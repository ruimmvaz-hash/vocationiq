import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Imagens Unsplash (licença gratuita, hotlink directo ao CDN — ver commit).
const HERO_IMG = "https://images.unsplash.com/photo-1620355402809-5bc3f630b2ac?auto=format&fit=crop&w=1920&q=75";
const LEITURA_IMG = "https://images.unsplash.com/photo-1681396059172-7532b1ef8b47?auto=format&fit=crop&w=1000&q=75";

const PUBLICOS = [
  {
    titulo: "Adolescentes (9º–12º ano)",
    texto: "Ainda não sabes que curso escolher? Percebe primeiro quem és.",
    icon: IconCap,
  },
  {
    titulo: "Jovens adultos (18–25)",
    texto: "Tens dúvidas sobre o teu caminho? A resposta está em ti.",
    icon: IconCompass,
  },
  {
    titulo: "Adultos em transição",
    texto: "Queres mudar de área? Descobre onde realmente encaixas.",
    icon: IconSwitch,
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
        <section className="relative flex min-h-[560px] items-center overflow-hidden bg-navy-dark sm:min-h-[680px]">
          <Image src={HERO_IMG} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-navy/70" />
          <div className="relative mx-auto max-w-5xl px-6 py-20">
            <div className="max-w-2xl">
              <h1 className="text-[56px] font-extrabold leading-[1.05] tracking-tight text-white text-balance md:text-[72px]">
                Ainda não sabes que curso escolher?
              </h1>
              <p className="mt-6 max-w-lg text-[20px] font-normal leading-relaxed text-white/85">
                Uma análise personalizada que descobre os teus talentos naturais, como aprendes e as áreas onde podes
                crescer mais — para adolescentes, jovens e adultos em transição de carreira.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link
                  href="/intake"
                  className="rounded-md bg-amber px-7 py-3.5 text-base font-bold text-navy-dark shadow-lg shadow-black/20 transition hover:bg-amber-dark"
                >
                  Começar a minha análise
                </Link>
              </div>
              <p className="mt-4 text-sm font-semibold text-white/70">€99 · Entrega em 48h</p>
            </div>
          </div>
        </section>

        {/* 2. PARA QUEM É */}
        <section className="bg-navy">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Para quem é</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {PUBLICOS.map((p) => (
                <div key={p.titulo} className="rounded-lg border border-amber/30 bg-white/5 p-6">
                  <p.icon className="h-7 w-7 text-amber" />
                  <p className="mt-4 font-bold text-white">{p.titulo}</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. O QUE RECEBES */}
        <section className="bg-fog">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 sm:py-20 md:grid-cols-2 md:gap-14">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">O que recebes</h2>
              <ul className="mt-8 space-y-4">
                {RECEBES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-bold text-navy-dark">
                      ✓
                    </span>
                    <span className="text-navy/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative order-first aspect-[4/5] w-full overflow-hidden rounded-lg shadow-md md:order-last">
              <Image
                src={LEITURA_IMG}
                alt="Pessoa a ler um documento à luz natural"
                fill
                sizes="(min-width: 768px) 40vw, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* 4. COMO FUNCIONA */}
        <section className="bg-paper">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Como funciona</h2>
            <div className="relative mt-12 grid gap-10 sm:grid-cols-3">
              <div className="absolute left-0 right-0 top-6 hidden h-px bg-border sm:block" aria-hidden="true" />
              {PASSOS.map((p) => (
                <div key={p.numero} className="relative">
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-2xl font-extrabold text-amber ring-1 ring-border">
                    {p.numero}
                  </span>
                  <p className="mt-4 font-bold text-navy">{p.titulo}</p>
                  <p className="mt-1 text-sm text-ink/70">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PREÇO */}
        <section className="bg-navy">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
            <p className="text-5xl font-extrabold tracking-tight text-amber">€99</p>
            <p className="mt-3 text-white/80">Análise personalizada · 48h</p>
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

function IconCap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
    </svg>
  );
}

function IconCompass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4-2 2-6 4 2Z" />
    </svg>
  );
}

function IconSwitch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h13l-3-3" />
      <path d="M20 17H7l3 3" />
    </svg>
  );
}
