import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarInfluencers } from "@/lib/influencersStore";
import { AdminNav } from "@/components/admin/AdminNav";
import { InfluencersClient } from "./InfluencersClient";

export const dynamic = "force-dynamic";

export default async function AdminInfluencersPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let influencers: Awaited<ReturnType<typeof listarInfluencers>> = [];
  let erro: string | null = null;
  try {
    influencers = await listarInfluencers();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="influencers" />
      <h1 className="text-2xl font-extrabold text-navy">Influencers — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">Influencers contactados para parcerias — não é o sistema de comerciais.</p>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar os influencers: {erro}</p>
      ) : (
        <InfluencersClient influencersIniciais={influencers} />
      )}
    </main>
  );
}
