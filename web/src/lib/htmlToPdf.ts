import "server-only";

// Réplica exacta de naveya/web/src/lib/report/pdf.ts — é o código que gera
// TODOS os Life Reports individuais da Naveya em produção (runGeneration
// -> buildAndUploadDeliverables -> generateReportPdf), o produto principal
// e mais antigo do fundador, a correr há muito mais tempo que o
// VocationIQ. Se isto estivesse partido lá, nenhum cliente da Naveya
// alguma vez teria recebido um relatório — é essa a evidência de que a
// combinação puppeteer-core + @sparticuz/chromium funciona mesmo na
// Vercel, com a configuração certa em next.config.mjs (ver lá).

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

export async function htmlParaPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");

  let executablePath: string;
  let args: string[];
  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
  } else {
    // Desenvolvimento local (fora da Vercel): @sparticuz/chromium é um
    // binário Linux, não corre aqui. Aponta CHROME_EXECUTABLE_PATH para um
    // Chrome/Edge instalado localmente para testar isto fora da Vercel.
    executablePath = process.env.CHROME_EXECUTABLE_PATH ?? "";
    if (!executablePath) {
      throw new Error("CHROME_EXECUTABLE_PATH não definida — necessária para gerar PDF fora da Vercel (em produção usa @sparticuz/chromium automaticamente).");
    }
    args = [];
  }

  const browser = await puppeteer.launch({ executablePath, args, headless: true });
  try {
    const page = await browser.newPage();
    // "load" espera que o <link> das Google Fonts termine de carregar
    // antes do snapshot — "domcontentloaded" disparava antes da fonte
    // chegar e o PDF saía com a fonte de sistema por engano.
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
