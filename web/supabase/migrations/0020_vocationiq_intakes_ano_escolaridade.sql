-- TAREFA 2 (correcção do especialista, aprovada) — granularidade de
-- escolaridade insuficiente com só "9-ou-menos"/"10-11-12": um aluno do
-- 7º e um do 9º estão em momentos de decisão muito diferentes (escolha
-- de ÁREA vs escolha de CURSO específico). Campo aditivo (não altera
-- `situacao`, que continua a distinguir os ramos do formulário) —
-- nenhum registo existente precisa de migração de dados.
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS ano_escolaridade text CHECK (ano_escolaridade IN ('7-a-9', '10-a-12', 'pos-12'));
