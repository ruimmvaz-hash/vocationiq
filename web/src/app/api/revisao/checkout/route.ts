import { NextResponse } from "next/server";
import { getStripe, PRECO_REVISAO_CENTIMOS, MOEDA } from "@/lib/stripe";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { criarRevisao } from "@/lib/revisaoStore";
import { validarRevisao } from "@/lib/revisaoValidation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  if (!hasSupabaseAdmin) {
    console.error("[revisao checkout] Supabase não configurado.");
    return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const validacao = validarRevisao(body);
  if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

  const intakeOriginal = await obterIntake(validacao.dados.intakeIdOriginal);
  if (!intakeOriginal || intakeOriginal.report_status !== "delivered") {
    return NextResponse.json({ error: "Pedido original não encontrado ou ainda não entregue." }, { status: 400 });
  }

  let revisaoId: string;
  try {
    revisaoId = await criarRevisao(validacao.dados, intakeOriginal.nome);
  } catch (err) {
    console.error("[revisao checkout] falha ao guardar a revisão:", err);
    return NextResponse.json({ error: "Não foi possível registar o teu pedido." }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const priceId = process.env.STRIPE_REVISAO_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: MOEDA,
                unit_amount: PRECO_REVISAO_CENTIMOS,
                product_data: { name: "VocationIQ Revisão" },
              },
            },
      ],
      success_url: `${SITE_URL}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/revisao/intake?id=${validacao.dados.intakeIdOriginal}&cancelado=1`,
      metadata: { vocationiq_revisao_id: revisaoId },
    });

    if (!session.url) throw new Error("Stripe não devolveu um URL de checkout.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[revisao checkout] falha ao criar sessão Stripe:", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
