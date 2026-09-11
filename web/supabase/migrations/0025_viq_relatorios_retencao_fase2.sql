-- VocationIQ — acções de retenção FASE 2, colunas de controlo em
-- viq_relatorios (pedido explícito, tal como especificado). A
-- elegibilidade (pago? entregue? há quanto tempo?) continua sempre a ser
-- calculada a partir de vocationiq_intakes — confirmado por leitura da
-- migração 0011: viq_relatorios nunca teve payment_status nem
-- delivered_at, só intake_id, pdf_path/filename, enviado_em. Estas
-- colunas ficam aqui porque marcam "este RELATÓRIO específico já gerou
-- este envio", o que é exactamente a granularidade certa quando um
-- intake pode ter mais do que um relatório ao longo do tempo (regenerado
-- após "Aprovar e enviar" outra vez).
ALTER TABLE public.viq_relatorios
  -- TAREFA 1 — aniversário do relatório (1 ano após a entrega).
  ADD COLUMN IF NOT EXISTS aniversario_relatorio_email_enviado_em timestamptz,
  -- TAREFA 2 — "como está a correr?" (6 meses após a entrega, sem venda).
  ADD COLUMN IF NOT EXISTS como_esta_email_enviado_em timestamptz,
  -- TAREFA 3 — início de ano personalizado. O ANO (não um timestamp),
  -- porque corre uma vez por ano (2 de Janeiro) para todos os clientes.
  ADD COLUMN IF NOT EXISTS inicio_ano_email_enviado_ano integer,
  -- TAREFA 4 — os três emails de Natal/Ano Novo, um ano por coluna pela
  -- mesma razão (repetem-se todos os anos, o cron corre todos os dias
  -- em Dezembro).
  ADD COLUMN IF NOT EXISTS natal_cupao_enviado_ano integer,
  ADD COLUMN IF NOT EXISTS natal_feliz_enviado_ano integer,
  ADD COLUMN IF NOT EXISTS ano_novo_enviado_ano integer;
