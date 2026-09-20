import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";
import { guardarRascunho, obterRascunho, apagarRascunho, usarVersaoLlmRascunho, restaurarVersaoAnteriorRascunho } from "@/lib/storage";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "@/lib/relatorioTemplate";
import { calcularDadosAstrologicos, reconstruirHTMLRelatorio, GeocodeError } from "@/lib/relatorioAdultoCompute";
import { SITUACOES } from "@/lib/validation";
import { construirPromptAdulto } from "@naveya/method-engine";
import { construirPromptCritica, construirBlocosPromptCritica, parseCritica, construirPromptReescrita, TOTAL_CRITERIOS_ADULTO, verificarProfundidadeLeituraPorOpcao, combinarFalhasComGuardas, verificarPalavraCarta, verificarPrimeiraPessoaPlural, verificarYogaDeGrupo, verificarCandidatasElegiveisPresentes, verificarYogasReforcoGeralNomeados } from "@/lib/criticaRelatorio";

// Motor de geração do relatório VocationIQ Adulto — ramo "trabalho-quero-
// mudar" (VOCATIONIQ-ADULTO-metodologia.md, secção 6: os outros ramos
// ficam para spec separada, não implementados aqui).
export const dynamic = "force-dynamic";
// BUG REAL, corrigido (ronda "regeneração Alexandra", ramo adolescente —
// mesma arquitectura aqui, mesmo risco). A previsão desta nota ("60s
// chegava para uma chamada... confirmar no plano se não for suficiente")
// confirmou-se: gerar+criticar+reescrever, 3 chamadas sequenciais à
// Anthropic dentro do MESMO pedido HTTP, ultrapassavam os 280s em
// produção ("Vercel Runtime Timeout Error"). Um timeout da plataforma é
// morto antes de chegar ao try/catch da rota, por isso o frontend nunca
// via `data.error`, só o fallback genérico "Não foi possível gerar o
// rascunho." (ver SeccaoRascunho.tsx). A reescrita (passo 3) saiu para o
// seu próprio pedido (PATCH acao="reescrever", abaixo) — cada pedido HTTP
// fica com no máximo 2 chamadas à Anthropic, bem dentro dos 280s.
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
// AUDITORIA (correcção do especialista, ronda "auditoria de erros", Set
// 2026) — subido de 8192 para 14000. O valor anterior (8192) tinha
// ficado dimensionado para quando a crítica tinha 23 critérios ("subido
// de 4096" — comentário antigo, abaixo); a crítica cresceu desde então
// para TOTAL_CRITERIOS_ADULTO (33) critérios, cada um podendo justificar
// a FALHA com uma citação do texto — 8192 arriscava (e, por auditoria ao
// código, provavelmente já estava a) truncar a resposta a meio,
// perdendo critérios do fim da lista (28-33: resposta directa à
// pergunta, validação das opções, profundidade da leitura) sem nenhum
// aviso visível fora dos logs do servidor. `parseCritica` agora também
// força como FALHA qualquer critério que continue ausente mesmo com
// este valor mais alto — ver `TOTAL_CRITERIOS_ADULTO` abaixo.
const MAX_TOKENS_CRITICA = 16000; // subido de 14000 (ronda 7, bloco RESULTADO_MAQUINA): margem extra para o bloco final maquina nunca ser cortado por falta de tokens, mesmo com analise detalhada longa antes dele.
// AUDITORIA (tentativa revertida no mesmo dia) — chegou-se a definir
// `temperature` explícito (0.4 gerar/reescrever, 0.2 crítica) para reduzir
// a variância entre regenerações do mesmo cliente. Partiu a produção:
// "Regenerar" (caso real: Alexandra) devolveu 400 "`temperature` is
// deprecated for this model." — o MODEL actual (claude-sonnet-5) já não
// aceita este parâmetro. Removido. A não-determinismo entre gerações
// continua por resolver (ver "Português, leitura e inconsistência" na
// auditoria) — só não pode ser este o caminho enquanto o modelo recusar
// o parâmetro.

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

/**
 * Uma chamada de texto à Anthropic (gerar/criticar/reescrever partilham a mesma forma) — thinking sempre desligado, mesmo diagnóstico de "sem bloco de texto" para as 3 chamadas.
 *
 * AUDITORIA (correcção do especialista, ronda "auditoria de erros") —
 * antes, um texto TRUNCADO (`stop_reason: "max_tokens"` mas com bloco de
 * texto presente) só era registado num `console.error` que ninguém via
 * fora dos logs do servidor — o chamador não tinha forma de saber que
 * isto tinha acontecido a não ser abrindo o Vercel/Render. Passa a
 * devolver `truncado` explicitamente, para cada rota decidir o que fazer
 * (tipicamente: avisar no admin — ver `SeccaoRascunho.tsx`).
 */
