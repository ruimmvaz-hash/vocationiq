import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarRevisoes } from "@/lib/revisaoStore";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export default async function AdminRevisoesPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let revisoes: Awaited<ReturnType<typeof listarRevisoes>> = [];
  let erro: string | null = null;
  try {
    revisoes = await listarRevisoes();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="revisoes" />
      <h1 className="text-2xl font-extrabold text-navy">Revisões — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">{revisoes.length} revisão(ões) paga(s).</p>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar as revisões: {erro}</p>
      ) : revisoes.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Ainda não há revisões pagas.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {revisoes.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-navy">{r.nome}</td>
                  <td className="px-4 py-3 text-ink/75">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/75">{formatarData(r.paid_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        r.estado === "entregue" ? "bg-emerald-100 text-emerald-800" : "bg-amber/20 text-amber-dark"
                      }`}
                    >
                      {r.estado === "entregue" ? "Entregue" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/revisoes/${r.id}`} className="font-semibold text-navy underline hover:text-navy-dark">
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
