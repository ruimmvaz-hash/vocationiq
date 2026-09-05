import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake, marcarIntakeEntregue, atualizarEmailIntake } from "@/lib/store";
import { obterRascunho, guardarRelatorioPdf, marcarRelatorioEnviado, registarEnvio } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";
import { registarEventoServidor } from "@/lib/eventLogServer";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { htmlParaPdf } from "@/lib/htmlToPdf";

/**
 * "Aprovar e enviar" para pedidos com rascunho gerado (ramo
 * trabalho-quero-mudar): gera o PDF automaticamente a partir do
 * rascunho aprovado e envia por email — reintroduzida depois de a
 * primeira tentativa falhar em produção ("The input directory does not
 * exist"); causa raiz corrigida em next.config.mjs (ver comentário lá).
 * Aceita um email de envio no corpo do pedido (editável no modal),
 * usado em vez de intake.email quando fornecido — nunca bloqueia por
 * falta de email no pedido original (mesmo padrão de /entregar).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (intake.report_status === "delivered") return NextResponse.json({ error: "este pedido já foi marcado como entregue" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const emailFornecido = (body as { email?: unknown })?.email;
  const email = (typeof emailFornecido === "string" ? emailFornecido.trim() : "") || intake.email;
  if (!email || !email.includes("@")) return NextResponse.json({ error: "email de envio em falta ou inválido" }, { status: 400 });

  const rascunho = await obterRascunho(id);
  if (!rascunho) return NextResponse.json({ error: "não há rascunho gerado para este pedido" }, { status: 400 });

  try {
    const { axes, pesosPlanetas, savPorCasa, datas, intakeAdulto, horaAproximada, catalogoResultados } = await calcularDadosAstrologicos(intake);

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
    const html = gerarHTMLRelatorio(dadosTemplate, rascunho.texto, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

    const bytes = await htmlParaPdf(html);
    const filename = `Relatorio-VocationIQ-${intake.nome.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;

    const resultado = await sendReportEmail({ to: email, nome: intake.nome, intakeId: id, pdfBytes: bytes, pdfFilename: filename });
    if (!resultado.ok) return NextResponse.json({ error: resultado.detail ?? "falha ao enviar o email" }, { status: 500 });

    if (email !== intake.email) await atualizarEmailIntake(id, email);

    const relatorio = await guardarRelatorioPdf({ intakeId: id, filename, bytes, contentType: "application/pdf" });
    await marcarRelatorioEnviado(relatorio.id);
    await registarEnvio(relatorio.id, email, "inicial");
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
