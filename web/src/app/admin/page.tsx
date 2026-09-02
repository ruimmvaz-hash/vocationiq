import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterMetricasDashboard, obterVendasPorDia } from "@/lib/adminMetrics";
import { obterUltimosPendentes } from "@/lib/store";
import { listarAvaliacoesPendentes } from "@/lib/testemunhosStore";
import { AdminNav } from "@/components/admin/AdminNav";
import { Estrelas } from "@/components/Estrelas";

export const dynamic = "force-dynamic";

const VAZIO_METRICAS = { totalPedidos: 0, pendentes: 0, entregues: 0, receitaTotalEur: 0, receitaMesActualEur: 0, pedidosHoje: 0 };

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function horasDesde(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let erro: string | null = null;
  let metricas = VAZIO_METRICAS;
  let pendentes: Awaited<ReturnType<typeof obterUltimosPendentes>> = [];
  let vendasPorDia: Awaited<ReturnType<typeof obterVendasPorDia>> = [];
  let avaliacoesPendentes: Awaited<ReturnType<typeof listarAvaliacoesPendentes>> = [];

  try {
    [metricas, pendentes, vendasPorDia, avaliacoesPendentes] = await Promise.all([
      obterMetricasDashboard(),
      obterUltimosPendentes(5),
      obterVendasPorDia(30),
      listarAvaliacoesPendentes(5),
    ]);
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  const atrasados = pendentes.filter((p) => horasDesde(p.paid_at) > 24);
  const maxVendasDia = Math.max(1, ...vendasPorDia.map((v) => v.vendas));

  const cartoes = [
    { label: "Total de pedidos", valor: metricas.totalPedidos },
    { label: "Pedidos pendentes", valor: metricas.pendentes },
    { label: "Pedidos entregues", valor: metricas.entregues },
    { label: "Receita total", valor: `€${metricas.receitaTotalEur.toFixed(2)}` },
    { label: "Receita este mês", valor: `€${metricas.receitaMesActualEur.toFixed(2)}` },
    { label: "Pedidos hoje", valor: metricas.pedidosHoje },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="dashboard" />
      <h1 className="text-2xl font-extrabold text-navy">Dashboard — VocationIQ</h1>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui calcular as métricas: {erro}</p>
      ) : (
        <>
          {atrasados.length > 0 && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-800">⚠ {atrasados.length} pedido(s) há mais de 24h sem resposta</p>
              <ul className="mt-1.5 space-y-0.5">
                {atrasados.map((p) => (
                  <li key={p.id} className="text-sm">
                    <Link href={`/admin/relatorios/${p.id}`} className="text-red-800 underline">
                      {p.nome} — pago em {formatarData(p.paid_at)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {avaliacoesPendentes.length > 0 && (
            <div className="mt-6 rounded-md border border-amber/50 bg-amber/10 px-4 py-3">
              <p className="text-sm font-bold text-amber-dark">★ {avaliacoesPendentes.length} nova(s) avaliação(ões) recebida(s)</p>
              <ul className="mt-1.5 space-y-1">
                {avaliacoesPendentes.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/admin/testemunhos#${a.id}`} className="text-navy underline">
                      {a.nome} deixou {a.nota} estrela{a.nota !== 1 ? "s" : ""}
                    </Link>
                    <Estrelas nota={a.nota} className="text-xs" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {cartoes.map((c) => (
              <div key={c.label} className="rounded-lg border border-border p-5">
                <p className="text-sm font-semibold text-ink/60">{c.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-navy">{c.valor}</p>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Últimos pedidos pendentes</p>
            {pendentes.length === 0 ? (
              <p className="mt-3 text-sm text-ink/60">Sem pedidos pendentes.</p>
            ) : (
              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {pendentes.map((p) => (
                  <Link key={p.id} href={`/admin/relatorios/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-fog">
                    <span className="font-semibold text-navy">{p.nome}</span>
                    <span className="text-ink/60">{formatarData(p.paid_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Vendas — últimos 30 dias</p>
            <div className="mt-3 flex h-24 items-end gap-0.5">
              {vendasPorDia.map((v) => (
                <div
                  key={v.data}
                  className="flex-1 rounded-t bg-navy"
                  style={{ height: `${Math.max(2, (v.vendas / maxVendasDia) * 100)}%` }}
                  title={`${v.data}: ${v.vendas} venda(s) · €${v.receitaEur.toFixed(2)}`}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
