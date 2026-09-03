import "server-only";
// @ts-expect-error — html-to-docx não publica tipos oficiais
import HTMLtoDOCX from "html-to-docx";

// Word simples pedido para "Ver Word" no backoffice — só texto
// estruturado (títulos + parágrafos), sem o design completo do relatório
// (sem cores/SVG: já se sabe, de uma tentativa anterior nesta mesma
// sessão, que html-to-docx os perde — mas para este uso, texto puro
// editável antes de enviar, isso não importa).

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Converte o texto do rascunho (cabeçalhos "## "/"### " + parágrafos soltos) em HTML mínimo com <h1>/<h2>/<p>. */
function textoParaHtmlSimples(texto: string): string {
  const linhas = texto.split("\n");
  const partes: string[] = [];
  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    if (linha.startsWith("### ")) {
      partes.push(`<h2>${escapeHtml(linha.slice(4))}</h2>`);
    } else if (linha.startsWith("## ")) {
      partes.push(`<h1>${escapeHtml(linha.slice(3))}</h1>`);
    } else {
      partes.push(`<p>${escapeHtml(linha)}</p>`);
    }
  }
  return partes.join("\n");
}

export async function textoParaDocx(titulo: string, textoRascunho: string): Promise<Buffer> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(titulo)}</h1>${textoParaHtmlSimples(textoRascunho)}</body></html>`;
  const buffer = await HTMLtoDOCX(html, null, { footer: false, pageNumber: false });
  return Buffer.from(buffer);
}
