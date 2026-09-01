import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Termos — VocationIQ" };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">Termos de Serviço</h1>
        <div className="prose-sm mt-8 space-y-5 text-sm leading-relaxed text-ink/80">
          <p>
            O VocationIQ vende um serviço único: uma análise personalizada, entregue em formato digital por email, no
            prazo de 48 horas após a confirmação do pagamento.
          </p>
          <p>
            O preço é de €99 por análise, cobrado através da Stripe no momento do pedido. Não é uma subscrição — não há
            cobranças recorrentes.
          </p>
          <p>
            A análise é gerada a partir dos dados fornecidos no formulário (nome, data, hora e local de nascimento, e
            contexto adicional opcional). É da responsabilidade de quem submete o pedido garantir que estes dados estão
            correctos — a análise não pode ser corrigida a posteriori sem novos dados.
          </p>
          <p>
            Se o pedido for feito para um menor de idade, presume-se que quem submete o formulário e efectua o pagamento
            é o encarregado de educação ou responsável legal, e que o fez com o seu conhecimento e consentimento.
          </p>
          <p>
            O conteúdo do relatório é interpretativo e destina-se a apoiar a reflexão sobre percursos académicos e
            profissionais — não substitui aconselhamento vocacional certificado, psicológico ou médico.
          </p>
          <p>
            Por ser um serviço digital entregue de forma personalizada, não são processados reembolsos depois da
            entrega do relatório. Se houver um erro no pedido antes da entrega, contacta{" "}
            <a href="mailto:hello@vocationiq.app" className="text-navy underline">
              hello@vocationiq.app
            </a>
            .
          </p>
          <p className="text-ink/50">
            Este texto é um ponto de partida e deve ser revisto por um jurista antes de o site entrar em produção.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
