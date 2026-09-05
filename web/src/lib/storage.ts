import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { VocationIQAxes, PesoPlaneta, EarningMode, SavPorCasa, DadosDatas } from "@naveya/method-engine";

const BUCKET = "viq-relatorios";

/** Forma dos períodos dentro de `dados_tecnicos` (jsonb) — as mesmas datas que `DadosDatas` do method-engine, mas já como string ISO (o que sobrevive a um JSON.stringify/round-trip pela base de dados), nunca `Date`. */
export interface DatasArmazenadas {
  mahadashaAtual: { senhor: string; inicio: string; fim: string };
  antardashaAtual: { senhor: string; inicio: string; fim: string };
  proximasAntardashas: { senhor: string; inicio: string; fim: string }[];
  transitoJupiter: { signo: string; aspectosAoNatal: string[] };
  transitoSaturno: { signo: string; aspectosAoNatal: string[] };
}

/** Ficha do "Mapa técnico" (secção 2 de /admin/relatorios/[id]) tal como volta de `viq_relatorios.dados_tecnicos` — as datas já são string ISO (sobrevivem ao round-trip jsonb), nunca `Date`. */
export interface DadosTecnicosArmazenados {
  axes: VocationIQAxes;
  pesos: PesoPlaneta[];
  earningModes: EarningMode[];
  datas: DatasArmazenadas;
  savPorCasa: SavPorCasa[];
}

/** A mesma ficha, do lado de quem GUARDA logo a seguir a calcular (`datas` ainda com `Date` reais — o Supabase serializa para ISO ao enviar, por isso não há tipo em comum entre escrita e leitura). */
export interface DadosTecnicosParaGuardar {
  axes: VocationIQAxes;
  pesos: PesoPlaneta[];
  earningModes: EarningMode[];
  datas: DadosDatas;
  savPorCasa: SavPorCasa[];
}

// Nomes de ficheiro em português quase sempre têm acentos ("Relatório-
// João.pdf") — chaves de storage sem isto sanitizado podem falhar o
// upload. O nome original (com acentos) mantém-se em pdf_filename/no
// anexo do email; só a CHAVE do storage é sanitizada. O intakeId (UUID,
// já só ASCII/hífens) fica fora da sanitização para preservar a pasta
// por pedido.
function sanitizarKey(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Guarda o PDF entregue. Reaproveita a linha de rascunho já existente
 * para este intake (pdf_path ainda nulo), quando houver uma, em vez de
 * criar sempre uma linha nova — duas razões: (1) mantém rascunho_texto
 * disponível na linha entregue, para "rascunho sempre visível" e "Ver
 * Word" funcionarem depois da entrega; (2) evita deixar a linha de
 * rascunho órfã (tradeoff conhecido e documentado numa ronda anterior).
 * Sem rascunho prévio (ex.: entrega manual nos ramos sem motor de
 * geração), insere uma linha nova como antes.
 */
export async function guardarRelatorioPdf(params: { intakeId: string; filename: string; bytes: Buffer; contentType: string }): Promise<{ id: string; path: string }> {
  const sb = await getSupabaseAdmin();
  const path = `${params.intakeId}/${sanitizarKey(`${Date.now()}-${params.filename}`)}`;

  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, params.bytes, { contentType: params.contentType, upsert: false });
  if (uploadError) throw new Error(`Falha ao guardar o PDF: ${uploadError.message}`);

  const { data: existente, error: buscaError } = await sb.from("viq_relatorios").select("id").eq("intake_id", params.intakeId).is("pdf_path", null).maybeSingle();
  if (buscaError) throw new Error(`Falha ao procurar rascunho existente: ${buscaError.message}`);

  if (existente) {
    const { error: updateError } = await sb.from("viq_relatorios").update({ pdf_path: path, pdf_filename: params.filename }).eq("id", existente.id);
    if (updateError) throw new Error(`Falha ao registar o relatório: ${updateError.message}`);
    return { id: existente.id as string, path };
  }

  const { data, error: insertError } = await sb
    .from("viq_relatorios")
    .insert({ intake_id: params.intakeId, pdf_path: path, pdf_filename: params.filename })
    .select("id")
    .single();
  if (insertError) throw new Error(`Falha ao registar o relatório: ${insertError.message}`);

  return { id: data.id as string, path };
}

