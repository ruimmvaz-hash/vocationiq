-- VocationIQ — consentimento RGPD explícito no lead magnet da homepage.
-- Sem isto não há base legal para guardar o email nem para o contactar
-- de volta (nem sequer para reenviar o próprio exemplo).

ALTER TABLE public.viq_leads
  ADD COLUMN IF NOT EXISTS consentimento_rgpd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimento_data timestamptz;
