import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Mudar de carreira aos 30 ou 40 anos: como decidir sem arrepender — VocationIQ",
  description:
    "Mudar de área não é começar do zero — é raro que sejas mesmo mau no que fazes agora. Um enquadramento prático para decidir com menos ansiedade e mais clareza.",
};

const FAQ = [
  {
    pergunta: "É tarde demais para mudar de carreira aos 35 ou 40 anos?",
    resposta:
      "Não, mas é uma decisão diferente da que se toma aos 22. Aos 35-40 há normalmente mais para perder (estabilidade, rendimento, tempo investido) e também mais para aproveitar — experiência, rede de contactos e autoconhecimento que faltam a quem começa do zero.",
  },
  {
    pergunta: "Como sei se é a área errada ou só uma fase difícil?",
    resposta:
      "Uma fase difícil costuma ser específica — um chefe, um projecto, uma empresa. Uma incompatibilidade real com a área tende a repetir-se em contextos diferentes, ao longo de anos, independentemente de onde trabalhas dentro dela.",
  },
  {
    pergunta: "A análise do VocationIQ serve para quem já trabalha, não só para quem está a escolher curso?",
    resposta:
      "Sim — o motor adulto foi pensado especificamente para quem já tem uma carreira e está a considerar mudar, cruzando os teus dados de nascimento com o teu momento actual para mapear onde realmente rendes mais.",
  },
];

export default function MudarDeCarreiraPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.pergunta,
              acceptedAnswer: { "@type": "Answer", text: f.resposta },
            })),
          }),
        }}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          Mudar de carreira aos 30 ou 40 anos: como decidir sem arrepender
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          A pergunta mais comum não é &quot;deixo tudo e recomeço?&quot; — é &quot;como sei se estou a fugir do problema
          errado?&quot;.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>Mudar de carreira raramente é começar do zero</h2>
          <p>
            A ideia de que mudar de área implica deitar fora anos de experiência é, na maioria dos casos, exagerada. O que
            realmente costuma acontecer é uma recombinação — competências que já tens (gestão, comunicação, resolução de
            problemas, conhecimento de um sector) aplicadas a um contexto diferente. Raramente se começa mesmo do zero.
          </p>

          <h2>Distinguir uma fase difícil de uma incompatibilidade real</h2>
          <p>
            Antes de decidir mudar de área, vale a pena perceber se o desconforto é específico (um chefe difícil, uma empresa
            desorganizada, um projecto mal definido) ou se se repete, de formas diferentes, em vários empregos e contextos ao
            longo de anos. A primeira situação resolve-se mudando de emprego dentro da mesma área. A segunda é um sinal mais
            sério de que a área em si não encaixa.
          </p>

          <h2>O que pesar antes de decidir</h2>
          <ul>
            <li>Onde tens talento natural, não só experiência acumulada por inércia.</li>
            <li>O que realmente te desgasta no dia a dia actual — é a área, ou é o contexto específico?</li>
            <li>Que competências já tens que se transferem directamente para a nova direcção.</li>
          </ul>

          <h2>Como o VocationIQ ajuda nesta decisão</h2>
          <p>
            A análise para adultos em busca de nova carreira cruza os teus dados de nascimento com o teu momento actual, para
            mapear talentos naturais que talvez estejam por explorar e áreas concretas onde tens maior probabilidade de
            render mais do que rendes hoje — entregue por email em 72 horas.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-mudar-de-carreira-30-40"
          className="mt-10 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Quero a minha análise → €99
        </TrackedCtaLink>
        <p className="mt-3 text-sm text-ink/60">
          Não sabes se vale a pena? <a href="/exemplo" className="underline">Vê um exemplo real de relatório primeiro</a>.
        </p>

        <h2 className="mt-16 text-xl font-extrabold text-navy">Perguntas frequentes</h2>
        <div className="mt-6 space-y-6">
          {FAQ.map((f) => (
            <div key={f.pergunta}>
              <h3 className="font-semibold text-navy">{f.pergunta}</h3>
              <p className="mt-1 text-ink/75">{f.resposta}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
