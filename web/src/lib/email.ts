import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
