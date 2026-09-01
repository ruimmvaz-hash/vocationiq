import { NextResponse } from "next/server";
import { criarOuActivarComercial } from "@/lib/comercialStore";
import { createMagicLinkToken } from "@/lib/comercialAuth";
import { sendComercialMagicLinkEmail } from "@/lib/comercialEmail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { name, email } = (body ?? {}) as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: "nome e email são obrigatórios" }, { status: 400 });

  try {
    const comercial = await criarOuActivarComercial({ name: name.trim(), email: email.trim() });

    const token = createMagicLinkToken(comercial.id, comercial.email);
    if (token) sendComercialMagicLinkEmail({ to: comercial.email, nome: comercial.name, token }).catch((err) => console.error("[comercial signup] falha ao enviar email:", err));

    return NextResponse.json({ ok: true, code: comercial.code, link: `${SITE_URL}?ref=${comercial.code}` });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
