-- VocationIQ — correcção: viq_comerciais reportada em falta no Supabase.
--
-- Mesma causa das migrações 0009/0010: todas as tabelas abaixo já tinham
-- sido desenhadas na migração 0002 (viq_comercial_analytics.sql) — o
-- schema vem de ler lib/comercialStore.ts, lib/leadsStore.ts e
-- lib/storage.ts directamente, coluna a coluna, não foi reinventado.
--
-- Este ficheiro junta TRÊS tabelas relacionadas com /admin/comerciais e
-- /comercial, mais duas que ficam órfãs sem elas se a 0002 nunca correu:
--   · viq_comerciais            — a tabela em falta reportada.
--   · viq_comercial_referrals   — pedida como "viq_comissoes"; o nome
--     real no código é este (uma linha por venda atribuída a um
--     comercial — é a tabela de comissões). Ver comercialStore.ts,
--     registarComissao().
--   · viq_leads                 — pedida também aqui; já tinha migração
--     própria (0005), repetida de forma idempotente por segurança.
--   · viq_relatorios + bucket "viq-relatorios" — NÃO foram pedidas, mas
--     são a terceira tabela criada pela 0002 e ficam em falta pela mesma
--     razão; sem elas, "marcar como entregue" com PDF (lib/storage.ts)
--     falha da mesma forma que os outros três problemas. Incluídas aqui
--     para não deixar o mesmo bug por resolver noutro sítio.
--
-- Tudo com IF NOT EXISTS — seguro correr mesmo que a 0002 (ou a 0005)
-- já tenham corrido; nesse caso não faz nada.

-- 1. Comerciais
CREATE TABLE IF NOT EXISTS public.viq_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('invited', 'pending', 'active', 'suspended')),
  commission_rate numeric NOT NULL DEFAULT 0.20,
  commission_rate_manual boolean NOT NULL DEFAULT false,
  total_sales integer NOT NULL DEFAULT 0,
  total_revenue_generated numeric NOT NULL DEFAULT 0,
  total_commission_owed numeric NOT NULL DEFAULT 0,
  total_commission_paid numeric NOT NULL DEFAULT 0,
  tax_id text,
  tax_country text,
  payout_requested_at timestamptz
);

ALTER TABLE public.viq_comerciais ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_comerciais_code_idx ON public.viq_comerciais (code);

-- 2. Comissões — uma linha por venda atribuída a um comercial.
CREATE TABLE IF NOT EXISTS public.viq_comercial_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  comercial_id uuid REFERENCES public.viq_comerciais(id),
  intake_id uuid REFERENCES public.vocationiq_intakes(id),
  referral_code text NOT NULL,
  order_value numeric NOT NULL,
  commission_amount numeric NOT NULL,
  commission_paid boolean NOT NULL DEFAULT false,
  commission_paid_at timestamptz
);

ALTER TABLE public.viq_comercial_referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_comercial_referrals_comercial_idx ON public.viq_comercial_referrals (comercial_id);

-- 3. Leads da homepage (idempotente — já tinha migração própria, 0005).
CREATE TABLE IF NOT EXISTS public.viq_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  fonte text NOT NULL DEFAULT 'lead_magnet'
);

ALTER TABLE public.viq_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_leads_email_idx ON public.viq_leads (email);

-- 4. Relatórios entregues — fora do pedido, incluída por ser a terceira
-- tabela da mesma migração 0002, com o mesmo risco de estar em falta.
CREATE TABLE IF NOT EXISTS public.viq_relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intake_id uuid NOT NULL REFERENCES public.vocationiq_intakes(id),
  pdf_path text NOT NULL,
  pdf_filename text NOT NULL,
  enviado_em timestamptz
);

ALTER TABLE public.viq_relatorios ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_relatorios_intake_idx ON public.viq_relatorios (intake_id);

-- 5. Bucket de storage para os PDFs — privado, só acedido via service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('viq-relatorios', 'viq-relatorios', false)
ON CONFLICT (id) DO NOTHING;
