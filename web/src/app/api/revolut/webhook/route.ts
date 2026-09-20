import { NextResponse } from "next/server";
import { verificarAssinaturaWebhookRevolut } from "@/lib/revolut";
import { processarPagamentoConcluido } from "@/lib/pagamentoConcluido";

interface EventoRevolut {
  event?: string;
  order?: {
    id?: string;
    amount?: number;
    customer?: { email?: string };
    metadata?: Record<string, string>;
  };
}

// A assinatura tem de ser verificada sobre o corpo em bruto — mesma
// regra já aplicada ao webhook da Stripe (route.ts irmão). Ver
// lib/revolut.ts para as fontes da verificação de assinatura.
//
// POR CONFIRMAR PELO RUI no sandbox antes de tráfego real: a forma
// exacta do payload do evento ORDER_COMPLETED — assumida aqui com base
// na documentação pesquisada (order.metadata espelha o que foi enviado
// em criarOrderRevolut), nunca vista directamente num evento real.
// Ajustar os nomes de campo abaixo se o payload de teste vier diferente.
export async function POST(request: Request) {
  if (!process.env.REVOLUT_WEBHOOK_SIGNING_SECRET) {
    console.error("[webhook-revolut] REVOLUT_WEBHOOK_SIGNING_SECRET não configurada.");
    return NextResponse.json({ error: "webhook não configurado" }, { status: 500 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("revolut-request-timestamp");
  const signature = request.headers.get("revolut-signature");

  if (!verificarAssinaturaWebhookRevolut(rawBody, timestamp, signature)) {
    console.error("[webhook-revolut] assinatura inválida ou em falta.");
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  let evento: EventoRevolut;
  try {
    evento = JSON.parse(rawBody) as EventoRevolut;
  } catch (err) {
    console.error("[webhook-revolut] corpo do webhook não é JSON válido:", err);
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  if (evento.event === "ORDER_COMPLETED") {
    const intakeId = evento.order?.metadata?.vocationiq_intake_id;
    const revisaoId = evento.order?.metadata?.vocationiq_revisao_id;
    const email = evento.order?.customer?.email;
    const amountCents = evento.order?.amount ?? 0;
    const orderId = evento.order?.id;

    if ((revisaoId || intakeId) && email && orderId) {
      try {
        await processarPagamentoConcluido({
          intakeId,
          revisaoId,
          email,
          amountCents,
          providerSessionId: orderId,
        });
      } catch (err) {
        console.error("[webhook-revolut] falha ao processar ORDER_COMPLETED:", err);
        return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
      }
    } else {
      console.error("[webhook-revolut] ORDER_COMPLETED sem intakeId/revisaoId, email ou id de order:", rawBody);
    }
  }

  return NextResponse.json({ received: true });
}
