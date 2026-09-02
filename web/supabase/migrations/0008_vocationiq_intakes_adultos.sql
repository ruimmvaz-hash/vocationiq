-- VocationIQ — perguntas novas para o ramo "Já trabalho e quero mudar"
-- (situacao = 'trabalho-quero-mudar') do formulário de intake: tipo de
-- mudança pretendida, área(s) de destino, e ideia concreta em texto livre.
-- Todas opcionais — ver validação em lib/validation.ts.

ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS tipo_mudanca text[],
  ADD COLUMN IF NOT EXISTS areas_destino text[],
  ADD COLUMN IF NOT EXISTS areas_destino_outra text,
  ADD COLUMN IF NOT EXISTS ideia_concreta text;
