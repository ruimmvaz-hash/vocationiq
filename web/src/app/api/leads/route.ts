import { NextResponse } from "next/server";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { criarLead } from "@/lib/leadsStore";
import { sendLeadMagnetEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: string };
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!EMAIL_RE.test(trimmed)) return NextResponse.json({ error: "Introduz um email válido." }, { status: 400 });

  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });

  try {
    await criarLead(trimmed, "lead_magnet");
  } catch (err) {
    console.error("[leads] falha ao guardar:", err);
    return NextResponse.json({ error: "Não foi possível guardar o teu email." }, { status: 500 });
  }

  sendLeadMagnetEmail({ to: trimmed }).catch((err) => console.error("[leads] falha ao enviar email de exemplo:", err));

  return NextResponse.json({ ok: true });
}
