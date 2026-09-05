-- Redesenho do motor VocationIQ, Parte 3 — arquitectura de 3 passos
-- (gerar → criticar → reescrever se alguma falha). auditoria_llm,
-- auditoria_criada_em, dados_tecnicos e prompt_completo já existem
-- (migração 0016) — só faltam as colunas da crítica/reescrita.
--
--   critica_llm / critica_criada_em — resultado da 2ª chamada (verifica
--     12 critérios contra o prompt técnico + o rascunho gerado).
--   rascunho_reescrito — resultado da 3ª chamada, só quando pelo menos
--     um critério falhou; `rascunho_texto` passa a ser sempre a versão
--     final (reescrita quando houve, original quando não) — esta coluna
--     fica como registo do que a reescrita produziu, para auditoria.
--   rascunho_versao — começa em 1, incrementa a cada reescrita (nunca a
--     cada geração — só quando o critério 3 do processo dispara).

ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS critica_llm text,
  ADD COLUMN IF NOT EXISTS critica_criada_em timestamptz,
  ADD COLUMN IF NOT EXISTS rascunho_reescrito text,
  ADD COLUMN IF NOT EXISTS rascunho_versao integer DEFAULT 1;
