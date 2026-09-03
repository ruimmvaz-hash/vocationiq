import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake } from "@/lib/store";
import { obterRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";

export const dynamic = "force-dynamic";

// Substitui a geração automática de PDF (puppeteer-core/@sparticuz/chromium
// não funciona no ambiente serverless da Vercel — "The input directory does
// not exist" confirmado em produção). O admin abre esta rota numa nova tab,
// faz Ctrl+P → Guardar como PDF, e faz o upload manual no modal "Marcar
// como entregue". A instrução fica num banner injectado a seguir ao
// <body>, marcado para não imprimir (evita alterar relatorioTemplate.ts,
// que é o template real entregue ao cliente).
function paginaSimples(titulo: string, mensagem: string): Response {
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${titulo}</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:40px;color:#1A1A1A;"><h1 style="color:#1B3A6B;">${titulo}</h1><p>${mensagem}</p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return paginaSimples("Não autenticado", "Inicia sessão no backoffice e volta a abrir este link.");

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return paginaSimples("Pedido não encontrado", "Confirma o link.");

  const rascunho = await obterRascunho(id);
  if (!rascunho?.texto) return paginaSimples("Ainda sem rascunho", "Gera o rascunho no backoffice antes de pré-visualizar o relatório.");

  try {
    const { axes, pesosPlanetas, savPorCasa, datas, intakeAdulto, horaAproximada } = await calcularDadosAstrologicos(intake);

    const dadosTemplate: DadosParaTemplate = {
      nome: intake.nome,
      dataNascimento: intake.data_nascimento,
      horaNascimento: horaAproximada ? null : intake.hora_nascimento,
      localNascimento: intake.local_nascimento,
      situacaoDeclarada: intakeAdulto.situacaoDeclarada,
      areaActual: intakeAdulto.areaActual,
      anosExperiencia: intakeAdulto.anosExperiencia,
      oQueNaoFunciona: intakeAdulto.oQueNaoFunciona,
      opcoesConsideradas: intakeAdulto.areasDestino.concat(intakeAdulto.areasDestinoOutra ? [intakeAdulto.areasDestinoOutra] : []),
      ideiaConcreta: intakeAdulto.ideiaConcreta,
      perguntaEspecifica: intakeAdulto.perguntaEspecifica,
    };

    const html = gerarHTMLRelatorio(dadosTemplate, rascunho.texto, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa);

    const banner = `
      <div class="viq-preview-banner" style="position:sticky;top:0;z-index:999;background:#F5A623;color:#142C52;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-align:center;">
        Para gerar o PDF: Ctrl+P (ou Cmd+P) → Guardar como PDF → fazer upload no modal "Marcar como entregue".
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
