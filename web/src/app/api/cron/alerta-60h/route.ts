import { NextResponse } from "next/server";
import { listarPendentesAlerta60h, marcarAlerta60hEnviado } from "@/lib/store";
import { sendPending60hAlertEmail } from "@/lib/email";

// CORRECÇÃO 1 (prazo de entrega 48h → 72h) — alerta interno de "pedido
// em risco" aos 60h. Corre 1x por dia (ver vercel.json) — o pedido
// original previa 4 em 4 horas, mas isso faz o deploy falhar no plano
// Hobby da Vercel (só permite crons diários); decisão do fundador foi
// manter Hobby e passar este cron a diário (ver a janela sem limite
// superior em listarPendentesAlerta60h, store.ts). Distinto e adicional
// ao alerta de 36h já existente (cron diário revisao-emails), que
// continua sem alterações.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  const erros: string[] = [];

  try {
    const pendentes = await listarPendentesAlerta60h();
    for (const intake of pendentes) {
      if (!intake.email || !intake.paid_at) continue;
      try {
        const resultado = await sendPending60hAlertEmail({ nome: intake.nome, email: intake.email, paidAt: intake.paid_at, intakeId: intake.id });
        if (resultado.ok) {
          await marcarAlerta60hEnviado(intake.id);
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
