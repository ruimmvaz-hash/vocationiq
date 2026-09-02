import "server-only";

// Cliente para a Web Analytics REST API real da Vercel
// (api.vercel.com/v1/query/web-analytics/...) — replicado do
// lib/vercelAnalytics.ts da Naveya, que já tem este contrato confirmado
// contra a documentação oficial: https://vercel.com/docs/analytics/web-analytics-api
//
// Nomes das variáveis com prefixo "VOCATIONIQ_": o Vercel injecta
// automaticamente um conjunto de variáveis "VERCEL_*" no ambiente de build
// e runtime (VERCEL_ENV, VERCEL_URL, VERCEL_REGION, etc. — ver
// https://vercel.com/docs/environment-variables/system-environment-variables).
// Com VERCEL_API_TOKEN/VERCEL_PROJECT_ID configurados no dashboard mas a
// página continuando a acusar "não configurado", a explicação mais
// provável é esse mecanismo automático a interferir com nomes que
// começam por "VERCEL_" — por isso as variáveis próprias desta app usam
// o prefixo "VOCATIONIQ_", que nunca colide com nada que o Vercel injecte.

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";

const VERCEL_API_TOKEN = process.env.VOCATIONIQ_VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VOCATIONIQ_VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VOCATIONIQ_VERCEL_TEAM_ID;

export const hasVercelAnalytics = Boolean(VERCEL_API_TOKEN && VERCEL_PROJECT_ID);

/** Diagnóstico exacto do que falta configurar, para o indicador de estado do painel. */
export function vercelAnalyticsMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!VERCEL_API_TOKEN) missing.push("VOCATIONIQ_VERCEL_API_TOKEN");
  if (!VERCEL_PROJECT_ID) missing.push("VOCATIONIQ_VERCEL_PROJECT_ID");
  return missing;
}

export class VercelAnalyticsError extends Error {}

function buildParams(extra: Record<string, string | number | undefined>): URLSearchParams {
  if (!VERCEL_PROJECT_ID) throw new VercelAnalyticsError("VOCATIONIQ_VERCEL_PROJECT_ID em falta.");
  const params = new URLSearchParams({ projectId: VERCEL_PROJECT_ID });
  if (VERCEL_TEAM_ID) params.set("teamId", VERCEL_TEAM_ID);
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params;
}

async function callVercelAnalytics<T>(path: string, params: URLSearchParams): Promise<T> {
  if (!VERCEL_API_TOKEN) throw new VercelAnalyticsError("VOCATIONIQ_VERCEL_API_TOKEN em falta.");
  const res = await fetch(`${API_BASE}/${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new VercelAnalyticsError(`Vercel Web Analytics API (${path}) devolveu ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface VisitsCount {
  pageviews: number;
  visitors: number;
}

/** Total de pageviews/visitors, opcionalmente filtrado por intervalo de datas ("since"/"until" aceitam ISO string). */
export async function queryVisitsCount(opts: { since?: string; until?: string; filter?: string } = {}): Promise<VisitsCount> {
  const params = buildParams({ since: opts.since, until: opts.until, filter: opts.filter });
  const json = await callVercelAnalytics<{ data: VisitsCount }>("visits/count", params);
  return json.data;
}

export interface VisitsAggregateRow {
  [dimension: string]: string | number;
}

/** Linhas agrupadas por uma dimensão (route, country, deviceType, referrerHostname, ...) dentro de um intervalo de datas. */
export async function queryVisitsAggregate(opts: { since: string; until: string; by: string; limit?: number; filter?: string }): Promise<VisitsAggregateRow[]> {
  const params = buildParams({ since: opts.since, until: opts.until, by: opts.by, limit: opts.limit, filter: opts.filter });
  const json = await callVercelAnalytics<{ data: VisitsAggregateRow[] }>("visits/aggregate", params);
  return json.data;
}
