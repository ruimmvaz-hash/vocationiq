import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { IntakePayload } from "./validation";

export async function criarIntake(dados: IntakePayload, referralCode?: string): Promise<string> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .insert({
      nome: dados.nome,
      data_nascimento: dados.dataNascimento,
      hora_nascimento: dados.horaNascimento ?? null,
      local_nascimento: dados.localNascimento,
      situacao: dados.situacao,
      referral_code: referralCode ?? null,

      clareza_ideia: dados.clarezaIdeia ?? null,
      areas_consideradas: dados.areasConsideradas ?? null,
      areas_consideradas_outra: dados.areasConsideradasOutra ?? null,
      preferencia_familia: dados.preferenciaFamilia ?? null,
      opcoes_adolescente: dados.opcoesAdolescente ?? null,
      opcao_mais_provavel: dados.opcaoMaisProvavel ?? null,
      ano_escolaridade: dados.anoEscolaridade ?? null,

      curso_actual: dados.cursoActual ?? null,
      satisfacao_curso: dados.satisfacaoCurso ?? null,

      area_trabalho_actual: dados.areaTrabalhoActual ?? null,
      anos_experiencia: dados.anosExperiencia ?? null,
      o_que_nao_funciona: dados.oQueNaoFunciona ?? null,
      tipo_mudanca: dados.tipoMudanca ?? null,
      areas_destino: dados.areasDestino ?? null,
      areas_destino_outra: dados.areasDestinoOutra ?? null,
      ideia_concreta: dados.ideiaConcreta ?? null,

      para_onde_quer_ir: dados.paraOndeQuerIr ?? null,
      descricao_situacao: dados.descricaoSituacao ?? null,

      contexto_adicional: dados.contextoAdicional ?? null,
      pergunta_especifica: dados.perguntaEspecifica ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar pedido: ${error.message}`);
  return data.id as string;
}

export async function marcarIntakePago(intakeId: string, params: { email: string; stripeSessionId: string; amountCents: number }): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("vocationiq_intakes")
    .update({
      payment_status: "paid",
      email: params.email,
      stripe_checkout_session_id: params.stripeSessionId,
      amount_cents: params.amountCents,
      paid_at: new Date().toISOString(),
    })
    .eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar pedido como pago: ${error.message}`);
}

/** Corrige/preenche o email quando o admin o introduz manualmente na entrega (ex.: pedidos sem webhook processado). */
export async function atualizarEmailIntake(intakeId: string, email: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("vocationiq_intakes").update({ email }).eq("id", intakeId);
  if (error) throw new Error(`Falha ao actualizar o email do pedido: ${error.message}`);
}

export interface IntakeRow {
  id: string;
  created_at: string;
  nome: string;
  data_nascimento: string;
  hora_nascimento: string | null;
  local_nascimento: string;
  situacao: string;
  contexto: string | null;
  email: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number | null;
  referral_code: string | null;
  payment_status: "pending" | "paid" | "failed";
  paid_at: string | null;
  report_status: "not_started" | "in_progress" | "delivered";
  delivered_at: string | null;
  revisao_email_enviado: boolean;
  revisao_email_180_enviado: boolean;
  alerta_36h_enviado: boolean;
  /** CORRECÇÃO 1 (prazo 48h → 72h) — alerta de "pedido em risco" aos 60h, distinto do alerta de 36h acima (que continua a correr sem alterações). */
  alerta_60h_enviado: boolean;
  /** TAREFA 1 (acções de retenção) — o ANO em que o email de aniversário já foi enviado, não um booleano: o aniversário repete-se todos os anos. */
  aniversario_email_enviado_ano: number | null;
  /** TAREFA 2 (acções de retenção) — quando o alerta de mudança de Mahadasha foi enviado, e para que data de fim (ver mahadasha_alerta_para_data — evita reenviar para a MESMA transição, mas permite um alerta novo quando o ciclo mudar outra vez, anos depois). */
  mahadasha_alerta_enviado_em: string | null;
  mahadasha_alerta_para_data: string | null;
  /** TAREFA 4 (acções de retenção) — o código próprio que ESTE cliente pode partilhar (distinto de `referral_code`, que identifica quem O referiu a ele). */
  cliente_codigo_referral: string | null;
  /** TAREFA 4 — idempotência do webhook: já foi processado o crédito ao cliente que referiu esta compra? */
  referral_creditado: boolean;

