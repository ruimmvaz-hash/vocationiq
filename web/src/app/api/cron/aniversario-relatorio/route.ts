import { NextResponse } from "next/server";
import { listarElegiveisAniversarioRelatorio, marcarAniversarioRelatorioEmailEnviado } from "@/lib/store";
import { criarCupao, gerarCodigoCupao } from "@/lib/cupoesStore";
import { sendAniversarioRelatorioEmail } from "@/lib/email";

// RETENÇÃO FASE 2, TAREFA 1A — cron mensal (dia 1, 09:00, ver
// vercel.json) do email de aniversário de 1 ano da entrega do
// relatório, com cupão de 15% (FALTA 1 — mesmo mecanismo viq_cupoes/
// Stripe da FASE 1 TAREFA 1, único por pessoa).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  const erros: string[] = [];
  const anoActual = new Date().getUTCFullYear();

  try {
    const elegiveis = await listarElegiveisAniversarioRelatorio();
    for (const { relatorioId, intake } of elegiveis) {
      if (!intake.email) continue;
      try {
        const codigo = gerarCodigoCupao("RELAT", intake.id, anoActual);
        const cupao = await criarCupao({
          codigo,
          descontoPercentagem: 15,
          intakeId: intake.id,
          motivo: `Aniversário do relatório ${anoActual}`,
          validoDias: 30,
          transferivel: true,
        });
        const resultado = await sendAniversarioRelatorioEmail({ to: intake.email, nome: intake.nome, codigoCupao: cupao.codigo });
        if (resultado.ok) {
          await marcarAniversarioRelatorioEmailEnviado(relatorioId);
          enviados++;
        } else {
          erros.push(`${relatorioId}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`${relatorioId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviados, erros });
}
