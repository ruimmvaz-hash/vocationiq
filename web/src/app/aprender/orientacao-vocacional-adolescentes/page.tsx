import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Orientação vocacional para adolescentes: guia para pais e alunos — VocationIQ",
  description:
    "Quando começar, o que perguntar e como ajudar um adolescente que 'não sabe o que quer' — sem transformar a escolha de curso numa pressão a mais.",
};

const FAQ = [
  {
    pergunta: "A partir de que ano vale a pena começar a pensar em orientação vocacional?",
    resposta:
      "Idealmente a partir do 9º ano, quando começam as primeiras escolhas de percurso — não porque haja pressa em decidir, mas porque há tempo para explorar sem pânico, em vez de decidir tudo no último ano.",
  },
  {
    pergunta: "O meu filho diz que não sabe o que quer. Isso é normal?",
    resposta:
      "Completamente normal, e é a situação mais comum nesta idade — não um sinal de que algo está errado. O objectivo nesta fase não é forçar uma resposta, é ajudar a identificar talentos e tendências reais, para que a escolha, quando vier, seja mais informada.",
  },
  {
    pergunta: "Como funciona a análise do VocationIQ para adolescentes?",
    resposta:
      "O motor adapta-se à idade: para quem está no 9º ao 12º ano, a análise foca-se em áreas de talento e forma de aprender, sem forçar uma escolha de curso fechada demais cedo. Entregue por email em 72 horas.",
  },
];

export default function OrientacaoVocacionalAdolescentesPage() {
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
          Orientação vocacional para adolescentes: guia para pais e alunos
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          A pergunta certa não é &quot;o que já decidiste?&quot; — é &quot;o que já sabemos sobre ti que ajuda a decidir
          melhor?&quot;.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>Quando começar</h2>
          <p>
            O momento certo para começar a pensar nisto é o 9º ano, não o último ano do secundário. Não é para decidir cedo
            demais — é para ter tempo de explorar sem a pressão de escolher em poucas semanas, que é o que normalmente
            acontece quando o assunto só é levantado no 12º ano.
          </p>

          <h2>&quot;Não sei o que quero&quot; não é um problema a resolver depressa</h2>
          <p>
            É a resposta mais comum nesta idade, não uma excepção. Um adolescente aos 15 ou 16 anos ainda está a formar
            identidade, interesses e forma de decidir — pedir uma resposta definitiva demasiado cedo tende a gerar ansiedade,
            não clareza. O que ajuda mais, nesta fase, é mapear talentos e tendências reais, para que a decisão, quando vier,
            tenha uma base mais sólida do que &quot;o que os amigos escolheram&quot; ou &quot;o que os pais preferem&quot;.
          </p>

          <h2>O papel dos pais</h2>
          <p>
            Ter opinião e preferência é normal e saudável — o risco é quando a preferência dos pais substitui inteiramente a
            exploração do próprio adolescente. A pergunta mais útil que um pai pode fazer não é &quot;já sabes o que
            queres?&quot;, é &quot;o que é que já reparaste que fazes com mais facilidade do que os teus colegas?&quot;.
          </p>

          <h2>Como o VocationIQ ajuda nesta fase</h2>
          <p>
            Para quem está entre o 9º e o 12º ano, a análise adapta a linguagem e a profundidade à idade — foca-se em áreas de
            talento natural e forma de aprender, sem forçar uma escolha de curso fechada demais cedo. Cruza os dados de
            nascimento com astrologia psicológica, e é entregue por email em 72 horas.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-orientacao-vocacional-adolescentes"
          className="mt-10 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Começar a análise → €49
        </TrackedCtaLink>
        <p className="mt-3 text-sm text-ink/60">
          Não sabes se vale a pena? <Link href="/exemplo" className="underline">Vê um exemplo real de relatório primeiro</Link>.
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
