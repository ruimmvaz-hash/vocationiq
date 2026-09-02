import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake, marcarIntakeEntregue } from "@/lib/store";
import { obterRascunho, guardarRelatorioPdf, marcarRelatorioEnviado } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";
import { registarEventoServidor } from "@/lib/eventLogServer";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { htmlParaPdf } from "@/lib/htmlToPdf";

/**
 * "Aprovar e enviar" para pedidos com rascunho gerado (ramo
 * trabalho-quero-mudar): gera o PDF automaticamente a partir do
 * rascunho aprovado, em vez de o admin ter de o exportar e fazer upload
 * à mão. Se qualquer passo falhar (o mais provável: Puppeteer/Chromium
 * no ambiente serverless), devolve erro e o frontend cai para o upload
 * manual (EntregarModal, inalterado) — nunca fica bloqueado.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (!intake.email) return NextResponse.json({ error: "este pedido não tem email associado" }, { status: 400 });
  if (intake.report_status === "delivered") return NextResponse.json({ error: "este pedido já foi marcado como entregue" }, { status: 400 });

  const rascunho = await obterRascunho(id);
  if (!rascunho) return NextResponse.json({ error: "não há rascunho gerado para este pedido — usa o upload manual" }, { status: 400 });

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

    const bytes = await htmlParaPdf(html);
    const filename = `Relatorio-VocationIQ-${intake.nome.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;

    const resultado = await sendReportEmail({ to: intake.email, nome: intake.nome, intakeId: id, pdfBytes: bytes, pdfFilename: filename });
    if (!resultado.ok) return NextResponse.json({ error: resultado.detail ?? "falha ao enviar o email" }, { status: 500 });

    const relatorio = await guardarRelatorioPdf({ intakeId: id, filename, bytes, contentType: "application/pdf" });
    await marcarRelatorioEnviado(relatorio.id);
    await marcarIntakeEntregue(id);
    await registarEventoServidor("report_delivered", { intakeId: id, viaEmail: true, automatico: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("[entregar-automatico] falha ao gerar/enviar PDF automaticamente:", message);
    return NextResponse.json({ error: `Geração automática falhou: ${message}` }, { status: 500 });
  }
}
