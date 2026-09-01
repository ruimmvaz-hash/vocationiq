import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe, PRECO_CENTIMOS, MOEDA } from "@/lib/stripe";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { criarIntake } from "@/lib/store";
import { validarIntake } from "@/lib/validation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  if (!hasSupabaseAdmin) {
    console.error("[checkout] Supabase não configurado — não é possível guardar o pedido antes do pagamento.");
    return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const validacao = validarIntake(body);
  if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

  const jar = await cookies();
  const referralCode = jar.get("viq_ref")?.value;

  let intakeId: string;
  try {
    intakeId = await criarIntake(validacao.dados, referralCode);
  } catch (err) {
    console.error("[checkout] falha ao guardar o pedido:", err);
    return NextResponse.json({ error: "Não foi possível registar o teu pedido." }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: MOEDA,
                unit_amount: PRECO_CENTIMOS,
                product_data: { name: "VocationIQ — Análise Personalizada" },
              },
            },
      ],
      success_url: `${SITE_URL}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/intake?cancelado=1`,
      metadata: { vocationiq_intake_id: intakeId },
    });

    if (!session.url) throw new Error("Stripe não devolveu um URL de checkout.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] falha ao criar sessão Stripe:", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
