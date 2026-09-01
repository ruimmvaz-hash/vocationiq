import "server-only";

// Leitura mínima do Vercel Web Analytics (api.vercel.com) — replica só o
// essencial do que a Naveya faz em lib/vercelAnalytics.ts (que tem muito
// mais dimensões: referrers, dispositivos, países). Aqui só o que foi
// pedido: visitantes hoje/semana e páginas mais visitadas.
//
// NOTA HONESTA: não foi possível testar esta integração de ponta a ponta
// nesta sessão — não há um VERCEL_API_TOKEN disponível aqui. O parsing é
// defensivo (nunca lança, cai para "sem dados" em vez de rebentar) mas o
// fundador deve confirmar que os números batem certo assim que configurar
// as variáveis de ambiente.

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export const hasVercelAnalytics = Boolean(VERCEL_API_TOKEN && VERCEL_PROJECT_ID);

export interface TrafegoBasico {
  visitantesHoje: number;
  visitantesSemana: number;
  paginasMaisVisitadas: { rota: string; visitas: number }[];
}

async function query(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://api.vercel.com/v1/query/web-analytics/${endpoint}`);
  url.searchParams.set("projectId", VERCEL_PROJECT_ID!);
  if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Vercel Analytics respondeu ${res.status}`);
  return res.json();
}

function numeroSeguro(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export async function obterTrafegoBasico(): Promise<TrafegoBasico> {
  if (!hasVercelAnalytics) throw new Error("Vercel Analytics não configurado (VERCEL_API_TOKEN/VERCEL_PROJECT_ID em falta).");

  const agora = new Date();
  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioSemana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [hoje, semana, paginas] = await Promise.all([
    query("visits/count", { since: inicioHoje.toISOString(), until: agora.toISOString() }),
    query("visits/count", { since: inicioSemana.toISOString(), until: agora.toISOString() }),
    query("visits/aggregate", { since: inicioSemana.toISOString(), until: agora.toISOString(), dimension: "route", limit: "5" }),
  ]);

  // Formato exacto da resposta não confirmado nesta sessão — parsing tolerante a variações.
  const visitantesHoje = numeroSeguro((hoje as Record<string, unknown>)?.visitors ?? (hoje as Record<string, unknown>)?.total);
  const visitantesSemana = numeroSeguro((semana as Record<string, unknown>)?.visitors ?? (semana as Record<string, unknown>)?.total);

  const dadosPaginas = (paginas as Record<string, unknown>)?.data;
  const linhasPaginas: Record<string, unknown>[] = Array.isArray(dadosPaginas) ? (dadosPaginas as Record<string, unknown>[]) : [];
  const paginasMaisVisitadas = linhasPaginas.slice(0, 5).map((p) => ({
    rota: String(p.route ?? p.path ?? "—"),
    visitas: numeroSeguro(p.visitors ?? p.total),
  }));

  return { visitantesHoje, visitantesSemana, paginasMaisVisitadas };
}
