import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterFunilConversao, obterVendasPorDia } from "@/lib/adminMetrics";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let erro: string | null = null;
  let funil: Awaited<ReturnType<typeof obterFunilConversao>> = [];
  let vendasPorDia: Awaited<ReturnType<typeof obterVendasPorDia>> = [];
  try {
    [funil, vendasPorDia] = await Promise.all([obterFunilConversao(), obterVendasPorDia(30)]);
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  const taxaConversao = funil.length > 0 ? funil[funil.length - 1].percentBaseline : 0;
  const maxVendasDia = Math.max(1, ...vendasPorDia.map((v) => v.vendas));
  const receitaSemana = vendasPorDia.slice(-7).reduce((soma, v) => soma + v.receitaEur, 0);
  const receitaMes = vendasPorDia.reduce((soma, v) => soma + v.receitaEur, 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="analytics" />
      <h1 className="text-2xl font-extrabold text-navy">Analytics — VocationIQ</h1>

      {erro && <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui calcular as métricas: {erro}</p>}

      {!erro && (
        <>
          <section className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Funil de conversão · taxa {taxaConversao}%</p>
            <div className="mt-3 space-y-3">
              {funil.map((f) => (
                <div key={f.step}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-navy">{f.label}</span>
                    <span className="text-ink/60">
                      {f.count} · {f.percentBaseline}%{f.dropoffPercent > 0 && ` · -${f.dropoffPercent}% vs. passo anterior`}
                    </span>
                  </div>
                  <div className="mt-1 h-4 w-full rounded bg-fog">
                    <div className="h-4 rounded bg-amber" style={{ width: `${Math.min(100, f.percentBaseline)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-5">
              <p className="text-sm font-semibold text-ink/60">Receita — últimos 7 dias</p>
              <p className="mt-2 text-2xl font-extrabold text-navy">€{receitaSemana.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border p-5">
              <p className="text-sm font-semibold text-ink/60">Receita — últimos 30 dias</p>
              <p className="mt-2 text-2xl font-extrabold text-navy">€{receitaMes.toFixed(2)}</p>
            </div>
          </section>

          <section className="mt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Vendas por dia — últimos 30 dias</p>
            <div className="mt-3 flex h-32 items-end gap-0.5">
              {vendasPorDia.map((v) => (
                <div key={v.data} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-navy transition group-hover:bg-amber"
                    style={{ height: `${Math.max(2, (v.vendas / maxVendasDia) * 100)}%` }}
                    title={`${v.data}: ${v.vendas} venda(s) · €${v.receitaEur.toFixed(2)}`}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
