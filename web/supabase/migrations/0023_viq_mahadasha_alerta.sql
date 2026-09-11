-- VocationIQ — acções de retenção, TAREFA 2 (alerta de mudança de
-- Mahadasha). Duas colunas, não uma: `mahadasha_alerta_enviado_em`
-- (quando) + `mahadasha_alerta_para_data` (a data de fim da Mahadasha a
-- que esse alerta se referia). Um ciclo de Mahadasha dura anos — sem a
-- 2ª coluna, "já enviámos algum dia" bloquearia para sempre qualquer
-- alerta futuro da PRÓXIMA transição, décadas depois. O cron só evita
-- reenviar quando a data de fim calculada agora é a MESMA já alertada.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS mahadasha_alerta_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS mahadasha_alerta_para_data date;
