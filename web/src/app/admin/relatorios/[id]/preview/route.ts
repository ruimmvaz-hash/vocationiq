import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake } from "@/lib/store";
import { obterTextoRelatorioActual, atualizarCoordenadasNascimento } from "@/lib/storage";
import { reconstruirHTMLRelatorio, GeocodeError } from "@/lib/relatorioAdultoCompute";

export const dynamic = "force-dynamic";

// Pré-visualização em HTML do texto mais actual (obterTextoRelatorioActual
// — o rascunho novo se existir, senão o entregue). Um banner injectado a
// seguir ao <body>, marcado para não imprimir, aponta para "Ver PDF" (que
// já gera o PDF automaticamente — não precisa de Ctrl+P manual desde que
// puppeteer-core/@sparticuz/chromium voltou a funcionar em produção).
function paginaSimples(titulo: string, mensagem: string): Response {
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${titulo}</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:40px;color:#1A1A1A;"><h1 style="color:#1B3A6B;">${titulo}</h1><p>${mensagem}</p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return paginaSimples("Não autenticado", "Inicia sessão no backoffice e volta a abrir este link.");

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return paginaSimples("Pedido não encontrado", "Confirma o link.");

  const actual = await obterTextoRelatorioActual(id);
  if (!actual) return paginaSimples("Ainda sem rascunho", "Gera o rascunho no backoffice antes de pré-visualizar o relatório.");

  try {
    // BUG REAL, corrigido (ronda "Miguel — secção perdida no preview") —
    // esta rota reconstruía o HTML à mão, chamando SEMPRE
    // calcularDadosAstrologicos (a versão adulto), nunca verificando
    // intake.situacao — ao contrário de "Ver PDF"/"Ver Word", que já
    // usavam reconstruirHTMLRelatorio (a única função central que decide
    // adulto/adolescente, ver relatorioAdultoCompute.ts). Para um pedido
    // do ramo adolescente, isto produzia um HTML em registo errado
    // ("você" em vez de "tu"), com um bloco extra só do ramo adulto
    // ("ponte de transição"), e sem opcoesConsideradas real nenhuma —
    // nunca a causa de uma secção desaparecer (confirmado por teste
    // directo), mas um bug real por si só, na única das 3 rotas de
    // exportação que ainda não passava pelo ponto único de decisão.
    // Corrigido reutilizando reconstruirHTMLRelatorio, nunca duplicando
    // a lógica de novo aqui.
    const { html, coordenadasNascimento } = await reconstruirHTMLRelatorio(intake, actual.texto, actual.coordenadasNascimento, actual.criadoEm);
    if (!actual.coordenadasNascimento) {
      await atualizarCoordenadasNascimento(actual.id, coordenadasNascimento).catch((err) => console.error("[preview] falha ao gravar coordenadas de nascimento (não bloqueante):", err));
    }

    const avisoRascunho = actual.origem === "rascunho" ? " (rascunho ainda não aprovado — o relatório entregue continua diferente deste)" : "";
    const banner = `
      <div class="viq-preview-banner" style="position:sticky;top:0;z-index:999;background:#F5A623;color:#142C52;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-align:center;">
        Pré-visualização${avisoRascunho} — para gerar o PDF, usa o botão "Ver PDF" no backoffice.
      </div>
      <style>@media print { .viq-preview-banner { display: none !important; } }</style>`;
    const htmlComBanner = html.replace("<body>", `<body>${banner}`);

    return new Response(htmlComBanner, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    if (err instanceof GeocodeError) return paginaSimples("Falha ao gerar a pré-visualização", err.message);
    const message = err instanceof Error ? err.message : String(err);
    return paginaSimples("Falha ao gerar a pré-visualização", message);
  }
}
