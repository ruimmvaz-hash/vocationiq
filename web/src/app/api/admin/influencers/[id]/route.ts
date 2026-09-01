import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { definirEstadoInfluencer, type EstadoInfluencer } from "@/lib/influencersStore";

const ESTADOS: EstadoInfluencer[] = ["contactado", "respondeu", "activo", "inactivo"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { estado } = (body ?? {}) as { estado?: string };
  if (!estado || !ESTADOS.includes(estado as EstadoInfluencer)) return NextResponse.json({ error: "estado inválido" }, { status: 400 });

  try {
    await definirEstadoInfluencer(id, estado as EstadoInfluencer);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
