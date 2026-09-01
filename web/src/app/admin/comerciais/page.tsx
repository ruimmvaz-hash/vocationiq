import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarComerciais } from "@/lib/comercialStore";
import { AdminNav } from "@/components/admin/AdminNav";
import { ComerciaisClient } from "./ComerciaisClient";

export const dynamic = "force-dynamic";

export default async function AdminComerciaisPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let comerciais: Awaited<ReturnType<typeof listarComerciais>> = [];
  let erro: string | null = null;
  try {
    comerciais = await listarComerciais();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminNav active="comerciais" />
      <h1 className="text-2xl font-extrabold text-navy">Comerciais — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">Lista sem criação directa — os comerciais registam-se em /comercial. Podes convidar por email.</p>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar os comerciais: {erro}</p>
      ) : (
        <ComerciaisClient comerciaisIniciais={comerciais} />
      )}
    </main>
  );
}
