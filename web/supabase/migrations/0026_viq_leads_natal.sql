-- VocationIQ — acções de retenção FASE 2, TAREFA 4 (Natal/Ano Novo para
-- leads consentidos, não só clientes). Leads não têm intake nem
-- relatório — o ano de envio fica directamente em viq_leads.
ALTER TABLE public.viq_leads
  ADD COLUMN IF NOT EXISTS natal_cupao_enviado_ano integer,
  ADD COLUMN IF NOT EXISTS natal_feliz_enviado_ano integer,
  ADD COLUMN IF NOT EXISTS ano_novo_enviado_ano integer;
