import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = { title: "Exemplo de análise — VocationIQ" };

const PAGINAS = [
  {
    src: "/images/exemplo/grafico-forcas.png",
    largura: 1785,
    altura: 1448,
    titulo: "Força real de cada planeta do teu perfil",
  },
  {
    src: "/images/exemplo/radar-competencias.png",
    largura: 1785,
    altura: 1623,
    titulo: "Radar das seis competências",
  },
  {
    src: "/images/exemplo/roda-da-vida.png",
    largura: 1785,
    altura: 2167,
    titulo: "Roda da vida — onde tens força natural",
  },
  {
    src: "/images/exemplo/tabelas-apoio-periodos.png",
    largura: 1785,
    altura: 1436,
    titulo: "Apoio por área de vida e os teus períodos",
  },
];

export default function ExemploPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Exemplo de análise VocationIQ</h1>
        <p className="mt-3 text-ink/70">
          Páginas reais de um relatório VocationIQ, com nome e dados de nascimento substituídos por um exemplo fictício.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {PAGINAS.map((p) => (
            <figure key={p.src} className="overflow-hidden rounded-lg border border-border bg-paper shadow-sm">
              <Image
                src={p.src}
                alt={p.titulo}
                width={p.largura}
                height={p.altura}
                sizes="(min-width: 640px) 50vw, 90vw"
                className="w-full h-auto"
              />
              <figcaption className="border-t border-border px-4 py-3 text-left text-sm font-semibold text-navy">{p.titulo}</figcaption>
            </figure>
          ))}
        </div>

        <TrackedCtaLink
          href="/intake"
          location="exemplo"
          className="mt-12 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Quero a minha análise → €99
        </TrackedCtaLink>
      </main>
      <Footer />
    </>
  );
}
