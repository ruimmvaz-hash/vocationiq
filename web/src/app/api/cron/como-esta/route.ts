import { NextResponse } from "next/server";
import { listarElegiveisComoEsta, marcarComoEstaEmailEnviado } from "@/lib/store";
import { sendComoEstaEmail } from "@/lib/email";

// RETENÇÃO FASE 2, TAREFA 2A — cron mensal (dia 1, 09:00, ver
// vercel.json) do email "como está a correr?", sem venda.
//
// DECISÃO do fundador: mantidos os dois emails da marca dos 6 meses,
// mas desfasados — o check-in de 180 dias (sendRevisao180Email, cron
// revisao-emails, com CTA de desconto) dispara primeiro, exactamente
// aos 180 dias; este, sem venda, dispara 2 semanas depois (~194 dias,
// ver listarElegiveisComoEsta em store.ts), para nunca chegarem no
// mesmo dia e servirem objectivos distintos.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  const erros: string[] = [];

  try {
    const elegiveis = await listarElegiveisComoEsta();
    for (const { relatorioId, intake } of elegiveis) {
      if (!intake.email) continue;
      try {
        const resultado = await sendComoEstaEmail({ to: intake.email, nome: intake.nome, intakeId: intake.id });
        if (resultado.ok) {
          await marcarComoEstaEmailEnviado(relatorioId);
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
