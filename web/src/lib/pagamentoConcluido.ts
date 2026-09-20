import "server-only";
import { marcarIntakePago, obterIntake, obterIntakePorCodigoReferralCliente, marcarReferralCreditado } from "@/lib/store";
import { marcarRevisaoPaga } from "@/lib/revisaoStore";
import { sendConfirmationEmail, sendNewOrderAdminEmail, sendReferralAgradecimentoEmail } from "@/lib/email";
import { validarCodigoComercial, registarComissao } from "@/lib/comercialStore";
import { criarCupao, gerarCodigoCupao } from "@/lib/cupoesStore";
import { registarEventoServidor } from "@/lib/eventLogServer";

export interface PagamentoConcluidoParams {
  intakeId?: string;
  revisaoId?: string;
  email: string;
  nomeCliente?: string;
  amountCents: number;
  // Id de sessão/order do provider (Stripe checkout session id OU Revolut
  // order id) — guardado na mesma coluna `stripe_checkout_session_id`
  // (ver nota em app/api/checkout/route.ts: decisão deliberada de não
  // migrar o schema só para acomodar um segundo provider nesta fase de
  // avaliação; reconsiderar se a Revolut avançar para produção a sério).
  providerSessionId: string;
}

/**
 * Lógica de negócio partilhada para "pagamento concluído" — extraída do
 * webhook original da Stripe (app/api/stripe/webhook/route.ts, ver
 * histórico) para que o webhook da Revolut
 * (app/api/revolut/webhook/route.ts) chame exactamente a mesma lógica,
 * em vez de duplicar comissões de comercial e cupões de referência entre
 * clientes em dois sítios que inevitavelmente divergiam com o tempo.
 * Nunca decide QUEM pagou nem verifica assinaturas — só processa um
 * pagamento já confirmado pelo webhook chamador (contrato do chamador:
 * só invocar isto depois de validar a assinatura do provider).
 */
export async function processarPagamentoConcluido(params: PagamentoConcluidoParams): Promise<void> {
  const { intakeId, revisaoId, email, nomeCliente, amountCents, providerSessionId } = params;

  if (revisaoId) {
    await marcarRevisaoPaga(revisaoId, { email, stripeSessionId: providerSessionId, amountCents });
    return;
  }

  if (!intakeId) {
    console.error("[pagamento-concluido] chamada sem intakeId nem revisaoId — nada a processar.");
    return;
  }

  const intakeAntesDoPagamento = await obterIntake(intakeId);
  await marcarIntakePago(intakeId, { email, stripeSessionId: providerSessionId, amountCents });
  const primeiroNome = nomeCliente?.split(" ")[0] || nomeCliente || "";
  await sendConfirmationEmail({ to: email, nome: primeiroNome });
  await registarEventoServidor("payment_completed", { intakeId, amountCents });

  // Notificação interna para o fundador — melhor esforço, nunca deve
  // bloquear/repetir um pagamento já processado com sucesso (mesmo
  // comportamento do webhook original da Stripe).
  try {
    await sendNewOrderAdminEmail({
      nome: intakeAntesDoPagamento?.nome || nomeCliente || "",
      situacao: intakeAntesDoPagamento?.situacao ?? "",
      email,
      amountCents,
      intakeId,
    });
  } catch (err) {
    console.error("[pagamento-concluido] falha ao enviar notificação de novo pedido ao admin:", err);
  }

  // Comissão de comercial, se o pedido tiver sido feito através do link dele.
  const referralCode = intakeAntesDoPagamento?.referral_code;
  if (!referralCode) return;

  const comercial = await validarCodigoComercial(referralCode);
  if (comercial) {
    await registarComissao({ comercial, intakeId, orderValueEur: amountCents / 100 });
    return;
  }

  // Não é um código de comercial — pode ser o código pessoal de OUTRO
  // cliente (referência entre clientes, `cliente_codigo_referral`).
  // Nunca bloqueia a confirmação do pagamento já cobrado se isto falhar
  // (mesmo padrão do email interno ao fundador, acima).
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
        console.warn(`[pagamento-concluido] código "${referralCode}" não corresponde a comercial activo nem a código de cliente — sem crédito.`);
      }
    }
  } catch (err) {
    console.error("[pagamento-concluido] falha ao processar referência entre clientes:", err);
  }
}