  clareza_ideia: string | null;
  areas_consideradas: string[] | null;
  areas_consideradas_outra: string | null;
  preferencia_familia: string | null;
  opcoes_adolescente: string[] | null;
  opcao_mais_provavel: string | null;
  ano_escolaridade: string | null;

  curso_actual: string | null;
  satisfacao_curso: string | null;

  area_trabalho_actual: string | null;
  anos_experiencia: string | null;
  o_que_nao_funciona: string | null;
  tipo_mudanca: string[] | null;
  areas_destino: string[] | null;
  areas_destino_outra: string | null;
  ideia_concreta: string | null;

  para_onde_quer_ir: string | null;
  descricao_situacao: string | null;

  contexto_adicional: string | null;
  pergunta_especifica: string | null;
}

export interface FiltrosIntakes {
  estado?: "pendente" | "entregue";
  situacao?: string;
  email?: string;
}

/** Lista para /admin/relatorios — só pedidos pagos, mais recentes primeiro. */
export async function listarIntakes(filtros: FiltrosIntakes = {}): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  let query = supabase.from("vocationiq_intakes").select("*").eq("payment_status", "paid");

  if (filtros.estado === "pendente") query = query.neq("report_status", "delivered");
  if (filtros.estado === "entregue") query = query.eq("report_status", "delivered");
  if (filtros.situacao) query = query.eq("situacao", filtros.situacao);
  if (filtros.email) query = query.eq("email", filtros.email);

  const { data, error } = await query.order("paid_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar pedidos: ${error.message}`);
  return (data ?? []) as IntakeRow[];
}

/** Últimos N pedidos pagos ainda não entregues — para os alertas do dashboard. */
export async function obterUltimosPendentes(limite: number): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .select("*")
    .eq("payment_status", "paid")
    .neq("report_status", "delivered")
    .order("paid_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Falha ao listar pedidos pendentes: ${error.message}`);
  return (data ?? []) as IntakeRow[];
}

export interface ClienteRow {
  email: string;
  nome: string;
  situacao: string;
  primeiraCompra: string;
  totalRelatorios: number;
}

/** /admin/clientes — agregado por email a partir de vocationiq_intakes (sem tabela própria, ver migração 0003). */
export async function listarClientes(): Promise<ClienteRow[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .select("email, nome, situacao, paid_at")
    .eq("payment_status", "paid")
    .not("email", "is", null)
    .order("paid_at", { ascending: true });
  if (error) throw new Error(`Falha ao listar clientes: ${error.message}`);

  const porEmail = new Map<string, ClienteRow>();
  for (const row of (data ?? []) as { email: string; nome: string; situacao: string; paid_at: string }[]) {
    const existente = porEmail.get(row.email);
    if (existente) {
      existente.totalRelatorios += 1;
      existente.nome = row.nome;
      existente.situacao = row.situacao;
    } else {
      porEmail.set(row.email, { email: row.email, nome: row.nome, situacao: row.situacao, primeiraCompra: row.paid_at, totalRelatorios: 1 });
    }
  }
  return Array.from(porEmail.values()).sort((a, b) => new Date(b.primeiraCompra).getTime() - new Date(a.primeiraCompra).getTime());
}

export async function obterIntake(intakeId: string): Promise<IntakeRow | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("id", intakeId).single();
  if (error) {
    // Registado (não silenciado) — esta função alimenta o guard de
    // /avaliacao, e um erro aqui (id inexistente na ligação Supabase
    // deste deploy, RLS, etc.) é indistinguível de "pedido não entregue"
    // sem este log. Consultar Vercel → Logs para a causa exacta.
    console.error(`[obterIntake] falha ao ler pedido ${intakeId}:`, error.message);
    return null;
  }
  return data as IntakeRow;
}

