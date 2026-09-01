-- VocationIQ — pedidos de análise (intake). Corre no MESMO projecto
-- Supabase da Naveya (decisão do fundador) — prefixo "vocationiq_" para
-- não colidir com nenhuma tabela existente desse projecto.

CREATE TABLE IF NOT EXISTS public.vocationiq_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),

  nome text NOT NULL,
  data_nascimento date NOT NULL,
  hora_nascimento text,
  local_nascimento text NOT NULL,
  situacao text NOT NULL CHECK (
    situacao IN ('9-ou-menos', '10-11-12', 'universidade', 'trabalho-quero-mudar', 'outra')
  ),
  contexto text,

  email text,
  stripe_checkout_session_id text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  paid_at timestamptz,

  report_status text NOT NULL DEFAULT 'not_started' CHECK (report_status IN ('not_started', 'in_progress', 'delivered')),
  delivered_at timestamptz
);

ALTER TABLE public.vocationiq_intakes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vocationiq_intakes_payment_status_idx ON public.vocationiq_intakes (payment_status);
CREATE INDEX IF NOT EXISTS vocationiq_intakes_stripe_session_idx ON public.vocationiq_intakes (stripe_checkout_session_id);
