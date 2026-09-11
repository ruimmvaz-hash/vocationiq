import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { marcarIntakePago, obterIntake, obterIntakePorCodigoReferralCliente, marcarReferralCreditado } from "@/lib/store";
import { marcarRevisaoPaga } from "@/lib/revisaoStore";
import { sendConfirmationEmail, sendNewOrderAdminEmail, sendReferralAgradecimentoEmail } from "@/lib/email";
import { validarCodigoComercial, registarComissao } from "@/lib/comercialStore";
import { criarCupao, gerarCodigoCupao } from "@/lib/cupoesStore";
import { registarEventoServidor } from "@/lib/eventLogServer";
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
    const revisaoId = session.metadata?.vocationiq_revisao_id;
    const email = session.customer_details?.email;
    const amountCents = session.amount_total ?? 0;

    if (revisaoId && email) {
      try {
        await marcarRevisaoPaga(revisaoId, { email, stripeSessionId: session.id, amountCents });
      } catch (err) {
        console.error("[webhook] falha ao processar checkout.session.completed (revisão):", err);
        return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
      }
    } else if (intakeId && email) {
      try {
        const intakeAntesDoPagamento = await obterIntake(intakeId);

        await marcarIntakePago(intakeId, { email, stripeSessionId: session.id, amountCents });
        const nome = session.customer_details?.name || "";
        await sendConfirmationEmail({ to: email, nome: nome.split(" ")[0] || nome || "" });
        await registarEventoServidor("payment_completed", { intakeId, amountCents });

        // Notificação interna para o fundador — melhor esforço, nunca deve
        // bloquear/repetir um pagamento já processado com sucesso.
        try {
          await sendNewOrderAdminEmail({
            nome: intakeAntesDoPagamento?.nome || nome || "",
            situacao: intakeAntesDoPagamento?.situacao ?? "",
            email,
            amountCents,
            intakeId,
          });
        } catch (err) {
          console.error("[webhook] falha ao enviar notificação de novo pedido ao admin:", err);
        }

        // Comissão de comercial, se o pedido tiver sido feito através do link dele.
        const referralCode = intakeAntesDoPagamento?.referral_code;
        if (referralCode) {
          const comercial = await validarCodigoComercial(referralCode);
          if (comercial) {
            await registarComissao({ comercial, intakeId, orderValueEur: amountCents / 100 });
          } else {
            // RETENÇÃO, TAREFA 4B — não é um código de comercial; pode ser
            // o código pessoal de OUTRO cliente (referência entre
            // clientes, `cliente_codigo_referral`). Correcção do
            // especialista sobre o pedido literal ("no evento
            // payment_intent.succeeded"): este webhook só ouve
            // `checkout.session.completed` (já em uso, acima) — reaproveitado
            // aqui em vez de adicionar um segundo listener para o mesmo
            // pagamento. Nunca bloqueia a confirmação do pagamento já
            // cobrado se isto falhar (mesmo padrão do email interno ao
            // fundador, acima).
            try {
              if (!intakeAntesDoPagamento?.referral_creditado) {
                const referidor = await obterIntakePorCodigoReferralCliente(referralCode);
                if (referidor && referidor.id !== intakeId && referidor.email) {
                  const codigoCupao = gerarCodigoCupao("REF", referidor.id, new Date().getUTCFullYear());
                  const cupaoReferidor = await criarCupao({
                    codigo: codigoCupao,
                    descontoPercentagem: 15,
                    intakeId: referidor.id,
                    motivo: "Referência de cliente",
                    validoDias: 60,
                    transferivel: true,
                  });
                  await sendReferralAgradecimentoEmail({ to: referidor.email, nome: referidor.nome, codigoCupao: cupaoReferidor.codigo });
                  await marcarReferralCreditado(intakeId);
                } else {
                  console.warn(`[webhook] código "${referralCode}" não corresponde a comercial activo nem a código de cliente — sem crédito.`);
                }
              }
            } catch (err) {
              console.error("[webhook] falha ao processar referência entre clientes:", err);
            }
          }
        }
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
