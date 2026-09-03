-- VocationIQ — histórico de envios de relatório (entrega inicial +
-- reenvios). Uma linha por cada vez que um PDF é efectivamente enviado
-- por email, com o email de destino real (pode diferir de
-- vocationiq_intakes.email se o admin reenviar para outro endereço).

CREATE TABLE IF NOT EXISTS public.viq_relatorio_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.viq_relatorios(id) ON DELETE CASCADE,
  email text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('inicial', 'reenvio')),
  enviado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.viq_relatorio_envios ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_relatorio_envios_relatorio_idx ON public.viq_relatorio_envios (relatorio_id, enviado_em DESC);
