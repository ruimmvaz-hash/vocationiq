import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

export const metadata: Metadata = {
  title: "Saídas profissionais de cada curso do secundário — VocationIQ",
  description:
    "Ciências e Tecnologias, Línguas e Humanidades, Ciências Socioeconómicas ou Artes Visuais: o que cada curso do 10º ano realmente abre e fecha, e o que fazer se escolheres mal.",
};

const FAQ = [
  {
    pergunta: "Qual curso do secundário abre mais portas?",
    resposta:
      "Ciências e Tecnologias é o que dá acesso ao maior número de cursos superiores, incluindo áreas de gestão e economia que também pedem Matemática A. Isso não significa que seja o curso certo para ti — só que, em termos de opções mantidas em aberto, é o mais amplo.",
  },
  {
    pergunta: "Posso mudar de curso depois de já ter escolhido no 10º ano?",
    resposta:
      "Sim, através de um pedido de mudança de percurso formativo na tua escola, mas não é automático nem sem custo: normalmente implica pôr-te em dia com disciplinas específicas que não tiveste (por exemplo, ir de Línguas e Humanidades para Ciências e Tecnologias exige recuperar Física-Química A e Biologia e Geologia). É possível, mas quanto mais cedo perceberes que escolheste mal, menos disciplinas há para recuperar.",
  },
  {
    pergunta: "Ciências Socioeconómicas serve para quê, já que não dá para Medicina nem Engenharia?",
    resposta:
      "Serve para economia, gestão, finanças, recursos humanos, administração pública e sociologia — áreas com procura real no mercado de trabalho português. O curso tem Matemática A, por isso mantém essa porta aberta; o que fecha são as áreas que exigem Biologia ou Física-Química como provas de ingresso específicas.",
  },
  {
    pergunta: "Um curso profissional é pior do que um curso científico-humanístico?",
    resposta:
      "Não é pior, é diferente: prepara para entrar no mercado de trabalho com uma qualificação técnica mais cedo, e continua a dar acesso ao ensino superior. Para quem já sabe que quer uma área técnica concreta, pode ser a opção mais directa — o erro é escolhê-lo (ou evitá-lo) só por pressão social, sem perceber o que de facto implica.",
  },
];

export default function SaidasProfissionaisCadaCursoPage() {
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
          Saídas profissionais de cada curso do secundário
        </h1>
        <p className="mt-4 text-lg text-ink/75">
          A escolha do 10º ano não decide a tua profissão — mas decide que portas ficam abertas e que portas ficam mais
          difíceis de abrir depois. Aqui está o que cada curso realmente permite.
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:text-navy prose-headings:font-extrabold">
          <h2>As quatro portas do 10º ano</h2>
          <p>
            Em Portugal, quem segue o ensino secundário regular escolhe entre quatro cursos científico-humanísticos:
            Ciências e Tecnologias, Línguas e Humanidades, Ciências Socioeconómicas e Artes Visuais. Cada um tem uma
            componente de formação geral comum (Português, Língua Estrangeira, Filosofia, Educação Física) e uma
            componente específica que é o que realmente separa as saídas de cada um. Há ainda o percurso dos cursos
            profissionais, com uma lógica diferente — mais orientado para uma saída técnica concreta.
          </p>

          <h2>O que cada curso abre</h2>
          <p>
            <strong>Ciências e Tecnologias</strong> é o que mantém mais portas abertas: dá acesso a agronomia,
            biologia, bioquímica, ciências do desporto ou do mar, engenharias, farmácia, medicina, química — e, por ter
            Matemática A, também às áreas de gestão e economia. É por isso que costuma ser o curso &quot;por defeito&quot; para
            quem ainda não decidiu, embora isso não o torne automaticamente a escolha certa.
          </p>
          <p>
            <strong>Ciências Socioeconómicas</strong> abre economia, finanças, gestão, recursos humanos, administração
            pública e sociologia. Tem Matemática A, mas não as disciplinas específicas (Biologia, Física-Química) que
            engenharia e medicina exigem como provas de ingresso — por isso essas áreas ficam de fora.
          </p>
          <p>
            <strong>Línguas e Humanidades</strong> serve para direito, ciência política, comunicação, filosofia,
            história, línguas, relações internacionais e tradução. Fecha o acesso directo a cursos de ciências,
            medicina, engenharia ou gestão que exigem matemática avançada como prova de ingresso.
          </p>
          <p>
            <strong>Artes Visuais</strong> prepara para arquitectura, design, cinema, artes plásticas, teatro e
            conservação e restauro. Tal como Humanidades, não dá acesso directo às áreas de ciências, engenharia ou
            gestão.
          </p>

          <h2>Mudar de curso a meio do secundário: é possível, mas tem custo</h2>
          <p>
            Se perceberes, no 10º ou 11º ano, que escolheste mal, existe um processo formal de mudança de percurso
            formativo, pedido na própria escola. Não é automático: normalmente implica recuperar as disciplinas
            específicas do novo curso que não tiveste no anterior, e a escola decide caso a caso consoante o que é
            exequível. Quanto mais cedo perceberes o desencontro, menos há para recuperar — o que torna a escolha
            inicial mais importante do que parece quando ainda se está no 9º ano a decidir.
          </p>

          <h2>Onde entra o VocationIQ</h2>
          <p>
            Antes de escolheres entre estas quatro portas — ou de perceberes se vale a pena pedir mudança de percurso —
            faz sentido perceber onde está o teu talento natural, não só onde a nota ou a pressão familiar te empurram.
            A análise do VocationIQ cruza os teus dados de nascimento com o teu perfil declarado para mapear isso, com
            relatório entregue por email em 72 horas.
          </p>
        </div>

        <TrackedCtaLink
          href="/intake"
          location="aprender-saidas-profissionais-cursos"
          className="mt-10 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
        >
          Quero a minha análise → €49
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
