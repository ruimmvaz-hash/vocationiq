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
