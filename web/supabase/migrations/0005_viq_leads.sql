-- VocationIQ — leads captados na homepage (lead magnet "Ainda tens dúvidas?").
-- Prefixo "viq_", mesmo projecto Supabase partilhado da Naveya.

CREATE TABLE IF NOT EXISTS public.viq_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  fonte text NOT NULL DEFAULT 'lead_magnet'
);

ALTER TABLE public.viq_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_leads_email_idx ON public.viq_leads (email);
