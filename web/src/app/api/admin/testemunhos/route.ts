import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { criarTestemunho } from "@/lib/testemunhosStore";
import { SITUACOES } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { nome, situacao, texto, aprovado } = (body ?? {}) as { nome?: string; situacao?: string; texto?: string; aprovado?: boolean };

  if (!texto?.trim()) return NextResponse.json({ error: "o texto do testemunho é obrigatório" }, { status: 400 });
  if (!SITUACOES.some((s) => s.valor === situacao)) return NextResponse.json({ error: "situação inválida" }, { status: 400 });

  try {
    const testemunho = await criarTestemunho({
      nome: nome ?? "",
      situacao: situacao as (typeof SITUACOES)[number]["valor"],
      texto,
      aprovado: !!aprovado,
    });
    return NextResponse.json({ ok: true, testemunho });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
