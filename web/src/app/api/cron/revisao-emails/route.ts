import { NextResponse } from "next/server";
import { listarElegiveisRevisao90, listarElegiveisRevisao180, marcarRevisaoEmailEnviado, listarPendentesAlerta36h, marcarAlerta36hEnviado } from "@/lib/store";
import { temRevisaoPaga } from "@/lib/revisaoStore";
import { sendRevisao90Email, sendRevisao180Email, sendPending36hAlertEmail } from "@/lib/email";

// Vercel Cron envia automaticamente "Authorization: Bearer $CRON_SECRET"
// quando essa env var está definida no projecto — basta comparar aqui.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados90 = 0;
  let enviados180 = 0;
  const erros: string[] = [];

  try {
    const elegiveis90 = await listarElegiveisRevisao90();
    for (const intake of elegiveis90) {
      if (!intake.email) continue;
      try {
        const resultado = await sendRevisao90Email({ to: intake.email, nome: intake.nome, intakeId: intake.id });
        if (resultado.ok) {
          await marcarRevisaoEmailEnviado(intake.id, "90");
          enviados90++;
        } else {
          erros.push(`90d ${intake.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`90d ${intake.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem 90d: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const elegiveis180 = await listarElegiveisRevisao180();
    for (const intake of elegiveis180) {
      if (!intake.email) continue;
      try {
        // Só envia o segundo email se ainda não comprou a revisão.
        if (await temRevisaoPaga(intake.id)) {
          await marcarRevisaoEmailEnviado(intake.id, "180");
          continue;
        }
        const resultado = await sendRevisao180Email({ to: intake.email, nome: intake.nome, intakeId: intake.id });
        if (resultado.ok) {
          await marcarRevisaoEmailEnviado(intake.id, "180");
          enviados180++;
        } else {
          erros.push(`180d ${intake.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`180d ${intake.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem 180d: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Bloco de alerta interno — pedidos pagos há +36h sem relatório entregue.
  // Corre no mesmo cron diário (pedido explícito) em vez de um cron próprio
  // — significa que a detecção pode chegar até ~24h depois de cruzar as
  // 36h reais, já que só é verificado uma vez por dia às 9h.
  let alertas36h = 0;
  try {
    const pendentes36h = await listarPendentesAlerta36h();
    for (const intake of pendentes36h) {
      if (!intake.email || !intake.paid_at) continue;
      try {
        const horasPendente = Math.floor((Date.now() - new Date(intake.paid_at).getTime()) / (60 * 60 * 1000));
        const resultado = await sendPending36hAlertEmail({ nome: intake.nome, email: intake.email, paidAt: intake.paid_at, horasPendente, intakeId: intake.id });
        if (resultado.ok) {
          await marcarAlerta36hEnviado(intake.id);
          alertas36h++;
        } else {
          erros.push(`36h ${intake.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`36h ${intake.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem 36h: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviados90, enviados180, alertas36h, erros });
}
