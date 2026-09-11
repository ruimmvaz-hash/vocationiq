-- VocationIQ — acções de retenção, TAREFA 1 (email de aniversário) e
-- base comum para qualquer outro cupão gerado por código (TAREFA 4,
-- desconto ao cliente que referiu). Um único registo por cupão emitido,
-- nunca reutilizado — `usado_em`/`usado_por_email` ficam preenchidos
-- quando o cupão é gasto (marcado pelo webhook do Stripe, não aqui).

CREATE TABLE IF NOT EXISTS public.viq_cupoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  desconto_percentagem integer NOT NULL DEFAULT 20,
  intake_id uuid REFERENCES public.vocationiq_intakes(id),
  motivo text NOT NULL,
  criado_em timestamptz DEFAULT now(),
  expira_em timestamptz,
  usado_em timestamptz,
  usado_por_email text,
  transferivel boolean DEFAULT true,
  -- Correcção do especialista (FALTA 1 — validação no Stripe) — o
  -- cupão só funciona no checkout real quando existe também como
  -- Coupon+PromotionCode no Stripe (allow_promotion_codes já está
  -- activo na sessão, ver api/checkout/route.ts); guarda-se aqui o id
  -- do PromotionCode criado, para nunca duplicar a criação nem perder
  -- o rasto de qual objecto Stripe corresponde a qual linha.
  stripe_promotion_code_id text
);

ALTER TABLE public.viq_cupoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_cupoes_codigo_idx ON public.viq_cupoes (codigo);
CREATE INDEX IF NOT EXISTS viq_cupoes_intake_id_idx ON public.viq_cupoes (intake_id);

-- TAREFA 1 — controlo de duplicados do email de aniversário: o ano em
-- que já foi enviado (não um booleano) porque o aniversário se repete
-- todos os anos e o cron corre todos os dias — sem isto, o mesmo
-- cliente receberia o email de novo no dia seguinte.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS aniversario_email_enviado_ano integer;
