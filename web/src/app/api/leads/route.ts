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

  const { email, consentimentoRgpd } = (body ?? {}) as { email?: string; consentimentoRgpd?: boolean };
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!EMAIL_RE.test(trimmed)) return NextResponse.json({ error: "Introduz um email válido." }, { status: 400 });
  if (consentimentoRgpd !== true) return NextResponse.json({ error: "É necessário aceitar receber comunicações para continuar." }, { status: 400 });

  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });

  try {
    await criarLead(trimmed, true, "lead_magnet");
  } catch (err) {
    console.error("[leads] falha ao guardar:", err);
    return NextResponse.json({ error: "Não foi possível guardar o teu email." }, { status: 500 });
  }

  // Aguarda o envio (em vez de fire-and-forget) para o formulário só
  // mostrar "enviámos" quando o email realmente saiu — antes disto, uma
  // falha no envio (ex.: RESEND_API_KEY em falta) ficava só no log do
  // servidor e o utilizador via sempre sucesso sem nunca receber nada.
  const envio = await sendLeadMagnetEmail({ to: trimmed });
  if (!envio.ok) {
    console.error("[leads] falha ao enviar email de exemplo:", envio.detail);
    return NextResponse.json({ error: "O teu email ficou registado, mas não foi possível enviar agora. Tenta novamente em alguns minutos." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
