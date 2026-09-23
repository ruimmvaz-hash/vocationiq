import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Mapa astral e escolha de carreira: como funciona, sem promessas vazias — VocationIQ",
  description:
    "O mapa astral não diz que profissão vais ter. Mostra padrões de talento, forma de aprender e onde tendes a render mais — e é isso que a astrologia psicológica cruza com a tua situação real.",
};

const FAQ = [
  {
    pergunta: "O mapa astral diz mesmo qual profissão devo escolher?",
    resposta:
      "Não, e qualquer análise séria evita essa promessa. O mapa astral mostra padrões — onde tens talento natural, como aprendes melhor, que tipo de ambiente te desgasta ou te energiza. A escolha da profissão exacta continua a ser tua, cruzada com o mercado, as tuas circunstâncias e o que já sabes sobre ti.",
  },
  {
    pergunta: "Qual a diferença entre isto e um horóscopo?",
    resposta:
      "Um horóscopo generalista fala do teu signo solar para toda a gente nascida no mesmo mês. A astrologia psicológica usada no VocationIQ lê o mapa completo — posições de vários planetas, casas, aspectos — que é único para a tua hora e local de nascimento, não só o mês.",
  },
  {
    pergunta: "Preciso de saber a hora exacta a que nasci?",
    resposta:
      "Ajuda bastante — a hora determina a casa astrológica, que tem peso na leitura vocacional. Se não a souberes com exactidão, o processo de intake explica como proceder; a análise continua a ser possível, só com algum ajuste ao que se pode ler com confiança.",
  },
  {
    pergunta: "Isto é astrologia védica ou ocidental?",
    resposta:
      "O motor do VocationIQ cruza os dois sistemas — Védico e Ocidental — em vez de escolher só um. Cada sistema tem pontos fortes diferentes na leitura de talento e vocação, e a combinação reduz o risco de uma leitura parcial ou enviesada por um método só.",
  },
];

export default function MapaAstralEscolhaDeCarreiraPage() {
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
          Mapa astral e escolha de carreira: como funciona, sem promessas vazias
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          O mapa astral não escolhe a tua profissão. Mostra o material com que trabalhas — e é aí que entra uma leitura
          vocacional séria.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>O que um mapa astral mostra, de facto</h2>
          <p>
            Um mapa astral é um registo das posições dos planetas no momento e local exactos em que nasceste. Na astrologia
            psicológica, essas posições são lidas como padrões — tendências de temperamento, forma de aprender, tipo de
            ambiente onde rendes melhor, o que te motiva a longo prazo. Não é um calendário de acontecimentos futuros nem
            uma lista de profissões pré-definidas.
          </p>

          <h2>Onde entra a escolha vocacional</h2>
          <p>
            A pergunta &quot;que profissão devo escolher&quot; não tem resposta directa num mapa astral — e devias
            desconfiar de quem promete isso. O que o mapa oferece é um conjunto de pistas consistentes sobre onde o teu
            perfil tende a encaixar com menos atrito e mais retorno. Cruzar essas pistas com a tua situação real — o que já
            tentaste, o que sabes sobre ti, as opções concretas que tens à frente — é o trabalho que transforma um mapa
            genérico numa leitura vocacional útil.
          </p>

          <h2>Porque cruzar Védico e Ocidental em vez de escolher um só</h2>
          <p>
            Os dois sistemas astrológicos têm histórico e ênfases diferentes. Usar só um deixa de fora ângulos que o outro
            capta. O motor do VocationIQ lê o teu mapa nos dois sistemas e cruza os resultados antes de gerar a análise —
            reduz o risco de uma conclusão apoiada num único ponto de vista.
          </p>

          <h2>O que isto não é</h2>
          <p>
            Não é uma previsão do que vais ganhar, nem uma garantia de sucesso numa área. É uma leitura de padrões,
            apresentada com o grau de confiança que os dados realmente sustentam — nalguns casos a indicação é forte,
            noutros é mais moderada, e a análise diz-te isso explicitamente em vez de simplificar tudo para soar mais
            convincente.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-mapa-astral-escolha-carreira"
          className="mt-10 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Quero a minha análise → €99
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
