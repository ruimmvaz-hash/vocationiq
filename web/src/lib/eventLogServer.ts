import "server-only";
import { getSupabaseAdmin, hasSupabaseAdmin } from "./supabaseAdmin";
import type { FunnelEvent } from "./eventLog";

/** Regista um evento a partir do servidor (webhook, rota de entrega) — nunca lança, só regista o erro. */
export async function registarEventoServidor(event: FunnelEvent, metadata?: Record<string, unknown>): Promise<void> {
  if (!hasSupabaseAdmin) return;
  try {
    const sb = await getSupabaseAdmin();
    await sb.from("viq_events").insert({ event_type: event, metadata: metadata ?? null });
  } catch (err) {
    console.error("[viq_events] falha ao registar evento:", err);
  }
}
