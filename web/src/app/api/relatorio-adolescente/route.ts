import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, obterRascunho, apagarRascunho, usarVersaoLlmRascunho, restaurarVersaoAnteriorRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicosAdolescente, reconstruirHTMLRelatorio, GeocodeError, ANO_ESCOLARIDADE_LABEL } from "@/lib/relatorioAdultoCompute";
import { construirPromptAdolescente, construirPromptAdulto, type VocationiqIntakeAdulto } from "@naveya/method-engine";
import { construirPromptCritica, construirPromptCriticaAdolescente, parseCritica, construirPromptReescrita, removerBlocosOpcaoNaoAutorizados, TOTAL_CRITERIOS_ADULTO, TOTAL_CRITERIOS_ADOLESCENTE } from "@/lib/criticaRelatorio";

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
// BUG REAL, corrigido (ronda "regeneração Alexandra" — confirmado nos
// logs reais da Vercel: "Vercel Runtime Timeout Error: Task timed out
// after 280 seconds", disparado sempre que a crítica pedia reescrita).
// Gerar+criticar+reescrever eram 3 chamadas sequenciais à Anthropic
// dentro do MESMO pedido HTTP — um timeout aqui é morto pela plataforma
// antes de chegar ao try/catch da rota, por isso o frontend nunca via
// `data.error`, só o fallback genérico "Não foi possível gerar o
// rascunho." (ver SeccaoRascunho.tsx). A reescrita (passo 3) saiu para o
// seu próprio pedido (PATCH acao="reescrever", abaixo) — cada pedido HTTP
// fica com no máximo 2 chamadas à Anthropic, bem dentro dos 280s.
export const maxDuration = 280;

const MODEL = process.env.REPORT_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 16000;
// AUDITORIA (correcção do especialista, ronda "auditoria de erros") —
// mesma correcção de api/relatorio/route.ts: a crítica adolescente já
// tem TOTAL_CRITERIOS_ADOLESCENTE (34) critérios, não os 23 para que
// 8192 tinha ficado dimensionado — subido para 14000 pelo mesmo motivo.
const MAX_TOKENS_CRITICA = 16000; // subido de 14000 (ronda 7, bloco RESULTADO_MAQUINA): margem extra para o bloco final maquina nunca ser cortado por falta de tokens, mesmo com analise detalhada longa antes dele.
const MAX_TENTATIVAS_REESCRITA = 2;

// "universidade" entrou (correcção do especialista) — ver o mesmo
// comentário em relatorioAdultoCompute.ts: mesmo questionário e motor do
// ramo adolescente, registo adulto via `ehPos12` (anoEscolaridade
// gravado sempre como "pos-12" para este ramo).
const SITUACOES_ADOLESCENTE = new Set(["9-ou-menos", "10-11-12", "universidade"]);

