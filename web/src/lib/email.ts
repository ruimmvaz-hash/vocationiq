import "server-only";
import { Resend } from "resend";
import { SITUACOES } from "@/lib/validation";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "VocationIQ <hello@vocationiq.app>";
const REPLY_TO = "hello@vocationiq.app";
const ADMIN_EMAIL = "hello@vocationiq.app";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const SITUACAO_LABEL: Record<string, string> = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

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

/**
 * Saudação/assunto com nome — os emails de Natal/Ano Novo (FASE 2,
 * TAREFA 4) vão também para leads (`viq_leads`, que nunca guarda nome,
 * só email), ao contrário de todos os outros emails desta ficha
 * (sempre clientes, sempre com `intake.nome`). Em vez de inventar um
 * nome, cai para uma saudação/assunto neutros quando `nome` vem vazio.
 */
function saudacao(nome: string): string {
  return nome ? `Olá ${escapeHtml(nome)},` : "Olá,";
}
function comNome(nome: string, texto: string): string {
  return nome ? `${texto}, ${nome}` : texto;
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
    ${p("A tua análise personalizada está agora em preparação e será enviada para este email em até 72 horas.")}
    ${seccaoTitulo("O que acontece a seguir")}
    <ol style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">A nossa equipa analisa o teu perfil</li>
      <li style="margin-bottom:6px;">O relatório é revisto por uma pessoa</li>
      <li>Recebes o teu relatório por email em até 72 horas</li>
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

// Uma fileira só de estrelas idênticas (⭐⭐⭐⭐⭐ repetido 5x, cada uma um
// link diferente) não deixa claro qual estrela corresponde a que nota —
// cada linha mostra as estrelas da nota INTEIRA + um rótulo, para não
// haver dúvida sobre o que se está a escolher.
const RATULOS_NOTA: Record<number, string> = { 5: "Excelente", 4: "Muito bom", 3: "Bom", 2: "Razoável", 1: "Fraco" };

function linksEstrelas(intakeId: string): string {
  const linha = (n: number) => `
    <a href="${SITE_URL}/avaliacao?nota=${n}&id=${intakeId}" style="display:block;text-decoration:none;margin-bottom:8px;padding:12px 16px;border-radius:6px;background:#FFF8EB;border:1px solid #F5A623;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#142C52;">
      <span style="color:#F5A623;letter-spacing:2px;">${"⭐".repeat(n)}</span>&nbsp;&nbsp;<span style="font-weight:700;">${RATULOS_NOTA[n]}</span>
    </a>`;
  return `<div style="margin:16px 0;">${[5, 4, 3, 2, 1].map(linha).join("")}</div>`;
}

/** Notificação interna — novo pedido pago, para o fundador. Nunca deve bloquear o webhook se falhar. */
export async function sendNewOrderAdminEmail(params: { nome: string; situacao: string; email: string; amountCents: number; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — notificação de novo pedido não enviada.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const situacaoLabel = escapeHtml(SITUACAO_LABEL[params.situacao] ?? params.situacao);
  const valor = (params.amountCents / 100).toFixed(2);
  const dataFormatada = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const link = `${SITE_URL}/admin/relatorios/${params.intakeId}`;

  const bodyHtml = `
    ${p("Novo pedido recebido.")}
    <p style="margin:0 0 6px;"><strong>Nome:</strong> ${escapeHtml(params.nome)}</p>
    <p style="margin:0 0 6px;"><strong>Situação:</strong> ${situacaoLabel}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
    <p style="margin:0 0 6px;"><strong>Valor:</strong> ${valor}€</p>
    <p style="margin:0 0 16px;"><strong>Data:</strong> ${dataFormatada}</p>
    ${botao(link, "Ver pedido", "azul")}
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Novo pedido VocationIQ — ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar notificação de novo pedido:", detail);
    return { ok: false, detail };
  }
}

/** Alerta interno — pedido pago há mais de 36h sem relatório entregue, para o fundador. Enviado pelo cron diário. */
export async function sendPending36hAlertEmail(params: { nome: string; email: string; paidAt: string; horasPendente: number; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — alerta de 36h não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const dataPedido = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(params.paidAt));
  const link = `${SITE_URL}/admin/relatorios/${params.intakeId}`;

  const bodyHtml = `
    ${p("Atenção — este pedido está pendente há mais de 36 horas.")}
    <p style="margin:0 0 6px;"><strong>Nome:</strong> ${escapeHtml(params.nome)}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
    <p style="margin:0 0 6px;"><strong>Data do pedido:</strong> ${dataPedido}</p>
    <p style="margin:0 0 16px;"><strong>Horas pendente:</strong> ${params.horasPendente}h</p>
    ${botao(link, "Ver pedido", "ambar")}
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `⚠ Relatório pendente há +36h — ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar alerta de 36h:", detail);
    return { ok: false, detail };
  }
}

/**
 * CORRECÇÃO 1 — alerta interno de pedido em risco: pago há mais de 60h
 * sem relatório entregue, contra o novo prazo de 72h (antes: 48h).
 * Copy exacta pedida. Enviado pelo cron de 4 em 4 horas
 * (api/cron/alerta-60h/route.ts) — nunca substitui o alerta de 36h
 * (sendPending36hAlertEmail, cron diário), que continua a existir tal
 * como está.
 */
export async function sendPending60hAlertEmail(params: { nome: string; email: string; paidAt: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — alerta de 60h não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const prazoLimite = new Date(new Date(params.paidAt).getTime() + 72 * 60 * 60 * 1000);
  const prazoFormatado = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(prazoLimite);
  const link = `${SITE_URL}/admin/relatorios/${params.intakeId}`;

  const bodyHtml = `
    ${p(`O pedido de ${escapeHtml(params.nome)} foi pago há mais de 60 horas e ainda não foi entregue.`)}
    <p style="margin:0 0 6px;"><strong>Prazo limite:</strong> ${prazoFormatado}</p>
    <p style="margin:0 0 16px;"><strong>Tempo restante:</strong> ~12 horas</p>
    ${botao(link, "Aceder ao backoffice", "ambar")}
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `⚠ Pedido em risco — ${params.nome} (60h passadas)`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar alerta de 60h:", detail);
    return { ok: false, detail };
  }
}

/** Email 2 — entrega do relatório, com PDF anexo. Enviado a partir do modal "Marcar como entregue" em /admin. */
export async function sendReportEmail(params: { to: string; nome: string; intakeId: string; codigoReferral: string; pdfBytes?: Buffer; pdfFilename?: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — relatório não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);

  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("O teu relatório VocationIQ está pronto.")}
    ${p("Encontras-o em anexo a este email.")}
    ${p("Lê com calma — foi escrito especificamente para ti.")}

    ${seccaoTitulo("Como foi a tua experiência?")}
    ${p("A tua opinião ajuda outros jovens e adultos a tomar a mesma decisão que tu tomaste.")}
    ${p("Clica na tua avaliação:")}
    ${linksEstrelas(params.intakeId)}

    ${seccaoTitulo("Conheces alguém que precisava disto?")}
    ${p("Se conheces um adolescente, jovem ou adulto com dúvidas sobre o seu caminho, podes ganhar por cada pessoa que trouxeres.")}
    ${p("20% de comissão por cada análise vendida — 25% a partir da 5ª venda. Registo gratuito, sem compromisso.")}
    ${botao(`${SITE_URL}/comercial`, "Saber mais sobre o programa de comerciais", "azul")}

    ${seccaoTitulo("O seu código de referência")}
    ${p("Conhece alguém que possa beneficiar de uma análise VocationIQ?")}
    <p style="margin:0 0 6px;"><strong>O seu código de referência é:</strong> ${escapeHtml(params.codigoReferral)}</p>
    ${p(`Partilhe em: <a href="${SITE_URL}/intake" style="color:#1B3A6B;">${SITE_HOST}/intake</a>`)}
    ${p("Quando alguém usar o seu código e fizer uma análise, recebe automaticamente um desconto.")}

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

  // Vai buscar o PDF ao próprio site em vez de ler do sistema de
  // ficheiros local — o conteúdo de public/ não é garantidamente
  // acessível por fs.readFileSync numa função serverless da Vercel,
  // mas é sempre servido normalmente por HTTP.
  let pdfBuffer: Buffer;
  try {
    const pdfRes = await fetch(`${SITE_URL}/exemplo-relatorio.pdf`);
    if (!pdfRes.ok) throw new Error(`GET /exemplo-relatorio.pdf → ${pdfRes.status}`);
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao obter o PDF de exemplo:", detail);
    return { ok: false, detail };
  }

  const bodyHtml = `
    ${p("Olá,")}
    ${p("Segue em anexo o exemplo completo de uma análise VocationIQ.")}
    ${p("Este relatório mostra o nível de profundidade e detalhe que recebes — desde o perfil de personalidade até às opções vocacionais concretas, com vias de entrada no mercado.")}
    ${p(`Se quiseres a tua análise pessoal, podes começar aqui: <a href="${SITE_URL}/intake" style="color:#1B3A6B;">${SITE_HOST}/intake</a>`)}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: "O teu exemplo de análise VocationIQ",
      html: wrapper(bodyHtml),
      attachments: [{ filename: "exemplo-analise-vocationiq.pdf", content: pdfBuffer, contentType: "application/pdf" }],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar exemplo:", detail);
    return { ok: false, detail };
  }
}

/**
 * Email de follow-up aos 90 dias — RETENÇÃO, TAREFA 3B: reescrito para
 * um tom mais pessoal (copy exacta pedida), a substituir a versão
 * anterior, mais transaccional. Nota de registo: a copy pedida usa
 * "você/sua" — mantido tal como especificado, mesmo sendo diferente do
 * registo "tu" do resto do site (incluindo a versão anterior deste
 * mesmo email); ver relatório final.
 */
export async function sendRevisao90Email(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de revisão (90d) não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Há 3 meses recebeu a sua análise VocationIQ. Esperamos que tenha sido útil.")}
    ${p("Gostaríamos de saber:")}
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">Tomou alguma decisão com base na análise?</li>
      <li style="margin-bottom:6px;">Há algo que ainda não está claro?</li>
      <li>Precisou de ajuda a implementar o plano?</li>
    </ul>
    ${p("Se quiser partilhar como está a correr — ou se tiver dúvidas — pode responder directamente a este email.")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `${params.nome}, como está a correr?`,
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

/**
 * Email de follow-up aos 180 dias — só enviado se ainda não comprou
 * revisão. RETENÇÃO, TAREFA 3B: reescrito (copy exacta pedida). Nota de
 * registo: mesma ressalva "você/sua" do email de 90 dias acima. Dispara
 * exactamente aos 180 dias; `sendComoEstaEmail` (FASE 2, TAREFA 2, sem
 * venda) dispara 2 semanas depois, por decisão do fundador, para nunca
 * chegarem no mesmo dia.
 */
export async function sendRevisao180Email(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de revisão (180d) não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const linkRevisao = `${SITE_URL}/revisao?id=${params.intakeId}`;
  const linkTestemunho = `${SITE_URL}/avaliacao?id=${params.intakeId}`;
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Já passaram 6 meses desde que recebeu a sua análise VocationIQ.")}
    ${p("Muito pode ter mudado desde então. Se sentir que é altura de rever o plano ou explorar novas opções, estamos aqui.")}
    ${p("E se a análise foi útil, adorávamos ouvir a sua história — um testemunho seu ajuda outras pessoas a tomar a mesma decisão que tomou.")}
    ${botao(linkTestemunho, "Partilhar a minha história", "azul")}
    ${botao(linkRevisao, "Rever o meu plano — 20% desconto", "ambar")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `6 meses depois — ${params.nome}, como está?`,
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

/** RETENÇÃO, TAREFA 1C — email de aniversário do cliente, com cupão de 20%. Copy exacta pedida. */
export async function sendAniversarioEmail(params: { to: string; nome: string; codigoCupao: string; dataExpiracao: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de aniversário não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const dataFormatada = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(params.dataExpiracao));
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("No seu aniversário, queremos agradecer a confiança que depositou em nós.")}
    ${p("Como presente, aqui está um cupão de 20% desconto para uma nova análise VocationIQ — para si ou para oferecer a alguém especial.")}
    <p style="margin:0 0 6px;"><strong>Código:</strong> ${escapeHtml(params.codigoCupao)}</p>
    <p style="margin:0 0 16px;"><strong>Válido até:</strong> ${dataFormatada}</p>
    ${botao(`${SITE_URL}/intake`, "Usar em vocationiq.app/intake", "ambar")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Parabéns, ${params.nome}! 🎂 Um presente da VocationIQ`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar email de aniversário:", detail);
    return { ok: false, detail };
  }
}

