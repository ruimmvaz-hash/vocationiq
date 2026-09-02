// Corre uma vez para criar o produto "VocationIQ Revisão" (€49, pagamento
// único) na conta Stripe indicada por STRIPE_SECRET_KEY. Imprime o Price
// ID a colar em STRIPE_REVISAO_PRICE_ID (web/.env.local e Vercel).
//
// Uso:
//   STRIPE_SECRET_KEY=sk_... npx tsx scripts/create-stripe-revisao-product.ts

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Falta STRIPE_SECRET_KEY no ambiente.");
  process.exit(1);
}

const stripe = new Stripe(key);

async function main() {
  const product = await stripe.products.create({
    name: "VocationIQ Revisão",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900,
    currency: "eur",
  });

  console.log("Produto criado:", product.id);
  console.log("Price ID:", price.id);
  console.log("\nColar em web/.env.local e no Vercel:");
  console.log(`STRIPE_REVISAO_PRICE_ID=${price.id}`);
}

main().catch((err) => {
  console.error("Falha ao criar o produto:", err);
  process.exit(1);
});
