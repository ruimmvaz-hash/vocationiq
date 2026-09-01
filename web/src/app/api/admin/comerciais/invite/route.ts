import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { convidarComercial } from "@/lib/comercialStore";
import { sendComercialInviteEmail } from "@/lib/comercialEmail";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { name, email } = (body ?? {}) as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: "nome e email são obrigatórios" }, { status: 400 });

  try {
    const { comercial, jaRegistado } = await convidarComercial({ name: name.trim(), email: email.trim() });
    if (!jaRegistado) await sendComercialInviteEmail({ to: comercial.email, nome: comercial.name });
    return NextResponse.json({ ok: true, jaRegistado });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