type ConteudoPrompt = string | { cacheavel: string; resto: string };

/**
 * PROMPT CACHING + LOG DE CUSTO REAL (correcção do especialista, pedido
 * do Rui — ronda "regeneração Alexandra 10"): quando `prompt` vem como
 * `{ cacheavel, resto }` (ver construirBlocosPromptCritica em
 * criticaRelatorio.ts), o bloco `cacheavel` leva `cache_control`
 * ephemeral (TTL de 5 min, sobra de longe para os ~150s do ciclo inteiro
 * de reescrita — ver LIMITE_TEMPO_REESCRITA_MS abaixo). Isto NÃO muda
 * nada do que o modelo lê — dividir uma string em vários blocos de texto
 * na mesma mensagem é idêntico, para o modelo, a mandar a string inteira
 * de uma vez só; é só uma fronteira de cache do lado da Anthropic. Só se
 * aplica às chamadas de crítica (o mesmo `promptTecnico` completo repete-
 * se, byte a byte, em todas as críticas do mesmo ciclo — original e
 * pós-reescrita); a chamada de reescrita fica de fora por agora, porque
 * lá a lista de falhas muda a cada tentativa e vem ANTES do prompt
 * técnico no texto — cachear exigiria reordenar esse prompt (pôr o
 * prompt técnico primeiro), uma mudança de ORDEM do que o modelo lê que
 * ainda não foi testada contra geração real; fica documentado aqui como
 * próximo passo, não implementado às cegas.
 */
