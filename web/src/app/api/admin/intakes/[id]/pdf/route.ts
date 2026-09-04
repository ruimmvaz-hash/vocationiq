import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { obterRelatorioEntregue, baixarRelatorioPdf } from "@/lib/storage";

/** "Ver PDF" no backoffice, sempre disponível depois da entrega — serve o PDF já guardado no Storage. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const relatorio = await obterRelatorioEntregue(id);
  if (!relatorio) return NextResponse.json({ error: "Sem PDF guardado para este pedido." }, { status: 404 });

  try {
    const bytes = await baixarRelatorioPdf(relatorio.pdfPath);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${relatorio.pdfFilename}"` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível obter o PDF: ${message}` }, { status: 500 });
  }
}
