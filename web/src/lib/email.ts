import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";
const REPLY_TO = "hello@vocationiq.app";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export interface DeliveryResult {
  ok: boolean;
  detail?: string;
}

// Design base de todos os emails (pedido explícito): fundo #F5F5F5,
// container branco 600px/border-radius 8px, logo + tagline no topo,
// linha separadora #1B3A6B, rodapé com copyright. Tabelas HTML, não
// flexbox/grid — é o que funciona de forma previsível em clientes de
// email (Outlook em particular).
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

// Botão "à prova de bala" — tabela com o fundo, não <a style="display:
// inline-block"> sozinho, porque o Outlook (motor Word) ignora vários
// estilos em links soltos mas respeita células de tabela.
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

/** Email 1 — confirmação de pedido, enviado imediatamente após o pagamento. */
export async function sendConfirmationEmail(params: { to: string; nome: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — confirmação não enviada.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
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

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `A tua análise VocationIQ está em curso, ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar confirmação:", detail);
    return { ok: false, detail };
  }
}

/** Email 2 — entrega do relatório, com PDF anexo. Enviado a partir do modal "Marcar como entregue" em /admin. */
export async function sendReportEmail(params: { to: string; nome: string; pdfBytes?: Buffer; pdfFilename?: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — relatório não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const avaliacaoHref = `mailto:hello@vocationiq.app?subject=${encodeURIComponent("A minha avaliação VocationIQ")}`;

  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("O teu relatório VocationIQ está pronto.")}
    ${p("Encontras-o em anexo a este email.")}
    ${p("Lê com calma — foi escrito especificamente para ti.")}

    ${seccaoTitulo("Partilha a tua experiência")}
    ${p("A tua opinião é muito importante para nós e para quem está a pensar fazer a análise.")}
    ${p("Se o relatório te ajudou, partilha a tua experiência connosco:")}
    ${botao(avaliacaoHref, "Deixar a minha avaliação", "ambar")}
    ${p("Podes enviar um texto simples — o que sentiste, o que te surpreendeu, o que mudou depois de leres. Publicamos no site (com a tua autorização) para ajudar outros a tomar a decisão.")}

    ${seccaoTitulo("Conheces alguém que precisava disto?")}
    ${p("Se conheces um adolescente, jovem ou adulto com dúvidas sobre o seu caminho, podes ganhar por cada pessoa que trouxeres.")}
    ${p("20% de comissão por cada análise vendida — 25% a partir da 5ª venda. Registo gratuito, sem compromisso.")}
    ${botao(`${SITE_URL}/comercial`, "Saber mais sobre o programa de comerciais", "azul")}

    <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #E6E6E6;">Obrigado por confiares no VocationIQ.</p>
    <p style="margin:8px 0 0;">VocationIQ<br/>hello@vocationiq.app</p>
  `;

  const attachments = params.pdfBytes && params.pdfFilename ? [{ filename: params.pdfFilename, content: params.pdfBytes.toString("base64") }] : undefined;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `O teu relatório VocationIQ está pronto, ${params.nome}`,
      html: wrapper(bodyHtml),
      attachments,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar relatório:", detail);
    return { ok: false, detail };
  }
}

/** Lead magnet da homepage ("Ainda tens dúvidas?") — copy exacta pedida. */
export async function sendLeadMagnetEmail(params: { to: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — exemplo não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const bodyHtml = `
    ${p("Olá, aqui está um exemplo de análise VocationIQ. [PDF em breve]")}
    ${p(`Quando quiseres a tua análise completa: <a href="${SITE_URL}/intake" style="color:#1B3A6B;">${SITE_HOST}/intake</a>`)}
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: "O teu exemplo VocationIQ",
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar exemplo:", detail);
    return { ok: false, detail };
  }
}

/** Email de follow-up aos 90 dias — copy exacta pedida. */
export async function sendRevisao90Email(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de revisão (90d) não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const link = `${SITE_URL}/revisao?id=${params.intakeId}`;
  const bodyHtml = `
    ${p(`Olá ${escapeHtml(params.nome)},`)}
    ${p("Há 3 meses recebeste a tua análise VocationIQ.")}
    ${p("Muito pode ter mudado desde então — e é exactamente aí que uma revisão faz sentido.")}
    ${p("A VocationIQ Revisão cruza o que já sabemos sobre o teu perfil com o que está a acontecer agora. Responde à tua dúvida actual com o contexto de quem já te conhece.")}
    <p style="margin:0 0 16px;font-weight:700;">€49 · Entrega em 48h</p>
    ${botao(link, "Ver a minha revisão →", "ambar")}
    <p style="margin:8px 0 16px;font-size:13px;color:#1A1A1A99;">${link.replace(/^https?:\/\//, "")}</p>
    ${p("Se não precisas agora, guarda este email — podes usar quando precisares.")}
    <p style="margin:24px 0 0;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Já passaram 3 meses — como está a correr, ${params.nome}?`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar revisão (90d):", detail);
    return { ok: false, detail };
  }
}

/** Email de follow-up aos 180 dias — só enviado se ainda não comprou revisão. Copy exacta pedida. */
export async function sendRevisao180Email(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de revisão (180d) não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const link = `${SITE_URL}/revisao?id=${params.intakeId}`;
  const bodyHtml = `
    ${p(`Olá ${escapeHtml(params.nome)},`)}
    ${p("6 meses é muito tempo.")}
    ${p("Se ainda tens dúvidas sobre o teu caminho, a revisão continua disponível por €49.")}
    ${botao(link, "Ver a minha revisão →", "ambar")}
    <p style="margin:24px 0 0;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: "Já passaram 6 meses desde a tua análise VocationIQ",
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar revisão (180d):", detail);
    return { ok: false, detail };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
