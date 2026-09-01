import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake, marcarIntakeEntregue } from "@/lib/store";
import { obterUltimoRelatorio, descarregarRelatorioPdf, marcarRelatorioEnviado } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";
import { registarEventoServidor } from "@/lib/eventLogServer";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (!intake.email) return NextResponse.json({ error: "este pedido não tem email associado" }, { status: 400 });

  const relatorio = await obterUltimoRelatorio(id);
  if (!relatorio) return NextResponse.json({ error: "ainda não anexaste nenhum PDF a este pedido" }, { status: 400 });

  try {
    const bytes = await descarregarRelatorioPdf(relatorio.pdf_path);
    const resultado = await sendReportEmail({ to: intake.email, nome: intake.nome, pdfBytes: bytes, pdfFilename: relatorio.pdf_filename });
    if (!resultado.ok) return NextResponse.json({ error: resultado.detail ?? "falha ao enviar" }, { status: 500 });

    await marcarRelatorioEnviado(relatorio.id);
    await marcarIntakeEntregue(id);
    await registarEventoServidor("report_delivered", { intakeId: id, viaEmail: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
