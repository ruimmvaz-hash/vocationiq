-- VocationIQ — ficha do cliente reorganizada em /admin/relatorios/[id]
-- (secções "Mapa técnico", "Auditoria do LLM", "Prompt completo").
--
--   dados_tecnicos  — jsonb com { axes, pesos, earningModes, datas,
--                     savPorCasa }, preenchido no momento em que o
--                     rascunho é gerado (POST /api/relatorio) — a mesma
--                     estrutura que já alimenta o prompt e o template,
--                     guardada para a secção "Mapa técnico" nunca ter de
--                     recalcular nem chamar a Anthropic.
--   prompt_completo — o texto exacto enviado à Anthropic nesse momento
--                     (secção "Prompt completo", só para debug interno).
--   auditoria_llm / auditoria_criada_em — resultado do botão "Analisar
--                     raciocínio do LLM" (chamada extra e explícita à
--                     Anthropic, nunca automática).

ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS auditoria_llm text,
  ADD COLUMN IF NOT EXISTS auditoria_criada_em timestamptz,
  ADD COLUMN IF NOT EXISTS dados_tecnicos jsonb,
  ADD COLUMN IF NOT EXISTS prompt_completo text;
