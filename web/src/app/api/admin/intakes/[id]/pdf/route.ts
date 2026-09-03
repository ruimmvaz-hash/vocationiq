import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { obterRelatorioMaisRecente, baixarRelatorioPdf, guardarRelatorioPdf } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { htmlParaPdf } from "@/lib/htmlToPdf";

/**
 * "Ver PDF" no backoffice, sempre disponível depois da entrega. Serve o
 * PDF já guardado no Storage; se por algum motivo não existir (só devia
 * acontecer com dados antigos, anteriores à correcção que passou a
 * reaproveitar a linha do rascunho na entrega) mas ainda houver o texto
 * do rascunho, gera-o de novo e guarda-o antes de o devolver.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const relatorio = await obterRelatorioMaisRecente(id);
  if (!relatorio) return NextResponse.json({ error: "Sem relatório guardado para este pedido." }, { status: 404 });

  try {
    if (relatorio.pdfPath && relatorio.pdfFilename) {
      const bytes = await baixarRelatorioPdf(relatorio.pdfPath);
      return new Response(new Uint8Array(bytes), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${relatorio.pdfFilename}"` },
      });
    }

    if (!relatorio.rascunhoTexto) return NextResponse.json({ error: "Sem PDF nem rascunho guardado para este pedido." }, { status: 404 });

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
    const html = gerarHTMLRelatorio(dadosTemplate, relatorio.rascunhoTexto, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa);
    const bytes = await htmlParaPdf(html);
    const filename = `Relatorio-VocationIQ-${intake.nome.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;

    await guardarRelatorioPdf({ intakeId: id, filename, bytes, contentType: "application/pdf" });

    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"` },
    });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível obter o PDF: ${message}` }, { status: 500 });
  }
}