export async function marcarIntakeEntregue(intakeId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("vocationiq_intakes")
    .update({ report_status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar pedido como entregue: ${error.message}`);
}

function janelaDias(diasAtras: number, folgaDias: number): { desde: string; ate: string } {
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;
  return {
    desde: new Date(agora - (diasAtras + folgaDias) * umDia).toISOString(),
    ate: new Date(agora - (diasAtras - folgaDias) * umDia).toISOString(),
  };
}

/** Pedidos entregues há ~90 dias (±1) que ainda não receberam o email de revisão. */
export async function listarElegiveisRevisao90(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { desde, ate } = janelaDias(90, 1);
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .select("*")
    .eq("report_status", "delivered")
    .eq("revisao_email_enviado", false)
    .gte("delivered_at", desde)
    .lte("delivered_at", ate);
  if (error) throw new Error(`Falha ao listar elegíveis para email de revisão (90d): ${error.message}`);
  return (data ?? []) as IntakeRow[];
}

/** Pedidos entregues há ~180 dias (±1) que ainda não receberam o segundo email. */
export async function listarElegiveisRevisao180(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { desde, ate } = janelaDias(180, 1);
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .select("*")
    .eq("report_status", "delivered")
    .eq("revisao_email_180_enviado", false)
    .gte("delivered_at", desde)
    .lte("delivered_at", ate);
  if (error) throw new Error(`Falha ao listar elegíveis para email de revisão (180d): ${error.message}`);
  return (data ?? []) as IntakeRow[];
}

export async function marcarRevisaoEmailEnviado(intakeId: string, marco: "90" | "180"): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const coluna = marco === "90" ? "revisao_email_enviado" : "revisao_email_180_enviado";
  const { error } = await supabase
    .from("vocationiq_intakes")
    .update({ [coluna]: true })
    .eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar email de revisão (${marco}d) como enviado: ${error.message}`);
}

/**
 * Pedidos pagos há mais de 36h sem relatório entregue, ainda sem alerta
 * enviado ao admin.
 *
 * Correcção do especialista ("email de 36h não disparou", pedido real
 * confirmado) — `.neq("report_status", "delivered")` e
 * `.eq("alerta_36h_enviado", false)` excluem, em SQL, qualquer linha
 * onde essas colunas sejam NULL na base de dados (NULL != valor e
 * NULL = false avaliam sempre para NULL, nunca para true, em Postgres —
 * a linha é silenciosamente omitida do resultado). O tipo `IntakeRow`
 * declara-as como não-nulas, mas isso é só uma promessa do TypeScript
 * em tempo de compilação — não impede uma linha antiga (anterior à
 * migração que criou `alerta_36h_enviado`, ou nunca escrita
 * explicitamente) de ter NULL de facto na base de dados. Um pedido
 * genuinamente pendente há mais de 36h podia ficar invisível a este
 * alerta exactamente por isso. Corrigido: filtra na Supabase só por
 * `payment_status`/`paid_at` (nunca ambíguo), e aplica a condição
 * "não entregue, sem alerta ainda" em memória — `!== "delivered"` e
 * `!== true` tratam `null`/`undefined` correctamente como "ainda não".
 */
export async function listarPendentesAlerta36h(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("payment_status", "paid").lt("paid_at", cutoff);
  if (error) throw new Error(`Falha ao listar pendentes para alerta de 36h: ${error.message}`);
  return ((data ?? []) as IntakeRow[]).filter((r) => (r.report_status as string | null) !== "delivered" && (r.alerta_36h_enviado as boolean | null) !== true);
}

export async function marcarAlerta36hEnviado(intakeId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("vocationiq_intakes").update({ alerta_36h_enviado: true }).eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar alerta de 36h como enviado: ${error.message}`);
}

/**
 * CORRECÇÃO 1 (prazo 48h → 72h) — pedidos pagos há entre 60h e 64h sem
 * relatório entregue, ainda sem o alerta de 60h enviado. Janela de 4h
 * (não "há mais de 60h", como no alerta de 36h) porque este cron corre
 * de 4 em 4 horas — sem o limite superior, cada pedido em atraso
 * continuaria a aparecer em TODAS as corridas seguintes até ser
 * entregue, reenviando o mesmo alerta repetidamente. Mesma armadilha do
 * NULL em Postgres documentada acima em `listarPendentesAlerta36h` —
 * filtrada em JS pela mesma razão.
 */
export async function listarPendentesAlerta60h(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const agora = Date.now();
  const desde = new Date(agora - 64 * 60 * 60 * 1000).toISOString();
  const ate = new Date(agora - 60 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("payment_status", "paid").gte("paid_at", desde).lte("paid_at", ate);
  if (error) throw new Error(`Falha ao listar pendentes para alerta de 60h: ${error.message}`);
  return ((data ?? []) as IntakeRow[]).filter((r) => (r.report_status as string | null) !== "delivered" && (r.alerta_60h_enviado as boolean | null) !== true);
}

export async function marcarAlerta60hEnviado(intakeId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("vocationiq_intakes").update({ alerta_60h_enviado: true }).eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar alerta de 60h como enviado: ${error.message}`);
}

