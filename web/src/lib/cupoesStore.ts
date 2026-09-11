import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { getStripe } from "./stripe";

export interface CupaoRow {
  id: string;
  codigo: string;
  desconto_percentagem: number;
  intake_id: string | null;
  motivo: string;
  criado_em: string;
  expira_em: string | null;
  usado_em: string | null;
  usado_por_email: string | null;
  transferivel: boolean;
  stripe_promotion_code_id: string | null;
}

/** Código curto e legível, no formato pedido: PREFIXO-[4 chars do id]-[ano]. Maiúsculas, sem hífens dentro do trecho do id (o UUID já os tem). */
export function gerarCodigoCupao(prefixo: string, intakeId: string, ano: number): string {
  const idCurto = intakeId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefixo}-${idCurto}-${ano}`;
}

/**
 * Cria um cupão em `viq_cupoes` E, sempre que o Stripe estiver
 * configurado, o Coupon+PromotionCode correspondente no Stripe — com o
 * MESMO código, para o cliente poder usá-lo directamente no campo
 * "Add promotion code" do checkout (`allow_promotion_codes: true`, já
 * activo em api/checkout/route.ts — FALTA 1, "verificar se existe
 * suporte a cupões no Stripe": existe, só faltava criar o objecto).
 * `max_redemptions: 1` porque cada cupão desta função é pessoal (um
 * código, um uso) — mesmo quando `transferivel` (a pessoa pode dar o
 * código a outra pessoa, mas só uma vez).
 *
 * Nunca falha a operação toda se o Stripe estiver indisponível/não
 * configurado — o cupão fica registado em `viq_cupoes` na mesma
 * (`stripe_promotion_code_id: null`), para nunca bloquear o email por
 * uma dependência externa; fica só sem validação automática no
 * checkout até alguém correr a criação manualmente.
 */
export async function criarCupao(params: {
  codigo: string;
  descontoPercentagem: number;
  intakeId?: string | null;
  motivo: string;
  validoDias: number;
  transferivel?: boolean;
  /**
   * FASE 2, FALTA 2 — os cupões de Natal para leads são um único código
   * genérico partilhado por toda a campanha (ex: "NATAL2026"), não um
   * código pessoal de uso único; `maxRedemptions` deixa de estar
   * implicitamente fixo em 1 para suportar isso. Omitido (o caso de
   * todos os outros cupões desta função, sempre pessoais), mantém o
   * comportamento anterior — 1 uso.
   */
  maxRedemptions?: number;
}): Promise<CupaoRow> {
  const supabase = await getSupabaseAdmin();
  const expiraEm = new Date(Date.now() + params.validoDias * 24 * 60 * 60 * 1000);

  let stripePromotionCodeId: string | null = null;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe();
      const coupon = await stripe.coupons.create({
        percent_off: params.descontoPercentagem,
        duration: "once",
        name: params.motivo,
      });
      const promotionCode = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code: params.codigo,
        expires_at: Math.floor(expiraEm.getTime() / 1000),
        max_redemptions: params.maxRedemptions ?? 1,
      });
      stripePromotionCodeId = promotionCode.id;
    }
  } catch (err) {
    // Nunca bloqueia a criação do cupão em viq_cupoes por uma falha no
    // Stripe (ex.: código duplicado, API fora do ar) — regista e segue.
    console.error(`[cupoesStore] falha ao criar o cupão "${params.codigo}" no Stripe:`, err instanceof Error ? err.message : String(err));
  }

  const { data, error } = await supabase
    .from("viq_cupoes")
    .insert({
      codigo: params.codigo,
      desconto_percentagem: params.descontoPercentagem,
      intake_id: params.intakeId ?? null,
      motivo: params.motivo,
      expira_em: expiraEm.toISOString(),
      transferivel: params.transferivel ?? true,
      stripe_promotion_code_id: stripePromotionCodeId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao guardar o cupão "${params.codigo}": ${error.message}`);
  return data as CupaoRow;
}

/**
 * Procura um cupão pelo código — usado pelos crons de Natal para leads
 * (FASE 2, FALTA 2): o código genérico da campanha (ex: "NATAL2026") só
 * deve ser criado UMA VEZ, na primeira vez que é preciso; nos dias
 * seguintes do cron diário, esta função encontra o já criado em vez de
 * tentar criar (e falhar, por violação da UNIQUE constraint em `codigo`)
 * um segundo.
 */
export async function obterCupaoPorCodigo(codigo: string): Promise<CupaoRow | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("viq_cupoes").select("*").eq("codigo", codigo).maybeSingle();
  if (error) throw new Error(`Falha ao procurar o cupão "${codigo}": ${error.message}`);
  return (data as CupaoRow | null) ?? null;
}

/** Cria o cupão só se ainda não existir com este código — usado para o cupão genérico de campanha (FASE 2, FALTA 2), nunca para cupões pessoais (esses têm sempre um código novo, nunca colidem). */
export async function obterOuCriarCupaoPorCodigo(params: Parameters<typeof criarCupao>[0]): Promise<CupaoRow> {
  const existente = await obterCupaoPorCodigo(params.codigo);
  if (existente) return existente;
  return criarCupao(params);
}
