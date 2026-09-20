import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cliente mínimo para a Revolut Merchant API — equivalente a lib/stripe.ts,
// mas sem SDK oficial Node/TypeScript (a Revolut só publica SDKs para
// Web/iOS/Android, ver developer.revolut.com/docs/guides/merchant/get-started)
// — por isso aqui é um wrapper directo sobre fetch(), não um SDK gerado.
//
// FONTES (pesquisadas em 2026-09-20, avaliação Revolut vs Stripe pedida
// pelo Rui): developer.revolut.com/docs/api/merchant/operations/create-order,
// developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature,
// developer.revolut.com/docs/guides/merchant/accept-payments/online-payments/hosted-checkout-page/api.
//
// POR CONFIRMAR PELO RUI antes de ligar isto a tráfego real (nunca visto
// directamente na documentação disponível nesta pesquisa, só inferido do
// padrão sandbox-business.revolut.com / business.revolut.com já
// confirmado para o dashboard): o URL base exacto do sandbox da API, e a
// forma exacta do campo `metadata` no payload do webhook ORDER_COMPLETED
// (assumido espelhado do pedido — confirmar com um evento de teste real).
// Produção está confirmada: https://merchant.revolut.com/api.

const REVOLUT_API_VERSION = "2026-08-17"; // a Revolut versiona a API por data (ver changelog em developer.revolut.com) — rever antes de subir de versão

function getBaseUrl(): string {
  const ambiente = process.env.REVOLUT_ENV; // "sandbox" | "production"
  if (ambiente === "production") return "https://merchant.revolut.com/api";
  // "sandbox" é o default deliberado — nunca aponta para produção sem a variável explícita.
  return "https://sandbox-merchant.revolut.com/api";
}

function getApiKey(): string {
  const key = process.env.REVOLUT_API_KEY;
  if (!key) throw new Error("REVOLUT_API_KEY não configurada.");
  return key;
}

export interface OrderRevolut {
  id: string;
  checkoutUrl: string;
}

/**
 * Cria uma "order" na Revolut Merchant API e devolve o URL da Hosted
 * Checkout Page para redireccionar o cliente — equivalente directo de
 * `stripe.checkout.sessions.create` + `session.url` em lib/stripe.ts e
 * app/api/checkout/route.ts.
 *
 * `metadata` espelha o padrão já usado do lado da Stripe
 * (`metadata.vocationiq_intake_id`/`vocationiq_revisao_id`) — usa-se
 * para o webhook de confirmação reconciliar o pagamento com o pedido
 * correcto.
 */
export async function criarOrderRevolut(params: {
  amountCents: number;
  currency: string; // ISO 4217 — normalizado para maiúsculas abaixo, como a Revolut espera
  description: string;
  redirectUrlSucesso: string;
  metadata: Record<string, string>;
  customerEmail?: string;
}): Promise<OrderRevolut> {
  const resposta = await fetch(`${getBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "Revolut-Api-Version": REVOLUT_API_VERSION,
    },
    body: JSON.stringify({
      amount: params.amountCents,
      currency: params.currency.toUpperCase(),
      description: params.description,
      redirect_url: params.redirectUrlSucesso,
      metadata: params.metadata,
      customer: params.customerEmail ? { email: params.customerEmail } : undefined,
      capture_mode: "automatic",
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`Revolut: falha ao criar order (${resposta.status}): ${corpo}`);
  }

  const dados = (await resposta.json()) as { id: string; checkout_url?: string };
  if (!dados.checkout_url) throw new Error("Revolut não devolveu checkout_url na resposta da order.");
  return { id: dados.id, checkoutUrl: dados.checkout_url };
}

/**
 * Verifica a assinatura de um webhook da Revolut — equivalente a
 * `stripe.webhooks.constructEvent` em app/api/stripe/webhook/route.ts,
 * mas replicado manualmente (sem SDK Node oficial): HMAC-SHA256 sobre
 * "v1.{timestamp}.{corpo em bruto}", comparado ao header
 * Revolut-Signature (formato "v1=<hex>"). O corpo tem de ser lido em
 * bruto (request.text()), nunca request.json() — mesma regra já
 * aplicada ao webhook da Stripe.
 */
export function verificarAssinaturaWebhookRevolut(corpoBruto: string, timestampHeader: string | null, assinaturaHeader: string | null): boolean {
  const signingSecret = process.env.REVOLUT_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret || !timestampHeader || !assinaturaHeader) return false;

  // Tolerância de 5 minutos recomendada pela documentação da Revolut —
  // protege contra reenvio de um payload capturado (replay attack).
  const timestampMs = Number(timestampHeader);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;

  const payloadAssinado = `v1.${timestampHeader}.${corpoBruto}`;
  const assinaturaCalculada = `v1=${createHmac("sha256", signingSecret).update(payloadAssinado).digest("hex")}`;

  // Comparação em tempo constante — nunca comparar strings de segredo com "===".
  const bufA = Buffer.from(assinaturaCalculada);
  const bufB = Buffer.from(assinaturaHeader);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const REVOLUT_MOEDA = "EUR";
