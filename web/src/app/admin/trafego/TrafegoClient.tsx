"use client";

import { useEffect, useState } from "react";

// Estrutura e lógica replicadas do TrafegoClient.tsx da Naveya (mesma
// API de Vercel Web Analytics, mesmas dimensões) — visual adaptado ao
// sistema de design do VocationIQ (Tailwind navy/amber sobre fundo
// claro) em vez do tema escuro inline da Naveya.

const REFRESH_MS = 5 * 60_000;

interface TopPage {
  page: string;
  visits: number;
  percent: number;
}

interface TrafficSource {
  source: string;
  visits: number;
  percent: number;
}

interface DeviceRow {
  device: string;
  percent: number;
}

interface TopCountry {
  country: string;
  flag: string;
  visits: number;
}

interface Traffic {
  status: "connected" | "waiting";
  visitorsToday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  topPages: TopPage[];
  trafficSources: TrafficSource[];
  devices: DeviceRow[];
  topCountries: TopCountry[];
  windowNote: string;
}

function StatusBadge({ status }: { status: "connected" | "waiting" | "config_error" }) {
  const variants = {
    connected: { icon: "🟢", label: "Vercel Analytics ligado", color: "text-emerald-700" },
    waiting: { icon: "🟡", label: "A aguardar dados (pode demorar 24-48h depois de activar o Web Analytics)", color: "text-amber-dark" },
    config_error: { icon: "🔴", label: "Erro de configuração — ver detalhes abaixo", color: "text-red-700" },
  } as const;
  const v = variants[status];
  return (
    <div className={`mb-5 flex items-center gap-2 text-sm ${v.color}`}>
      <span>{v.icon}</span>
      <span>{v.label}</span>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[160px] flex-1 rounded-lg border border-border p-5">
      <p className="text-sm font-semibold text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">{children}</h2>;
}

export function TrafegoClient() {
  const [data, setData] = useState<Traffic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/admin/trafego")
        .then((r) => r.json())
        .then((d) => (d.error ? setError(d.error) : (setData(d), setError(null))))
        .catch((err) => setError(String(err)));
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div>
        <StatusBadge status="config_error" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">Vercel Analytics não disponível</p>
          <p className="mt-2 text-sm text-red-700/80">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-ink/60">A carregar…</p>;

  const maxCountryVisits = Math.max(1, ...data.topCountries.map((c) => c.visits));

  return (
    <div>
      <StatusBadge status={data.status} />
      <div className="flex flex-wrap gap-4">
        <Card label="Visitantes hoje" value={data.visitorsToday} />
        <Card label="Visitantes esta semana" value={data.visitorsWeek} />
        <Card label="Visitantes este mês" value={data.visitorsMonth} />
      </div>
      <p className="mt-3 text-xs text-ink/45">{data.windowNote}</p>

      <div className="mt-8 flex flex-wrap gap-8">
        <div className="min-w-[320px] flex-[2]">
          <SectionTitle>Top páginas mais visitadas</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-ink/50">
                  <th className="px-4 py-2.5 font-semibold">Página</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Visitas</th>
                  <th className="px-4 py-2.5 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-ink/50">
                      Sem dados ainda.
                    </td>
                  </tr>
                ) : (
                  data.topPages.map((p) => (
                    <tr key={p.page} className="border-t border-border">
                      <td className="px-4 py-2.5 text-navy">{p.page}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-amber-dark">{p.visits}</td>
                      <td className="px-4 py-2.5 text-right text-ink/50">{p.percent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-[260px] flex-1">
          <SectionTitle>Origem do tráfego</SectionTitle>
          <div className="rounded-lg border border-border px-4">
            {data.trafficSources.length === 0 ? (
              <p className="py-3 text-sm text-ink/50">Sem dados ainda.</p>
            ) : (
              data.trafficSources.map((s) => (
                <div key={s.source} className="flex items-center justify-between border-t border-border py-2.5 first:border-t-0">
                  <span className="text-sm text-navy">{s.source}</span>
                  <span className="text-sm font-semibold text-amber-dark">{s.percent}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-8">
        <div className="min-w-[260px] flex-1">
          <SectionTitle>Dispositivos</SectionTitle>
          <div className="rounded-lg border border-border px-4">
            {data.devices.map((d) => (
              <div key={d.device} className="border-t border-border py-2.5 first:border-t-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-navy">{d.device}</span>
                  <span className="text-sm font-semibold text-amber-dark">{d.percent}%</span>
                </div>
                <div className="h-2 rounded bg-fog">
                  <div className="h-full rounded bg-amber" style={{ width: `${d.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-[260px] flex-1">
          <SectionTitle>Top países</SectionTitle>
          <div className="rounded-lg border border-border px-4">
            {data.topCountries.length === 0 ? (
              <p className="py-3 text-sm text-ink/50">Sem dados ainda.</p>
            ) : (
              data.topCountries.map((c) => (
                <div key={c.country} className="border-t border-border py-2.5 first:border-t-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-navy">
                      {c.flag} {c.country}
                    </span>
                    <span className="text-sm font-semibold text-amber-dark">{c.visits}</span>
                  </div>
                  <div className="h-1.5 rounded bg-fog">
                    <div className="h-full rounded bg-amber" style={{ width: `${(c.visits / maxCountryVisits) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
