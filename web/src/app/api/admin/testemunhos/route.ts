import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { criarTestemunho, SITUACAO_TESTEMUNHO, type SituacaoTestemunho } from "@/lib/testemunhosStore";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { nome, situacao, texto, nota, aprovado } = (body ?? {}) as { nome?: string; situacao?: string; texto?: string; nota?: number; aprovado?: boolean };

  if (!texto?.trim()) return NextResponse.json({ error: "o texto do testemunho é obrigatório" }, { status: 400 });
  if (!SITUACAO_TESTEMUNHO.some((s) => s.valor === situacao)) return NextResponse.json({ error: "situação inválida" }, { status: 400 });
  if (nota !== undefined && (!Number.isInteger(nota) || nota < 1 || nota > 5)) return NextResponse.json({ error: "nota inválida" }, { status: 400 });

  try {
    const testemunho = await criarTestemunho({
      nome: nome ?? "",
      situacao: situacao as SituacaoTestemunho,
      texto,
      nota,
      aprovado: !!aprovado,
    });
    return NextResponse.json({ ok: true, testemunho });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
