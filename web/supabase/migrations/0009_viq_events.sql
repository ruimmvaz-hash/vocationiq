-- VocationIQ — correcção: viq_events reportada em falta no Supabase.
--
-- Esta tabela já tinha sido desenhada na migração 0002
-- (viq_comercial_analytics.sql), com o schema abaixo — e é esse schema,
-- não outro, que o código já usa em produção:
--   · lib/eventLogServer.ts → insert({ event_type, metadata })
--   · lib/adminMetrics.ts (obterFunilConversao) → select("event_type")
-- Se a app está a reportar esta tabela como inexistente, a explicação mais
-- provável é que a migração 0002 nunca chegou a correr no Supabase — não
-- que o schema pedido agora (tipo/intake_id/ref/criado_em) seja o
-- correcto. Manter esse schema (event_type text + metadata jsonb) é o que
-- evita rebentar tudo o que já lê desta tabela.
--
-- IF NOT EXISTS torna isto seguro correr mesmo que a 0002 já tenha
-- corrido — não faz nada nesse caso.

CREATE TABLE IF NOT EXISTS public.viq_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  metadata jsonb
);

ALTER TABLE public.viq_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_events_type_idx ON public.viq_events (event_type, created_at DESC);
