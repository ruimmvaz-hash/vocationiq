import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, apagarRascunho } from "@/lib/storage";
import { geocodeCityCountry } from "@/lib/reportGeo";
import { localBirthTimeToUtc } from "@/lib/localBirthTime";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { SITUACOES, ANOS_EXPERIENCIA, TIPO_MUDANCA, AREAS_DESTINO } from "@/lib/validation";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  currentDasha,
  computeTransits,
  construirPromptAdulto,
  type VocationiqIntakeAdulto,
  type DadosDatas,
  type BirthInput,
} from "@naveya/method-engine";

// Motor de geração do relatório VocationIQ Adulto — ramo "trabalho-quero-
// mudar" (VOCATIONIQ-ADULTO-metodologia.md, secção 6: os outros ramos
// ficam para spec separada, não implementados aqui).
export const dynamic = "force-dynamic";

// Nota de modelo (mesma correcção já documentada em
// naveya/web/src/lib/report/write.ts): "claude-sonnet-4-6" pedido não
// existe — os modelos actuais são claude-opus-5/claude-sonnet-5/claude-
// haiku-4-5-20251001. Usa-se claude-sonnet-5 (o mesmo ID passado neste
// pedido é inválido; overridable por REPORT_MODEL tal como na Naveya).
const MODEL = process.env.REPORT_MODEL || "claude-sonnet-5";
// Subido de 4000 para 8000 — um relatório de 5 secções com leitura por
// cada opção declarada pode legitimamente ultrapassar 4000 tokens de
// saída, e nesse caso a resposta corta a meio (stop_reason
// "max_tokens") em vez de produzir um erro claro.
const MAX_TOKENS = 8000;

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));
const ANOS_LABEL = Object.fromEntries(ANOS_EXPERIENCIA.map((a) => [a.valor, a.label]));
const TIPO_MUDANCA_LABEL = Object.fromEntries(TIPO_MUDANCA.map((t) => [t.valor, t.label]));
const AREA_DESTINO_LABEL = Object.fromEntries(AREAS_DESTINO.map((a) => [a.valor, a.label]));

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

class GeocodeError extends Error {}

async function resolverNascimento(localNascimento: string, dataNascimento: string, horaNascimento: string | null): Promise<{ birth: BirthInput; horaAproximada: boolean }> {
  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new GeocodeError(`Não consegui geocodificar "${localNascimento}".`);

  const [year, month, day] = dataNascimento.split("-").map(Number);
  // Sem hora de nascimento (campo opcional no intake), usa-se meio-dia
  // como convenção — o Ascendente/casas ficam menos fiáveis sem hora
  // real; `horaAproximada` avisa o prompt para tratar os elementos
  // sensíveis ao Ascendente com mais cautela.
  const horaAproximada = !horaNascimento;
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento || "12:00", geo.timezone);
  if (!utcDate) throw new GeocodeError(`Data/hora de nascimento inválida (${dataNascimento} ${horaNascimento ?? "12:00"}).`);

  return { birth: { utcDate, latitude: geo.latitude, longitude: geo.longitude }, horaAproximada };
}

function construirDadosDatas(birth: BirthInput, agora: Date): DadosDatas {
  const dasha = currentDasha(birth.utcDate, agora);
  const proximas = dasha.allAntardashas.filter((a) => a.start >= dasha.antardasha.end).slice(0, 2);
  const transitos = computeTransits(birth, agora);

  const formatarAspectos = (hits: { to: string; aspect: string; orb: number }[]) =>
    hits.map((h) => `${ASPECTO_LABEL[h.aspect] ?? h.aspect} com o ${PONTO_LABEL[h.to] ?? h.to} (orbe ${h.orb.toFixed(1)}°)`);

  return {
    mahadashaAtual: { senhor: dasha.mahadasha.lord, inicio: dasha.mahadasha.start, fim: dasha.mahadasha.end },
    antardashaAtual: { senhor: dasha.antardasha.lord, inicio: dasha.antardasha.start, fim: dasha.antardasha.end },
    proximasAntardashas: proximas.map((a) => ({ senhor: a.lord, inicio: a.start, fim: a.end })),
    transitoJupiter: { signo: transitos.jupiter.sign, aspectosAoNatal: formatarAspectos(transitos.jupiter.aspectsToNatal) },
    transitoSaturno: { signo: transitos.saturn.sign, aspectosAoNatal: formatarAspectos(transitos.saturn.aspectsToNatal) },
  };
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
    const { birth, horaAproximada } = await resolverNascimento(intake.local_nascimento, intake.data_nascimento, intake.hora_nascimento);

    const d1 = computeD1Table(birth);
    const axes = computeVocationIQAxes(d1);
    const pesosPlanetas = computePesosPlanetas(d1);
    const datas = construirDadosDatas(birth, new Date());

    const intakeAdulto: VocationiqIntakeAdulto = {
      nome: intake.nome,
      situacaoDeclarada: SITUACAO_LABEL[intake.situacao] ?? intake.situacao,
      areaActual: intake.area_trabalho_actual ?? "",
      anosExperiencia: (intake.anos_experiencia && ANOS_LABEL[intake.anos_experiencia]) ?? "",
      oQueNaoFunciona: intake.o_que_nao_funciona ?? undefined,
      paraOndeQuerIr: intake.para_onde_quer_ir ?? undefined,
      perguntaEspecifica: intake.pergunta_especifica ?? undefined,
      ideiaConcreta: intake.ideia_concreta ?? undefined,
      tipoMudanca: (intake.tipo_mudanca ?? []).map((t) => TIPO_MUDANCA_LABEL[t] ?? t),
      areasDestino: (intake.areas_destino ?? []).filter((a) => a !== "outra" && a !== "ainda-nao-sei").map((a) => AREA_DESTINO_LABEL[a] ?? a),
      areasDestinoIncluiOutra: (intake.areas_destino ?? []).includes("outra"),
      areasDestinoOutra: intake.areas_destino_outra ?? undefined,
      areasDestinoIncluiAindaNaoSei: (intake.areas_destino ?? []).includes("ainda-nao-sei"),
    };

    const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, !horaAproximada);

    const client = new Anthropic({ apiKey });
    // Confirmado em produção (ver commit anterior): sem `thinking`
    // explícito, este modelo usa "adaptive" thinking por omissão e pode
    // gastar TODO o max_tokens em blocos de "thinking" sem nunca chegar
    // a escrever texto (stop_reason "max_tokens", blocos=[thinking]).
    // "disabled" força a resposta directa, sem essa camada.
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      // Diagnóstico em vez de um erro genérico — sem isto, "sem bloco de
      // texto" não diz se a causa foi truncagem (stop_reason
      // "max_tokens") ou outro tipo de bloco.
      const tiposDeBloco = response.content.map((b) => b.type).join(", ") || "(nenhum bloco)";
      const detalhe = `stop_reason=${response.stop_reason}, blocos=[${tiposDeBloco}]`;
      console.error(`[api/relatorio] resposta sem bloco de texto — ${detalhe}`);
      throw new Error(`Resposta da Anthropic sem bloco de texto (${detalhe}).`);
    }

    const rascunho = await guardarRascunho(intakeId, textBlock.text);

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
    const html = gerarHTMLRelatorio(dadosTemplate, textBlock.text, axes, pesosPlanetas, axes.earningModeAll, datas);

    return NextResponse.json({ ok: true, rascunhoId: rascunho.id, texto: textBlock.text, html });
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
