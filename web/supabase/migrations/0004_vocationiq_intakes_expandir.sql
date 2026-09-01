-- VocationIQ — formulário de intake multi-passo adaptativo. Adiciona as
-- colunas novas à tabela EXISTENTE "vocationiq_intakes" (migração 0001) —
-- não "viq_intakes": essa tabela nunca existiu, o prefixo "viq_" só foi
-- usado nas tabelas criadas a partir da migração 0002 em diante. Ver
-- relatório de entrega.
--
-- Duas colunas foram acrescentadas para além da lista pedida, por serem
-- necessárias para guardar respostas que o formulário recolhe mas que não
-- tinham coluna nomeada no pedido — assinaladas abaixo:
--   · clareza_ideia — "Já tens alguma ideia do que queres seguir?"
--     (ramo 9º ano ou menos / 10º-12º ano)
--   · descricao_situacao — "Descreve a tua situação" (ramo "Outra situação")
--
-- A coluna "contexto" (migração 0001, "O que te trouxe aqui") fica
-- intocada com os dados antigos — o novo Passo 3 escreve em
-- "contexto_adicional" (nome pedido explicitamente), não a reaproveita.

ALTER TABLE public.vocationiq_intakes
  -- Ramo "9º ano ou menos" / "10º, 11º ou 12º ano"
  ADD COLUMN IF NOT EXISTS clareza_ideia text CHECK (clareza_ideia IN ('clara', 'duas-tres-opcoes', 'nao-faco-ideia')),
  ADD COLUMN IF NOT EXISTS areas_consideradas text[],
  ADD COLUMN IF NOT EXISTS areas_consideradas_outra text,
  ADD COLUMN IF NOT EXISTS preferencia_familia text,

  -- Ramo "Estou na universidade"
  ADD COLUMN IF NOT EXISTS curso_actual text,
  ADD COLUMN IF NOT EXISTS satisfacao_curso text CHECK (satisfacao_curso IN ('satisfeito-quer-perceber', 'duvidas-serias', 'quer-mudar')),

  -- Ramo "Já trabalho e quero mudar"
  ADD COLUMN IF NOT EXISTS area_trabalho_actual text,
  ADD COLUMN IF NOT EXISTS anos_experiencia text CHECK (anos_experiencia IN ('menos-2', '2-a-5', '5-a-10', 'mais-10')),
  ADD COLUMN IF NOT EXISTS o_que_nao_funciona text,

  -- Partilhado entre o ramo "universidade" ("para onde, se pensas mudar")
  -- e o ramo "já trabalho" ("para onde queres ir") — mesma pergunta em
  -- espírito, mesma coluna.
  ADD COLUMN IF NOT EXISTS para_onde_quer_ir text,

  -- Ramo "Outra situação"
  ADD COLUMN IF NOT EXISTS descricao_situacao text,

  -- Passo 3 — todos os públicos
  ADD COLUMN IF NOT EXISTS contexto_adicional text,
  ADD COLUMN IF NOT EXISTS pergunta_especifica text;
