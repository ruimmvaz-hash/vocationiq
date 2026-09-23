import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Que curso escolher depois do 12º ano: guia prático — VocationIQ",
  description:
    "Escolher curso pela nota, pela família ou pelo que 'dá dinheiro' são os três erros mais comuns. Um guia prático para decidir com mais clareza antes das candidaturas.",
};

const FAQ = [
  {
    pergunta: "Devo escolher o curso pela nota que tenho na disciplina?",
    resposta:
      "Ter boa nota a uma disciplina é sinal de disciplina de estudo e de facilidade cognitiva numa área — não é, por si só, sinal de vocação. Muitas pessoas com boas notas a Matemática rendem mais noutra área completamente diferente.",
  },
  {
    pergunta: "E se ainda não faço mesmo ideia do que quero?",
    resposta:
      "É a situação mais comum, não uma excepção. Não faz mal chegar às candidaturas sem uma ideia clara — o que ajuda é teres pelo menos uma ou duas hipóteses concretas para testar, em vez de decidires no último dia por eliminação.",
  },
  {
    pergunta: "Posso mudar de curso depois, se escolher mal?",
    resposta:
      "Sim, e muita gente muda. Mas mudar tem custo real — tempo, dinheiro, e o desgaste de recomeçar. Vale sempre mais investir algumas horas a pensar bem antes de te candidatares do que corrigir depois de já teres começado.",
  },
];

export default function QueCursoEscolherPage() {
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
          Que curso escolher depois do 12º ano: guia prático
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          Três erros explicam a maioria das escolhas de curso das quais as pessoas se arrependem. Nenhum deles é
          &quot;não teres pensado o suficiente&quot;.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>Erro 1 — escolher pela nota</h2>
          <p>
            Teres boa nota a uma disciplina diz-te que tens disciplina de estudo e alguma facilidade nela — não te diz se é aí
            que vais render mais, nem se vais gostar de a fazer todos os dias durante uma carreira inteira. Confundir nota com
            vocação é o erro mais comum, e um dos mais caros: leva a escolher pelo que já correu bem na escola, não pelo que
            realmente encaixa.
          </p>

          <h2>Erro 2 — escolher pelo que os outros esperam</h2>
          <p>
            A pressão da família, dos amigos, ou do que &quot;dá dinheiro&quot; entra sempre na decisão — e não há problema
            nenhum em ouvi-la. O problema é quando substitui inteiramente a pergunta &quot;onde é que eu realmente rendo
            mais&quot;. Um curso escolhido só para agradar tende a custar caro anos depois.
          </p>

          <h2>Erro 3 — escolher por eliminação</h2>
          <p>
            &quot;Não gosto de Biologia, não gosto de Direito, sobra Gestão&quot; não é uma escolha — é a ausência de uma. Sem
            nenhuma hipótese concreta para testar, a decisão acaba por ser feita no último dia, sob pressão, com a informação
            mínima possível.
          </p>

          <h2>Um ponto de partida mais sólido</h2>
          <p>
            Antes de te candidatares, vale a pena mapear três coisas: onde tens talento natural (não só boa nota), como
            aprendes melhor, e que áreas concretas combinam com isso — não uma lista genérica de &quot;profissões do
            futuro&quot;. É exactamente isto que a análise do VocationIQ faz, cruzando os teus dados de nascimento com
            astrologia psicológica para mapear talentos, forma de aprender e áreas de maior crescimento.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-que-curso-escolher-12-ano"
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
