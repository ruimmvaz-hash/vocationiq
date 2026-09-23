import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Teste vocacional online: como escolher um que sirva para algo — VocationIQ",
  description:
    "A maioria dos testes vocacionais online mede o que respondes hoje, não quem és. Percebe a diferença antes de escolheres um curso com base nisso.",
};

const FAQ = [
  {
    pergunta: "Um teste vocacional online é suficiente para escolher um curso?",
    resposta:
      "Como ponto de partida, sim — ajuda a organizar ideias. Como única base para uma decisão de vários anos, normalmente não: a maioria mede preferências do momento (o que respondes hoje), não a estrutura de talentos que tens desde a origem, que muda muito menos com o humor ou a pressão social.",
  },
  {
    pergunta: "Qual é a diferença entre um teste vocacional e uma análise como a do VocationIQ?",
    resposta:
      "Um teste de escolha múltipla pergunta o que preferes; a nossa análise cruza os teus dados de nascimento com astrologia psicológica para mapear talentos naturais, forma de aprender e áreas de maior crescimento — sem depender de auto-avaliação, que é fácil de distorcer por pressão familiar, moda ou insegurança.",
  },
  {
    pergunta: "Quanto tempo demora a receber os resultados?",
    resposta: "O formulário demora cerca de 2 minutos a preencher. A análise completa é entregue por email em 72 horas.",
  },
];

export default function TesteVocacionalOnlinePage() {
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
          Teste vocacional online: como escolher um que sirva para algo
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          Antes de responderes a mais um questionário de 40 perguntas, vale a pena perceber o que um teste vocacional online
          consegue mesmo medir — e o que não consegue.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>O problema dos testes de escolha múltipla</h2>
          <p>
            A maioria dos testes vocacionais gratuitos funciona da mesma forma: um conjunto de perguntas de "concordo/discordo"
            sobre o que gostas de fazer, seguido de um resultado que te encaixa numa de seis ou oito categorias genéricas
            (&quot;tipo social&quot;, &quot;tipo investigativo&quot;, e por aí fora). É um ponto de partida honesto, mas tem um
            limite estrutural: mede o que respondes <em>hoje</em>, num certo estado de espírito, com uma certa quantidade de
            pressão familiar, social e de rede social já dentro da cabeça.
          </p>
          <p>
            Faz o mesmo teste dois meses depois de uma conversa difícil com os pais sobre &quot;profissões com futuro&quot;, e é
            muito provável que as respostas mudem — não porque tu mudaste, mas porque a pergunta &quot;o que gostas de
            fazer&quot; é mais volátil do que parece.
          </p>

          <h2>O que vale a pena pedir a um teste vocacional</h2>
          <p>Antes de confiares o resultado, vale a pena perguntar três coisas sobre qualquer teste que faças:</p>
          <ul>
            <li>Mede talento e estrutura, ou só preferência declarada no momento?</li>
            <li>O resultado muda muito se o refizeres daqui a um mês, com outro estado de espírito?</li>
            <li>Dá-te uma direcção concreta, ou só uma categoria genérica que serve para metade das profissões do mercado?</li>
          </ul>

          <h2>A abordagem do VocationIQ</h2>
          <p>
            Em vez de partir de perguntas sobre o que preferes, cruzamos os teus dados de nascimento com astrologia psicológica
            para mapear a tua estrutura de talentos naturais, a forma como aprendes e decides, e as áreas onde tens maior
            probabilidade de crescer — sem depender de auto-avaliação, que é precisamente o que é mais fácil de distorcer.
            Recebes uma análise escrita, não uma categoria genérica.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-teste-vocacional-online"
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
