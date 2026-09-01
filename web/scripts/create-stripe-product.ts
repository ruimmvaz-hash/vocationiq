// Corre uma vez para criar o produto "VocationIQ — Análise Personalizada"
// (€99, pagamento único) na conta Stripe indicada por STRIPE_SECRET_KEY.
// Imprime o Price ID a colar em STRIPE_PRICE_ID (web/.env.local e nas
// variáveis de ambiente do Vercel).
//
// Uso:
//   STRIPE_SECRET_KEY=sk_... npx tsx scripts/create-stripe-product.ts
//
// Não corre automaticamente em lado nenhum do site — é deliberadamente um
// script à parte, para nunca criar produtos Stripe sem uma acção explícita.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Falta STRIPE_SECRET_KEY no ambiente.");
  process.exit(1);
}

const stripe = new Stripe(key);

async function main() {
  const product = await stripe.products.create({
    name: "VocationIQ — Análise Personalizada",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 9900,
    currency: "eur",
  });

  console.log("Produto criado:", product.id);
  console.log("Price ID:", price.id);
  console.log("\nColar em web/.env.local e no Vercel:");
  console.log(`STRIPE_PRICE_ID=${price.id}`);
}

main().catch((err) => {
  console.error("Falha ao criar o produto:", err);
  process.exit(1);
});
