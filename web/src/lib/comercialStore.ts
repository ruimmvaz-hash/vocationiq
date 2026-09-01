import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type ComercialStatus = "invited" | "pending" | "active" | "suspended";

export interface Comercial {
  id: string;
  created_at: string;
  name: string;
  email: string;
  code: string;
  status: ComercialStatus;
  commission_rate: number;
  commission_rate_manual: boolean;
  total_sales: number;
  total_revenue_generated: number;
  total_commission_owed: number;
  total_commission_paid: number;
  tax_id: string | null;
  tax_country: string | null;
  payout_requested_at: string | null;
}

function slugify(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

async function codeTaken(sb: Awaited<ReturnType<typeof getSupabaseAdmin>>, code: string): Promise<boolean> {
  const { data } = await sb.from("viq_comerciais").select("id").ilike("code", code).maybeSingle();
  return !!data;
}

export async function generateUniqueReferralCode(name: string): Promise<string> {
  const sb = await getSupabaseAdmin();
  const base = slugify(name) || "REP";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${base}${suffix}`;
    if (!(await codeTaken(sb, candidate))) return candidate;
  }
  throw new Error("Não foi possível gerar um código único.");
}

export async function criarOuActivarComercial(params: { name: string; email: string }): Promise<Comercial> {
  const sb = await getSupabaseAdmin();
  const { data: existente } = await sb.from("viq_comerciais").select("*").eq("email", params.email).maybeSingle();

  if (existente) {
    if (existente.status === "invited") {
      const { data, error } = await sb.from("viq_comerciais").update({ status: "pending", name: params.name }).eq("id", existente.id).select().single();
      if (error) throw new Error(`Falha ao activar comercial: ${error.message}`);
      return data as Comercial;
    }
    return existente as Comercial;
  }

  const code = await generateUniqueReferralCode(params.name);
  const { data, error } = await sb
    .from("viq_comerciais")
    .insert({ name: params.name, email: params.email, code, status: "pending" })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar comercial: ${error.message}`);
  return data as Comercial;
}

export async function convidarComercial(params: { name: string; email: string }): Promise<{ comercial: Comercial; jaRegistado: boolean }> {
  const sb = await getSupabaseAdmin();
  const { data: existente } = await sb.from("viq_comerciais").select("*").eq("email", params.email).maybeSingle();
  if (existente) return { comercial: existente as Comercial, jaRegistado: true };

  const code = await generateUniqueReferralCode(params.name);
  const { data, error } = await sb
    .from("viq_comerciais")
    .insert({ name: params.name, email: params.email, code, status: "invited" })
    .select()
    .single();
  if (error) throw new Error(`Falha ao convidar comercial: ${error.message}`);
  return { comercial: data as Comercial, jaRegistado: false };
}

export async function obterComercialPorEmail(email: string): Promise<Comercial | null> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_comerciais").select("*").eq("email", email).maybeSingle();
  return (data as Comercial) ?? null;
}

export async function obterComercialPorId(id: string): Promise<Comercial | null> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_comerciais").select("*").eq("id", id).maybeSingle();
  return (data as Comercial) ?? null;
}

/** Válido para atribuição de venda: código existe e está activo. */
export async function validarCodigoComercial(code: string): Promise<Comercial | null> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_comerciais").select("*").ilike("code", code.trim()).eq("status", "active").maybeSingle();
  return (data as Comercial) ?? null;
}

export async function listarComerciais(): Promise<Comercial[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_comerciais").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar comerciais: ${error.message}`);
  return (data ?? []) as Comercial[];
}

export async function definirEstadoComercial(id: string, status: ComercialStatus): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_comerciais").update({ status }).eq("id", id);
  if (error) throw new Error(`Falha ao mudar estado do comercial: ${error.message}`);
}

export async function definirTaxaComercial(id: string, rate: number): Promise<void> {
  const sb = await getSupabaseAdmin();
  const clamped = Math.min(1, Math.max(0, rate));
  const { error } = await sb.from("viq_comerciais").update({ commission_rate: clamped, commission_rate_manual: true }).eq("id", id);
  if (error) throw new Error(`Falha ao definir taxa: ${error.message}`);
}

export async function pedirPagamentoComercial(comercialId: string, params: { taxId: string; taxCountry: string }): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb
    .from("viq_comerciais")
    .update({ tax_id: params.taxId, tax_country: params.taxCountry, payout_requested_at: new Date().toISOString() })
    .eq("id", comercialId);
  if (error) throw new Error(`Falha ao pedir pagamento: ${error.message}`);
}

/** Salda toda a comissão em dívida — bookkeeping apenas, sem transferência automática. */
export async function marcarComissaoPaga(id: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { data: comercial, error: getError } = await sb.from("viq_comerciais").select("*").eq("id", id).single();
  if (getError || !comercial) throw new Error(`Comercial não encontrado: ${getError?.message ?? id}`);

  const now = new Date().toISOString();
  await sb.from("viq_comercial_referrals").update({ commission_paid: true, commission_paid_at: now }).eq("comercial_id", id).eq("commission_paid", false);

  const { error } = await sb
    .from("viq_comerciais")
    .update({ total_commission_paid: comercial.total_commission_owed, payout_requested_at: null })
    .eq("id", id);
  if (error) throw new Error(`Falha ao marcar comissão como paga: ${error.message}`);
}

/**
 * Regista a venda atribuída a um comercial: 20% até à 4ª venda (inclusive),
 * 25% a partir da 5ª — igual à Naveya. Uma taxa definida manualmente pelo
 * fundador (commission_rate_manual) desliga o escalonamento automático.
 * Chamado a partir do webhook Stripe (checkout.session.completed), não do
 * cliente — mais fiável que o "no browser" da Naveya, mesma mecânica.
 */
export async function registarComissao(params: { comercial: Comercial; intakeId: string; orderValueEur: number }): Promise<void> {
  const { comercial, intakeId, orderValueEur } = params;
  const sb = await getSupabaseAdmin();

  const priorSales = comercial.total_sales ?? 0;
  const effectiveRate = comercial.commission_rate_manual ? Number(comercial.commission_rate ?? 0.2) : priorSales >= 4 ? 0.25 : 0.2;
  const commissionAmount = effectiveRate * orderValueEur;

  const { error: insertError } = await sb.from("viq_comercial_referrals").insert({
    comercial_id: comercial.id,
    intake_id: intakeId,
    referral_code: comercial.code,
    order_value: orderValueEur,
    commission_amount: commissionAmount,
  });
  if (insertError) throw new Error(`Falha ao registar comissão: ${insertError.message}`);

  const update: Record<string, unknown> = {
    total_sales: priorSales + 1,
    total_revenue_generated: Number(comercial.total_revenue_generated ?? 0) + orderValueEur,
    total_commission_owed: Number(comercial.total_commission_owed ?? 0) + commissionAmount,
  };
  if (!comercial.commission_rate_manual) update.commission_rate = effectiveRate;

  const { error: updateError } = await sb.from("viq_comerciais").update(update).eq("id", comercial.id);
  if (updateError) throw new Error(`Falha ao actualizar totais do comercial: ${updateError.message}`);
}
