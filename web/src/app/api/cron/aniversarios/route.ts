import { NextResponse } from "next/server";
import { listarAniversariantesHoje, marcarAniversarioEmailEnviado } from "@/lib/store";
import { criarCupao, gerarCodigoCupao } from "@/lib/cupoesStore";
import { sendAniversarioEmail } from "@/lib/email";

// RETENÇÃO, TAREFA 1A — cron diário (09:00, ver vercel.json) do email de
// aniversário do cliente, com cupão de 20% (TAREFA 1B/1D). Mesmo padrão
// estrutural de api/cron/revisao-emails/route.ts: auth por CRON_SECRET,
// erro de um item nunca aborta os restantes.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  const erros: string[] = [];
  const anoActual = new Date().getUTCFullYear();

  try {
    const aniversariantes = await listarAniversariantesHoje();
    for (const intake of aniversariantes) {
      if (!intake.email) continue;
      try {
        const codigo = gerarCodigoCupao("ANIV", intake.id, anoActual);
        const cupao = await criarCupao({
          codigo,
          descontoPercentagem: 20,
          intakeId: intake.id,
          motivo: `Aniversário ${anoActual}`,
          validoDias: 30,
          transferivel: true,
        });
        const resultado = await sendAniversarioEmail({
          to: intake.email,
          nome: intake.nome,
          codigoCupao: cupao.codigo,
          dataExpiracao: cupao.expira_em ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (resultado.ok) {
          await marcarAniversarioEmailEnviado(intake.id, anoActual);
          enviados++;
        } else {
          erros.push(`${intake.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`${intake.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviados, erros });
}