/** Descarrega os bytes de um PDF já guardado no bucket. */
export async function baixarRelatorioPdf(path: string): Promise<Buffer> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Falha ao descarregar o PDF: ${error?.message ?? "ficheiro não encontrado"}`);
  return Buffer.from(await data.arrayBuffer());
}

export interface RelatorioEntregue {
  id: string;
  pdfPath: string;
  pdfFilename: string;
  rascunhoTexto: string | null;
  enviadoEm: string | null;
  criadoEm: string;
  dadosTecnicos: DadosTecnicosArmazenados | null;
  promptCompleto: string | null;
  auditoriaLlm: string | null;
  auditoriaCriadaEm: string | null;
}

/**
 * A linha ENTREGUE (pdf_path preenchido) mais recente de viq_relatorios
 * para este intake — usada por "Ver PDF"/"Ver Word"/"Reenviar"/histórico
 * de envios. Deliberadamente distinta de `obterRascunho` (pdf_path
 * nulo): depois de "Regenerar rascunho" pós-entrega, passam a coexistir
 * DUAS linhas para o mesmo intake — a entregue (histórico, imutável) e
 * um novo rascunho (pdf_path nulo, para rever) — por isso nunca basta
 * "a linha mais recente" para decidir qual é a entregue.
 */
export async function obterRelatorioEntregue(intakeId: string): Promise<RelatorioEntregue | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_relatorios")
    .select("id, pdf_path, pdf_filename, rascunho_texto, enviado_em, created_at, dados_tecnicos, prompt_completo, auditoria_llm, auditoria_criada_em")
    .eq("intake_id", intakeId)
    .not("pdf_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || !data.pdf_path || !data.pdf_filename) return null;
  return {
    id: data.id as string,
    pdfPath: data.pdf_path as string,
    pdfFilename: data.pdf_filename as string,
    rascunhoTexto: data.rascunho_texto as string | null,
    enviadoEm: data.enviado_em as string | null,
    criadoEm: data.created_at as string,
    dadosTecnicos: (data.dados_tecnicos as DadosTecnicosArmazenados | null) ?? null,
    promptCompleto: (data.prompt_completo as string | null) ?? null,
    auditoriaLlm: (data.auditoria_llm as string | null) ?? null,
    auditoriaCriadaEm: (data.auditoria_criada_em as string | null) ?? null,
  };
}

export interface EnvioRelatorio {
  email: string;
  tipo: "inicial" | "reenvio";
  enviadoEm: string;
}

/** Regista um envio (inicial ou reenvio) no histórico — nunca substitui, só acrescenta. */
export async function registarEnvio(relatorioId: string, email: string, tipo: "inicial" | "reenvio"): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorio_envios").insert({ relatorio_id: relatorioId, email, tipo });
  if (error) throw new Error(`Falha ao registar envio: ${error.message}`);
}

/** Histórico de envios de um relatório, mais recente primeiro. */
export async function listarEnvios(relatorioId: string): Promise<EnvioRelatorio[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_relatorio_envios").select("email, tipo, enviado_em").eq("relatorio_id", relatorioId).order("enviado_em", { ascending: false });
  if (error) throw new Error(`Falha ao listar envios: ${error.message}`);
  return (data ?? []).map((d) => ({ email: d.email as string, tipo: d.tipo as "inicial" | "reenvio", enviadoEm: d.enviado_em as string }));
}

export async function marcarRelatorioEnviado(relatorioId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").update({ enviado_em: new Date().toISOString() }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar relatório como enviado: ${error.message}`);
}

/**
 * Guarda o rascunho gerado pelo motor (VOCATIONIQ-ADULTO-metodologia.md)
 * em viq_relatorios. Idempotente por intake — reaproveita a linha de
 * rascunho já existente (pdf_path ainda nulo) em vez de acumular uma
 * nova a cada "Gerar rascunho"; a linha final da entrega (com PDF, via
 * guardarRelatorioPdf) continua a ser sempre uma linha à parte.
 */
/**
 * `dadosTecnicos`/`promptCompleto` só vêm preenchidos quando quem chama
 * acabou de gerar o rascunho pelo motor (POST /api/relatorio) — nesse
 * caso substituem sempre o que estava guardado. Quando ficam por
 * definir (ex.: PUT /api/relatorio, edição manual do admin sem
 * regeneração), a coluna correspondente não é tocada — o texto pode
 * mudar à mão sem invalidar o "Mapa técnico"/"Prompt completo" da última
 * geração real, que continuam válidos.
 */
