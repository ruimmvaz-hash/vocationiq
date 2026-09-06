// Utilitário de teste — converte um HTML já gerado (docs/*.html) num PDF,
// com puppeteer-core + Chrome local (réplica do que `htmlToPdf.ts` faz em
// produção, sem o import "server-only" que só resolve dentro do Next.js).
// Só para verificação visual local — nunca chama a Anthropic nem o Supabase.
//
// Uso: CHROME_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npx tsx scripts/html-para-pdf.ts relatorio-v9.html relatorio-v9.pdf

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer-core";

async function main() {
  const nomeEntrada = process.argv[2];
  const nomeSaida = process.argv[3] || nomeEntrada.replace(/\.html$/, ".pdf");
  if (!nomeEntrada) throw new Error("Uso: npx tsx scripts/html-para-pdf.ts <ficheiro.html> [ficheiro.pdf]");

  const executablePath = process.env.CHROME_EXECUTABLE_PATH ?? "";
  if (!executablePath) throw new Error("CHROME_EXECUTABLE_PATH não definida.");

  const docsDir = join(process.cwd(), "..", "docs");
  const html = readFileSync(join(docsDir, nomeEntrada), "utf-8");

  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const outPath = join(docsDir, nomeSaida);
    writeFileSync(outPath, pdf);
    console.log(`Guardado em: ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Falha na conversão HTML->PDF:", err);
  process.exit(1);
});
