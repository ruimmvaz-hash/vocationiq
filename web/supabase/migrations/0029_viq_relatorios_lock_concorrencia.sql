-- VocationIQ — AUDITORIA DE ERROS (ronda "auditoria de erros", Set 2026).
--
-- BUG DE CONCORRÊNCIA (risco teórico confirmado por leitura de código,
-- não reportado por um cliente até à data desta migração): `guardarRascunho`
-- (storage.ts) faz um SELECT a verificar se já existe um rascunho aberto
-- (intake_id + pdf_path IS NULL) e, se não encontrar, faz INSERT — sem
-- transacção nem lock. Dois pedidos quase simultâneos ao mesmo intake
-- (dois separadores do admin abertos, ou um retry depois de um timeout
-- percebido) podiam ambos "não encontrar nada" e ambos inserir, deixando
-- DUAS linhas de rascunho aberto para o mesmo cliente — cada uma com
-- texto potencialmente diferente, sem nenhuma a ser claramente "a boa".
--
-- Este índice único parcial torna essa situação impossível ao nível da
-- base de dados: só pode existir UMA linha com pdf_path IS NULL por
-- intake_id. `guardarRascunho` foi actualizado para apanhar a violação
-- (código Postgres 23505) e cair para um UPDATE em vez de falhar — ver
-- storage.ts.
CREATE UNIQUE INDEX IF NOT EXISTS viq_relatorios_intake_rascunho_aberto_unico
  ON public.viq_relatorios (intake_id)
  WHERE pdf_path IS NULL;
