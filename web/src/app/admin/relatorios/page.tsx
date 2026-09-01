import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarIntakes, type FiltrosIntakes } from "@/lib/store";
import { SITUACOES } from "@/lib/validation";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

function formatarValor(cents: number | null): string {
  return `€${((cents ?? 9900) / 100).toFixed(2)}`;
}

function construirLink(base: URLSearchParams, chave: string, valor: string): string {
  const params = new URLSearchParams(base);
  if (valor) params.set(chave, valor);
  else params.delete(chave);
  const qs = params.toString();
  return qs ? `/admin/relatorios?${qs}` : "/admin/relatorios";
}

export default async function AdminIntakesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const sp = await searchParams;
  const estado = sp.estado === "pendente" || sp.estado === "entregue" ? sp.estado : undefined;
  const situacao = sp.situacao || undefined;
  const email = sp.email || undefined;
  const filtros: FiltrosIntakes = { estado, situacao, email };

  let intakes: Awaited<ReturnType<typeof listarIntakes>> = [];
  let erro: string | null = null;
  try {
    intakes = await listarIntakes(filtros);
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  const currentParams = new URLSearchParams();
  if (estado) currentParams.set("estado", estado);
  if (situacao) currentParams.set("situacao", situacao);
  if (email) currentParams.set("email", email);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminNav active="relatorios" />
      <h1 className="text-2xl font-extrabold text-navy">Relatórios — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">{intakes.length} relatório(s) pago(s).</p>

      {email && (
        <p className="mt-3 text-sm text-ink/70">
          A filtrar por cliente: <strong>{email}</strong> ·{" "}
          <Link href={construirLink(currentParams, "email", "")} className="text-navy underline">
            limpar
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-6">
        <FiltroGrupo titulo="Estado">
          <FiltroLink href={construirLink(currentParams, "estado", "")} activo={!estado}>
            Todos
          </FiltroLink>
          <FiltroLink href={construirLink(currentParams, "estado", "pendente")} activo={estado === "pendente"}>
            Pendente
          </FiltroLink>
          <FiltroLink href={construirLink(currentParams, "estado", "entregue")} activo={estado === "entregue"}>
            Entregue
          </FiltroLink>
        </FiltroGrupo>

        <FiltroGrupo titulo="Situação">
          <FiltroLink href={construirLink(currentParams, "situacao", "")} activo={!situacao}>
            Todas
          </FiltroLink>
          {SITUACOES.map((s) => (
            <FiltroLink key={s.valor} href={construirLink(currentParams, "situacao", s.valor)} activo={situacao === s.valor}>
              {s.label}
            </FiltroLink>
          ))}
        </FiltroGrupo>
      </div>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar os pedidos: {erro}</p>
      ) : intakes.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Nenhum pedido corresponde a este filtro.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Data do pedido</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {intakes.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-navy">{i.nome}</td>
                  <td className="px-4 py-3 text-ink/75">{i.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/75">{formatarData(i.paid_at)}</td>
                  <td className="px-4 py-3 text-ink/75">{SITUACAO_LABEL[i.situacao] ?? i.situacao}</td>
                  <td className="px-4 py-3 text-ink/75">{formatarValor(i.amount_cents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        i.report_status === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-amber/20 text-amber-dark"
                      }`}
                    >
                      {i.report_status === "delivered" ? "Entregue" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/relatorios/${i.id}`} className="font-semibold text-navy underline hover:text-navy-dark">
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

function FiltroGrupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FiltroLink({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${activo ? "bg-navy text-white" : "bg-fog text-ink/70 hover:bg-border"}`}
    >
      {children}
    </Link>
  );
}
