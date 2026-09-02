import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { AdminNav } from "@/components/admin/AdminNav";
import { TrafegoClient } from "./TrafegoClient";

export const dynamic = "force-dynamic";

export default async function AdminTrafegoPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

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
        <p className="mb-4 text-sm font-semibold text-navy">Vercel Web Analytics</p>
        <TrafegoClient />
      </section>

      <p className="mt-4 text-xs text-ink/45">
        Dados actualizados a cada 24h pela Vercel — os primeiros números aparecem até 48h após activar o Web Analytics. Origem &ldquo;Direct&rdquo; = sem UTM
        (acesso directo ao URL).
      </p>
    </main>
  );
}