async function gerarTexto(client: Anthropic, prompt: ConteudoPrompt, maxTokens: number, rotulo: string, intakeId: string): Promise<{ texto: string; truncado: boolean }> {
  const content = typeof prompt === "string" ? prompt : [
    { type: "text" as const, text: prompt.cacheavel, cache_control: { type: "ephemeral" as const } },
    { type: "text" as const, text: prompt.resto },
  ];
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content }],
  });
  const uso = response.usage;
  console.log(
    `[custo-tokens][intake=${intakeId}][chamada=${rotulo}] input=${uso.input_tokens} output=${uso.output_tokens}` +
      (uso.cache_creation_input_tokens ? ` cache_escrita=${uso.cache_creation_input_tokens}` : "") +
      (uso.cache_read_input_tokens ? ` cache_leitura=${uso.cache_read_input_tokens}` : ""),
  );
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    const tiposDeBloco = response.content.map((b) => b.type).join(", ") || "(nenhum bloco)";
    const detalhe = `stop_reason=${response.stop_reason}, blocos=[${tiposDeBloco}]`;
    console.error(`[api/relatorio] resposta sem bloco de texto — ${detalhe}`);
    throw new Error(`Resposta da Anthropic sem bloco de texto (${detalhe}).`);
  }
  const truncado = response.stop_reason === "max_tokens";
  if (truncado) {
    console.error(`[api/relatorio] resposta TRUNCADA (stop_reason=max_tokens, maxTokens=${maxTokens}) — se isto for a crítica, critérios do fim da lista podem ter sido perdidos silenciosamente.`);
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
  // VOCATIONIQ-ADULTO-metodologia.md cobre a fundo só o ramo "trabalho-
  // quero-mudar" (secção 6). Correcção do especialista (solução de
  // emergência — 1 pedido pago com BETA200 bloqueado, "outra" nunca teve
  // ramo próprio construído) — passa agora pelo MESMO motor adulto, com o
  // quadro de dados adaptado minimamente em `construirIntakeAdulto`
  // (relatorioAdultoCompute.ts): "área actual"/"anos de experiência"
  // deixam de ficar em branco, mas o resto do prompt/metodologia é
  // idêntico ao ramo "trabalho-quero-mudar" — nunca uma metodologia
  // própria escrita para este ramo. Formulário de intake deixa de
  // oferecer esta opção (IntakeForm.tsx) enquanto não houver um ramo
  // dedicado a sério.
  //
  // "universidade" SAIU deste gate (correcção do especialista) — deixou
  // de ser um ramo "adulto adaptado": o questionário e o motor de geração
  // são agora os mesmos do ramo adolescente (ver SITUACOES_ADOLESCENTE em
  // relatorioAdultoCompute.ts/admin/page.tsx/api/relatorio-adolescente),
  // nunca este route. Um pedido "universidade" que caia aqui por engano
  // (dados antigos, pré-correcção) é rejeitado tal como qualquer outro
  // ramo não suportado — a rota certa para ele é sempre /api/relatorio-adolescente.
  if (intake.situacao !== "trabalho-quero-mudar" && intake.situacao !== "outra") {
    return NextResponse.json({ error: `Motor de geração ainda só suporta os ramos "Já trabalho e quero mudar" e "Outra situação" (este pedido: "${SITUACAO_LABEL[intake.situacao] ?? intake.situacao}").` }, { status: 400 });
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
      intakeAdulto,
      catalogoResultados,
      dadosRicos,
      coordenadasNascimento,
      elementosModalidades,
      aspectosPessoais,
      cursosPorDestino,
      d1,
      yogas,
    } = await calcularDadosAstrologicos(intake);

    const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, !horaAproximada, catalogoResultados, savPorCasa, elementosModalidades, aspectosPessoais, cursosPorDestino, d1, yogas);

    const client = new Anthropic({ apiKey });

    // Passo 2 — gerar. Confirmado em produção (ver commit anterior): sem
    // `thinking` explícito, este modelo usa "adaptive" thinking por
    // omissão e pode gastar TODO o max_tokens em blocos de "thinking" sem
    // nunca chegar a escrever texto (stop_reason "max_tokens", blocos=
    // [thinking]). "disabled" força a resposta directa, sem essa camada.
    const { texto: textoOriginal, truncado: geracaoTruncada } = await gerarTexto(client, prompt, MAX_TOKENS, "gerar", intakeId);

    // Passo 3 — criticar. Segunda chamada, sempre (nunca opcional) — o
    // resultado fica guardado mesmo quando tudo passa, para auditoria.
    const blocosCritica = construirBlocosPromptCritica(prompt, textoOriginal);
    const { texto: textoCritica, truncado: criticaTruncada } = await gerarTexto(client, blocosCritica, MAX_TOKENS_CRITICA, "criticar-inicial", intakeId);
    // GUARDA DETERMINÍSTICA (critério 33 — profundidade da leitura por
    // opção): corre sempre sobre o texto REALMENTE gerado, nunca depende
    // só do juízo da crítica LLM sobre si mesma nesta chamada em
    // particular (ver doc comment de `verificarProfundidadeLeituraPorOpcao`
    // em criticaRelatorio.ts).
    const resultadoCritica = combinarFalhasComGuardas(parseCritica(textoCritica, TOTAL_CRITERIOS_ADULTO), [...verificarProfundidadeLeituraPorOpcao(textoOriginal), ...verificarPalavraCarta(textoOriginal), ...verificarPrimeiraPessoaPlural(textoOriginal), ...verificarYogaDeGrupo(textoOriginal), ...verificarCandidatasElegiveisPresentes(textoOriginal, catalogoResultados.candidatasForaDaLista), ...verificarYogasReforcoGeralNomeados(textoOriginal, catalogoResultados.candidatasForaDaLista)]);

    // Correcção do especialista ("provar que o critério corre de
    // facto") — log estruturado, por geração, do que a crítica avaliou
    // e decidiu — visível nos logs do servidor (Vercel/Render) sem
    // precisar de abrir o admin. Generaliza a qualquer critério, não só
    // o 26: se um dia outro critério parecer "decorativo", esta linha
    // mostra imediatamente se ele chegou a ser avaliado e com que
    // resultado. O texto completo da crítica (com o número e o
    // veredicto exacto de CADA critério) já fica guardado em
    // `criticaLlm` (ver `guardarRascunho` abaixo) e é visível em
    // /admin/relatorios/[id] — este log é só para não precisar de abrir
    // o admin a cada geração para confirmar que o mecanismo correu.
    const criterio26 = resultadoCritica.criterios.find((c) => c.numero === 26);
    console.log(
      `[crítica][intake=${intakeId}] critérios extraídos=${resultadoCritica.criterios.length} falhas=${resultadoCritica.falhas.length} ` +
        `critério26=${criterio26 ? (criterio26.passa ? "PASSA" : `FALHA — ${criterio26.detalhe ?? "(sem detalhe)"}`) : "AUSENTE da resposta da crítica (não avaliado ou não formatado)"} ` +
        `decisão=${resultadoCritica.falhas.length > 0 ? "REESCREVER" : "ACEITAR"}` +
        (resultadoCritica.criteriosEmFalta.length > 0 ? ` criteriosEmFaltaForcadosParaFalha=[${resultadoCritica.criteriosEmFalta.join(",")}]` : ""),
    );
    if (geracaoTruncada) console.error(`[api/relatorio] a GERAÇÃO original (não só a crítica) veio truncada — intake=${intakeId}. O texto pode estar incompleto mesmo antes da crítica correr.`);

    // BUG REAL, corrigido (ronda "regeneração Alexandra") — Passo 3
    // (reescrever) saiu deste pedido para PATCH acao="reescrever"
    // (abaixo) — ver comentário em `maxDuration`. Este pedido guarda
    // sempre o rascunho ORIGINAL (nunca reescrito); o chamador decide se
    // vale a pena pedir a reescrita a seguir, olhando para
    // `precisaReescrita` na resposta.
    //
    // "Mapa técnico"/"Prompt completo"/"Crítica" (ficha do cliente
    // reorganizada em /admin/relatorios/[id]) — guardados tal como
    // calculados agora, para essas secções nunca terem de recalcular nem
    // chamar a Anthropic outra vez.
    const dadosTecnicosParaGuardar = { axes, pesos: pesosPlanetas, earningModes: axes.earningModeAll, earningModeDominante: axes.earningModeDominante, datas, savPorCasa, classificacaoMahadashaAtual: dadosRicos.classificacaoMahadashaAtual };
    const rascunho = await guardarRascunho(intakeId, textoOriginal, "geracao", dadosTecnicosParaGuardar, prompt, { criticaLlm: textoCritica, rascunhoReescrito: null }, coordenadasNascimento);

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
      // FRENTE 1 (correcção do especialista, prova de geração real) — o
      // mesmo timestamp gravado agora em `guardarRascunho`, nunca
      // recalculado à parte.
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
      // AUDITORIA — antes só existiam nos logs do servidor; o admin
      // (SeccaoRascunho.tsx) mostra isto como aviso visível.
      geracaoTruncada,
      criticaTruncada,
      criteriosEmFalta: resultadoCritica.criteriosEmFalta,
    });
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
    const { criadoEm } = await guardarRascunho(intakeId, texto, "manual");
    return NextResponse.json({ ok: true, criadoEm });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Não foi possível guardar o rascunho: ${message}` }, { status: 500 });
  }
}

/**
 * CORRECÇÃO 2 — "Usar versão LLM" / "Restaurar versão anterior", as duas
 * acções conscientes sobre uma edição manual preservada.
 *
 * BUG REAL, corrigido (ronda "regeneração Alexandra") — acao="reescrever"
 * é o antigo Passo 3 (reescrita) do POST acima, agora num pedido HTTP
 * próprio (ver comentário em `maxDuration`): lê o prompt técnico e a
 * crítica já guardados por POST (nunca recalcula a astrologia), grava o
 * resultado e devolve o HTML reconstruído. Chamado automaticamente pelo
 * frontend logo a seguir a um POST cuja resposta veio com
 * `precisaReescrita: true` — nunca por clique directo do fundador.
 *
 * AUDITORIA (correcção do especialista, ronda "auditoria de erros") —
 * BUG REAL encontrado por auditoria ao código (não reportado por um
 * cliente, mas é o mecanismo mais provável por trás de "cada vez que
 * regenero aparecem erros novos"): esta rota reescrevia o relatório
 * inteiro para corrigir as falhas apontadas pela crítica, mas NUNCA
 * verificava se a reescrita corrigiu mesmo o que devia, nem se
 * introduziu problemas novos nas partes que antes estavam correctas — a
 * reescrita era aceite às cegas. Passa agora a fechar o ciclo: depois de
 * reescrever, corre a crítica outra vez sobre o texto reescrito. Se
 * ainda houver falhas, tenta reescrever mais uma vez (máximo
 * MAX_TENTATIVAS_REESCRITA no total) — nunca em loop indefinido. Se
 * mesmo assim continuar a falhar, devolve `precisaRevisaoManual: true`
 * em vez de fingir que está pronto — o fundador vê isso no admin em vez
 * de descobrir mais tarde que o relatório "reescrito" tem erros novos.
 */
const MAX_TENTATIVAS_REESCRITA = 2;
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

      // Critério 22 (verificarCandidatasElegiveisPresentes) precisa da
      // pool completa (`catalogoResultados.candidatasForaDaLista`), que
      // não fica guardada no rascunho (só os dados técnicos de
      // apresentação — ver `dadosTecnicosParaGuardar` no POST acima).
      // Repete-se aqui o cálculo determinístico (sem chamada à
      // Anthropic), mesmo padrão já usado para `opcoesAdolescente` no
      // PATCH de /api/relatorio-adolescente.
      const { catalogoResultados } = await calcularDadosAstrologicos(intake);

      const rascunho = await obterRascunho(intakeId);
      if (!rascunho || !rascunho.promptCompleto || !rascunho.criticaLlm) {
        return NextResponse.json({ error: "Não há uma crítica associada a este rascunho — gera o rascunho primeiro." }, { status: 400 });
      }

      const textoAvaliarInicialmente = rascunho.textoLlm ?? rascunho.texto;
      let resultadoCritica = combinarFalhasComGuardas(parseCritica(rascunho.criticaLlm, TOTAL_CRITERIOS_ADULTO), [...verificarProfundidadeLeituraPorOpcao(textoAvaliarInicialmente), ...verificarPalavraCarta(textoAvaliarInicialmente), ...verificarPrimeiraPessoaPlural(textoAvaliarInicialmente), ...verificarYogaDeGrupo(textoAvaliarInicialmente), ...verificarCandidatasElegiveisPresentes(textoAvaliarInicialmente, catalogoResultados.candidatasForaDaLista), ...verificarYogasReforcoGeralNomeados(textoAvaliarInicialmente, catalogoResultados.candidatasForaDaLista)]);
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

      // AUDITORIA — ciclo fechado: reescreve, critica outra vez, e só
      // pára quando passar ou quando esgotar as tentativas. Cada
      // iteração reescreve a partir da versão mais recente (nunca da
      // original), para as falhas da ronda anterior não reaparecerem.
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
        const { texto: novoTexto } = await gerarTexto(client, promptReescrita, MAX_TOKENS, `reescrever-${tentativas}`, intakeId);
        textoReescrito = novoTexto;

        // Fecha o ciclo: volta a criticar o que acabou de ser reescrito,
        // nunca aceita a reescrita às cegas.
        const blocosCriticaPosReescrita = construirBlocosPromptCritica(rascunho.promptCompleto, textoReescrito);
        const { texto: textoCriticaPos, truncado } = await gerarTexto(client, blocosCriticaPosReescrita, MAX_TOKENS_CRITICA, `criticar-pos-reescrita-${tentativas}`, intakeId);
        algumaCriticaTruncada = algumaCriticaTruncada || truncado;
        ultimaCriticaLlm = textoCriticaPos;
        resultadoCritica = combinarFalhasComGuardas(parseCritica(textoCriticaPos, TOTAL_CRITERIOS_ADULTO), [...verificarProfundidadeLeituraPorOpcao(textoReescrito), ...verificarPalavraCarta(textoReescrito), ...verificarPrimeiraPessoaPlural(textoReescrito), ...verificarYogaDeGrupo(textoReescrito), ...verificarCandidatasElegiveisPresentes(textoReescrito, catalogoResultados.candidatasForaDaLista), ...verificarYogasReforcoGeralNomeados(textoReescrito, catalogoResultados.candidatasForaDaLista)]);
        textoBase = textoReescrito;

        console.log(
          `[crítica-pós-reescrita][intake=${intakeId}] tentativa=${tentativas}/${MAX_TENTATIVAS_REESCRITA} falhas=${resultadoCritica.falhas.length} ` +
            `decisão=${resultadoCritica.falhas.length > 0 ? "REESCREVER OUTRA VEZ" : "ACEITAR"}`,
        );
      }

      const precisaRevisaoManual = resultadoCritica.falhas.length > 0;
      if (precisaRevisaoManual) {
        console.error(
          `[api/relatorio] reescrita esgotou ${MAX_TENTATIVAS_REESCRITA} tentativas e AINDA tem falhas (intake=${intakeId}) — guardado tal como está, mas marcado para revisão manual em vez de aceite às cegas: ${resultadoCritica.falhas.join(" | ")}`,
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
        // AUDITORIA — nunca mais um "pronto" silencioso sobre um
        // relatório que a própria crítica ainda reprova.
        precisaRevisaoManual,
        falhasRestantes: precisaRevisaoManual ? resultadoCritica.falhas : [],
        criticaTruncada: algumaCriticaTruncada,
        tentativasReescrita: tentativas,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[api/relatorio] falha na reescrita:", message);
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
