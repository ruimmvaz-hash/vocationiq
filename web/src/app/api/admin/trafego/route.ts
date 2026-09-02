import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasVercelAnalytics, queryVisitsCount, queryVisitsAggregate, vercelAnalyticsMissingEnvVars } from "@/lib/vercelAnalytics";

// Dashboard "Tráfego" do /admin — replicado do /api/admin/traffic da
// Naveya. Janelas deslizantes (últimas 24h / 7 dias / 30 dias) em vez de
// fronteiras de calendário, para evitar ambiguidade de fuso horário.
export const dynamic = "force-dynamic";

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Código de país ISO-3166 alpha-2 -> emoji de bandeira (regional indicator symbols), sem depender de tabela de lookup. */
function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

function categorizeReferrer(hostname: string): string {
  const h = (hostname || "").toLowerCase();
  if (!h) return "Direct";
  if (h.includes("google")) return "Google";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("linkedin")) return "LinkedIn";
  return "Outro";
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasVercelAnalytics) {
    const missing = vercelAnalyticsMissingEnvVars();
    return NextResponse.json(
      { status: "config_error", error: `Vercel Web Analytics não configurado — em falta: ${missing.join(", ")}.`, missing },
      { status: 503 },
    );
  }

  const now = new Date().toISOString();
  const since24h = isoDaysAgo(1);
  const since7d = isoDaysAgo(7);
  const since30d = isoDaysAgo(30);

  try {
    const [today, week, month, topPagesRaw, referrersRaw, devicesRaw, countriesRaw] = await Promise.all([
      queryVisitsCount({ since: since24h, until: now }),
      queryVisitsCount({ since: since7d, until: now }),
      queryVisitsCount({ since: since30d, until: now }),
      queryVisitsAggregate({ since: since30d, until: now, by: "route", limit: 10 }),
      queryVisitsAggregate({ since: since30d, until: now, by: "referrerHostname", limit: 20 }),
      queryVisitsAggregate({ since: since30d, until: now, by: "deviceType", limit: 10 }),
      queryVisitsAggregate({ since: since30d, until: now, by: "country", limit: 5 }),
    ]);

    // O total de páginas visto pelo endpoint "aggregate" (agrupado por
    // rota) não bate certo com o total do endpoint "count" para a mesma
    // janela (a Vercel não garante que os dois fiquem alinhados) — usar
    // o total do count como denominador produzia percentagens > 100%. O
    // denominador tem de vir da soma das próprias linhas devolvidas por
    // este aggregate.
    const topPagesTotal = topPagesRaw.reduce((sum, row) => sum + Number(row.pageviews ?? 0), 0) || 1;

    const topPages = topPagesRaw
      .map((row) => ({
        page: String(row.route ?? "—"),
        visits: Number(row.pageviews ?? 0),
        percent: Math.round((Number(row.pageviews ?? 0) / topPagesTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.visits - a.visits);

    const referrerBuckets = new Map<string, number>();
    for (const row of referrersRaw) {
      const category = categorizeReferrer(String(row.referrerHostname ?? ""));
      referrerBuckets.set(category, (referrerBuckets.get(category) ?? 0) + Number(row.pageviews ?? 0));
    }
    const referrerTotal = [...referrerBuckets.values()].reduce((a, b) => a + b, 0) || 1;
    const trafficSources = ["Direct", "Google", "Instagram", "TikTok", "LinkedIn", "Outro"]
      .map((name) => ({ source: name, visits: referrerBuckets.get(name) ?? 0, percent: Math.round(((referrerBuckets.get(name) ?? 0) / referrerTotal) * 1000) / 10 }))
      .filter((r) => r.visits > 0);

    const deviceTotal = devicesRaw.reduce((sum, row) => sum + Number(row.pageviews ?? 0), 0) || 1;
    const devices = ["mobile", "desktop", "tablet"].map((key) => {
      const row = devicesRaw.find((r) => String(r.deviceType ?? "").toLowerCase() === key);
      const visits = Number(row?.pageviews ?? 0);
      return { device: key.charAt(0).toUpperCase() + key.slice(1), percent: Math.round((visits / deviceTotal) * 1000) / 10 };
    });

    const topCountries = countriesRaw
      .map((row) => ({ country: String(row.country ?? "—"), flag: flagEmoji(String(row.country ?? "")), visits: Number(row.pageviews ?? 0) }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);

    // Sem visitantes no mês inteiro ainda não é um erro de configuração,
    // é só uma conta nova/pouco tráfego (o Web Analytics da Vercel pode
    // levar 24-48h a começar a reportar depois de activado no dashboard).
    const status = month.visitors > 0 ? "connected" : "waiting";

    return NextResponse.json({
      status,
      visitorsToday: today.visitors,
      visitorsWeek: week.visitors,
      visitorsMonth: month.visitors,
      topPages,
      trafficSources,
      devices,
      topCountries,
      windowNote: "hoje = últimas 24h · semana = últimos 7 dias · mês = últimos 30 dias (janelas deslizantes)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "config_error", error: message }, { status: 502 });
  }
}
