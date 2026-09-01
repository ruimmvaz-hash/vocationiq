-- VocationIQ — testemunhos e influencers. Prefixo "viq_", corre no mesmo
-- projecto Supabase partilhado da Naveya, sem colidir com nada existente.
--
-- "Clientes" (/admin/clientes) NÃO tem tabela própria — é derivado por
-- agregação de vocationiq_intakes (agrupado por email), opção que o
-- fundador deu explicitamente ("viq_clientes ou usar viq_intakes"). Mais
-- simples e nunca fica dessincronizado de vocationiq_intakes.

CREATE TABLE IF NOT EXISTS public.viq_testemunhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL DEFAULT 'Anónimo',
  situacao text NOT NULL CHECK (
    situacao IN ('9-ou-menos', '10-11-12', 'universidade', 'trabalho-quero-mudar', 'outra')
  ),
  texto text NOT NULL,
  aprovado boolean NOT NULL DEFAULT false
);

ALTER TABLE public.viq_testemunhos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_testemunhos_aprovado_idx ON public.viq_testemunhos (aprovado, created_at DESC);

-- Estado explícito (contactado/respondeu/activo/inactivo) — diferente da
-- Naveya, cuja tabela "influencers" só tem um booleano "active" que nem
-- chega a estar ligado à UI (confirmado por leitura do código-fonte).
CREATE TABLE IF NOT EXISTS public.viq_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  rede_social text,
  seguidores integer,
  estado text NOT NULL DEFAULT 'contactado' CHECK (estado IN ('contactado', 'respondeu', 'activo', 'inactivo')),
  notas text
);

ALTER TABLE public.viq_influencers ENABLE ROW LEVEL SECURITY;
