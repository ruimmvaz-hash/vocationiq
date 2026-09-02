-- VocationIQ Revisão — follow-up de €49, 3 meses após o relatório inicial.
-- Corre no mesmo projecto Supabase partilhado.

-- 1. Flags de email de revisão em vocationiq_intakes (pedido explícito).
ALTER TABLE public.vocationiq_intakes
  ADD COLUMN IF NOT EXISTS revisao_email_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao_email_180_enviado boolean NOT NULL DEFAULT false;

-- 2. Tabela viq_revisoes. Além dos campos pedidos, acrescenta
-- stripe_checkout_session_id, amount_cents e payment_status — sem estes,
-- não há como o checkout/webhook do Stripe saber se a revisão foi paga
-- (o mesmo gap que existiu em vocationiq_intakes antes da migração 0002,
-- resolvido da mesma forma agora). "estado" (pendente/entregue), tal como
-- pedido, refere-se à ENTREGA do relatório de revisão, não ao pagamento —
-- por isso os dois conjuntos de campos coexistem, tal como
-- payment_status/report_status em vocationiq_intakes.
CREATE TABLE IF NOT EXISTS public.viq_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),

  intake_id_original uuid NOT NULL REFERENCES public.vocationiq_intakes(id),
  nome text NOT NULL,
  email text,

  seguiu_direcao text CHECK (seguiu_direcao IN ('sim-nesse-caminho', 'experimentei-mudei', 'ainda-nao-decidi', 'outro-lado')),
  o_que_correu_bem text,
  o_que_nao_correu text,

  duvida_actual text,
  sentimento_caminho smallint CHECK (sentimento_caminho BETWEEN 1 AND 5),
  questao_relatorio text,

  situacao_mudou text CHECK (situacao_mudou IN ('continuo-igual', 'mudei-escola-curso-trabalho', 'em-processo-mudanca')),
  decisao_concreta text,

  stripe_checkout_session_id text,
  amount_cents integer,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  paid_at timestamptz,

  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'entregue')),
  entregue_em timestamptz
);

ALTER TABLE public.viq_revisoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS viq_revisoes_intake_original_idx ON public.viq_revisoes (intake_id_original);