/** RETENÇÃO, TAREFA 2B — alerta de mudança de Mahadasha. Copy exacta pedida. */
export async function sendMahadashaAlertaEmail(params: { to: string; nome: string; mahadashaActual: string; proximaMahadasha: string; descricaoMudanca: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — alerta de Mahadasha não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("A sua análise VocationIQ identificou que está prestes a entrar numa nova fase do seu ciclo pessoal.")}
    ${p(`O período actual (${escapeHtml(params.mahadashaActual)}) termina em aproximadamente 3 meses. O próximo período (${escapeHtml(params.proximaMahadasha)}) traz consigo ${escapeHtml(params.descricaoMudanca)}.`)}
    ${p("Este é um bom momento para rever o seu plano e perceber como aproveitar melhor esta transição.")}
    ${botao(`${SITE_URL}/revisao`, "Reservar uma revisão", "ambar")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `O seu ciclo vai mudar em breve — ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar alerta de Mahadasha:", detail);
    return { ok: false, detail };
  }
}

/** RETENÇÃO, TAREFA 4C — agradecimento ao cliente que referiu uma compra confirmada, com cupão de 15%. Copy exacta pedida. */
export async function sendReferralAgradecimentoEmail(params: { to: string; nome: string; codigoCupao: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — agradecimento de referência não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Alguém que conhece usou a sua recomendação e fez uma análise VocationIQ.")}
    ${p("Como agradecimento, aqui está um cupão de 15% desconto para a sua próxima análise ou para oferecer:")}
    <p style="margin:0 0 6px;"><strong>Código:</strong> ${escapeHtml(params.codigoCupao)}</p>
    <p style="margin:0 0 16px;"><strong>Válido 60 dias.</strong></p>
    ${p("Obrigado por confiar em nós o suficiente para recomendar.")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Alguém que conhece confiou em si, ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar agradecimento de referência:", detail);
    return { ok: false, detail };
  }
}

// ---------- RETENÇÃO, FASE 2 ----------

/** FASE 2, TAREFA 1B — aniversário de 1 ano da entrega do relatório, com cupão de 15%. Copy exacta pedida. */
export async function sendAniversarioRelatorioEmail(params: { to: string; nome: string; codigoCupao: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de aniversário do relatório não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Há exactamente um ano recebeu a sua análise VocationIQ.")}
    ${p("Muito pode ter mudado desde então — decisões tomadas, caminhos iniciados, perguntas que surgiram.")}
    ${p("Gostaríamos de saber como correu. Se quiser partilhar, pode responder directamente a este email.")}
    ${p("E se sentir que é altura de rever o plano ou fazer uma nova análise, temos um desconto especial para si:")}
    <p style="margin:0 0 6px;"><strong>Código:</strong> ${escapeHtml(params.codigoCupao)}</p>
    <p style="margin:0 0 16px;"><strong>Válido 30 dias.</strong></p>
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Há um ano recebeu a sua análise — ${params.nome}, como correu?`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar aniversário do relatório:", detail);
    return { ok: false, detail };
  }
}

