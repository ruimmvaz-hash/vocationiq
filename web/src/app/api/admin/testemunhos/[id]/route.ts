import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { definirAprovacaoTestemunho, apagarTestemunho } from "@/lib/testemunhosStore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { aprovado } = (body ?? {}) as { aprovado?: boolean };
  if (typeof aprovado !== "boolean") return NextResponse.json({ error: "aprovado tem de ser boolean" }, { status: 400 });

  try {
    await definirAprovacaoTestemunho(id, aprovado);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    await apagarTestemunho(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
