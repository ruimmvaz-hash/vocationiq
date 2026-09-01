import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Torna-te comercial — VocationIQ" };

export default function ComercialPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-navy">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Vende VocationIQ, ganha comissão</h1>
            <p className="mt-4 text-lg text-white/85">Partilha o teu link. Cada análise vendida através dele rende-te comissão — sem limite.</p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <h2 className="text-xl font-extrabold text-navy">O que ganhas</h2>
          <p className="mt-3 text-ink/80">
            20% de comissão em cada uma das primeiras 4 vendas. A partir da 5ª venda, a tua taxa sobe para 25% — em todas as
            vendas seguintes. Sem tecto.
          </p>

          <h2 className="mt-10 text-xl font-extrabold text-navy">Como funciona o link</h2>
          <p className="mt-3 text-ink/80">
            Regista-te abaixo e recebes um link único (<code className="rounded bg-fog px-1.5 py-0.5 text-sm">vocationiq.app?ref=OTEUCODIGO</code>).
            Quem comprar através dele paga o preço normal — €99, sem desconto — e a venda fica automaticamente atribuída a ti.
          </p>

          <h2 className="mt-10 text-xl font-extrabold text-navy">Como és pago</h2>
          <p className="mt-3 text-ink/80">
            O teu painel mostra sempre a comissão acumulada. Quando quiseres receber, pedes o pagamento no painel — o
            fundador paga-te directamente e marca o valor como liquidado.
          </p>

          <h2 className="mt-10 text-xl font-extrabold text-navy">Exemplos de comissão (com €99 por venda)</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-ink/75">Vendas 1–4</td>
                  <td className="px-4 py-3 font-semibold text-navy">20% = €19,80 cada</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-ink/75">Venda 5 em diante</td>
                  <td className="px-4 py-3 font-semibold text-navy">25% = €24,75 cada</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-ink/75">10 vendas</td>
                  <td className="px-4 py-3 font-semibold text-navy">4×€19,80 + 6×€24,75 = €79,20 + €148,50 = €227,70</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-ink/75">20 vendas</td>
                  <td className="px-4 py-3 font-semibold text-navy">4×€19,80 + 16×€24,75 = €79,20 + €396,00 = €475,20</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12">
            <SignupForm />
          </div>

          <p className="mt-6 text-center text-sm text-ink/60">
            Já és comercial?{" "}
            <a href="/comercial/dashboard" className="font-semibold text-navy underline">
              Ir para o painel
            </a>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
