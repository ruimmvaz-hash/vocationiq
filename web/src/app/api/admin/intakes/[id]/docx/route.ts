import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { obterRelatorioMaisRecente } from "@/lib/storage";
import { textoParaDocx } from "@/lib/textoParaDocx";

/** "Ver Word" no backoffice — .docx simples (títulos + parágrafos, sem design) a partir do texto do rascunho, para o admin editar antes de reenviar se precisar. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;
  const intake = await obterIntake(id);
  if (!intake) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  const relatorio = await obterRelatorioMaisRecente(id);
  if (!relatorio?.rascunhoTexto) return NextResponse.json({ error: "Sem texto de relatório guardado para este pedido." }, { status: 404 });

  try {
    const buffer = await textoParaDocx(`Relatório VocationIQ — ${intake.nome}`, relatorio.rascunhoTexto);
    const filename = `Relatorio-VocationIQ-${intake.nome.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "-")}.docx`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível gerar o Word: ${message}` }, { status: 500 });
  }
}
