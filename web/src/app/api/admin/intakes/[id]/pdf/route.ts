import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { obterTextoRelatorioActual } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { htmlParaPdf } from "@/lib/htmlToPdf";

/**
 * "Ver PDF" — gera SEMPRE o PDF a partir do texto mais actual
 * (obterTextoRelatorioActual: o rascunho novo se existir, senão o texto
 * do relatório entregue) e devolve-o directamente, sem tocar no
 * Storage. Corrige um bug real: antes servia sempre os bytes já
 * guardados no Storage no momento da entrega — depois de "Regenerar
 * rascunho", "Ver PDF" continuava a mostrar a versão antiga, porque o
 * Storage só é actualizado quando se aprova ("Aprovar e enviar"/
 * "Aprovar e reenviar"), nunca só ao visualizar. Também garante que
 * correcções ao template (margens, Roda da Vida, etc.) aparecem sempre,
 * mesmo para pedidos entregues antes dessas correcções existirem.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const actual = await obterTextoRelatorioActual(id);
  if (!actual) return NextResponse.json({ error: "Sem rascunho nem relatório entregue para este pedido." }, { status: 404 });

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
    const html = gerarHTMLRelatorio(dadosTemplate, actual.texto, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa);
    const bytes = await htmlParaPdf(html);
    const filename = `Relatorio-VocationIQ-${intake.nome.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;

    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"` },
    });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível gerar o PDF: ${message}` }, { status: 500 });
  }
}
