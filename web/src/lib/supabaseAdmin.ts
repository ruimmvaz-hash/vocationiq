import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseAdmin = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  if (!hasSupabaseAdmin) throw new Error("Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em falta).");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
