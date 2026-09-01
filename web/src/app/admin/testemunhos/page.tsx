import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { listarTestemunhos } from "@/lib/testemunhosStore";
import { AdminNav } from "@/components/admin/AdminNav";
import { TestemunhosClient } from "./TestemunhosClient";

export const dynamic = "force-dynamic";

export default async function AdminTestemunhosPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let testemunhos: Awaited<ReturnType<typeof listarTestemunhos>> = [];
  let erro: string | null = null;
  try {
    testemunhos = await listarTestemunhos();
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AdminNav active="testemunhos" />
      <h1 className="text-2xl font-extrabold text-navy">Testemunhos — VocationIQ</h1>
      <p className="mt-1 text-sm text-ink/60">Testemunhos aprovados aparecem na homepage.</p>

      {erro ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar os testemunhos: {erro}</p>
      ) : (
        <TestemunhosClient testemunhosIniciais={testemunhos} />
      )}
    </main>
  );
}
