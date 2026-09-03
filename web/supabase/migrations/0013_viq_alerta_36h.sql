-- VocationIQ — alerta interno de "relatório pendente há mais de 36h",
-- verificado pelo cron diário já existente (api/cron/revisao-emails).
-- Idempotente por pedido: uma vez enviado, não volta a enviar para o
-- mesmo pedido mesmo que continue pendente nos dias seguintes.

ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS alerta_36h_enviado boolean NOT NULL DEFAULT false;
