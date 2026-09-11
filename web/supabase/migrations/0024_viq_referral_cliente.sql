-- VocationIQ — acções de retenção, TAREFA 4 (notificação + crédito
-- quando um referido compra). O `referral_code` já existente em
-- vocationiq_intakes serve só para identificar QUEM referiu esta
-- pessoa (comercial OU, a partir de agora, outro cliente) — nunca o
-- código que ESTA pessoa pode partilhar. `cliente_codigo_referral` é
-- esse código próprio, gerado quando o pagamento é confirmado
-- (webhook), e reaproveita o MESMO mecanismo já existente de captura
-- (?ref=, cookie viq_ref, ReferralCapture.tsx) — nunca um sistema de
-- tracking novo.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS cliente_codigo_referral text,
  -- Idempotência do webhook — o Stripe pode reentregar o mesmo evento
  -- mais do que uma vez; sem isto, uma entrega repetida criava um
  -- segundo cupão e enviava um segundo email de agradecimento ao
  -- cliente que referiu.
  ADD COLUMN IF NOT EXISTS referral_creditado boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS vocationiq_intakes_cliente_codigo_referral_idx
  ON public.vocationiq_intakes (cliente_codigo_referral)
  WHERE cliente_codigo_referral IS NOT NULL;
