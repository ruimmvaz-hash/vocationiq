import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IntakeForm } from "./IntakeForm";

export const metadata: Metadata = { title: "Começar a minha análise — VocationIQ" };

export default function IntakePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-6 py-16 sm:py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">A tua análise VocationIQ</h1>
        <p className="mt-3 text-ink/70">Preenche os teus dados. Depois do pagamento, o relatório chega por email em 48 horas.</p>
        <div className="mt-10">
          <IntakeForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