export async function guardarRascunho(intakeId: string, texto: string, dadosTecnicos?: DadosTecnicosParaGuardar, promptCompleto?: string): Promise<{ id: string }> {
  const sb = await getSupabaseAdmin();
  const agora = new Date().toISOString();
  const camposExtra = {
    ...(dadosTecnicos !== undefined ? { dados_tecnicos: dadosTecnicos } : {}),
    ...(promptCompleto !== undefined ? { prompt_completo: promptCompleto } : {}),
  };

  const { data: existente, error: buscaError } = await sb.from("viq_relatorios").select("id").eq("intake_id", intakeId).is("pdf_path", null).maybeSingle();
  if (buscaError) throw new Error(`Falha ao procurar rascunho existente: ${buscaError.message}`);

  if (existente) {
    const { error } = await sb
      .from("viq_relatorios")
      .update({ rascunho_texto: texto, rascunho_criado_em: agora, ...camposExtra })
      .eq("id", existente.id);
    if (error) throw new Error(`Falha ao actualizar rascunho: ${error.message}`);
    return { id: existente.id as string };
  }

  const { data, error } = await sb
    .from("viq_relatorios")
    .insert({ intake_id: intakeId, rascunho_texto: texto, rascunho_criado_em: agora, ...camposExtra })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao guardar rascunho: ${error.message}`);
  return { id: data.id as string };
}

export interface RascunhoRelatorio {
  id: string;
  texto: string;
  criadoEm: string;
  dadosTecnicos: DadosTecnicosArmazenados | null;
  promptCompleto: string | null;
  auditoriaLlm: string | null;
  auditoriaCriadaEm: string | null;
}

/** Último rascunho por gerar/aprovar (pdf_path ainda nulo) para este intake, se existir. */
export async function obterRascunho(intakeId: string): Promise<RascunhoRelatorio | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_relatorios")
    .select("id, rascunho_texto, rascunho_criado_em, dados_tecnicos, prompt_completo, auditoria_llm, auditoria_criada_em")
    .eq("intake_id", intakeId)
    .is("pdf_path", null)
    .not("rascunho_texto", "is", null)
    .maybeSingle();
  if (error || !data || !data.rascunho_texto) return null;
  return {
    id: data.id as string,
    texto: data.rascunho_texto as string,
    criadoEm: data.rascunho_criado_em as string,
    dadosTecnicos: (data.dados_tecnicos as DadosTecnicosArmazenados | null) ?? null,
    promptCompleto: (data.prompt_completo as string | null) ?? null,
    auditoriaLlm: (data.auditoria_llm as string | null) ?? null,
    auditoriaCriadaEm: (data.auditoria_criada_em as string | null) ?? null,
  };
}

/** Guarda o resultado do botão "Analisar raciocínio do LLM" numa linha específica de viq_relatorios (a mesma que já guarda o rascunho/prompt que foi auditado). */
export async function guardarAuditoriaLlm(relatorioId: string, texto: string): Promise<{ criadoEm: string }> {
  const sb = await getSupabaseAdmin();
  const criadoEm = new Date().toISOString();
  const { error } = await sb.from("viq_relatorios").update({ auditoria_llm: texto, auditoria_criada_em: criadoEm }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao guardar auditoria: ${error.message}`);
  return { criadoEm };
}

/** "Descartar" — apaga a linha de rascunho (pdf_path ainda nulo) deste intake. Nunca toca em linhas já entregues (com PDF). */
export async function apagarRascunho(intakeId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").delete().eq("intake_id", intakeId).is("pdf_path", null);
  if (error) throw new Error(`Falha ao apagar rascunho: ${error.message}`);
}

export interface TextoRelatorioActual {
  id: string;
  texto: string;
  origem: "rascunho" | "entregue";
  dadosTecnicos: DadosTecnicosArmazenados | null;
  promptCompleto: string | null;
  auditoriaLlm: string | null;
  auditoriaCriadaEm: string | null;
}

/**
 * Texto mais actual para pré-visualizar/reimprimir (Ver HTML, Ver PDF,
 * Ver Word): prefere um rascunho novo ainda não aprovado (regenerado
 * depois da entrega), e só cai para o texto do relatório entregue se não
 * houver nenhum rascunho por aprovar. Corrige um bug real — estas três
 * rotas usavam cada uma só uma das duas linhas (uma só via rascunho,
 * outra só via entregue), por isso "Ver PDF" continuava a mostrar a
 * versão antiga depois de "Regenerar rascunho". Nunca lê pdf_path/bytes
 * guardados — isso é propositadamente só para "Reenviar relatório", que
 * reenvia deliberadamente o que já foi enviado, não o rascunho actual.
 */
export async function obterTextoRelatorioActual(intakeId: string): Promise<TextoRelatorioActual | null> {
  const rascunho = await obterRascunho(intakeId);
  if (rascunho?.texto) {
    return {
      id: rascunho.id,
      texto: rascunho.texto,
      origem: "rascunho",
      dadosTecnicos: rascunho.dadosTecnicos,
      promptCompleto: rascunho.promptCompleto,
      auditoriaLlm: rascunho.auditoriaLlm,
      auditoriaCriadaEm: rascunho.auditoriaCriadaEm,
    };
  }
  const entregue = await obterRelatorioEntregue(intakeId);
  if (entregue?.rascunhoTexto) {
    return {
      id: entregue.id,
      texto: entregue.rascunhoTexto,
      origem: "entregue",
      dadosTecnicos: entregue.dadosTecnicos,
      promptCompleto: entregue.promptCompleto,
      auditoriaLlm: entregue.auditoriaLlm,
      auditoriaCriadaEm: entregue.auditoriaCriadaEm,
    };
  }
  return null;
}
