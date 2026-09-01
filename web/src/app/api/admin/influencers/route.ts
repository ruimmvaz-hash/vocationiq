import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { criarInfluencer } from "@/lib/influencersStore";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { nome, redeSocial, seguidores, notas } = (body ?? {}) as { nome?: string; redeSocial?: string; seguidores?: number; notas?: string };
  if (!nome?.trim()) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  try {
    const influencer = await criarInfluencer({ nome, redeSocial, seguidores, notas });
    return NextResponse.json({ ok: true, influencer });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
