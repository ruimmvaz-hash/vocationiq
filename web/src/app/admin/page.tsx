import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterMetricasDashboard } from "@/lib/adminMetrics";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let erro: string | null = null;
  let metricas: Awaited<ReturnType<typeof obterMetricasDashboard>> = {
    totalPedidos: 0,
    pendentes: 0,
    entregues: 0,
    receitaTotalEur: 0,
    pedidosHoje: 0,
  };
  try {
    metricas = await obterMetricasDashboard();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  const cartoes = [
    { label: "Total de pedidos", valor: metricas.totalPedidos },
    { label: "Pedidos pendentes", valor: metricas.pendentes },
    { label: "Pedidos entregues", valor: metricas.entregues },
    { label: "Receita total", valor: `€${metricas.receitaTotalEur.toFixed(2)}` },
    { label: "Pedidos hoje", valor: metricas.pedidosHoje },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="dashboard" />
      <h1 className="text-2xl font-extrabold text-navy">Dashboard — VocationIQ</h1>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui calcular as métricas: {erro}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {cartoes.map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-5">
              <p className="text-sm font-semibold text-ink/60">{c.label}</p>
              <p className="mt-2 text-3xl font-extrabold text-navy">{c.valor}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
