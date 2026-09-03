import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake, atualizarEmailIntake } from "@/lib/store";
import { obterRelatorioMaisRecente, baixarRelatorioPdf, registarEnvio } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";

/** "Reenviar relatório" — reenvia o PDF já guardado para um email (por omissão, o do pedido), sem alterar report_status/delivered_at. Regista o reenvio no histórico. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const relatorio = await obterRelatorioMaisRecente(id);
  if (!relatorio?.pdfPath || !relatorio.pdfFilename) return NextResponse.json({ error: "Sem PDF guardado para reenviar — usa \"Ver PDF\" primeiro para gerar um." }, { status: 400 });

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
    const bytes = await baixarRelatorioPdf(relatorio.pdfPath);
    const resultado = await sendReportEmail({ to: email, nome: intake.nome, intakeId: id, pdfBytes: bytes, pdfFilename: relatorio.pdfFilename });
    if (!resultado.ok) return NextResponse.json({ error: resultado.detail ?? "falha ao enviar o email" }, { status: 500 });

    await registarEnvio(relatorio.id, email, "reenvio");
    if (email !== intake.email) await atualizarEmailIntake(id, email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível reenviar: ${message}` }, { status: 500 });
  }
}
