-- VocationIQ — CORRECÇÃO 2 (editor de rascunho com preservação de
-- edições manuais). `rascunho_texto` continua a ser SEMPRE o texto
-- usado por "Ver PDF"/"Aprovar e enviar" (nunca muda de significado);
-- `rascunho_texto_llm` passa a guardar sempre o texto bruto da última
-- geração real pela Anthropic, em separado — para nunca se perder
-- quando existe uma edição manual por cima.
ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS rascunho_texto_llm text,
  -- NOT NULL (correcção sobre o pedido literal, "DEFAULT false" sem
  -- NOT NULL) — consistente com o resto do esquema (ex.: referral_creditado,
  -- transferivel): uma coluna booleana de controlo nunca deve poder
  -- ficar NULL, ou as comparações `= true`/`= false` do Postgres
  -- excluem-na silenciosamente (mesma armadilha documentada em store.ts).
  ADD COLUMN IF NOT EXISTS rascunho_editado_manualmente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rascunho_editado_em timestamptz,
  -- Um único nível de undo (texto, não histórico completo) — tal como
  -- pedido.
  ADD COLUMN IF NOT EXISTS rascunho_versao_anterior text;
