import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake, atualizarEmailIntake } from "@/lib/store";
import { obterRascunho, guardarRelatorioPdf, marcarRelatorioEnviado, registarEnvio } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { htmlParaPdf } from "@/lib/htmlToPdf";

/**
 * "Aprovar e reenviar" o rascunho NOVO gerado depois da entrega
 * (RelatorioEntregue.tsx > "Regenerar rascunho") — gera um PDF a partir
 * dele e envia-o ao cliente, exactamente como "Aprovar e enviar" faz na
 * primeira entrega, mas aqui já há uma entrega anterior. A linha do
 * rascunho novo (pdf_path ainda nulo) é promovida a entregue pelo mesmo
 * guardarRelatorioPdf() que já reaproveita essa linha — passa a ser a
 * linha "entregue" mais recente (obterRelatorioEntregue devolve sempre a
 * mais recente com pdf_path preenchido); a entrega anterior fica no
 * histórico, intacta. Nunca mexe em report_status/delivered_at — o
 * pedido já estava entregue.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const rascunho = await obterRascunho(id);
  if (!rascunho) return NextResponse.json({ error: "não há rascunho novo para aprovar" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const emailFornecido = (body as { email?: unknown })?.email;
  const email = (typeof emailFornecido === "string" ? emailFornecido.trim() : "") || intake.email;
  if (!email || !email.includes("@")) return NextResponse.json({ error: "email de envio em falta ou inválido" }, { status: 400 });

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
    await registarEnvio(relatorio.id, email, "reenvio");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("[aprovar-rascunho] falha ao gerar/enviar o novo rascunho:", message);
    return NextResponse.json({ error: `Não foi possível aprovar e enviar: ${message}` }, { status: 500 });
  }
}