/** Idêntica à de api/relatorio/route.ts — thinking sempre desligado, mesmo diagnóstico de "sem bloco de texto", agora também devolve `truncado` (ver auditoria em api/relatorio/route.ts). */
async function gerarTexto(client: Anthropic, prompt: string, maxTokens: number): Promise<{ texto: string; truncado: boolean }> {
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
  const truncado = response.stop_reason === "max_tokens";
  if (truncado) {
    console.error(`[api/relatorio-adolescente] resposta TRUNCADA (stop_reason=max_tokens, maxTokens=${maxTokens}) — se isto for a crítica, critérios do fim da lista podem ter sido perdidos silenciosamente.`);
  }
  return { texto: textBlock.text, truncado };
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
    return NextResponse.json({ error: `Esta rota só serve o ramo adolescente ("9º ano ou menos"/"10º-12º ano"/"universidade") — este pedido é "${intake.situacao}". Usa /api/relatorio para o ramo adulto.` }, { status: 400 });
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

    const { texto: textoGerado, truncado: geracaoTruncada } = await gerarTexto(client, prompt, MAX_TOKENS);

    // GUARDA DETERMINÍSTICA (ver removerBlocosOpcaoNaoAutorizados em
    // criticaRelatorio.ts) — "Leitura por opção" só pode ter um bloco
    // "### " por nome literalmente presente em "Opções em cima da mesa";
    // aplicada aqui, antes da crítica, para o bug nunca mais chegar a
    // texto entregue, independentemente de o LLM seguir ou não a
    // instrução em prosa (já reincidiu 3x apesar dela). Só faz sentido
    // no ramo adolescente estruturado — "pos-12" usa o motor adulto, que
    // não tem esta secção/armadilha, e o caso "legado" (texto livre) não
    // tem lista fixa para comparar.
    const guardaOpcoes = !ehPos12 && intakeAdolescente.opcoesAdolescente.length > 0 ? removerBlocosOpcaoNaoAutorizados(textoGerado, intakeAdolescente.opcoesAdolescente) : { texto: textoGerado, blocosRemovidos: [] as string[] };
    if (guardaOpcoes.blocosRemovidos.length > 0) {
      console.error(
        "[api/relatorio-adolescente] guarda determinística removeu bloco(s) '### ' não autorizado(s) em 'Leitura por opção' (intake=" + intakeId + "): " + guardaOpcoes.blocosRemovidos.join(", "),
      );
    }
    const textoOriginal = guardaOpcoes.texto;

    // Crítica: "pos-12" gerou texto no tom adulto ("você"), por isso usa
    // a crítica adulta original — a versão adaptada ao adolescente
    // (construirPromptCriticaAdolescente) inverte o teste de TOM e
    // rejeitaria precisamente o "você" correcto deste ramo.
    //
    // AUDITORIA — `totalCriteriosEsperado` acompanha a mesma escolha
    // (adulto vs adolescente): o PATCH acao="reescrever" recalcula
    // `ehPos12` a partir do intake (ver abaixo) para saber qual crítica
    // usar depois de reescrever, sem depender de guardar mais um campo.
    const totalCriteriosEsperado = ehPos12 ? TOTAL_CRITERIOS_ADULTO : TOTAL_CRITERIOS_ADOLESCENTE;
    const promptCritica = ehPos12 ? construirPromptCritica(prompt, textoOriginal) : construirPromptCriticaAdolescente(prompt, textoOriginal);
    const { texto: textoCritica, truncado: criticaTruncada } = await gerarTexto(client, promptCritica, MAX_TOKENS_CRITICA);
    const resultadoCritica = parseCritica(textoCritica, totalCriteriosEsperado);

    // Correcção do especialista ("provar que o critério corre de facto")
    // — mesmo log estruturado do ramo adulto, ver route.ts.
    const criterio26Adolescente = resultadoCritica.criterios.find((c) => c.numero === 26);
    console.log(
      `[crítica-adolescente][intake=${intakeId}] critérios extraídos=${resultadoCritica.criterios.length} falhas=${resultadoCritica.falhas.length} ` +
        `critério26=${criterio26Adolescente ? (criterio26Adolescente.passa ? "PASSA" : `FALHA — ${criterio26Adolescente.detalhe ?? "(sem detalhe)"}`) : "AUSENTE da resposta da crítica (não avaliado ou não formatado)"} ` +
        `decisão=${resultadoCritica.falhas.length > 0 ? "REESCREVER" : "ACEITAR"}` +
        (resultadoCritica.criteriosEmFalta.length > 0 ? ` criteriosEmFaltaForcadosParaFalha=[${resultadoCritica.criteriosEmFalta.join(",")}]` : ""),
    );
    if (geracaoTruncada) console.error(`[api/relatorio-adolescente] a GERAÇÃO original veio truncada — intake=${intakeId}.`);

    // BUG REAL, corrigido (ronda "regeneração Alexandra") — a reescrita
    // (3ª chamada à Anthropic) saiu deste pedido para PATCH
    // acao="reescrever" (abaixo) — ver comentário em `maxDuration`. Este
    // pedido guarda sempre o rascunho ORIGINAL (nunca reescrito); o
    // chamador decide se vale a pena pedir a reescrita a seguir, olhando
    // para `precisaReescrita` na resposta.
    const dadosTecnicosParaGuardar = { axes, pesos: pesosPlanetas, earningModes: axes.earningModeAll, earningModeDominante: axes.earningModeDominante, datas, savPorCasa };
    const rascunho = await guardarRascunho(intakeId, textoOriginal, "geracao", dadosTecnicosParaGuardar, prompt, { criticaLlm: textoCritica, rascunhoReescrito: null }, coordenadasNascimento);

    // TAREFA 1 (correcção do especialista) — ehAdolescente/anoEscolaridade
    // dizem ao template para não mostrar campos/secções do ramo adulto
    // (área actual, anos de experiência, "ponte de transição") que não
    // fazem sentido para quem ainda não trabalha (ver relatorioTemplate.ts).
    // "pos-12" usa o quadro adulto (texto já gerado nesse tom acima).
    // BUG REAL, corrigido (ronda "relatório Marta") — pedidos
    // "universidade" anteriores à migração 0019 declararam a sua direcção
    // em `para_onde_quer_ir` (texto livre antigo), nunca em
    // opcoes_adolescente — sem isto, a caixa "O que trouxe" mostrava o
    // texto de reserva "nenhuma opção declarada" mesmo quando a pessoa
    // tinha mesmo declarado uma direcção, só no campo antigo (o mesmo
    // texto que `construirPromptAdolescente` agora também lê, ver
    // promptAdolescente.ts). `oQueNaoFunciona` (nunca usado por este
    // ramo antes) é o campo certo para uma frase livre citada — nunca os
    // "chips" curtos de `opcoesConsideradas`, pensados para nomes curtos
    // de área, não para uma frase inteira.
    const oQueNaoFuncionaLegado = !intakeAdolescente.opcoesAdolescente.length && intakeAdolescente.paraOndeQuerIr ? intakeAdolescente.paraOndeQuerIr : undefined;

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
          oQueNaoFunciona: oQueNaoFuncionaLegado,
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
          oQueNaoFunciona: oQueNaoFuncionaLegado,
          rascunhoCriadoEm: rascunho.criadoEm,
        };
    const html = gerarHTMLRelatorio(dadosTemplate, textoOriginal, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

    return NextResponse.json({
      ok: true,
      rascunhoId: rascunho.id,
      texto: textoOriginal,
      html,
      // O chamador (SeccaoRascunho.tsx) pede a reescrita a seguir, num
      // pedido HTTP separado (PATCH acao="reescrever"), só quando isto
      // vier true — ver comentário em `maxDuration`.
      precisaReescrita: resultadoCritica.falhas.length > 0,
      manualPreservada: rascunho.manualPreservada,
      geracaoTruncada,
      criticaTruncada,
      criteriosEmFalta: resultadoCritica.criteriosEmFalta,
    });
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
    const { criadoEm } = await guardarRascunho(intakeId, texto, "manual");
    return NextResponse.json({ ok: true, criadoEm });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível guardar o rascunho: ${message}` }, { status: 500 });
  }
}

/**
 * CORRECÇÃO 2 — "Usar versão LLM"/"Restaurar versão anterior", idêntico
 * ao ramo adulto (mesmo storage).
 *
 * BUG REAL, corrigido (ronda "regeneração Alexandra") — acao="reescrever"
 * é o antigo Passo 3 (reescrita) do POST acima, agora num pedido HTTP
 * próprio (ver comentário em `maxDuration`): lê o prompt técnico e a
 * crítica já guardados por POST (nunca recalcula a astrologia nem chama a
 * crítica outra vez — só a 3ª chamada, a reescrita em si), grava o
 * resultado e devolve o HTML reconstruído. Chamado automaticamente pelo
 * frontend logo a seguir a um POST cuja resposta veio com
 * `precisaReescrita: true` — nunca por clique directo do fundador.
 */
export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!hasSupabaseAdmin) return NextResponse.json({ error: "Serviço indisponível de momento." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const { intakeId, acao } = body as { intakeId?: unknown; acao?: unknown };
  if (typeof intakeId !== "string" || !intakeId) return NextResponse.json({ error: "Falta intakeId." }, { status: 400 });
  if (acao !== "usar-llm" && acao !== "restaurar-anterior" && acao !== "reescrever") return NextResponse.json({ error: "Acção desconhecida." }, { status: 400 });

  if (acao === "reescrever") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada." }, { status: 503 });

    try {
      const intake = await obterIntake(intakeId);
      if (!intake) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

      const rascunho = await obterRascunho(intakeId);
      if (!rascunho || !rascunho.promptCompleto || !rascunho.criticaLlm) {
        return NextResponse.json({ error: "Não há uma crítica associada a este rascunho — gera o rascunho primeiro." }, { status: 400 });
      }

      // AUDITORIA — precisamos de saber se este intake é "pos-12" (usa a
      // crítica adulta) ou adolescente normal (crítica adolescente) para
      // voltar a criticar depois da reescrita com o critério certo. Isto
      // é só cálculo astrológico determinístico (sem chamada à
      // Anthropic) — não reintroduz o risco de timeout que motivou tirar
      // a reescrita deste pedido (ver comentário em `maxDuration`).
      const { intakeAdolescente } = await calcularDadosAstrologicosAdolescente(intake);
      const ehPos12 = intakeAdolescente.anoEscolaridade === "pos-12";
      const totalCriteriosEsperado = ehPos12 ? TOTAL_CRITERIOS_ADULTO : TOTAL_CRITERIOS_ADOLESCENTE;
      const construirCritica = ehPos12 ? construirPromptCritica : construirPromptCriticaAdolescente;

      let resultadoCritica = parseCritica(rascunho.criticaLlm, totalCriteriosEsperado);
      if (resultadoCritica.falhas.length === 0) {
        // Nada a corrigir (ou a crítica guardada não seguiu o formato
        // esperado — nunca se força uma reescrita sobre dados não
        // interpretáveis, mesma regra do POST). Devolve o estado actual
        // sem gastar uma chamada à Anthropic.
        const { html } = await reconstruirHTMLRelatorio(intake, rascunho.texto, rascunho.coordenadasNascimento, rascunho.criadoEm);
        return NextResponse.json({ ok: true, criadoEm: rascunho.criadoEm, texto: rascunho.texto, html, houveReescrita: false, manualPreservada: false, precisaRevisaoManual: false });
      }

      // A base da reescrita é sempre a ÚLTIMA geração real da Anthropic
      // (`textoLlm`), nunca `texto` — que pode já ser uma edição manual
      // por cima (ver guardarRascunho/RascunhoRelatorio).
      let textoBase = rascunho.textoLlm ?? rascunho.texto;
      const client = new Anthropic({ apiKey });

      // AUDITORIA — mesmo ciclo fechado do ramo adulto: reescreve,
      // critica outra vez, repete até passar ou esgotar tentativas.
      // CORRECAO (ronda "regeneracao Alexandra 7", bug real em producao:
      // "a correccao automatica falhou -- o texto original ja esta
      // guardado" apareceu no admin sem nenhum detalhe -- prova de que a
      // resposta nunca chegou a ser JSON valido, ver SeccaoRascunho.tsx
      // `.json().catch(() => ({}))`, o mesmo sinal ja diagnosticado uma
      // vez para este mesmo maxDuration=280, ver o comentario no topo
      // deste ficheiro): este ciclo faz ate MAX_TENTATIVAS_REESCRITA=2
      // iteracoes, cada uma com 2 chamadas grandes a Anthropic (reescrita
      // ate MAX_TOKENS + critica ate MAX_TOKENS_CRITICA) -- 4 chamadas
      // sequenciais no pior caso, facilmente acima dos 280s da Vercel, e
      // esse limite nunca foi revisto depois de MAX_TENTATIVAS_REESCRITA
      // ter subido para 2. Corrigido com um orcamento de tempo: antes de
      // COMECAR uma nova iteracao, verifica quanto tempo passou desde o
      // inicio deste pedido -- se ja estiver perto do limite, para agora
      // e devolve o que tiver (sempre uma resposta JSON valida e
      // completa, nunca um kill silencioso da plataforma), marcado para
      // revisao manual como qualquer outra tentativa esgotada.
      const inicioReescrita = Date.now();
      const LIMITE_TEMPO_REESCRITA_MS = 150_000; // 150s -- deixa margem para a iteracao em curso + guardarRascunho + reconstrucao do HTML, dentro dos 280s totais
      let textoReescrito = textoBase;
      let ultimaCriticaLlm = rascunho.criticaLlm;
      let tentativas = 0;
      let algumaCriticaTruncada = false;
      while (resultadoCritica.falhas.length > 0 && tentativas < MAX_TENTATIVAS_REESCRITA && Date.now() - inicioReescrita < LIMITE_TEMPO_REESCRITA_MS) {
        tentativas += 1;
        const promptReescrita = construirPromptReescrita(rascunho.promptCompleto, textoBase, resultadoCritica.falhas);
        const { texto: novoTextoGerado } = await gerarTexto(client, promptReescrita, MAX_TOKENS);
        const guardaOpcoesReescrita = !ehPos12 && intakeAdolescente.opcoesAdolescente.length > 0 ? removerBlocosOpcaoNaoAutorizados(novoTextoGerado, intakeAdolescente.opcoesAdolescente) : { texto: novoTextoGerado, blocosRemovidos: [] as string[] };
        if (guardaOpcoesReescrita.blocosRemovidos.length > 0) {
          console.error(
            "[api/relatorio-adolescente] guarda determinística removeu bloco(s) '### ' não autorizado(s) em 'Leitura por opção' pós-reescrita (intake=" + intakeId + ", tentativa=" + tentativas + "): " + guardaOpcoesReescrita.blocosRemovidos.join(", "),
          );
        }
        textoReescrito = guardaOpcoesReescrita.texto;

        const promptCriticaPosReescrita = construirCritica(rascunho.promptCompleto, textoReescrito);
        const { texto: textoCriticaPos, truncado } = await gerarTexto(client, promptCriticaPosReescrita, MAX_TOKENS_CRITICA);
        algumaCriticaTruncada = algumaCriticaTruncada || truncado;
        ultimaCriticaLlm = textoCriticaPos;
        resultadoCritica = parseCritica(textoCriticaPos, totalCriteriosEsperado);
        textoBase = textoReescrito;

        console.log(
          `[crítica-adolescente-pós-reescrita][intake=${intakeId}] tentativa=${tentativas}/${MAX_TENTATIVAS_REESCRITA} falhas=${resultadoCritica.falhas.length} ` +
            `decisão=${resultadoCritica.falhas.length > 0 ? "REESCREVER OUTRA VEZ" : "ACEITAR"}`,
        );
      }

      const precisaRevisaoManual = resultadoCritica.falhas.length > 0;
      if (precisaRevisaoManual) {
        console.error(
          `[api/relatorio-adolescente] reescrita esgotou ${MAX_TENTATIVAS_REESCRITA} tentativas e AINDA tem falhas (intake=${intakeId}): ${resultadoCritica.falhas.join(" | ")}`,
        );
      }

      const resultado = await guardarRascunho(intakeId, textoReescrito, "geracao", undefined, rascunho.promptCompleto, { criticaLlm: ultimaCriticaLlm, rascunhoReescrito: textoReescrito });
      const { html } = await reconstruirHTMLRelatorio(intake, textoReescrito, rascunho.coordenadasNascimento, resultado.criadoEm);

      return NextResponse.json({
        ok: true,
        criadoEm: resultado.criadoEm,
        texto: textoReescrito,
        html,
        houveReescrita: true,
        manualPreservada: resultado.manualPreservada,
        precisaRevisaoManual,
        falhasRestantes: precisaRevisaoManual ? resultadoCritica.falhas : [],
        criticaTruncada: algumaCriticaTruncada,
        tentativasReescrita: tentativas,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[api/relatorio-adolescente] falha na reescrita:", message);
      return NextResponse.json({ error: `Não foi possível aplicar a correcção automática: ${message}` }, { status: 500 });
    }
  }

  try {
    const { criadoEm } = acao === "usar-llm" ? await usarVersaoLlmRascunho(intakeId) : await restaurarVersaoAnteriorRascunho(intakeId);
    return NextResponse.json({ ok: true, criadoEm });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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
