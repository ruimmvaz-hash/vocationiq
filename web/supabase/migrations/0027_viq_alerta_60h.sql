-- VocationIQ — CORRECÇÃO 1 (prazo de entrega 48h → 72h): alerta interno
-- de "pedido em risco" aos 60h, para dar ao fundador uma janela de
-- ~12h antes do novo prazo-limite de 72h. `alerta_60h_enviado` não
-- existia (confirmado por grep antes desta migração) — é novo, ao lado
-- de `alerta_36h_enviado` (migração 0013), que continua como está.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS alerta_60h_enviado boolean NOT NULL DEFAULT false;
