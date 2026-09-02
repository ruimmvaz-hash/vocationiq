import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

export interface DeliveryResult {
  ok: boolean;
  detail?: string;
}

function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1A1A1A;">
      <p style="color:#1B3A6B;font-size:20px;font-weight:800;margin-bottom:32px;">Vocation<span style="color:#F5A623;">IQ</span></p>
      ${bodyHtml}
      <p style="margin-top:48px;font-size:11px;color:#1A1A1A66;">© ${new Date().getFullYear()} VocationIQ</p>
    </div>`;
}

/** Email enviado depois do pagamento confirmado (Tarefa 6 — copy exacta pedida). */
export async function sendConfirmationEmail(params: { to: string; nome: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — confirmação não enviada.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;">Olá ${escapeHtml(params.nome)},</p>
    <p style="font-size:16px;line-height:1.7;">Recebemos o teu pedido.</p>
    <p style="font-size:16px;line-height:1.7;">A tua análise personalizada estará pronta em 48 horas e será enviada para este email.</p>
    <p style="font-size:16px;line-height:1.7;">Se tiveres alguma dúvida, responde a este email.</p>
    <p style="font-size:16px;line-height:1.7;margin-top:24px;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: "A tua análise VocationIQ está em curso",
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

/** Envio do relatório final, em PDF anexo, pelo fundador via /admin. */
export async function sendReportEmail(params: { to: string; nome: string; pdfBytes: Buffer; pdfFilename: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — relatório não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;">Olá ${escapeHtml(params.nome)},</p>
    <p style="font-size:16px;line-height:1.7;">A tua análise VocationIQ está pronta — vai em anexo, em PDF.</p>
    <p style="font-size:16px;line-height:1.7;">Se tiveres alguma dúvida, responde a este email.</p>
    <p style="font-size:16px;line-height:1.7;margin-top:24px;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: "A tua análise VocationIQ",
      html: wrapper(bodyHtml),
      attachments: [{ filename: params.pdfFilename, content: params.pdfBytes.toString("base64") }],
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
    <p style="font-size:16px;line-height:1.7;">Olá, aqui está um exemplo de análise VocationIQ. [PDF em breve]</p>
    <p style="font-size:16px;line-height:1.7;">Quando quiseres a tua análise completa: <a href="${SITE_URL}/intake">${SITE_URL.replace(/^https?:\/\//, "")}/intake</a></p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
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

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#F5A623;color:#142C52;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">${label}</a>`;
}

/** Email de follow-up aos 90 dias — copy exacta pedida. */
export async function sendRevisao90Email(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de revisão (90d) não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const link = `${SITE_URL}/revisao?id=${params.intakeId}`;
  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;">Olá ${escapeHtml(params.nome)},</p>
    <p style="font-size:16px;line-height:1.7;">Há 3 meses recebeste a tua análise VocationIQ.</p>
    <p style="font-size:16px;line-height:1.7;">Muito pode ter mudado desde então — e é exactamente aí que uma revisão faz sentido.</p>
    <p style="font-size:16px;line-height:1.7;">A VocationIQ Revisão cruza o que já sabemos sobre o teu perfil com o que está a acontecer agora. Responde à tua dúvida actual com o contexto de quem já te conhece.</p>
    <p style="font-size:16px;line-height:1.7;font-weight:700;">€49 · Entrega em 48h</p>
    <p style="margin-top:24px;">${ctaButton(link, "Ver a minha revisão →")}</p>
    <p style="margin-top:16px;font-size:13px;color:#1A1A1A99;">${link.replace(/^https?:\/\//, "")}</p>
    <p style="font-size:16px;line-height:1.7;margin-top:24px;">Se não precisas agora, guarda este email — podes usar quando precisares.</p>
    <p style="font-size:16px;line-height:1.7;margin-top:24px;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
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
    <p style="font-size:16px;line-height:1.7;">Olá ${escapeHtml(params.nome)},</p>
    <p style="font-size:16px;line-height:1.7;">6 meses é muito tempo.</p>
    <p style="font-size:16px;line-height:1.7;">Se ainda tens dúvidas sobre o teu caminho, a revisão continua disponível por €49.</p>
    <p style="margin-top:24px;">${ctaButton(link, "Ver a minha revisão →")}</p>
    <p style="font-size:16px;line-height:1.7;margin-top:24px;">VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
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
