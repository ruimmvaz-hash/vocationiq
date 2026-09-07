import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, apagarRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicosAdolescente, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { construirPromptAdolescente } from "@naveya/method-engine";
import { construirPromptCriticaAdolescente, parseCritica, construirPromptReescrita } from "@/lib/criticaRelatorio";

// TAREFA 1A (correcção do especialista, ronda de produção do motor
// adolescente) — equivalente de api/relatorio/route.ts para o ramo
// adolescente ("9-ou-menos"/"10-11-12"). Mesma arquitectura de 3 passos
// (gerar → criticar → reescrever, sempre dentro do mesmo pedido), mesmo
// guardarRascunho/viq_relatorios (schema genérico, nenhuma migração nova
// necessária — ver relatório da ronda), só a computação de intake e o
// prompt mudam (calcularDadosAstrologicosAdolescente/
// construirPromptAdolescente em vez das versões adulto).
//
// AVISO DE MATURIDADE — ver o mesmo aviso no topo de
// method-engine/src/vocationiq/promptAdolescente.ts: a prosa instrucional
// do prompt adolescente é nova nesta ronda, nunca testada contra geração
// real. Recomenda-se um lote de teste revisto pelo fundador antes de usar
// esta rota com clientes pagantes.
export const dynamic = "force-dynamic";
export const maxDuration = 280;

const MODEL = process.env.REPORT_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 16000;
const MAX_TOKENS_CRITICA = 4096;

const SITUACOES_ADOLESCENTE = new Set(["9-ou-menos", "10-11-12"]);

