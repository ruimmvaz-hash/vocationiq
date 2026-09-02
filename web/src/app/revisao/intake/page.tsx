import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { obterIntake } from "@/lib/store";
import { RevisaoIntakeForm } from "./RevisaoIntakeForm";

export const metadata: Metadata = { title: "A tua revisão VocationIQ" };
export const dynamic = "force-dynamic";

export default async function RevisaoIntakePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) redirect("/");

  const intake = await obterIntake(id).catch(() => null);
  if (!intake || intake.report_status !== "delivered") redirect("/");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-6 py-16 sm:py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">A tua revisão, {intake.nome}</h1>
        <p className="mt-3 text-ink/70">Três passos curtos. Depois do pagamento, a revisão chega por email em 48 horas.</p>
        <div className="mt-10">
          <RevisaoIntakeForm intakeIdOriginal={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
