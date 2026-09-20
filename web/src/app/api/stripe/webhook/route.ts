import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { processarPagamentoConcluido } from "@/lib/pagamentoConcluido";
import type Stripe from "stripe";

// A assinatura tem de ser verificada sobre o corpo em bruto — por isso
// lê-se request.text(), nunca request.json().
//
// REFACTOR (avaliação Revolut vs Stripe, pedido do Rui) — a lógica de
// negócio (marcar como pago, email de confirmação, comissão de
// comercial, cupão de referência entre clientes) foi extraída para
// lib/pagamentoConcluido.ts, para o webhook da Revolut
// (app/api/revolut/webhook/route.ts) chamar exactamente a mesma lógica
// em vez de duplicá-la. Este ficheiro fica só com o que É específico da
// Stripe: verificar a assinatura e extrair os campos do evento.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook-stripe] STRIPE_WEBHOOK_SECRET não configurada.");
    return NextResponse.json({ error: "webhook não configurado" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "assinatura em falta" }, { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook-stripe] assinatura inválida:", err);
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const intakeId = session.metadata?.vocationiq_intake_id;
    const revisaoId = session.metadata?.vocationiq_revisao_id;
    const email = session.customer_details?.email;
    const amountCents = session.amount_total ?? 0;

    if ((revisaoId || intakeId) && email) {
      try {
        await processarPagamentoConcluido({
          intakeId,
          revisaoId,
          email,
          nomeCliente: session.customer_details?.name || "",
          amountCents,
          providerSessionId: session.id,
        });
      } catch (err) {
        console.error("[webhook-stripe] falha ao processar checkout.session.completed:", err);
        // Devolve 500 para o Stripe repetir o evento — nunca falha silenciosamente um pagamento já cobrado.
        return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
      }
    } else {
      console.error("[webhook-stripe] checkout.session.completed sem intakeId/revisaoId ou email:", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
