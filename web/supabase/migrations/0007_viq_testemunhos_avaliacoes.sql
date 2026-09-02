-- VocationIQ — sistema de avaliações com estrelas (link no Email 2,
-- página pública /avaliacao). Expande viq_testemunhos (migração 0003)
-- em vez de criar tabela nova — é a mesma entidade (testemunho), só
-- passa a ter origem dupla: escrito à mão pelo fundador no /admin, ou
-- submetido pelo próprio cliente em /avaliacao.
--
-- DECISÃO — a coluna "situacao" já existia (migração 0003) com a
-- taxonomia de 5 valores do formulário de intake principal
-- (9-ou-menos/10-11-12/universidade/trabalho-quero-mudar/outra). Este
-- pedido usa uma taxonomia diferente e mais simples, pensada para
-- aparecer publicamente (Estudante/Jovem adulto/Adulto em transição/
-- Prefiro não dizer — inclui uma opção de anonimato que a taxonomia do
-- intake não tem). Manter as duas em paralelo criaria dois "tipos de
-- situação" incompatíveis na mesma coluna. Troca-se a constraint para a
-- nova taxonomia — passa a ser a única, usada tanto pelo formulário
-- manual do admin como por /avaliacao. Ver relatório de entrega.
--
-- DECISÃO — "nome_proprio" (pedido) não é uma coluna nova: já existia
-- "nome" (migração 0003, mesmo propósito — o nome mostrado no
-- testemunho). Duas colunas de nome no mesmo registo obrigaria a
-- decidir sempre qual mostrar; reaproveita-se "nome".
--
-- "publicavel" não é uma coluna gerada pelo Postgres — é calculada em
-- código (autoriza_publicacao AND aprovado) sempre que uma das duas
-- muda, para manter a lógica simples e visível no TypeScript em vez de
-- espalhada em triggers SQL.

ALTER TABLE public.viq_testemunhos
  ADD COLUMN IF NOT EXISTS intake_id uuid REFERENCES public.vocationiq_intakes(id),
  ADD COLUMN IF NOT EXISTS nota smallint CHECK (nota BETWEEN 1 AND 5),
  -- Default true: preserva o comportamento actual dos testemunhos
  -- escritos à mão pelo admin, onde só "aprovado" decidia a
  -- publicação — sem alterar nada para os já existentes.
  ADD COLUMN IF NOT EXISTS autoriza_publicacao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS publicavel boolean NOT NULL DEFAULT false;

-- publicavel = autoriza_publicacao AND aprovado, para as linhas já
-- existentes (novas linhas calculam isto em código no momento da
-- escrita — ver lib/testemunhosStore.ts).
UPDATE public.viq_testemunhos SET publicavel = (autoriza_publicacao AND aprovado);

ALTER TABLE public.viq_testemunhos DROP CONSTRAINT IF EXISTS viq_testemunhos_situacao_check;
ALTER TABLE public.viq_testemunhos ADD CONSTRAINT viq_testemunhos_situacao_check CHECK (
  situacao IN ('estudante', 'jovem-adulto', 'adulto-transicao', 'prefiro-nao-dizer')
);

CREATE INDEX IF NOT EXISTS viq_testemunhos_publicavel_idx ON public.viq_testemunhos (publicavel, created_at DESC);
CREATE INDEX IF NOT EXISTS viq_testemunhos_intake_idx ON public.viq_testemunhos (intake_id);
