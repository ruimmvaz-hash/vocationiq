import { SECCAO_TITULOS } from "@naveya/method-engine";
import type { IntakeRow } from "./store";

// Template HTML do relatório VocationIQ Adulto — Passo 4
// (VOCATIONIQ-ADULTO-metodologia.md). Identidade visual VocationIQ (azul
// #1B3A6B + âmbar #F5A623), pronto para imprimir/converter em PDF
// (impressão de página, não email — por isso CSS normal, não tabelas
// "à prova de Outlook" como em lib/email.ts).

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Conversor minimalista de markdown -> HTML: parágrafos, listas numeradas, **negrito**. Suficiente para prosa de relatório — não um parser de markdown completo. */
function markdownParaHtml(bloco: string): string {
  const linhas = bloco.trim().split("\n");
  const partes: string[] = [];
  let paragrafoActual: string[] = [];
  let listaActual: string[] = [];

  function fecharParagrafo() {
    if (paragrafoActual.length) {
      partes.push(`<p>${paragrafoActual.join(" ")}</p>`);
      paragrafoActual = [];
    }
  }
  function fecharLista() {
    if (listaActual.length) {
      partes.push(`<ol>${listaActual.map((li) => `<li>${li}</li>`).join("")}</ol>`);
      listaActual = [];
    }
  }
  function inline(texto: string): string {
    return escapeHtml(texto).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (!linha) {
      fecharParagrafo();
      fecharLista();
      continue;
    }
    const itemNumerado = linha.match(/^\d+[.)]\s+(.*)/);
    if (itemNumerado) {
      fecharParagrafo();
      listaActual.push(inline(itemNumerado[1]));
      continue;
    }
    fecharLista();
    paragrafoActual.push(inline(linha));
  }
  fecharParagrafo();
  fecharLista();
  return partes.join("\n");
}

/** Divide o texto gerado pelo LLM nas 5 secções, pelos cabeçalhos "## <título>" pedidos no prompt (ver SECCAO_TITULOS, partilhado com promptAdulto.ts para as duas pontas nunca divergirem). */
function dividirEmSeccoes(texto: string): { titulo: string; corpo: string }[] {
  const titulos = Object.values(SECCAO_TITULOS);
  const escapados = titulos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regexCabecalho = new RegExp(`^##\\s+(${escapados.join("|")})\\s*$`, "gm");

  const marcadores: { titulo: string; inicioCabecalho: number; inicioCorpo: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regexCabecalho.exec(texto))) {
    marcadores.push({ titulo: match[1], inicioCabecalho: match.index, inicioCorpo: match.index + match[0].length });
  }

  if (marcadores.length === 0) {
    // Rede de segurança — se o LLM não seguiu o formato pedido, mostra o
    // texto inteiro numa única secção em vez de rebentar a página.
    return [{ titulo: "Relatório", corpo: texto }];
  }

  return marcadores.map((m, i) => {
    const fimCorpo = i + 1 < marcadores.length ? marcadores[i + 1].inicioCabecalho : texto.length;
    return { titulo: m.titulo, corpo: texto.slice(m.inicioCorpo, fimCorpo) };
  });
}

export function gerarHTMLRelatorio(intake: Pick<IntakeRow, "nome">, texto: string): string {
  const seccoes = dividirEmSeccoes(texto);
  const dataGeracao = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const corpoSeccoes = seccoes
    .map((s) => `<section class="seccao"><h2>${escapeHtml(s.titulo)}</h2>${markdownParaHtml(s.corpo)}</section>`)
    .join("\n");

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório VocationIQ — ${escapeHtml(intake.nome)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1A1A1A; background: #FFFFFF; margin: 0; padding: 0; }
  .header { background: #1B3A6B; padding: 48px 60px; text-align: center; }
  .logo { font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: 700; color: #FFFFFF; }
  .logo .iq { color: #F5A623; }
  .tagline { font-family: Arial, Helvetica, sans-serif; color: #F5A623; font-size: 13px; margin-top: 8px; letter-spacing: 0.3px; }
  .container { max-width: 720px; margin: 0 auto; padding: 50px 60px 20px; }
  .subtitulo { font-family: Arial, Helvetica, sans-serif; color: #1A1A1A99; font-size: 14px; margin-bottom: 8px; }
  h2 { font-family: Arial, Helvetica, sans-serif; color: #1B3A6B; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; border-bottom: 2px solid #F5A623; padding-bottom: 10px; margin-top: 48px; margin-bottom: 20px; }
  .seccao:first-of-type h2 { margin-top: 32px; }
  p { line-height: 1.8; font-size: 16px; margin: 0 0 18px; }
  ol { padding-left: 22px; margin: 0 0 18px; }
  li { margin-bottom: 10px; line-height: 1.7; font-size: 16px; }
  strong { color: #1B3A6B; }
  .footer { font-family: Arial, Helvetica, sans-serif; text-align: center; padding: 30px 20px 50px; color: #1A1A1A66; font-size: 12px; }
  @media print {
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .seccao { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Vocation<span class="iq">IQ</span></div>
    <div class="tagline">Descobre a tua área. Antes de escolheres.</div>
  </div>
  <div class="container">
    <p class="subtitulo">Análise vocacional personalizada para ${escapeHtml(intake.nome)} · ${dataGeracao}</p>
    ${corpoSeccoes}
  </div>
  <div class="footer">© ${new Date().getFullYear()} VocationIQ · hello@vocationiq.app · vocationiq.app</div>
</body>
</html>`;
}
