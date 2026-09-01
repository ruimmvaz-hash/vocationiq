import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Pedido recebido — VocationIQ" };

export default function ObrigadoPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-6 py-20 text-center sm:py-28">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Recebemos o teu pedido.</h1>
        <p className="mt-4 text-lg text-ink/75">
          A tua análise personalizada estará pronta em 48 horas e vai ser enviada para o email que usaste no pagamento.
        </p>
        <p className="mt-8 text-sm text-ink/55">Alguma dúvida? Escreve para hello@vocationiq.app.</p>
      </main>
      <Footer />
    </>
  );
}
