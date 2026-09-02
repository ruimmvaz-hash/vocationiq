import { NextResponse } from "next/server";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { criarAvaliacao } from "@/lib/testemunhosStore";
import { validarAvaliacao } from "@/lib/avaliacaoValidation";

export async function POST(request: Request) {
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const validacao = validarAvaliacao(body);
  if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

  const intake = await obterIntake(validacao.dados.intakeId);
  if (!intake || intake.report_status !== "delivered") {
    return NextResponse.json({ error: "Pedido não encontrado ou ainda não entregue." }, { status: 400 });
  }

  try {
    const testemunho = await criarAvaliacao(validacao.dados);
    return NextResponse.json({ ok: true, testemunho });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
