import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

interface DeliveryResult {
  ok: boolean;
  detail?: string;
}

function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1A1A1A;">
      <p style="color:#1B3A6B;font-size:20px;font-weight:800;margin-bottom:32px;">Vocation<span style="color:#F5A623;">IQ</span> — Comerciais</p>
      ${bodyHtml}
      <p style="margin-top:48px;font-size:11px;color:#1A1A1A66;">© ${new Date().getFullYear()} VocationIQ</p>
    </div>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#F5A623;color:#142C52;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">${label}</a>`;
}

async function send(to: string, subject: string, bodyHtml: string): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[comercial email] RESEND_API_KEY não configurada.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }
  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html: wrapper(bodyHtml) });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[comercial email] falha ao enviar:", detail);
    return { ok: false, detail };
  }
}

export async function sendComercialInviteEmail(params: { to: string; nome: string }): Promise<DeliveryResult> {
  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;">Olá ${params.nome},</p>
    <p style="font-size:16px;line-height:1.7;">Fostes convidado a ser comercial VocationIQ. Regista-te para receberes o teu link e começares a ganhar comissão.</p>
    <p style="margin-top:24px;">${ctaButton(`${SITE_URL}/comercial`, "Completar o registo")}</p>
  `;
  return send(params.to, "Convite — comercial VocationIQ", bodyHtml);
}

export async function sendComercialMagicLinkEmail(params: { to: string; nome: string; token: string }): Promise<DeliveryResult> {
  const link = `${SITE_URL}/api/comercial/verify?token=${encodeURIComponent(params.token)}`;
  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;">Olá ${params.nome},</p>
    <p style="font-size:16px;line-height:1.7;">Usa o botão abaixo para entrares no teu painel de comercial VocationIQ. O link expira em 1 hora.</p>
    <p style="margin-top:24px;">${ctaButton(link, "Entrar no painel")}</p>
  `;
  return send(params.to, "O teu acesso ao painel de comercial VocationIQ", bodyHtml);
}
