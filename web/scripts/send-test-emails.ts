// Envia os dois emails novos (confirmação de pedido + entrega do
// relatório) para hello@vocationiq.app, com dados de teste ("Rui"), via
// Resend directamente. Auto-contido — não importa lib/email.ts, porque
// esse ficheiro tem "import server-only" e um script tsx corre fora do
// bundler da Next.js, tal como scripts/create-stripe-product.ts não
// importa lib/stripe.ts pela mesma razão. O HTML aqui replica
// exactamente lib/email.ts — se alterares o design lá, actualiza aqui
// também (ou corre este script logo a seguir para confirmar visualmente).
//
// Uso:
//   RESEND_API_KEY=re_... npx tsx scripts/send-test-emails.ts

import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error("Falta RESEND_API_KEY no ambiente.");
  process.exit(1);
}

const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";
const REPLY_TO = "hello@vocationiq.app";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const TO = "hello@vocationiq.app";
const NOME = "Rui";

function wrapper(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F5F5F5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 40px 24px;font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:28px;font-weight:700;color:#1B3A6B;">Vocation<span style="color:#F5A623;">IQ</span></div>
                <div style="font-size:13px;color:#F5A623;margin-top:6px;">Descobre a tua área. Antes de escolheres.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <div style="border-top:2px solid #1B3A6B;line-height:0;font-size:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;font-size:16px;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 40px;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1A1A1A99;">
                © ${new Date().getFullYear()} VocationIQ · hello@vocationiq.app · ${SITE_HOST}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function botao(href: string, label: string, cor: "azul" | "ambar"): string {
  const bg = cor === "azul" ? "#1B3A6B" : "#F5A623";
  const fg = cor === "azul" ? "#FFFFFF" : "#142C52";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr>
        <td style="border-radius:6px;background:${bg};">
          <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${fg};text-decoration:none;border-radius:6px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function seccaoTitulo(texto: string): string {
  return `<p style="margin:32px 0 12px;padding-top:20px;border-top:1px solid #E6E6E6;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1B3A6B;">${texto}</p>`;
}

function p(texto: string): string {
  return `<p style="margin:0 0 16px;">${texto}</p>`;
}

function linksEstrelas(intakeId: string): string {
  const estrela = (n: number) =>
    `<a href="${SITE_URL}/avaliacao?nota=${n}&id=${intakeId}" style="text-decoration:none;font-size:32px;line-height:1;padding:0 4px;">⭐</a>`;
  return `<div style="margin:16px 0;">${[1, 2, 3, 4, 5].map(estrela).join("")}</div>`;
}

async function main() {
  const resend = new Resend(key);

  // Email 1 — confirmação de pedido
  const bodyEmail1 = `
    ${p(`Olá ${NOME},`)}
    ${p("Recebemos o teu pedido e o pagamento foi confirmado.")}
    ${p("A tua análise personalizada está agora em preparação e será enviada para este email em até 48 horas.")}
    ${seccaoTitulo("O que acontece a seguir")}
    <ol style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">A nossa equipa analisa o teu perfil</li>
      <li style="margin-bottom:6px;">O relatório é revisto por uma pessoa</li>
      <li>Recebes o teu relatório por email em até 48 horas</li>
    </ol>
    ${p("Se tiveres alguma dúvida, responde directamente a este email.")}
    ${botao(SITE_URL, "Visitar vocationiq.app", "azul")}
  `;

  const resultado1 = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO,
    replyTo: REPLY_TO,
    subject: `[TESTE] A tua análise VocationIQ está em curso, ${NOME}`,
    html: wrapper(bodyEmail1),
  });
  console.log("Email 1 (confirmação):", resultado1.error ? `FALHOU — ${resultado1.error.message}` : `enviado, id ${resultado1.data?.id}`);

  // Email 2 — entrega do relatório (sem PDF, só teste de design)
  const idTeste = "00000000-0000-0000-0000-000000000000"; // id fictício — só para o link ter a forma certa, não resolve a um pedido real
  const bodyEmail2 = `
    ${p(`Olá ${NOME},`)}
    ${p("O teu relatório VocationIQ está pronto.")}
    ${p("Encontras-o em anexo a este email.")}
    ${p("Lê com calma — foi escrito especificamente para ti.")}

    ${seccaoTitulo("Como foi a tua experiência?")}
    ${p("A tua opinião ajuda outros jovens e adultos a tomar a mesma decisão que tu tomaste.")}
    ${p("Clica na tua avaliação:")}
    ${linksEstrelas(idTeste)}

    ${seccaoTitulo("Conheces alguém que precisava disto?")}
    ${p("Se conheces um adolescente, jovem ou adulto com dúvidas sobre o seu caminho, podes ganhar por cada pessoa que trouxeres.")}
    ${p("20% de comissão por cada análise vendida — 25% a partir da 5ª venda. Registo gratuito, sem compromisso.")}
    ${botao(`${SITE_URL}/comercial`, "Saber mais sobre o programa de comerciais", "azul")}

    <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #E6E6E6;">Obrigado por confiares no VocationIQ.</p>
    <p style="margin:8px 0 0;">VocationIQ<br/>hello@vocationiq.app</p>
  `;

  const resultado2 = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO,
    replyTo: REPLY_TO,
    subject: `[TESTE] O teu relatório VocationIQ está pronto, ${NOME}`,
    html: wrapper(bodyEmail2),
    // Sem anexo de propósito — pedido explícito: "é só teste de design".
  });
  console.log("Email 2 (entrega, sem PDF):", resultado2.error ? `FALHOU — ${resultado2.error.message}` : `enviado, id ${resultado2.data?.id}`);
}

main().catch((err) => {
  console.error("Falha a enviar os emails de teste:", err);
  process.exit(1);
});