// ---------- TAREFA 1 (acções de retenção) — email de aniversário ----------

/**
 * Clientes pagos cujo dia/mês de nascimento é hoje e que ainda não
 * receberam o email de aniversário ESTE ano.
 *
 * Correcção do especialista (mesma armadilha já documentada em
 * `listarPendentesAlerta36h` acima) — comparar
 * `aniversario_email_enviado_ano` contra o ano actual directamente no
 * filtro do Supabase excluiria silenciosamente as linhas onde a coluna
 * é NULL (nunca enviado) — em Postgres, `NULL <> valor` avalia para
 * NULL, nunca para true. Filtra-se em JS pela mesma razão.
 *
 * FALTA 3 (acções de retenção) — nunca filtra por `hora_nascimento`:
 * só dia/mês de `data_nascimento` interessam aqui, e essa coluna é
 * sempre obrigatória no intake (ao contrário da hora, que pode ficar
 * em branco) — um cliente sem hora de nascimento recebe o email na
 * mesma.
 */
export async function listarAniversariantesHoje(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("payment_status", "paid");
  if (error) throw new Error(`Falha ao listar clientes para o email de aniversário: ${error.message}`);

  const hoje = new Date();
  const diaHoje = hoje.getUTCDate();
  const mesHoje = hoje.getUTCMonth() + 1;
  const anoActual = hoje.getUTCFullYear();

  return ((data ?? []) as IntakeRow[]).filter((r) => {
    if (!r.data_nascimento) return false;
    const [, mesStr, diaStr] = r.data_nascimento.split("-");
    const aniversarioHoje = Number(mesStr) === mesHoje && Number(diaStr) === diaHoje;
    const aindaNaoEnviadoEsteAno = r.aniversario_email_enviado_ano !== anoActual;
    return aniversarioHoje && aindaNaoEnviadoEsteAno;
  });
}

export async function marcarAniversarioEmailEnviado(intakeId: string, ano: number): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("vocationiq_intakes").update({ aniversario_email_enviado_ano: ano }).eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar email de aniversário como enviado: ${error.message}`);
}

// ---------- TAREFA 2 (acções de retenção) — alerta de mudança de Mahadasha ----------

/**
 * Todos os clientes pagos com dados de nascimento — a data de fim da
 * Mahadasha actual não está guardada em lado nenhum (depende de um
 * cálculo astrológico completo, não só de campos do intake), por isso
 * esta função devolve a lista completa e é o cron
 * (api/cron/mahadasha-alerta/route.ts) que calcula e decide, pedido a
 * pedido, se a janela dos ~3 meses se aplica.
 */
export async function listarPagosParaAlertaMahadasha(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("payment_status", "paid");
  if (error) throw new Error(`Falha ao listar clientes para o alerta de Mahadasha: ${error.message}`);
  return ((data ?? []) as IntakeRow[]).filter((r) => !!r.data_nascimento && !!r.local_nascimento);
}

/** `dataFimISO` — a data de fim da Mahadasha (formato "YYYY-MM-DD") a que este alerta se refere, para nunca reenviar para a MESMA transição (mas continuar disponível para a próxima, anos depois). */
export async function marcarMahadashaAlertaEnviado(intakeId: string, dataFimISO: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("vocationiq_intakes")
    .update({ mahadasha_alerta_enviado_em: new Date().toISOString(), mahadasha_alerta_para_data: dataFimISO })
    .eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar alerta de Mahadasha como enviado: ${error.message}`);
}

// ---------- TAREFA 4 (acções de retenção) — referral entre clientes ----------

/**
 * O código que ESTE cliente pode partilhar — distinto de
 * `referral_code` (quem referiu ESTE cliente, comercial ou outro
 * cliente). Gerado uma única vez, na primeira vez que é pedido (ver
 * `sendConfirmationEmail`, chamada logo após o pagamento) — nunca
 * recriado depois disso, mesmo que voltado a pedir.
 */
