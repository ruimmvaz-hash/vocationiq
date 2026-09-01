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

export async function obterNomeIntake(intakeId: string): Promise<string | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("vocationiq_intakes").select("nome").eq("id", intakeId).single();
  if (error) return null;
  return data?.nome ?? null;
}
