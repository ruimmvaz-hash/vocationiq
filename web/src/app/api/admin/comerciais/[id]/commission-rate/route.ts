import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { definirTaxaComercial } from "@/lib/comercialStore";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { ratePct } = (body ?? {}) as { ratePct?: number };
  if (typeof ratePct !== "number" || Number.isNaN(ratePct)) return NextResponse.json({ error: "taxa inválida" }, { status: 400 });

  try {
    await definirTaxaComercial(id, ratePct / 100);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