export async function obterOuCriarCodigoReferralCliente(intake: IntakeRow): Promise<string> {
  if (intake.cliente_codigo_referral) return intake.cliente_codigo_referral;
  const supabase = await getSupabaseAdmin();
  const codigo = `VIQ-${intake.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const { error } = await supabase.from("vocationiq_intakes").update({ cliente_codigo_referral: codigo }).eq("id", intake.id);
  if (error) throw new Error(`Falha ao gerar o código de referência do cliente: ${error.message}`);
  return codigo;
}

/** Encontra o cliente DONO de um `cliente_codigo_referral` — usado pelo webhook do Stripe para identificar quem referiu uma nova compra. `null` quando o código não pertence a nenhum cliente (pode ser um código de comercial, verificado à parte por `validarCodigoComercial`). */
export async function obterIntakePorCodigoReferralCliente(codigo: string): Promise<IntakeRow | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("cliente_codigo_referral", codigo).maybeSingle();
  if (error) throw new Error(`Falha ao procurar cliente pelo código de referência: ${error.message}`);
  return (data as IntakeRow | null) ?? null;
}

/** Idempotência — marca que ESTA compra (a do referido, não a do referidor) já creditou quem a referiu, para o webhook do Stripe nunca duplicar o cupão/email se o evento for reentregue. */
export async function marcarReferralCreditado(intakeId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("vocationiq_intakes").update({ referral_creditado: true }).eq("id", intakeId);
  if (error) throw new Error(`Falha ao marcar referência como creditada: ${error.message}`);
}

// ---------- RETENÇÃO, FASE 2 ----------
//
// Correcção do especialista sobre o pedido literal ("viq_relatorios onde
// payment_status/delivered_at...") — confirmado por leitura directa da
// migração 0011: `viq_relatorios` NUNCA teve `payment_status` nem
// `delivered_at`, essas colunas só existem em `vocationiq_intakes` (é o
// que `listarElegiveisRevisao90/180`, já em produção, sempre usaram). As
// novas colunas de controlo desta fase (aniversario_relatorio_email_
// enviado_em, como_esta_email_enviado_em, etc.) FICAM em
// `viq_relatorios`, exactamente como pedido — mas a elegibilidade
// (pago? entregue? há quanto tempo?) é sempre calculada a partir de
// `vocationiq_intakes`, ligada por `intake_id`. `viq_relatorios.enviado_em`
// é escrito no MESMO instante que `vocationiq_intakes.delivered_at`
// (`marcarRelatorioEnviado`+`marcarIntakeEntregue`, chamados em par em
// todas as rotas de entrega) — por isso serve na mesma como o "há quanto
// tempo foi entregue" sem precisar de ir a `vocationiq_intakes` para essa
// parte.

export interface RelatorioParaRetencao {
  relatorioId: string;
  intake: IntakeRow;
}

async function juntarIntakesPorId(linhas: { id: string; intake_id: string }[]): Promise<RelatorioParaRetencao[]> {
  if (linhas.length === 0) return [];
  const supabase = await getSupabaseAdmin();
  const ids = [...new Set(linhas.map((l) => l.intake_id))];
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").in("id", ids);
  if (error) throw new Error(`Falha ao juntar intakes para retenção: ${error.message}`);
  const porId = new Map((data as IntakeRow[]).map((i) => [i.id, i]));
  return linhas.map((l) => ({ relatorioId: l.id, intake: porId.get(l.intake_id) })).filter((x): x is RelatorioParaRetencao => !!x.intake);
}

/** Relatórios entregues há ~365 dias (±15) sem o email de aniversário do relatório ainda enviado. Mesma armadilha do NULL em Postgres documentada acima — filtra-se `aniversario_relatorio_email_enviado_em IS NULL` em JS, não no Supabase. */
export async function listarElegiveisAniversarioRelatorio(): Promise<RelatorioParaRetencao[]> {
  const supabase = await getSupabaseAdmin();
  const { desde, ate } = janelaDias(365, 15);
  const { data, error } = await supabase
    .from("viq_relatorios")
    .select("id, intake_id, enviado_em, aniversario_relatorio_email_enviado_em")
    .not("enviado_em", "is", null)
    .gte("enviado_em", desde)
    .lte("enviado_em", ate);
  if (error) throw new Error(`Falha ao listar elegíveis para o email de aniversário do relatório: ${error.message}`);
  const elegiveis = (data ?? []).filter((r) => !r.aniversario_relatorio_email_enviado_em);
  return juntarIntakesPorId(elegiveis);
}

export async function marcarAniversarioRelatorioEmailEnviado(relatorioId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ aniversario_relatorio_email_enviado_em: new Date().toISOString() }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email de aniversário do relatório como enviado: ${error.message}`);
}

