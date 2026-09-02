import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { obterIntake } from "@/lib/store";
import { AvaliacaoForm } from "./AvaliacaoForm";

export const metadata: Metadata = { title: "A tua avaliação — VocationIQ" };
export const dynamic = "force-dynamic";

export default async function AvaliacaoPage({ searchParams }: { searchParams: Promise<{ id?: string; nota?: string }> }) {
  const { id, nota: notaBruta } = await searchParams;
  if (!id) redirect("/");

  const intake = await obterIntake(id).catch(() => null);
  if (!intake || intake.report_status !== "delivered") redirect("/");

  const nota = Math.min(5, Math.max(1, Number(notaBruta) || 5));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-6 py-16 sm:py-20">
        <AvaliacaoForm intakeId={id} notaInicial={nota} />
      </main>
      <Footer />
    </>
  );
}
