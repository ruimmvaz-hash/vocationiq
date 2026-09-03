import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake, marcarIntakeEntregue, atualizarEmailIntake } from "@/lib/store";
import { guardarRelatorioPdf, marcarRelatorioEnviado } from "@/lib/storage";
import { sendReportEmail } from "@/lib/email";
import { registarEventoServidor } from "@/lib/eventLogServer";

/**
 * Rota única para o modal "Marcar como entregue": recebe o PDF, envia o
 * Email 2 com o PDF anexo, guarda o ficheiro para registo, marca o
 * pedido como entregue e regista a data. Substitui o fluxo anterior em
 * dois passos (anexar → enviar) por um pedido só, tal como pedido.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento. Tenta novamente mais tarde." }, { status: 503 });

  const { id } = await params;

  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (intake.report_status === "delivered") return NextResponse.json({ error: "este pedido já foi marcado como entregue" }, { status: 400 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }

  // O admin pode sempre introduzir/corrigir o email de envio — nunca
  // bloqueia a entrega por falta de email no pedido original.
  const emailFornecido = formData.get("email");
  const email = (typeof emailFornecido === "string" ? emailFornecido.trim() : "") || intake.email;
  if (!email || !email.includes("@")) return NextResponse.json({ error: "email de envio em falta ou inválido" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "o PDF do relatório é obrigatório" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "só são aceites ficheiros PDF" }, { status: 400 });

  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    const resultado = await sendReportEmail({ to: email, nome: intake.nome, intakeId: id, pdfBytes: bytes, pdfFilename: file.name });
    if (!resultado.ok) return NextResponse.json({ error: resultado.detail ?? "falha ao enviar o email" }, { status: 500 });

    if (email !== intake.email) await atualizarEmailIntake(id, email);

    const relatorio = await guardarRelatorioPdf({ intakeId: id, filename: file.name, bytes, contentType: file.type });
    await marcarRelatorioEnviado(relatorio.id);
    await marcarIntakeEntregue(id);
    await registarEventoServidor("report_delivered", { intakeId: id, viaEmail: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
