import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { FUNNEL_STEPS, type FunnelEvent } from "./eventLog";

export interface DashboardMetrics {
  totalPedidos: number;
  pendentes: number;
  entregues: number;
  receitaTotalEur: number;
  receitaMesActualEur: number;
  pedidosHoje: number;
}

export async function obterMetricasDashboard(): Promise<DashboardMetrics> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("vocationiq_intakes").select("payment_status, report_status, amount_cents, paid_at").eq("payment_status", "paid");
  if (error) throw new Error(`Falha ao calcular métricas: ${error.message}`);

  const rows = (data ?? []) as { report_status: string; amount_cents: number | null; paid_at: string | null }[];
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(inicioHoje.getFullYear(), inicioHoje.getMonth(), 1);

  let pendentes = 0;
  let entregues = 0;
  let receitaCents = 0;
  let receitaMesCents = 0;
  let pedidosHoje = 0;

  for (const r of rows) {
    if (r.report_status === "delivered") entregues++;
    else pendentes++;
    const cents = r.amount_cents ?? 9900;
    receitaCents += cents;
    if (r.paid_at && new Date(r.paid_at) >= inicioHoje) pedidosHoje++;
    if (r.paid_at && new Date(r.paid_at) >= inicioMes) receitaMesCents += cents;
  }

  return {
    totalPedidos: rows.length,
    pendentes,
    entregues,
    receitaTotalEur: receitaCents / 100,
    receitaMesActualEur: receitaMesCents / 100,
    pedidosHoje,
  };
}

export interface FunnelStepMetric {
  step: FunnelEvent;
  label: string;
  count: number;
  percentBaseline: number;
  dropoffPercent: number;
}

const FUNNEL_LABELS: Record<FunnelEvent, string> = {
  homepage_view: "Visitas homepage",
  cta_click: "Cliques no CTA",
  intake_started: "Início do intake",
  intake_completed: "Intake concluído",
  payment_completed: "Pagamento concluído",
  report_delivered: "Relatório entregue",
};

export async function obterFunilConversao(): Promise<FunnelStepMetric[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_events").select("event_type").in("event_type", FUNNEL_STEPS);
  if (error) throw new Error(`Falha ao calcular o funil: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { event_type: string }[]) counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;

  const baseline = counts[FUNNEL_STEPS[0]] || 1;
  return FUNNEL_STEPS.map((step, i) => {
    const count = counts[step] ?? 0;
    const prevCount = i > 0 ? (counts[FUNNEL_STEPS[i - 1]] ?? 0) : count;
    const dropoffPercent = i > 0 && prevCount > 0 ? Math.round((1 - count / prevCount) * 1000) / 10 : 0;
    return { step, label: FUNNEL_LABELS[step], count, percentBaseline: Math.round((count / baseline) * 1000) / 10, dropoffPercent };
  });
}

export interface VendaPorDia {
  data: string; // YYYY-MM-DD
  vendas: number;
  receitaEur: number;
}

/** Últimos `dias` dias, mais antigo primeiro — usado para o gráfico de barras. */
export async function obterVendasPorDia(dias = 30): Promise<VendaPorDia[]> {
  const sb = await getSupabaseAdmin();
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  desde.setHours(0, 0, 0, 0);

  const { data, error } = await sb.from("vocationiq_intakes").select("amount_cents, paid_at").eq("payment_status", "paid").gte("paid_at", desde.toISOString());
  if (error) throw new Error(`Falha ao calcular vendas por dia: ${error.message}`);

  const porDia = new Map<string, { vendas: number; centavos: number }>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), { vendas: 0, centavos: 0 });
  }

  for (const r of (data ?? []) as { amount_cents: number | null; paid_at: string | null }[]) {
    if (!r.paid_at) continue;
    const key = r.paid_at.slice(0, 10);
    const atual = porDia.get(key);
    if (atual) {
      atual.vendas += 1;
      atual.centavos += r.amount_cents ?? 9900;
    }
  }

  return Array.from(porDia.entries()).map(([data, v]) => ({ data, vendas: v.vendas, receitaEur: v.centavos / 100 }));
}
