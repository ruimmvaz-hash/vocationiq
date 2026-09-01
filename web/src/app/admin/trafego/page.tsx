import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasVercelAnalytics, obterTrafegoBasico } from "@/lib/vercelAnalytics";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminTrafegoPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  let trafego: Awaited<ReturnType<typeof obterTrafegoBasico>> | null = null;
  let erro: string | null = null;

  if (hasVercelAnalytics) {
    try {
      trafego = await obterTrafegoBasico();
    } catch (err) {
      erro = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AdminNav active="trafego" />
      <h1 className="text-2xl font-extrabold text-navy">Tráfego — VocationIQ</h1>

      <section className="mt-6 rounded-lg border border-border p-5">
        <p className="text-sm font-semibold text-navy">Microsoft Clarity</p>
        <p className="mt-1 text-sm text-ink/70">
          Gravações de sessão e mapas de calor — não tem uma API simples de métricas, por isso o link vai directo ao
          dashboard da Clarity em vez de tentar mostrar números aqui.
        </p>
        {clarityId ? (
          <a
            href={`https://clarity.microsoft.com/projects/view/${clarityId}/dashboard`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
          >
            Abrir o dashboard da Clarity →
          </a>
        ) : (
          <p className="mt-3 text-sm text-amber-dark">NEXT_PUBLIC_CLARITY_PROJECT_ID não configurado — o tracking não está activo.</p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border p-5">
        <p className="text-sm font-semibold text-navy">Métricas básicas (Vercel Web Analytics)</p>
        {!hasVercelAnalytics ? (
          <p className="mt-2 text-sm text-ink/60">VERCEL_API_TOKEN/VERCEL_PROJECT_ID não configurados — sem métricas para mostrar.</p>
        ) : erro ? (
          <p className="mt-2 text-sm text-red-700">Não consegui carregar o tráfego: {erro}</p>
        ) : trafego ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-ink/60">Visitantes hoje</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">{trafego.visitantesHoje}</p>
              </div>
              <div>
                <p className="text-sm text-ink/60">Visitantes esta semana</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">{trafego.visitantesSemana}</p>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold text-navy">Páginas mais visitadas</p>
            {trafego.paginasMaisVisitadas.length === 0 ? (
              <p className="mt-1 text-sm text-ink/60">Ainda sem dados suficientes.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {trafego.paginasMaisVisitadas.map((p) => (
                  <li key={p.rota} className="flex justify-between text-sm">
                    <span className="text-ink/80">{p.rota}</span>
                    <span className="text-ink/60">{p.visitas}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
