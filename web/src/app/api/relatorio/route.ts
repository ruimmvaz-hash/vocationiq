import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, apagarRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { SITUACOES } from "@/lib/validation";
import { construirPromptAdulto } from "@naveya/method-engine";
import { construirPromptCritica, parseCritica, construirPromptReescrita } from "@/lib/criticaRelatorio";

// Motor de geração do relatório VocationIQ Adulto — ramo "trabalho-quero-
// mudar" (VOCATIONIQ-ADULTO-metodologia.md, secção 6: os outros ramos
// ficam para spec separada, não implementados aqui).
export const dynamic = "force-dynamic";
// Redesenho do motor (Parte 3) — até 3 chamadas sequenciais à Anthropic
// (gerar, criticar, e reescrever se alguma falha) em vez de 1. 60s
// chegava para uma chamada; para três, subido para 280s (o tecto prático
// do runtime Node por defeito da Vercel — confirmar no plano do projecto
// se isto ainda não for suficiente em produção).
export const maxDuration = 280;

// Nota de modelo (mesma correcção já documentada em
// naveya/web/src/lib/report/write.ts): "claude-sonnet-4-6" pedido não
// existe — os modelos actuais são claude-opus-5/claude-sonnet-5/claude-
// haiku-4-5-20251001. Usa-se claude-sonnet-5 (o mesmo ID passado neste
// pedido é inválido; overridable por REPORT_MODEL tal como na Naveya).
const MODEL = process.env.REPORT_MODEL || "claude-sonnet-5";
// Subido de 4000 para 8000, e agora para 16000 — o relatório passou a
// ter um volume obrigatório de 8-10 páginas A4 (ver promptAdulto.ts),
// bem acima do que 8000 tokens de saída conseguem cobrir sem cortar a
// meio (stop_reason "max_tokens"). A reescrita (Parte 3, Passo 3) produz
// outro relatório inteiro — mesmo tecto. A crítica é só texto de análise,
// tecto mais baixo.
const MAX_TOKENS = 16000;
const MAX_TOKENS_CRITICA = 4096;

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

/** Uma chamada de texto à Anthropic (gerar/criticar/reescrever partilham a mesma forma) — thinking sempre desligado, mesmo diagnóstico de "sem bloco de texto" para as 3 chamadas. */
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
    console.error(`[api/relatorio] resposta sem bloco de texto — ${detalhe}`);
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
  // VOCATIONIQ-ADULTO-metodologia.md só cobre o ramo "trabalho-quero-mudar" (secção 6).
  if (intake.situacao !== "trabalho-quero-mudar") {
    return NextResponse.json({ error: `Motor de geração ainda só suporta o ramo "Já trabalho e quero mudar" (este pedido: "${SITUACAO_LABEL[intake.situacao] ?? intake.situacao}").` }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada." }, { status: 503 });

  try {
    const { horaAproximada, axes, pesosPlanetas, savPorCasa, datas, intakeAdulto, catalogoResultados, dadosRicos } = await calcularDadosAstrologicos(intake);

    const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, !horaAproximada, catalogoResultados, savPorCasa);

    const client = new Anthropic({ apiKey });

    // Passo 2 — gerar. Confirmado em produção (ver commit anterior): sem
    // `thinking` explícito, este modelo usa "adaptive" thinking por
    // omissão e pode gastar TODO o max_tokens em blocos de "thinking" sem
    // nunca chegar a escrever texto (stop_reason "max_tokens", blocos=
    // [thinking]). "disabled" força a resposta directa, sem essa camada.
    const textoOriginal = await gerarTexto(client, prompt, MAX_TOKENS);

    // Passo 3 — criticar. Segunda chamada, sempre (nunca opcional) — o
    // resultado fica guardado mesmo quando tudo passa, para auditoria.
    const promptCritica = construirPromptCritica(prompt, textoOriginal);
    const textoCritica = await gerarTexto(client, promptCritica, MAX_TOKENS_CRITICA);
    const resultadoCritica = parseCritica(textoCritica);

    // Passo 3 — reescrever, só se pelo menos um critério falhou de facto
    // (nunca quando a crítica não seguiu o formato pedido — não se força
    // uma reescrita sobre dados não interpretáveis, ver criticaRelatorio.ts).
    let textoFinal = textoOriginal;
    let rascunhoReescrito: string | null = null;
    if (resultadoCritica.falhas.length > 0) {
      const promptReescrita = construirPromptReescrita(textoOriginal, resultadoCritica.falhas);
      rascunhoReescrito = await gerarTexto(client, promptReescrita, MAX_TOKENS);
      textoFinal = rascunhoReescrito;
    }

    // "Mapa técnico"/"Prompt completo"/"Crítica" (ficha do cliente
    // reorganizada em /admin/relatorios/[id]) — guardados tal como
    // calculados agora, para essas secções nunca terem de recalcular nem
    // chamar a Anthropic outra vez.
    const dadosTecnicosParaGuardar = { axes, pesos: pesosPlanetas, earningModes: axes.earningModeAll, datas, savPorCasa, classificacaoMahadashaAtual: dadosRicos.classificacaoMahadashaAtual };
    const rascunho = await guardarRascunho(intakeId, textoFinal, dadosTecnicosParaGuardar, prompt, { criticaLlm: textoCritica, rascunhoReescrito });

    // Passa os dados técnicos já calculados ao template — os gráficos
    // (SVG) são sempre gerados a partir destes, nunca do texto do LLM.
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
    const html = gerarHTMLRelatorio(dadosTemplate, textoFinal, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa);

    return NextResponse.json({ ok: true, rascunhoId: rascunho.id, texto: textoFinal, html, houveReescrita: rascunhoReescrito !== null });
  } catch (err) {
    if (err instanceof GeocodeError) return NextResponse.json({ error: err.message }, { status: 422 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/relatorio] falha ao gerar rascunho:", message);
    return NextResponse.json({ error: `Não foi possível gerar o rascunho: ${message}` }, { status: 500 });
  }
}

/** "Guardar rascunho" — actualiza o texto (editado à mão pelo admin) sem chamar a Anthropic outra vez. */
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

/** "Descartar" — apaga o rascunho (nunca uma linha já entregue) e volta ao Estado 1. */
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
