import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe, PRECO_CENTIMOS, MOEDA } from "@/lib/stripe";
import { criarOrderRevolut, REVOLUT_MOEDA } from "@/lib/revolut";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { criarIntake } from "@/lib/store";
import { validarIntake } from "@/lib/validation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// AVALIAÇÃO REVOLUT VS STRIPE (pedido do Rui, Set 2026) — qual
// processador cria a sessão de checkout é decidido aqui, num único
// sítio, por uma variável de ambiente: PAYMENT_PROVIDER="revolut" liga
// a Revolut, qualquer outro valor (incluindo a variável em falta)
// mantém a Stripe — nunca o contrário, para nunca migrar tráfego real
// sem essa variável ser posta explicitamente em produção. O frontend
// (IntakeForm.tsx) nunca muda — chama sempre este mesmo endpoint, a
// escolha de provider é só do backend.
//
// POR FAZER antes de PAYMENT_PROVIDER=revolut em produção: conta
// Revolut Business criada, chaves de API (sandbox e produção) e
// webhook configurado no dashboard da Revolut a apontar para
// /api/revolut/webhook — ver .env.local.example e
// app/api/revolut/webhook/route.ts.
async function criarUrlCheckout(intakeId: string): Promise<string> {
  if (process.env.PAYMENT_PROVIDER === "revolut") {
    const order = await criarOrderRevolut({
      amountCents: PRECO_CENTIMOS,
      currency: REVOLUT_MOEDA,
      description: "VocationIQ — Análise Personalizada",
      redirectUrlSucesso: `${SITE_URL}/obrigado?session_id=${encodeURIComponent(intakeId)}`,
      metadata: { vocationiq_intake_id: intakeId },
    });
    return order.checkoutUrl;
  }

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
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe não devolveu um URL de checkout.");
  return session.url;
}

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
  // O código escrito à mão no Passo 3 tem prioridade sobre o cookie
  // capturado automaticamente de um link ?ref= (ReferralCapture) — é o
  // sinal mais explícito e recente do cliente, útil sobretudo quando não
  // veio de um link de comercial ou o cookie de 30 dias já expirou.
  const referralCode = validacao.dados.referralCodeManual || jar.get("viq_ref")?.value;

  let intakeId: string;
  try {
    intakeId = await criarIntake(validacao.dados, referralCode);
  } catch (err) {
    console.error("[checkout] falha ao guardar o pedido:", err);
    return NextResponse.json({ error: "Não foi possível registar o teu pedido." }, { status: 500 });
  }

  try {
    const url = await criarUrlCheckout(intakeId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[checkout] falha ao criar sessão de pagamento:", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