/** Idêntica à de api/relatorio/route.ts — thinking sempre desligado, mesmo diagnóstico de "sem bloco de texto". */
async function gerarTexto(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    const tiposDeBloco = response.content.map((b) => b.type).join(", ") || "(nenhum bloco)";
    const detalhe = `stop_reason=${response.stop_reason}, blocos=[${tiposDeBloco}]`;
    console.error(`[api/relatorio-adolescente] resposta sem bloco de texto — ${detalhe}`);
    throw new Error(`Resposta da Anthropic sem bloco de texto (${detalhe}).`);
  }
  return textBlock.text;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const intakeId = (body as { intakeId?: unknown })?.intakeId;
  if (typeof intakeId !== "string" || !intakeId) return NextResponse.json({ error: "Falta intakeId." }, { status: 400 });

  const intake = await obterIntake(intakeId);
  if (!intake) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (intake.payment_status !== "paid") return NextResponse.json({ error: "Este pedido ainda não está pago." }, { status: 400 });
  if (!SITUACOES_ADOLESCENTE.has(intake.situacao)) {
    return NextResponse.json({ error: `Esta rota só serve o ramo adolescente ("9º ano ou menos"/"10º-12º ano") — este pedido é "${intake.situacao}". Usa /api/relatorio para o ramo adulto.` }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada." }, { status: 503 });

  try {
    const { horaAproximada, axes, pesosPlanetas, savPorCasa, datas, intakeAdolescente, catalogoResultados, coordenadasNascimento, elementosModalidades, aspectosPessoais, cursosPorDestino, cursosPorOpcaoDeclarada } =
      await calcularDadosAstrologicosAdolescente(intake);

    const prompt = construirPromptAdolescente(
      intakeAdolescente,
      axes,
      pesosPlanetas,
      datas,
      !horaAproximada,
      catalogoResultados,
      savPorCasa,
      elementosModalidades,
      aspectosPessoais,
      cursosPorDestino,
      cursosPorOpcaoDeclarada,
    );

    const client = new Anthropic({ apiKey });

    const textoOriginal = await gerarTexto(client, prompt, MAX_TOKENS);

    // Crítica adaptada ao ramo adolescente (TOM invertido para "tu",
    // "ÁREA ACTUAL" substituído por "OPÇÃO EM CIMA DA MESA" — ver
    // criticaRelatorio.ts). parseCritica/construirPromptReescrita são
    // genéricos, partilhados com o ramo adulto sem alteração.
    const promptCritica = construirPromptCriticaAdolescente(prompt, textoOriginal);
    const textoCritica = await gerarTexto(client, promptCritica, MAX_TOKENS_CRITICA);
    const resultadoCritica = parseCritica(textoCritica);

    let textoFinal = textoOriginal;
    let rascunhoReescrito: string | null = null;
    if (resultadoCritica.falhas.length > 0) {
      const promptReescrita = construirPromptReescrita(textoOriginal, resultadoCritica.falhas);
      rascunhoReescrito = await gerarTexto(client, promptReescrita, MAX_TOKENS);
      textoFinal = rascunhoReescrito;
    }

    const dadosTecnicosParaGuardar = { axes, pesos: pesosPlanetas, earningModes: axes.earningModeAll, earningModeDominante: axes.earningModeDominante, datas, savPorCasa };
    const rascunho = await guardarRascunho(intakeId, textoFinal, dadosTecnicosParaGuardar, prompt, { criticaLlm: textoCritica, rascunhoReescrito }, coordenadasNascimento);

    // DESVIO — DadosParaTemplate foi desenhado para o ramo adulto
    // (areaActual/anosExperiencia). Para o adolescente, que ainda não
    // trabalha, estes 2 campos recebem texto próprio em vez de ficarem
    // vazios/enganosos — reaproveita gerarHTMLRelatorio tal como está
    // (uma reescrita do template para 2 ramos é uma mudança maior, fora
    // do âmbito desta ronda; sinalizado no relatório).
    const dadosTemplate: DadosParaTemplate = {
      nome: intake.nome,
      dataNascimento: intake.data_nascimento,
      horaNascimento: horaAproximada ? null : intake.hora_nascimento,
      localNascimento: intake.local_nascimento,
      situacaoDeclarada: intakeAdolescente.situacaoDeclarada,
      areaActual: "Ainda a estudar",
      anosExperiencia: intakeAdolescente.situacaoDeclarada,
      opcoesConsideradas: intakeAdolescente.opcoesAdolescente,
      perguntaEspecifica: intakeAdolescente.opcaoMaisProvavel ? `Qual das opções lhe parece mais provável hoje: ${intakeAdolescente.opcaoMaisProvavel}?` : undefined,
    };
    const html = gerarHTMLRelatorio(dadosTemplate, textoFinal, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

    return NextResponse.json({ ok: true, rascunhoId: rascunho.id, texto: textoFinal, html, houveReescrita: rascunhoReescrito !== null });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/relatorio-adolescente] falha ao gerar rascunho:", message);
    return NextResponse.json({ error: `Não foi possível gerar o rascunho: ${message}` }, { status: 500 });
  }
}

/** "Guardar rascunho" — idêntico ao ramo adulto (mesmo storage, sem chamar a Anthropic). */
export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const { intakeId, texto } = body as { intakeId?: unknown; texto?: unknown };
  if (typeof intakeId !== "string" || !intakeId) return NextResponse.json({ error: "Falta intakeId." }, { status: 400 });
  if (typeof texto !== "string" || !texto.trim()) return NextResponse.json({ error: "O rascunho não pode ficar vazio." }, { status: 400 });

  try {
    const criadoEm = new Date().toISOString();
    await guardarRascunho(intakeId, texto);
    return NextResponse.json({ ok: true, criadoEm });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível guardar o rascunho: ${message}` }, { status: 500 });
  }
}

/** "Descartar" — idêntico ao ramo adulto. */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  const intakeId = new URL(request.url).searchParams.get("intakeId");
  if (!intakeId) return NextResponse.json({ error: "Falta intakeId." }, { status: 400 });

  try {
    await apagarRascunho(intakeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível apagar o rascunho: ${message}` }, { status: 500 });
  }
}
