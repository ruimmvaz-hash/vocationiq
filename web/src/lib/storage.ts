import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

const BUCKET = "viq-relatorios";

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
    .select("id, pdf_path, pdf_filename, rascunho_texto, enviado_em, created_at")
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
export async function guardarRascunho(intakeId: string, texto: string): Promise<{ id: string }> {
  const sb = await getSupabaseAdmin();
  const agora = new Date().toISOString();

  const { data: existente, error: buscaError } = await sb.from("viq_relatorios").select("id").eq("intake_id", intakeId).is("pdf_path", null).maybeSingle();
  if (buscaError) throw new Error(`Falha ao procurar rascunho existente: ${buscaError.message}`);

  if (existente) {
    const { error } = await sb.from("viq_relatorios").update({ rascunho_texto: texto, rascunho_criado_em: agora }).eq("id", existente.id);
    if (error) throw new Error(`Falha ao actualizar rascunho: ${error.message}`);
    return { id: existente.id as string };
  }

  const { data, error } = await sb.from("viq_relatorios").insert({ intake_id: intakeId, rascunho_texto: texto, rascunho_criado_em: agora }).select("id").single();
  if (error) throw new Error(`Falha ao guardar rascunho: ${error.message}`);
  return { id: data.id as string };
}

export interface RascunhoRelatorio {
  id: string;
  texto: string;
  criadoEm: string;
}

/** Último rascunho por gerar/aprovar (pdf_path ainda nulo) para este intake, se existir. */
export async function obterRascunho(intakeId: string): Promise<RascunhoRelatorio | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_relatorios")
    .select("id, rascunho_texto, rascunho_criado_em")
    .eq("intake_id", intakeId)
    .is("pdf_path", null)
    .not("rascunho_texto", "is", null)
    .maybeSingle();
  if (error || !data || !data.rascunho_texto) return null;
  return { id: data.id as string, texto: data.rascunho_texto as string, criadoEm: data.rascunho_criado_em as string };
}

/** "Descartar" — apaga a linha de rascunho (pdf_path ainda nulo) deste intake. Nunca toca em linhas já entregues (com PDF). */
export async function apagarRascunho(intakeId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").delete().eq("intake_id", intakeId).is("pdf_path", null);
  if (error) throw new Error(`Falha ao apagar rascunho: ${error.message}`);
}
