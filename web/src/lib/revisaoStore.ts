import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { RevisaoPayload } from "./revisaoValidation";

export interface RevisaoRow {
  id: string;
  criado_em: string;
  intake_id_original: string;
  nome: string;
  email: string | null;
  seguiu_direcao: string | null;
  o_que_correu_bem: string | null;
  o_que_nao_correu: string | null;
  duvida_actual: string | null;
  sentimento_caminho: number | null;
  questao_relatorio: string | null;
  situacao_mudou: string | null;
  decisao_concreta: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number | null;
  payment_status: "pending" | "paid" | "failed";
  paid_at: string | null;
  estado: "pendente" | "entregue";
  entregue_em: string | null;
}

export async function criarRevisao(dados: RevisaoPayload, nome: string): Promise<string> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_revisoes")
    .insert({
      intake_id_original: dados.intakeIdOriginal,
      nome,
      seguiu_direcao: dados.seguiuDirecao,
      o_que_correu_bem: dados.oQueCorreuBem ?? null,
      o_que_nao_correu: dados.oQueNaoCorreu ?? null,
      duvida_actual: dados.duvidaActual,
      sentimento_caminho: dados.sentimentoCaminho,
      questao_relatorio: dados.questaoRelatorio ?? null,
      situacao_mudou: dados.situacaoMudou,
      decisao_concreta: dados.decisaoConcreta ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar revisão: ${error.message}`);
  return data.id as string;
}

export async function marcarRevisaoPaga(revisaoId: string, params: { email: string; stripeSessionId: string; amountCents: number }): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb
    .from("viq_revisoes")
    .update({
      payment_status: "paid",
      email: params.email,
      stripe_checkout_session_id: params.stripeSessionId,
      amount_cents: params.amountCents,
      paid_at: new Date().toISOString(),
    })
    .eq("id", revisaoId);
  if (error) throw new Error(`Falha ao marcar revisão como paga: ${error.message}`);
}

export async function listarRevisoes(): Promise<RevisaoRow[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_revisoes").select("*").eq("payment_status", "paid").order("paid_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar revisões: ${error.message}`);
  return (data ?? []) as RevisaoRow[];
}

export async function obterRevisao(id: string): Promise<RevisaoRow | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_revisoes").select("*").eq("id", id).single();
  if (error) return null;
  return data as RevisaoRow;
}

export async function marcarRevisaoEntregue(id: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_revisoes").update({ estado: "entregue", entregue_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Falha ao marcar revisão como entregue: ${error.message}`);
}

/** Já existe alguma revisão paga para este pedido original? (usado pelo cron do email de 180 dias) */
export async function temRevisaoPaga(intakeIdOriginal: string): Promise<boolean> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_revisoes").select("id").eq("intake_id_original", intakeIdOriginal).eq("payment_status", "paid").limit(1).maybeSingle();
  return !!data;
}
