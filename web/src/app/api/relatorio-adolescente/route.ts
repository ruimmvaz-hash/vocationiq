import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, apagarRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicosAdolescente, GeocodeError, ANO_ESCOLARIDADE_LABEL } from "@/lib/relatorioAdultoCompute";
import { construirPromptAdolescente, construirPromptAdulto, type VocationiqIntakeAdulto } from "@naveya/method-engine";
import { construirPromptCritica, construirPromptCriticaAdolescente, parseCritica, construirPromptReescrita } from "@/lib/criticaRelatorio";

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
// TAREFA (correcção do especialista) — mesma correcção de api/relatorio/route.ts:
// subido de 4096 porque a crítica cresceu para 23 critérios, risco real
// de truncar a resposta a meio e perder critérios do fim sem aviso.
const MAX_TOKENS_CRITICA = 8192;

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
  // TAREFA (correcção do especialista) — ver a mesma correcção em
  // api/relatorio/route.ts: texto truncado (stop_reason "max_tokens")
  // passava sem aviso, arriscando perder critérios do fim da crítica
  // (18-23) silenciosamente. Nunca lança erro, só regista.
  if (response.stop_reason === "max_tokens") {
    console.error(`[api/relatorio-adolescente] resposta TRUNCADA (stop_reason=max_tokens, maxTokens=${maxTokens}) — se isto for a crítica, critérios do fim da lista podem ter sido perdidos silenciosamente.`);
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
    const {
      horaAproximada,
      axes,
      pesosPlanetas,
      savPorCasa,
      datas,
      intakeAdolescente,
      catalogoResultados,
      coordenadasNascimento,
      elementosModalidades,
      aspectosPessoais,
      cursosPorDestino,
      cursosPorOpcaoDeclarada,
      d1,
      yogas,
    } = await calcularDadosAstrologicosAdolescente(intake);

    // TAREFA 2C (correcção do especialista, aprovada) — "pos-12" já
    // terminou o secundário: em vez de criar um terceiro prompt, usa o
    // motor adulto integral (construirPromptAdulto), tal como pedido
    // ("sem criar terceiro prompt"). DESVIO: o formulário adolescente não
    // recolhe área actual/anos de experiência/tipo de mudança — ficam
    // vazios; as opções escritas em texto livre alimentam areasDestino.
    const ehPos12 = intakeAdolescente.anoEscolaridade === "pos-12";
    const prompt = ehPos12
      ? construirPromptAdulto(
          {
            nome: intakeAdolescente.nome,
            situacaoDeclarada: intakeAdolescente.situacaoDeclarada,
            areaActual: "",
            anosExperiencia: "",
            tipoMudanca: [],
            areasDestino: intakeAdolescente.opcoesAdolescente,
            areasDestinoIncluiOutra: false,
            areasDestinoIncluiAindaNaoSei: intakeAdolescente.opcoesAdolescente.length === 0,
            ideiaConcreta: intakeAdolescente.opcaoMaisProvavel,
          } satisfies VocationiqIntakeAdulto,
          axes,
          pesosPlanetas,
          datas,
          !horaAproximada,
          catalogoResultados,
          savPorCasa,
          elementosModalidades,
          aspectosPessoais,
          cursosPorDestino,
          d1,
          yogas,
        )
      : construirPromptAdolescente(
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
          d1,
          yogas,
        );

    const client = new Anthropic({ apiKey });

    const textoOriginal = await gerarTexto(client, prompt, MAX_TOKENS);

    // Crítica: "pos-12" gerou texto no tom adulto ("você"), por isso usa
    // a crítica adulta original — a versão adaptada ao adolescente
    // (construirPromptCriticaAdolescente) inverte o teste de TOM e
    // rejeitaria precisamente o "você" correcto deste ramo.
    const promptCritica = ehPos12 ? construirPromptCritica(prompt, textoOriginal) : construirPromptCriticaAdolescente(prompt, textoOriginal);
    const textoCritica = await gerarTexto(client, promptCritica, MAX_TOKENS_CRITICA);
    const resultadoCritica = parseCritica(textoCritica);

    // Correcção do especialista ("provar que o critério corre de facto")
    // — mesmo log estruturado do ramo adulto, ver route.ts.
    const criterio26Adolescente = resultadoCritica.criterios.find((c) => c.numero === 26);
    console.log(
      `[crítica-adolescente][intake=${intakeId}] critérios extraídos=${resultadoCritica.criterios.length} falhas=${resultadoCritica.falhas.length} ` +
        `critério26=${criterio26Adolescente ? (criterio26Adolescente.passa ? "PASSA" : `FALHA — ${criterio26Adolescente.detalhe ?? "(sem detalhe)"}`) : "AUSENTE da resposta da crítica (não avaliado ou não formatado)"} ` +
        `decisão=${resultadoCritica.falhas.length > 0 ? "REESCREVER" : "ACEITAR"}`,
    );

    let textoFinal = textoOriginal;
    let rascunhoReescrito: string | null = null;
    if (resultadoCritica.falhas.length > 0) {
      const promptReescrita = construirPromptReescrita(prompt, textoOriginal, resultadoCritica.falhas);
      rascunhoReescrito = await gerarTexto(client, promptReescrita, MAX_TOKENS);
      textoFinal = rascunhoReescrito;
    }

    const dadosTecnicosParaGuardar = { axes, pesos: pesosPlanetas, earningModes: axes.earningModeAll, earningModeDominante: axes.earningModeDominante, datas, savPorCasa };
    const rascunho = await guardarRascunho(intakeId, textoFinal, dadosTecnicosParaGuardar, prompt, { criticaLlm: textoCritica, rascunhoReescrito }, coordenadasNascimento);

    // TAREFA 1 (correcção do especialista) — ehAdolescente/anoEscolaridade
    // dizem ao template para não mostrar campos/secções do ramo adulto
    // (área actual, anos de experiência, "ponte de transição") que não
    // fazem sentido para quem ainda não trabalha (ver relatorioTemplate.ts).
    // "pos-12" usa o quadro adulto (texto já gerado nesse tom acima).
    const dadosTemplate: DadosParaTemplate = ehPos12
      ? {
          nome: intake.nome,
          dataNascimento: intake.data_nascimento,
          horaNascimento: horaAproximada ? null : intake.hora_nascimento,
          localNascimento: intake.local_nascimento,
          situacaoDeclarada: intakeAdolescente.situacaoDeclarada,
          areaActual: "",
          anosExperiencia: "",
          opcoesConsideradas: intakeAdolescente.opcoesAdolescente,
          ideiaConcreta: intakeAdolescente.opcaoMaisProvavel,
          rascunhoCriadoEm: rascunho.criadoEm,
        }
      : {
          nome: intake.nome,
          dataNascimento: intake.data_nascimento,
          horaNascimento: horaAproximada ? null : intake.hora_nascimento,
          localNascimento: intake.local_nascimento,
          situacaoDeclarada: intakeAdolescente.situacaoDeclarada,
          ehAdolescente: true,
          anoEscolaridade: intakeAdolescente.anoEscolaridade ? ANO_ESCOLARIDADE_LABEL[intakeAdolescente.anoEscolaridade] : undefined,
          areaActual: "Ainda a estudar",
          anosExperiencia: intakeAdolescente.situacaoDeclarada,
          opcoesConsideradas: intakeAdolescente.opcoesAdolescente,
          perguntaEspecifica: intakeAdolescente.opcaoMaisProvavel ? `Qual das opções te parece mais provável hoje: ${intakeAdolescente.opcaoMaisProvavel}?` : undefined,
          rascunhoCriadoEm: rascunho.criadoEm,
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
    const { criadoEm } = await guardarRascunho(intakeId, texto);
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
