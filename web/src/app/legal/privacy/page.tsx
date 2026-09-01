import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Privacidade — VocationIQ" };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">Política de Privacidade</h1>
        <div className="prose-sm mt-8 space-y-5 text-sm leading-relaxed text-ink/80">
          <p>
            Recolhemos os dados que preenches no formulário — nome, data, hora e local de nascimento, situação actual e
            o contexto que quiseres partilhar — apenas para gerar a tua análise personalizada e para te contactar sobre
            o teu pedido.
          </p>
          <p>
            O pagamento é processado directamente pela Stripe; não guardamos nem vemos os dados do teu cartão. A Stripe
            partilha connosco o email usado no pagamento, para te enviarmos o relatório.
          </p>
          <p>Usamos a Resend para enviar emails transaccionais (confirmação e entrega do relatório).</p>
          <p>
            Os teus dados ficam guardados apenas o tempo necessário para gerar e entregar o relatório, e para efeitos de
            suporte e obrigações fiscais/contabilísticas. Podes pedir a eliminação dos teus dados a qualquer momento
            escrevendo para{" "}
            <a href="mailto:hello@vocationiq.app" className="text-navy underline">
              hello@vocationiq.app
            </a>
            .
          </p>
          <p>Não vendemos nem partilhamos os teus dados com terceiros para fins de marketing.</p>
          <p className="text-ink/50">
            Este texto é um ponto de partida e deve ser revisto por um jurista antes de o site entrar em produção.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
