import "server-only";

// DESVIO final: puppeteer-core + @sparticuz/chromium (duas tentativas,
// incluindo a correcção de output file tracing que a Naveya usa) continuou
// a falhar em produção na Vercel com "The input directory does not
// exist" — sem confirmação de que essa combinação alguma vez funcionou lá
// (ver a auditoria anterior: a entrada de tracing do chromium na Naveya
// nunca teve um commit de "corrigido em produção" dedicado, ao contrário
// da entrada do ephe/). Substituído pela API do PDFShift — um serviço
// externo dedicado a HTML->PDF, sem binário nenhum para empacotar/traçar.

export async function htmlParaPdf(html: string): Promise<Buffer> {
  const apiKey = process.env.PDFSHIFT_API_KEY;
  if (!apiKey) throw new Error("PDFSHIFT_API_KEY não configurada");

  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: html,
      format: "A4",
      margin: "0",
      print_background: true,
    }),
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`PDFShift erro: ${response.status} ${erro}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
