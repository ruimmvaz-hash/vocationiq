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

  clareza_ideia: string | null;
  areas_consideradas: string[] | null;
  areas_consideradas_outra: string | null;
  preferencia_familia: string | null;

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
