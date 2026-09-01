import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { FUNNEL_STEPS } from "@/lib/eventLog";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const { event, metadata } = (body ?? {}) as { event?: string; metadata?: Record<string, unknown> };
  if (!event || !FUNNEL_STEPS.includes(event as (typeof FUNNEL_STEPS)[number])) {
    return NextResponse.json({ error: "evento desconhecido" }, { status: 400 });
  }

  if (!hasSupabaseAdmin) return NextResponse.json({ ok: true, skipped: "supabase não configurado" });

  try {
    const sb = await getSupabaseAdmin();
    await sb.from("viq_events").insert({ event_type: event, metadata: metadata ?? null });
  } catch (err) {
    console.error("[events] falha ao registar:", err);
  }

  return NextResponse.json({ ok: true });
}
