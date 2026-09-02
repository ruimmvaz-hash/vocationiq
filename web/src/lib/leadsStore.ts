import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

export async function criarLead(email: string, fonte = "lead_magnet"): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_leads").insert({ email, fonte });
  if (error) throw new Error(`Falha ao guardar lead: ${error.message}`);
}
