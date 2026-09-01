import { NextResponse } from "next/server";
import { obterComercialPorEmail } from "@/lib/comercialStore";
import { createMagicLinkToken } from "@/lib/comercialAuth";
import { sendComercialMagicLinkEmail } from "@/lib/comercialEmail";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { email } = (body ?? {}) as { email?: string };
  if (!email?.trim()) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  // Nunca revela se o email existe — sempre {ok:true}.
  const comercial = await obterComercialPorEmail(email.trim());
  if (comercial) {
    const token = createMagicLinkToken(comercial.id, comercial.email);
    if (token) sendComercialMagicLinkEmail({ to: comercial.email, nome: comercial.name, token }).catch((err) => console.error("[request-link] falha ao enviar:", err));
  }

  return NextResponse.json({ ok: true });
}
