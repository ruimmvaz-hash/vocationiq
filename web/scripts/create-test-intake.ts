// Cria (ou reaproveita, se já existir) um pedido de teste marcado como
// pago+entregue em vocationiq_intakes, para testar o fluxo de avaliação
// (/avaliacao) de ponta a ponta com um id real — o guard dessa página e
// da rota /api/avaliacao exigem sempre um pedido real com
// report_status = 'delivered'; um id inventado (ex.: um UUID de zeros)
// é sempre rejeitado, por desenho (RLS + FK), e é isso que faz o link
// das estrelas no email de teste redireccionar para a homepage.
//
// Idempotente: reaproveita o pedido de teste já criado (identificado por
// email fixo "teste-avaliacao@vocationiq.app") em vez de acumular um novo
// a cada execução.
//
// Auto-contido — não importa lib/store.ts nem lib/supabaseAdmin.ts,
// porque têm "import server-only" e este script corre fora do bundler da
// Next.js (mesmo motivo de scripts/create-stripe-product.ts).
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-test-intake.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Falta SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const TEST_EMAIL = "teste-avaliacao@vocationiq.app";

async function main() {
  const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existente, error: buscaError } = await sb.from("vocationiq_intakes").select("id").eq("email", TEST_EMAIL).maybeSingle();
  if (buscaError) {
    console.error("Falha ao procurar pedido de teste existente:", buscaError.message);
    process.exit(1);
  }

  if (existente) {
    console.log("Pedido de teste já existia, reaproveitado:", existente.id);
    return;
  }

  const agora = new Date().toISOString();
  const { data, error } = await sb
    .from("vocationiq_intakes")
    .insert({
      nome: "Rui (TESTE — pode apagar)",
      data_nascimento: "1990-01-01",
      local_nascimento: "Lisboa, Portugal",
      situacao: "outra",
      descricao_situacao: "Pedido de teste criado automaticamente por scripts/create-test-intake.ts para testar o fluxo de avaliação.",
      email: TEST_EMAIL,
      payment_status: "paid",
      amount_cents: 9900,
      paid_at: agora,
      report_status: "delivered",
      delivered_at: agora,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao criar pedido de teste:", error.message);
    process.exit(1);
  }

  console.log("Pedido de teste criado:", data.id);
}

main().catch((err) => {
  console.error("Falha inesperada:", err);
  process.exit(1);
});
