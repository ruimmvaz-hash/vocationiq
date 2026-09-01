import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { marcarIntakePago } from "@/lib/store";
import { sendConfirmationEmail } from "@/lib/email";
import type Stripe from "stripe";

// A assinatura tem de ser verificada sobre o corpo em bruto — por isso
// lê-se request.text(), nunca request.json().
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET não configurada.");
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
    console.error("[webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const intakeId = session.metadata?.vocationiq_intake_id;
    const email = session.customer_details?.email;

    if (intakeId && email) {
      try {
        await marcarIntakePago(intakeId, { email, stripeSessionId: session.id });
        const nome = session.customer_details?.name || "";
        await sendConfirmationEmail({ to: email, nome: nome.split(" ")[0] || nome || "" });
      } catch (err) {
        console.error("[webhook] falha ao processar checkout.session.completed:", err);
        // Devolve 500 para o Stripe repetir o evento — nunca falha silenciosamente um pagamento já cobrado.
        return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
      }
    } else {
      console.error("[webhook] checkout.session.completed sem intakeId ou email:", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
