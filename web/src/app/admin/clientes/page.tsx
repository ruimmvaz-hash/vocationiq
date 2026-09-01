import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarClientes } from "@/lib/store";
import { SITUACOES } from "@/lib/validation";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export default async function AdminClientesPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let clientes: Awaited<ReturnType<typeof listarClientes>> = [];
  let erro: string | null = null;
  try {
    clientes = await listarClientes();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="clientes" />
      <h1 className="text-2xl font-extrabold text-navy">Clientes — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">{clientes.length} cliente(s). Agrupado por email a partir dos pedidos pagos.</p>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar os clientes: {erro}</p>
      ) : clientes.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Ainda não há clientes.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Data da compra</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Relatórios</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.email} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-navy">{c.nome}</td>
                  <td className="px-4 py-3 text-ink/75">{c.email}</td>
                  <td className="px-4 py-3 text-ink/75">{formatarData(c.primeiraCompra)}</td>
                  <td className="px-4 py-3 text-ink/75">{SITUACAO_LABEL[c.situacao] ?? c.situacao}</td>
                  <td className="px-4 py-3 text-ink/75">{c.totalRelatorios}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/relatorios?email=${encodeURIComponent(c.email)}`} className="font-semibold text-navy underline hover:text-navy-dark">
                      Ver relatórios
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
