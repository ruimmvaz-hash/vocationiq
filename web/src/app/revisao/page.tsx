import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { obterIntake } from "@/lib/store";

export const metadata: Metadata = { title: "VocationIQ Revisão" };
export const dynamic = "force-dynamic";

const INCLUI = [
  "O que mudou em ti desde o relatório",
  "A tua dúvida actual respondida",
  "O próximo passo concreto",
  "Entregue em 48 horas",
];

export default async function RevisaoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) redirect("/");

  const intake = await obterIntake(id).catch(() => null);
  if (!intake || intake.report_status !== "delivered") redirect("/");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">VocationIQ Revisão</h1>
        <p className="mt-4 text-lg text-ink/70">Muito mudou desde o teu relatório. Vamos ver onde estás agora.</p>

        <ul className="mx-auto mt-10 max-w-sm space-y-3 text-left">
          {INCLUI.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-bold text-navy-dark">✓</span>
              <span className="text-navy/90">{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-3xl font-extrabold text-navy">€49</p>

        <TrackedCtaLink
          href={`/revisao/intake?id=${id}`}
          location="revisao-landing"
          className="mt-6 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Começar a minha revisão →
        </TrackedCtaLink>
      </main>
      <Footer />
    </>
  );
}
