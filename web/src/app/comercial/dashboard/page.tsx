import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getComercialSession } from "@/lib/comercialAuth";
import { RequestLinkForm } from "./RequestLinkForm";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Painel do comercial — VocationIQ" };
export const dynamic = "force-dynamic";

export default async function ComercialDashboardPage() {
  const session = await getComercialSession();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        {session ? (
          <DashboardClient />
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-navy">Painel do comercial</h1>
            <p className="mt-2 text-sm text-ink/70">Precisas de entrar para veres o teu painel.</p>
            <div className="mt-8">
              <RequestLinkForm />
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