/**
 * Relatórios entregues há ~194 dias (180 + 14, ±15) sem o email "como
 * está a correr" ainda enviado.
 *
 * DECISÃO do fundador (após o relatório inicial desta fase): manter os
 * dois emails dos 6 meses, mas desfasados — o check-in de 180 dias
 * (`sendRevisao180Email`, cron revisao-emails) dispara primeiro,
 * exactamente aos 180 dias; este, sem venda, dispara 2 semanas depois
 * (~194 dias), para nunca chegarem no mesmo dia.
 */
export async function listarElegiveisComoEsta(): Promise<RelatorioParaRetencao[]> {
  const supabase = await getSupabaseAdmin();
  const { desde, ate } = janelaDias(194, 15);
  const { data, error } = await supabase
    .from("viq_relatorios")
    .select("id, intake_id, enviado_em, como_esta_email_enviado_em")
    .not("enviado_em", "is", null)
    .gte("enviado_em", desde)
    .lte("enviado_em", ate);
  if (error) throw new Error(`Falha ao listar elegíveis para o email "como está a correr": ${error.message}`);
  const elegiveis = (data ?? []).filter((r) => !r.como_esta_email_enviado_em);
  return juntarIntakesPorId(elegiveis);
}

export async function marcarComoEstaEmailEnviado(relatorioId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ como_esta_email_enviado_em: new Date().toISOString() }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email "como está a correr" como enviado: ${error.message}`);
}

/** Ficha mínima de um relatório entregue, para os crons anuais/dados técnicos (início de ano, Natal) — evita repetir a mesma junção viq_relatorios/vocationiq_intakes em cada um. */
export interface RelatorioEntregueParaRetencao extends RelatorioParaRetencao {
  dadosTecnicos: unknown | null;
  inicioAnoEnviadoAno: number | null;
  natalCupaoEnviadoAno: number | null;
  natalFelizEnviadoAno: number | null;
  anoNovoEnviadoAno: number | null;
}

/**
 * Um relatório entregue por cliente (o mais recente, mesma regra de
 * `obterRelatorioEntregue` em storage.ts) — base comum dos crons de
 * início de ano e Natal para clientes, que precisam de "todos os
 * clientes pagos com relatório entregue", não de uma janela de dias.
 */
export async function listarClientesComRelatorioEntregue(): Promise<RelatorioEntregueParaRetencao[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viq_relatorios")
    .select("id, intake_id, created_at, dados_tecnicos, inicio_ano_email_enviado_ano, natal_cupao_enviado_ano, natal_feliz_enviado_ano, ano_novo_enviado_ano")
    .not("pdf_path", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar clientes com relatório entregue: ${error.message}`);

  const maisRecentePorIntake = new Map<string, (typeof data)[number]>();
  for (const linha of data ?? []) {
    if (!maisRecentePorIntake.has(linha.intake_id)) maisRecentePorIntake.set(linha.intake_id, linha);
  }
  const linhas = [...maisRecentePorIntake.values()];
  const comIntake = await juntarIntakesPorId(linhas.map((l) => ({ id: l.id, intake_id: l.intake_id })));
  const porRelatorioId = new Map(linhas.map((l) => [l.id, l]));

  return comIntake
    .filter(({ intake }) => intake.payment_status === "paid")
    .map(({ relatorioId, intake }) => {
      const linha = porRelatorioId.get(relatorioId)!;
      return {
        relatorioId,
        intake,
        dadosTecnicos: linha.dados_tecnicos ?? null,
        inicioAnoEnviadoAno: linha.inicio_ano_email_enviado_ano ?? null,
        natalCupaoEnviadoAno: linha.natal_cupao_enviado_ano ?? null,
        natalFelizEnviadoAno: linha.natal_feliz_enviado_ano ?? null,
        anoNovoEnviadoAno: linha.ano_novo_enviado_ano ?? null,
      };
    });
}

export async function marcarInicioAnoEmailEnviado(relatorioId: string, ano: number): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ inicio_ano_email_enviado_ano: ano }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email de início de ano como enviado: ${error.message}`);
}

export async function marcarNatalCupaoEmailEnviado(relatorioId: string, ano: number): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ natal_cupao_enviado_ano: ano }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email de cupão de Natal como enviado: ${error.message}`);
}

export async function marcarNatalFelizEmailEnviado(relatorioId: string, ano: number): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ natal_feliz_enviado_ano: ano }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email de Feliz Natal como enviado: ${error.message}`);
}

export async function marcarAnoNovoEmailEnviado(relatorioId: string, ano: number): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("viq_relatorios").update({ ano_novo_enviado_ano: ano }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar email de Ano Novo como enviado: ${error.message}`);
}
