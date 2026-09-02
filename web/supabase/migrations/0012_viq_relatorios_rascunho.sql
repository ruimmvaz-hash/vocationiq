-- VocationIQ — motor de geração do relatório Adulto (VOCATIONIQ-ADULTO-metodologia.md).
--
-- "Guardar rascunho em viq_relatorios" (pedido explícito) implica que
-- viq_relatorios passa a representar o ciclo de vida INTEIRO de um
-- relatório (rascunho gerado → revisto → aprovado com PDF anexado →
-- enviado), não só o registo do envio final como até agora. Por isso:
--
--   1. pdf_path/pdf_filename deixam de ser NOT NULL — uma linha de
--      rascunho ainda não tem PDF; só passa a ter quando o admin aprova
--      e anexa um (fluxo "Aprovar e enviar", já existente em
--      api/admin/intakes/[id]/entregar).
--   2. rascunho_texto (o texto gerado pelo LLM) e rascunho_criado_em
--      são novas.
--
-- Nada disto quebra o fluxo actual: as linhas já existentes têm sempre
-- pdf_path/pdf_filename preenchidos, e o insert em lib/storage.ts
-- continua a fornecer os dois sempre que cria uma linha por esse
-- caminho.

ALTER TABLE public.viq_relatorios
  ALTER COLUMN pdf_path DROP NOT NULL,
  ALTER COLUMN pdf_filename DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS rascunho_texto text,
  ADD COLUMN IF NOT EXISTS rascunho_criado_em timestamptz;
