-- VocationIQ — correcção: amount_cents (e referral_code) reportadas em
-- falta em vocationiq_intakes.
--
-- As duas colunas já tinham sido desenhadas na migração 0002 (primeiro
-- bloco, antes de criar as tabelas viq_*) — mesma explicação da 0009: o
-- mais provável é que a 0002 nunca tenha corrido, não que estas colunas
-- precisem de ser reinventadas. referral_code é escrita por
-- lib/store.ts (criarIntake) sempre que há um código de comercial —
-- sem ela, qualquer compra com link de comercial falha a gravar o pedido.
--
-- DEFAULT 9900 (pedido explicitamente): serve de rede de segurança para
-- qualquer leitura futura que não use o fallback "?? 9900" já existente
-- no código (lib/adminMetrics.ts, lib/store.ts formatarValor). Não
-- interfere com o valor real: marcarIntakePago (lib/store.ts) escreve
-- sempre o amount_cents a partir do valor efectivamente cobrado pelo
-- Stripe quando o pedido é marcado como pago.
--
-- O backfill só actualiza pedidos já PAGOS — um pedido pendente ou
-- falhado não tem um valor "pago" real a registar; o dashboard já ignora
-- amount_cents de pedidos não pagos (filtra sempre por payment_status =
-- 'paid' antes de ler esta coluna).

ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS amount_cents integer DEFAULT 9900,
  ADD COLUMN IF NOT EXISTS referral_code text;

UPDATE public.vocationiq_intakes
  SET amount_cents = 9900
  WHERE amount_cents IS NULL AND payment_status = 'paid';
