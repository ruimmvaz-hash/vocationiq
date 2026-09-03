import "server-only";
import { existsSync } from "fs";
import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";

// DESVIO do pedido original: "puppeteer" (com Chromium completo embutido,
// ~280MB) instala e corre bem em desenvolvimento, mas em produção numa
// função serverless da Vercel isto tipicamente excede o limite de
// tamanho da função ou falha a arrancar (faltam bibliotecas partilhadas
// no runtime, semelhante ao AWS Lambda). A combinação estabelecida para
// este cenário exacto é `puppeteer-core` (sem browser embutido) +
// `@sparticuz/chromium` (um Chromium comprimido, compatível com esse
// runtime) — mesma API do Puppeteer, só muda como o browser é lançado.
// Em desenvolvimento local usa-se o Chrome já instalado na máquina, para
// não obrigar a descarregar outro binário.
//
// Reintroduzido depois de uma primeira tentativa falhada em produção
// ("The input directory does not exist") — causa raiz identificada:
// faltava next.config.mjs incluir explicitamente o binário do Chromium
// via outputFileTracingIncludes (o output file tracing da Vercel não o
// detecta sozinho, porque @sparticuz/chromium resolve o caminho em
// runtime, não de forma estaticamente analisável). Ver next.config.mjs —
// mesma correcção já validada em produção pela Naveya.

const CAMINHOS_CHROME_LOCAL = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

async function resolverOpcoesArranque(): Promise<{ args?: string[]; executablePath: string; headless: boolean | "shell" }> {
  const emVercel = Boolean(process.env.VERCEL);
  if (emVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return { args: chromium.args, executablePath: await chromium.executablePath(), headless: true };
  }

  const caminhoLocal = process.env.PUPPETEER_EXECUTABLE_PATH ?? CAMINHOS_CHROME_LOCAL.find((p) => existsSync(p));
  if (!caminhoLocal) {
    throw new Error("Chrome não encontrado localmente para gerar o PDF — define PUPPETEER_EXECUTABLE_PATH com o caminho do Chrome instalado.");
  }
  return { args: ["--no-sandbox", "--disable-setuid-sandbox"], executablePath: caminhoLocal, headless: true };
}

export async function htmlParaPdf(html: string): Promise<Buffer> {
  const opcoes = await resolverOpcoesArranque();
  const browser: Browser = await puppeteer.launch(opcoes);
  try {
    const page = await browser.newPage();
    // "networkidle0/2" não são aceites por setContent() nesta versão do
    // puppeteer-core (só fazem sentido numa navegação real) — "load"
    // espera pelos recursos externos (a folha de estilo da Google Fonts
    // incluída), suficiente para o relatório não imprimir sem a fonte.
    await page.setContent(html, { waitUntil: "load" });
    const pdfOptions: PDFOptions = { format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } };
    const pdf = await page.pdf(pdfOptions);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
