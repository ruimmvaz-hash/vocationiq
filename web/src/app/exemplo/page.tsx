import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = { title: "Exemplo de análise — VocationIQ" };

export default function ExemploPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Exemplo de análise VocationIQ</h1>
        <p className="mt-3 text-ink/70">Dados pessoais protegidos. Conteúdo real.</p>

        <div className="mt-10 rounded-lg border border-dashed border-border bg-fog px-6 py-24 text-sm text-ink/50">
          [Relatório de exemplo será adicionado em breve]
        </div>

        <TrackedCtaLink
          href="/intake"
          location="exemplo"
          className="mt-10 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Quero a minha análise → €99
        </TrackedCtaLink>
      </main>
      <Footer />
    </>
  );
}
