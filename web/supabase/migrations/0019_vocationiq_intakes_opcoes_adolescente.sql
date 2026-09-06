-- TAREFA 3 (correcção do especialista) — dois campos exigidos por
-- SPEC-vocacional.md ("O QUE ISTO EXIGE DA RECOLHA"): as opções em cima
-- da mesa do jovem (2-4, texto livre) e qual delas lhe parece a mais
-- provável hoje — permite ao relatório tratar essa como a hipótese em
-- teste, em vez de tratar todas as opções como igualmente hipotéticas.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS opcoes_adolescente text[],
  ADD COLUMN IF NOT EXISTS opcao_mais_provavel text;
