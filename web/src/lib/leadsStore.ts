import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

// consentimentoRgpd é sempre um parâmetro explícito (sem valor por
// omissão) — obriga quem chama a decidir, em vez de assumir aqui. O
// lead magnet da homepage só chama isto depois de validar o checkbox
// (POST /api/leads rejeita com 400 se não vier marcado); o chatbot
// (api/chat/lead) não tem checkbox de consentimento, por isso passa
// false — regista com precisão que não há consentimento explícito,
// em vez de fabricá-lo.
export async function criarLead(email: string, consentimentoRgpd: boolean, fonte = "lead_magnet"): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_leads").insert({
    email,
    fonte,
    consentimento_rgpd: consentimentoRgpd,
    consentimento_data: new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao guardar lead: ${error.message}`);
}

export interface LeadRow {
  id: string;
  created_at: string;
  email: string;
  fonte: string;
  consentimento_rgpd: boolean;
  consentimento_data: string | null;
  natal_cupao_enviado_ano: number | null;
  natal_feliz_enviado_ano: number | null;
  ano_novo_enviado_ano: number | null;
}

type ColunaNatalLead = "natal_cupao_enviado_ano" | "natal_feliz_enviado_ano" | "ano_novo_enviado_ano";

/**
 * FASE 2, verificação explícita: "leads só recebem emails com
 * consentimento_rgpd = true" — filtrado directamente no Supabase (não é
 * uma comparação NULL-sensível: `.eq(col, true)` exclui correctamente
 * tanto `false` como `NULL`, ao contrário do `.neq`/`.eq(col,false)`
 * documentado em store.ts).
 */
export async function listarLeadsElegiveisNatal(coluna: ColunaNatalLead): Promise<LeadRow[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_leads").select("*").eq("consentimento_rgpd", true);
  if (error) throw new Error(`Falha ao listar leads para o email de Natal: ${error.message}`);
  const anoActual = new Date().getUTCFullYear();
  return ((data ?? []) as LeadRow[]).filter((l) => l[coluna] !== anoActual);
}

export async function marcarLeadEmailEnviado(leadId: string, coluna: ColunaNatalLead, ano: number): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_leads").update({ [coluna]: ano }).eq("id", leadId);
  if (error) throw new Error(`Falha ao marcar email de Natal do lead como enviado: ${error.message}`);
}
