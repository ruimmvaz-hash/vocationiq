import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PUBLICOS = [
  {
    titulo: "Adolescentes (9º–12º ano)",
    texto: "Ainda não sabes que curso escolher? Percebe primeiro quem és.",
  },
  {
    titulo: "Jovens adultos (18–25)",
    texto: "Tens dúvidas sobre o teu caminho? A resposta está em ti.",
  },
  {
    titulo: "Adultos em transição",
    texto: "Queres mudar de área? Descobre onde realmente encaixas.",
  },
];

const RECEBES = [
  "Análise dos teus talentos naturais",
  "Como aprendes e decides melhor",
  "As áreas onde rendes mais",
  "O que pode estar a travar-te",
  "Direcções concretas a explorar",
  "Entregue em 48 horas",
];

const PASSOS = [
  { numero: "1", titulo: "Preenches os teus dados", texto: "Um formulário curto — 2 minutos." },
  { numero: "2", titulo: "Analisamos o teu perfil", texto: "Cruzamos os teus dados com o nosso método." },
  { numero: "3", titulo: "Recebes o teu relatório", texto: "Por email, pronto a ler, em 48 horas." },
];

const FAQ = [
  {
    pergunta: "O que é exactamente o VocationIQ?",
    resposta:
      "Uma análise personalizada que cruza os teus dados de nascimento com o teu momento actual, para mapear os teus talentos naturais, a tua forma de decidir e aprender, e as áreas onde tens mais probabilidade de te destacares.",
  },
  {
    pergunta: "Como é feita a análise?",
    resposta:
      "Aplicamos um método próprio de análise de perfil aos teus dados e à tua situação — depois um humano revê e escreve o teu relatório. Não é um teste genérico com resultado automático.",
  },
  {
    pergunta: "Para que idade é indicado?",
    resposta: "Desde o final do 9º ano até à vida adulta — sempre que estiveres a decidir entre caminhos.",
  },
  {
    pergunta: "Quanto tempo demora?",
    resposta: "48 horas desde a confirmação do pagamento.",
  },
  {
    pergunta: "Como recebo o relatório?",
    resposta: "Por email, no endereço que usares no pagamento.",
  },
  {
    pergunta: "Posso oferecer a outra pessoa?",
    resposta: "Sim — preenche o formulário com os dados da pessoa a quem queres oferecer o relatório.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* 1. HERO */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">
              Descobre onde realmente rendes.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/80">
              Uma análise personalizada que te ajuda a perceber os teus talentos naturais, a tua forma de aprender e as
              áreas onde podes crescer mais.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/intake"
                className="rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
              >
                Começar a minha análise
              </Link>
              <span className="text-sm font-semibold text-ink/60">€99 · Entrega em 48h</span>
            </div>
          </div>
        </section>

        {/* 2. PARA QUEM É */}
        <section className="border-t border-border bg-fog">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Para quem é</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {PUBLICOS.map((p) => (
                <div key={p.titulo} className="rounded-lg border border-border bg-paper p-6">
                  <p className="font-bold text-navy">{p.titulo}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink/75">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. O QUE RECEBES */}
        <section>
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">O que recebes</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {RECEBES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    ✓
                  </span>
                  <span className="text-ink/85">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. COMO FUNCIONA */}
        <section className="border-t border-border bg-fog">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Como funciona</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.numero}>
                  <span className="text-3xl font-extrabold text-amber-dark">{p.numero}</span>
                  <p className="mt-2 font-bold text-navy">{p.titulo}</p>
                  <p className="mt-1 text-sm text-ink/70">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PREÇO */}
        <section>
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
            <p className="text-5xl font-extrabold tracking-tight text-navy">€99</p>
            <p className="mt-3 text-ink/70">Análise personalizada · 48h</p>
            <Link
              href="/intake"
              className="mt-8 inline-block rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
            >
              Começar a minha análise
            </Link>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="border-t border-border bg-fog">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Perguntas frequentes</h2>
            <div className="mt-8 divide-y divide-border">
              {FAQ.map((f) => (
                <details key={f.pergunta} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy">
                    {f.pergunta}
                    <span className="ml-4 shrink-0 text-amber-dark transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink/75">{f.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
