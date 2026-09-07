import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { obterTextoRelatorioActual, atualizarCoordenadasNascimento } from "@/lib/storage";
import { reconstruirHTMLRelatorio, GeocodeError } from "@/lib/relatorioAdultoCompute";
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
    // TAREFA 1D (correcção do especialista) — decide adulto/adolescente a
    // partir de intake.situacao num único sítio (nunca duplicado aqui).
    // FRENTE 1 (correcção do especialista, prova de geração real) —
    // `actual.criadoEm` é o único lugar de onde este timestamp pode vir,
    // nunca uma data calculada agora ("Ver PDF" nunca gera texto novo).
    const { html, coordenadasNascimento } = await reconstruirHTMLRelatorio(intake, actual.texto, actual.coordenadasNascimento, actual.criadoEm);
    // RISCO ARQUITECTURAL 7 — auto-cura: esta linha ainda não tinha
    // coordenadas guardadas (rascunho de antes da migração 0018) e acabou
    // de geocodificar de novo por não ter escolha — grava agora, para
    // nunca mais precisar. Nunca bloqueia "Ver PDF" se falhar.
    if (!actual.coordenadasNascimento) {
      await atualizarCoordenadasNascimento(actual.id, coordenadasNascimento).catch((err) => console.error("[pdf] falha ao gravar coordenadas de nascimento (não bloqueante):", err));
    }
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
