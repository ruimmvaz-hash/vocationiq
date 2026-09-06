-- RISCO ARQUITECTURAL 7 (correcção do especialista, 2026-09-05) — antes
-- desta migração, todo o pipeline astrológico (POST /api/relatorio,
-- "Ver PDF", "Aprovar e enviar/reenviar", pré-visualização) chamava a API
-- de geocodificação externa (Open-Meteo) do zero, a cada chamada, sem
-- nenhuma garantia de que o resultado seria sempre o mesmo. Esta coluna
-- guarda a latitude/longitude/timezone resolvidas UMA VEZ, na primeira
-- geração ("Gerar rascunho"), para todas as rotas seguintes reutilizarem
-- em vez de geocodificar de novo.
ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS coordenadas_nascimento jsonb;
