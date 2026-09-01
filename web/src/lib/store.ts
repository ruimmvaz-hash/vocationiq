import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { IntakePayload } from "./validation";

export async function criarIntake(dados: IntakePayload): Promise<string> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .insert({
      nome: dados.nome,
      data_nascimento: dados.dataNascimento,
      hora_nascimento: dados.horaNascimento ?? null,
      local_nascimento: dados.localNascimento,
      situacao: dados.situacao,
      contexto: dados.contexto ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar pedido: ${error.message}`);
  return data.id as string;
}

export async function marcarIntakePago(intakeId: string, params: { email: string; stripeSessionId: string }): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("vocationiq_intakes")
    .update({
      payment_status: "paid",
      email: params.email,
      stripe_checkout_session_id: params.stripeSessionId,
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
  payment_status: "pending" | "paid" | "failed";
  paid_at: string | null;
  report_status: "not_started" | "in_progress" | "delivered";
  delivered_at: string | null;
}

/** Lista para /admin/intakes — só pedidos pagos, mais recentes primeiro. */
export async function listarIntakes(): Promise<IntakeRow[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocationiq_intakes")
    .select("*")
    .eq("payment_status", "paid")
    .order("paid_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar pedidos: ${error.message}`);
  return (data ?? []) as IntakeRow[];
}

export async function obterIntake(intakeId: string): Promise<IntakeRow | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("id", intakeId).single();
  if (error) return null;
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
