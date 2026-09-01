-- VocationIQ — sistema de comerciais, tracking de conversão e entrega de
-- relatórios. Corre no MESMO projecto Supabase da Naveya. Todas as tabelas
-- novas usam o prefixo "viq_" para nunca colidir com as tabelas da Naveya
-- (que não têm esse prefixo) nem com "vocationiq_intakes" (migração 0001).
--
-- Mecânica do sistema de comerciais replicada da Naveya (sales_reps /
-- sales_rep_referrals), adaptada: sem Stripe Connect (só bookkeeping —
-- o fundador paga manualmente e marca "pago"), preço fixo €99.

-- 1. Colunas novas em vocationiq_intakes — valor realmente pago (em vez de
-- assumir sempre €99) e o código de comercial usado neste pedido, se algum.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- 2. Comerciais
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

-- 3. Comissões — uma linha por venda atribuída a um comercial.
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

-- 4. Eventos de funil (homepage_view, cta_click, intake_started,
-- intake_completed, payment_completed, report_delivered).
CREATE TABLE IF NOT EXISTS public.viq_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  metadata jsonb
);

ALTER TABLE public.viq_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_events_type_idx ON public.viq_events (event_type, created_at DESC);

-- 5. Relatórios entregues — ficheiro anexado pelo fundador + histórico de
-- envio por email.
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

-- 6. Bucket de storage para os PDFs — privado, só acedido via service role
-- (o mesmo cliente admin que já usa toda a app; nunca do browser).
INSERT INTO storage.buckets (id, name, public)
VALUES ('viq-relatorios', 'viq-relatorios', false)
ON CONFLICT (id) DO NOTHING;