/** FASE 2, TAREFA 2B — "como está a correr?" aos 6 meses, sem venda, a pedir testemunho. Copy exacta pedida. */
export async function sendComoEstaEmail(params: { to: string; nome: string; intakeId: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email 'como está a correr' não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const linkTestemunho = `${SITE_URL}/avaliacao?id=${params.intakeId}`;
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Já passaram 6 meses desde que recebeu a sua análise VocationIQ.")}
    ${p("Não temos nada para vender — só queríamos saber como está a correr.")}
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">Tomou alguma decisão com base na análise?</li>
      <li style="margin-bottom:6px;">Há algo que ainda não está claro?</li>
      <li>O plano está a funcionar?</li>
    </ul>
    ${p("Se a análise foi útil, adorávamos ouvir a sua história — um testemunho seu ajuda outras pessoas a tomar a mesma decisão que tomou.")}
    ${botao(linkTestemunho, "Partilhar a minha história", "azul")}
    ${p("Pode responder directamente a este email.")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `6 meses depois, ${params.nome} — como está?`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar 'como está a correr':", detail);
    return { ok: false, detail };
  }
}

/** FASE 2, TAREFA 3B — início de ano personalizado, com o período astrológico actual. Copy exacta pedida (o parágrafo de favorável/consolidação é escolhido pelo chamador, nunca inventado aqui). */
export async function sendInicioAnoEmail(params: { to: string; nome: string; mahadasha: string; antardasha: string; descricaoPeriodo: string; paragrafoExtra: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de início de ano não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const nome = escapeHtml(params.nome);
  const bodyHtml = `
    ${p(`Olá ${nome},`)}
    ${p("Começou um novo ano — e o seu perfil astrológico tem algo a dizer sobre ele.")}
    ${p(`Está actualmente num período de ${escapeHtml(params.mahadasha)} / ${escapeHtml(params.antardasha)} — ${escapeHtml(params.descricaoPeriodo)}.`)}
    ${p(params.paragrafoExtra)}
    ${p("Se quiser rever o seu plano à luz deste novo ciclo, estamos disponíveis.")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `O que este ano traz para si, ${params.nome}`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar início de ano:", detail);
    return { ok: false, detail };
  }
}

/** FASE 2, TAREFA 4 — cupão de Natal (5-23 Dezembro), 10%. Mesma copy para clientes e leads consentidos — só o código/mecanismo do cupão muda (pessoal vs. genérico de campanha, ver cupoesStore.ts). Copy exacta pedida. */
export async function sendNatalCupaoEmail(params: { to: string; nome: string; codigoCupao: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — cupão de Natal não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const bodyHtml = `
    ${p(saudacao(params.nome))}
    ${p("O Natal está a aproximar-se e queremos oferecer-lhe um presente.")}
    ${p("Um cupão de 10% desconto numa análise VocationIQ — para si ou para oferecer a alguém especial.")}
    <p style="margin:0 0 6px;"><strong>Código:</strong> ${escapeHtml(params.codigoCupao)}</p>
    <p style="margin:0 0 16px;"><strong>Válido até 31 de Janeiro.</strong></p>
    ${botao(`${SITE_URL}/intake`, "Usar em vocationiq.app/intake", "ambar")}
    <p style="margin:24px 0 0;">Boas festas,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: comNome(params.nome, "Um presente de Natal da VocationIQ"),
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar cupão de Natal:", detail);
    return { ok: false, detail };
  }
}

/** FASE 2, TAREFA 4 — "Feliz Natal" (25 Dezembro), sem venda. Copy exacta pedida. */
export async function sendNatalFelizEmail(params: { to: string; nome: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de Feliz Natal não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const bodyHtml = `
    ${p(saudacao(params.nome))}
    ${p("Neste dia especial, queremos desejar-lhe um Feliz Natal — a si e a toda a sua família.")}
    ${p("Que este seja um momento de descanso, celebração e alegria com quem mais importa.")}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `${comNome(params.nome, "Feliz Natal")} 🎄`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar Feliz Natal:", detail);
    return { ok: false, detail };
  }
}

/** FASE 2, TAREFA 4 — "Feliz Ano Novo" (31 Dezembro), sem venda. Copy exacta pedida. */
export async function sendAnoNovoEmail(params: { to: string; nome: string }): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    console.warn("[vocationiq email] RESEND_API_KEY não configurada — email de Ano Novo não enviado.");
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }

  const anoQueVem = new Date().getUTCFullYear() + 1;
  const bodyHtml = `
    ${p(saudacao(params.nome))}
    ${p("No último dia deste ano, queremos desejar-lhe um Feliz Ano Novo — cheio de clareza, coragem e boas decisões.")}
    ${p(`Que ${anoQueVem} traga tudo o que procura.`)}
    <p style="margin:24px 0 0;">Com os melhores cumprimentos,<br/>Equipa VocationIQ</p>
  `;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `${comNome(params.nome, "Feliz Ano Novo")} 🎉`,
      html: wrapper(bodyHtml),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[vocationiq email] falha ao enviar Feliz Ano Novo:", detail);
    return { ok: false, detail };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
