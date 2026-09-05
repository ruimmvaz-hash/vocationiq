import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterTextoRelatorioActual, guardarAuditoriaLlm } from "@/lib/storage";

// "Analisar raciocínio do LLM" (secção 4 de /admin/relatorios/[id]) — uma
// segunda chamada à Anthropic, sempre explícita (nunca automática, nunca
// disparada ao gerar o rascunho), a pedir ao modelo que explique as
// próprias decisões de escrita sobre o prompt técnico + o texto que já
// gerou. Auditoria interna, nunca mostrada ao cliente.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.REPORT_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 4096;

const INSTRUCAO = `Tens à tua frente o prompt técnico que foi enviado para gerar este relatório e o texto que geraste.

Para cada secção do relatório que escreveste, explica:
1. Que dados técnicos leste e usaste como base
2. Que conclusão tiraste e porquê
3. Que dados técnicos ignoraste e porquê
4. Que tensões identificaste mas decidiste não nomear
5. Que alternativas consideraste antes de escrever o que escreveste

Sê específico — cita os dados técnicos exactos (pesos, casas, períodos) que fundamentaram cada decisão.
Esta análise é para uso interno.`;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada." }, { status: 503 });

  try {
    const actual = await obterTextoRelatorioActual(id);
    if (!actual) return NextResponse.json({ error: "Não há rascunho ou relatório entregue para este pedido." }, { status: 404 });
    if (!actual.promptCompleto) {
      return NextResponse.json({ error: "Este rascunho não tem o prompt técnico guardado (gerado antes desta funcionalidade existir) — regenera o rascunho para poder auditar." }, { status: 400 });
    }

    const promptAuditoria = `${INSTRUCAO}\n\n=== PROMPT TÉCNICO ENVIADO ===\n${actual.promptCompleto}\n\n=== TEXTO QUE GERASTE ===\n${actual.texto}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: promptAuditoria }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      const tiposDeBloco = response.content.map((b) => b.type).join(", ") || "(nenhum bloco)";
      throw new Error(`Resposta da Anthropic sem bloco de texto (stop_reason=${response.stop_reason}, blocos=[${tiposDeBloco}]).`);
    }

    const { criadoEm } = await guardarAuditoriaLlm(actual.id, textBlock.text);

    return NextResponse.json({ ok: true, auditoriaLlm: textBlock.text, auditoriaCriadaEm: criadoEm });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auditoria-llm] falha ao analisar o raciocínio:", message);
    return NextResponse.json({ error: `Não foi possível analisar o raciocínio: ${message}` }, { status: 500 });
  }
}
