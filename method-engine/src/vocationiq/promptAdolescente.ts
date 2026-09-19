// VocationIQ Adolescente — TAREFA 2 (correcção do especialista, ronda de
// produção). Substitui o rascunho anterior (TAREFA 6, ronda anterior) por
// uma versão que espelha as regras do prompt adulto (mesma escala de
// confiança, mesma regra anti-repetição, mesmos planetas fracos/tensão
// interna/horizonte temporal, mesma regra absoluta da candidata fora da
// lista) mas com a "Quem é" e "O plano" reformulados para o contexto de
// quem ainda não trabalha — nunca "o que me define profissionalmente",
// sempre "o que me ajuda a prosperar na área que escolho".
//
// TAREFA 2C (correcção do especialista, ronda seguinte, aprovada) —
// granularidade por `anoEscolaridade` (migração 0020): quem está no
// 7º-9º ano ainda não escolhe curso — escolhe VIA do secundário
// (científico-humanística). Recomendar "Curso: Medicina, QNQ 7" a um
// aluno do 7º é prematuro e confunde o momento de decisão real. Quem
// está no 10º-12º mantém o formato anterior (curso concreto + via de
// acesso). "pos-12" não é tratado aqui — a rota decide encaminhar para
// `construirPromptAdulto` nesse caso (ver DESVIO em relatorioAdultoCompute.ts).
//
// REVERTIDO (correcção do especialista, ronda seguinte) — a distinção
// 7º-9º vs 10º-12º acima foi removida por inteiro deste ficheiro; os 7
// pontos de ramificação por `ehSeteANove` (candidatas por via vs
// catálogo completo, leitura por opção, instrução de candidata,
// "momento de decisão", rótulos de "via do secundário" vs "cursos
// concretos", tom do plano) foram unificados num único percurso — o que
// antes era só o ramo "10º-12º" (curso concreto + via de entrada).
// `ano_escolaridade` continua a existir no intake e a alimentar
// `ehPos12` fora deste ficheiro (relatorioAdultoCompute.ts/route.ts,
// intocado) — só a distinção 7-9/10-12 DENTRO do prompt adolescente foi
// revertida.
//
// AVISO DE MATURIDADE (honestidade obrigatória, ver relatório desta
// ronda): o prompt adulto (`promptAdulto.ts`) chegou a este ponto depois
// de MAIS DE 15 RONDAS de diagnóstico com dados reais, revisão do
// especialista, e correcções sucessivas ao longo de toda a sessão. Este
// ficheiro foi escrito numa ÚNICA ronda, sem esse historial de escrutínio
// — a astrologia por trás é a mesma (reaproveita os blocos de dados já
// testados do adulto), mas a PROSA INSTRUCIONAL em si (as regras da
// secção "Quem é", os exemplos de tom) é nova e não foi validada contra
// relatórios reais gerados por ela. Recomendação: gerar um lote de
// relatórios de teste com o Anthropic real e reve-los antes de expor isto
// a clientes pagantes.
//
// AUDITORIA DE PARIDADE (correcção do especialista, ronda "relatório
// Alexandra 2" — pedido directo do fundador: "já andamos a corrigir
// muita coisa muito antes do motor adolescente, o que é feito de tudo?")
// — confirmado por auditoria sistemática linha-a-linha contra
// promptAdulto.ts: este ficheiro nasceu como um fork do adulto numa
// única ronda (ver AVISO DE MATURIDADE acima) e, desde então, nunca
// recebeu 6 regras que o adulto já tinha (ou ganhou depois, só do lado
// dele): FRASE_ABERTURA:/IDENTIDADE: (banner de abertura + diagrama
// visual — nunca pedidos aqui, por isso nunca apareciam no relatório),
// VOLUME (sem travão anti-preenchimento), anti-"coaching genérico"
// (conselho sem ligação a um facto técnico), LEITURA CONJUNTA/KARAKAMSHA
// NUNCA ISOLADO (ordem obrigatória de leitura dos eixos, evita
// contradições internas), COERÊNCIA COM OS VISUAIS + "valor alto não é o
// tema central" (o texto podia contradizer os próprios gráficos), e o
// eixo "Montra de Mercado" (calculado sempre, mas nunca chegava a este
// prompt). Todas as 6 acrescentadas agora, adaptadas ao registo "tu" e
// ao contexto de quem ainda não trabalha — nunca copiadas ao pé da letra
// do adulto. Nota separada, MAIS GRAVE: a causa directa do "não" seco
// reportado no relatório real da Alexandra não é uma lacuna de paridade
// — é INSTRUCAO_PERGUNTA_ESPECIFICA (importada, partilhada pelos dois
// motores) reagindo mal a "perguntaImplicita" ser sempre uma pergunta em
// formato sim/não (só o adolescente gera perguntas assim) — corrigida na
// própria constante partilhada, ver o comentário lá.

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";
import type { D1TableResult } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";
import {
  blocoEixoMissao,
  blocoModoDeGanho,
  blocoMontraMercado,
  blocoPesos,
  blocoDatas,
  blocoCatalogoVocacional,
  blocoElementosModalidades,
  blocoAspectosPessoais,
  blocoAvasthas,
  blocoConjuncoes,
  blocoYogas,
  blocoVargottama,
  blocoRodaDaVida,
  INSTRUCAO_AVASTHAS,
  INSTRUCAO_CONJUNCOES,
  INSTRUCAO_YOGAS,
  INSTRUCAO_MECANISMO_NUNCA_SO_EFEITO,
  INSTRUCAO_FERRAMENTAS_PATRIMONIO,
  EXEMPLO_TOM_ESPECIALISTA,
  INSTRUCAO_VARGOTTAMA,
  INSTRUCAO_KARAKAMSHA,
  INSTRUCAO_CONSISTENCIA_TECNICA,
  INSTRUCAO_SELECCAO_CANDIDATAS,
  INSTRUCAO_ABERTURA_CANDIDATAS,
  INSTRUCAO_NIVEL_CANDIDATAS,
  INSTRUCAO_NUNCA_CANDIDATA,
  INSTRUCAO_PERGUNTA_ESPECIFICA,
  INSTRUCAO_ABERTURA_RESPONDE,
  INSTRUCAO_VALIDACAO_OPCOES,
  INSTRUCAO_PLANO_PERIODOS_RELATIVOS,
  INSTRUCAO_FACILIDADES_NATURAIS,
  blocoFacilidadesNaturais,
  paragrafoAntiDaParaTudo,
  normalizarTextoLivre,
  TERMOS_PROIBIDOS,
  SECCAO_TITULOS,
  MARCADORES,
  type DadosDatas,
} from "./promptAdulto";

export interface VocationiqIntakeAdolescente {
  nome: string;
  situacaoDeclarada: string;
  /** SPEC-vocacional.md — "opções em cima da mesa", 2-4 em texto livre. Pode vir vazio (nunca bloqueia o relatório). */
  opcoesAdolescente: string[];
  /** SPEC-vocacional.md — "qual delas te parece a mais provável hoje?". Não decide nada, é a hipótese em teste. */
  opcaoMaisProvavel?: string;
  preferenciaFamilia?: string;
  /**
   * BUG REAL, corrigido (auditoria de hoje — caso real: Alexandra, campo
   * preenchido no intake, "devo seguir economia, gestão ou direito?",
   * NUNCA chegava aqui nem ao prompt) — o comentário mais abaixo, junto a
   * `perguntaImplicita`, afirmava que "o adolescente não tem um campo de
   * texto livre 'pergunta específica' como o adulto": FALSO — o
   * formulário tem esse campo (`pergunta_especifica` na base de dados,
   * o mesmo nome de coluna do ramo adulto), só `construirIntakeAdolescente`
   * (web, relatorioAdultoCompute.ts) nunca o lia. Sem este campo, uma
   * pergunta explícita com 3 opções nomeadas (ex.: "economia, gestão ou
   * direito?") era substituída, em silêncio, por uma pergunta genérica
   * derivada só de `opcaoMaisProvavel` ("é X a mais provável?") — que
   * nem menciona as outras opções que a pessoa nomeou de propósito.
   */
  perguntaEspecifica?: string;
  /** TAREFA 2 (correcção do especialista, aprovada) — migração 0020. `undefined`/`"pos-12"` nunca chegam a este prompt: `undefined` cai no formato "10-a-12" por omissão (formulário antigo, sem o campo preenchido); "pos-12" é decidido antes, na rota (ver DESVIO em relatorioAdultoCompute.ts). */
  anoEscolaridade?: "7-a-9" | "10-a-12" | "pos-12";
  /**
   * BUG REAL, corrigido (ronda "relatório Marta", caso real: paga em
   * 07/09/2026, antes da migração 0019) — pedidos "universidade" ANTIGOS
   * usam o formulário anterior (curso_actual/satisfacao_curso/
   * para_onde_quer_ir), nunca opcoes_adolescente/clareza_ideia (esse
   * formulário não existia ainda). `construirIntakeAdolescente` (web,
   * relatorioAdultoCompute.ts) só lia opcoes_adolescente — vazio para
   * estes pedidos — por isso "Leitura por opção" escrevia "não trouxeste
   * opções declaradas" para clientes que, de facto, declararam uma
   * direcção real, só que no campo antigo. `cursoActual`/`paraOndeQuerIr`
   * ficam aqui como fallback, só preenchidos quando `opcoesAdolescente`
   * está vazio E o pedido é deste formato antigo — ver uso em
   * `construirPromptAdolescente` abaixo.
   */
  cursoActual?: string;
  paraOndeQuerIr?: string;
}

/**
 * TAREFA 1C — formata os cursos concretos resolvidos para uma opção declarada
 * (ver `sugerirCursosParaOpcoesAdolescente`), para quem está no 10º-12º ano.
 * `[]` quando a opção não teve correspondência no mapeamento curado.
 *
 * BUG REAL, corrigido (pedido directo do fundador — "se o cliente
 * apresentou, obviamente que é uma opção, e tem de ser tratada como todas
 * as outras... e tem de ser incluída") — o texto antigo, injectado aqui
 * directamente no bloco de dados de CADA opção declarada sem curso curado
 * correspondente, dizia "esta opção não tem correspondência directa no
 * catálogo" — linguagem de desqualificação, junto ao próprio nome da
 * opção, que o modelo tendia a ecoar no relatório visível apesar da
 * instrução em contrário mais abaixo (ver ponto 3 de
 * `instrucaoLeituraPorOpcao`). Não existir no catálogo curado de cursos é
 * uma limitação DOS DADOS (o catálogo é uma lista curada, não cobre todos
 * os nomes possíveis), nunca um sinal sobre a opção em si — reescrito para
 * nunca sugerir isso.
 */
function formatarCursosDaOpcao(cursos: CursosSugeridos[]): string {
  if (!cursos.length) return "(sem entrada curada de curso para este nome exacto — é uma opção declarada válida como qualquer outra; descreve-a com a mesma profundidade, pelo Eixo da Missão e pelo Modo de Ganho acima.)";
  return cursos
    .map((c) => {
      const curso = c.cursos[0];
      return [
        `Curso: ${curso.nome} (${curso.nivel}, QNQ ${curso.qnq ?? "—"}, ${curso.duracao ?? "duração não aplicável"}, ${curso.tipoInstituicao})`,
        ...c.entradaMercadoAdulto.map((linha) => `  ${linha}`),
      ].join("\n");
    })
    .join("\n\n");
}

export function construirPromptAdolescente(
  intake: VocationiqIntakeAdolescente,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
  catalogo: ResultadoCatalogoVocacional,
  savPorCasa: SavPorCasa[],
  elementosModalidades: PerfilElementosModalidades,
  aspectosPessoais: AspectoPessoal[],
  cursosPorDestino: Record<string, CursosSugeridos>,
  cursosPorOpcaoDeclarada: Record<string, CursosSugeridos[]>,
  /** FALTA 2 (correcção do especialista) — mesmas 4 camadas técnicas do ramo adulto, mesmos blocos partilhados (blocoAvasthas/blocoConjuncoes/blocoYogas/blocoVargottama, importados de promptAdulto.ts) — nunca um adolescente com menos profundidade técnica do que um adulto. */
  d1: D1TableResult,
  yogas: YogaHit[],
): string {
  // REVERTIDO — "pos-12" nunca chega aqui (a rota encaminha para o motor
  // adulto antes, ver `ehPos12` em relatorioAdultoCompute.ts/route.ts,
  // intocado); a distinção 7-a-9 vs 10-a-12 que existia aqui foi
  // removida (ver comentário no topo do ficheiro) — percurso único para
  // qualquer `anoEscolaridade` que chegue a este prompt.
  // BUG REAL, corrigido (ronda "relatório Marta") — pedidos "universidade"
  // ANTERIORES à migração 0019 declararam a sua direcção no campo antigo
  // "para onde quer ir" (texto livre), nunca em opcoesAdolescente (esse
  // formulário não existia ainda para eles). Sem este fallback, "Leitura
  // por opção" escrevia "não trouxeste opções declaradas" para alguém
  // que, de facto, tinha declarado uma direcção real — só no sítio
  // errado para este prompt olhar. `usarOpcoesLegado` só é verdadeiro
  // quando NÃO há opções no formato actual E existe texto livre no
  // formato antigo — nunca substitui opcoesAdolescente quando este vem
  // preenchido.
  const opcoesLegadoTexto = !intake.opcoesAdolescente.length && intake.paraOndeQuerIr ? normalizarTextoLivre(intake.paraOndeQuerIr) : null;
  const usarOpcoesLegado = opcoesLegadoTexto !== null;
  const opcoesTexto = intake.opcoesAdolescente.length
    ? intake.opcoesAdolescente
        .map((o) => {
          const maisProvavel = intake.opcaoMaisProvavel && o.toLowerCase() === intake.opcaoMaisProvavel.toLowerCase();
          const detalhe = formatarCursosDaOpcao(cursosPorOpcaoDeclarada[o] ?? []);
          return `- ${o}${maisProvavel ? " (a que a pessoa acha mais provável hoje — trata como a hipótese em teste, não como decisão)" : ""}\n${detalhe}`;
        })
        .join("\n\n")
    : usarOpcoesLegado
      ? `(PEDIDO ANTERIOR ao formulário actual de "opções em cima da mesa" — a pessoa não usou essa caixa, mas declarou por escrito livre, no campo "Se pensa mudar, para onde": "${opcoesLegadoTexto}"${intake.cursoActual ? ` (curso actual desta pessoa: ${normalizarTextoLivre(intake.cursoActual)})` : ""}. Identifica cada área/curso claramente mencionado neste texto e trata cada um como se fosse uma opção declarada normal na secção "${SECCAO_TITULOS.leituraPorOpcao}" — escreve o bloco "### <nome>" completo para cada área que conseguires identificar com clareza. Nunca inventes uma área que a pessoa não tenha mencionado aqui.)`
      : `(nenhuma opção declarada — escreve a partir do que o perfil sustenta em geral e da secção "${SECCAO_TITULOS.candidataForaDaLista}", que aparece ao cliente como "Opções que ainda não consideraste" — nunca uses o nome interno "candidata" a referir-te a esta secção no texto visível.)`;

  // Correcção do especialista (bug crítico — pergunta concreta sem
  // resposta directa / abertura não responde à situação) — a pergunta
  // que INSTRUCAO_PERGUNTA_ESPECIFICA/INSTRUCAO_ABERTURA_RESPONDE têm de
  // responder de frente, nos dois motores pela mesma regra. PRIORIDADE
  // (correcção do especialista, auditoria de hoje — caso real: Alexandra):
  // a pergunta REAL que a pessoa escreveu (`perguntaEspecifica`, campo
  // que existe no formulário adolescente tal como no adulto) tem sempre
  // prioridade — nomeia as opções que a pessoa quis nomear, nunca só uma.
  // "opcaoMaisProvavel" ("qual delas te parece a mais provável hoje?",
  // SPEC-vocacional.md) é só o FALLBACK, para pedidos que não preencheram
  // pergunta específica.
  const perguntaImplicita = intake.perguntaEspecifica
    ? normalizarTextoLivre(intake.perguntaEspecifica)
    : intake.opcaoMaisProvavel
      ? `É "${intake.opcaoMaisProvavel}" mesmo a mais provável, à luz do perfil?`
      : null;

  // ORDEM do especialista ("novo parágrafo de abertura em 'Opções que
  // ainda não considerou', anti 'isto dá para tudo'") — mesma função
  // partilhada de promptAdulto.ts, em registo "tu".
  const paragrafoAntiDaParaTudoTexto = paragrafoAntiDaParaTudo(catalogo.parOpcoesContraste, true);

  const blocoCandidatasCatalogo = blocoCatalogoVocacional(catalogo, cursosPorDestino);

  const instrucaoLeituraPorOpcao = `${perguntaImplicita ? `Esta secção abre, ANTES do primeiro bloco "### ", com a resposta directa a "${perguntaImplicita}" no formato exigido por INSTRUCAO_PERGUNTA_ESPECIFICA — retomada aqui, nunca contradita face ao que já foi respondido em "${SECCAO_TITULOS.abertura}".\n\n` : ""}PROFUNDIDADE OBRIGATÓRIA (correcção do especialista, ronda "relatório Marta", ponto 9a) — quando a pessoa declarou opções reais (o caso mais comum desta secção), esta é a secção que responde directamente à pergunta que a trouxe até aqui: tem de ser a mais desenvolvida do relatório inteiro, nunca a mais resumida. Cada um dos 6 pontos abaixo é um parágrafo próprio de pelo menos 3-4 frases, nunca uma única frase-resumo por ponto — texto corrido e argumentado, nunca 6 caixas curtas telegráficas. VERIFICAÇÃO OBRIGATÓRIA, PONTO A PONTO (correcção do especialista — bug real, confirmado num relatório de adolescente: 5 dos 6 pontos tinham 3-4 frases, mas um ponto isolado saiu com só 2): antes de avançares para a próxima opção candidata, conta as frases de CADA um dos 6 pontos que acabaste de escrever, um a um — não confies na impressão geral de que "o bloco parece completo". Qualquer ponto com menos de 3 frases é uma falha a corrigir, acrescentando conteúdo real (nunca frases de enchimento), antes de continuares.
ERRO CONFIRMADO EM GERAÇÃO REAL (correcção do especialista, ronda seguinte — nunca repetir isto): uma opção declarada saiu, de facto, como uma única frase com um badge de força e nada mais — nenhum dos 6 pontos numerados chegou a aparecer. Isto é uma falha grave: a pessoa perguntou especificamente sobre esta opção, e uma frase não é uma resposta. A crítica automática que se segue a esta geração vai medir isto directamente (critério 33) — conta quantas frases tem cada ponto e obriga a reescrever o bloco inteiro se algum tiver menos de 3.

BUG REAL, corrigido (ronda "regeneração Alexandra 3" — nunca repetir isto): num relatório real, "Direito" (mencionado só em "Preferência da família", nunca em "Opções em cima da mesa") ganhou aqui um bloco "### " completo, ao mesmo tempo que aparecia — correctamente — como candidata fora da lista na secção seguinte. O mesmo nome com dois estatutos opostos no mesmo relatório é uma contradição visível, pior do que não o mencionar. PROIBIDO ABSOLUTO: um bloco "### " nesta secção para qualquer nome que não esteja, exactamente, na lista "Opções em cima da mesa" acima — mesmo que esse nome apareça noutro sítio dos dados técnicos (preferência da família, "para onde quer ir" legado, ou como candidata forte no catálogo). Se o perfil sustenta com força uma área que a pessoa não pôs em cima da mesa, isso é precisamente o trabalho da secção "${SECCAO_TITULOS.candidataForaDaLista}" — nunca duplicado aqui.

BUG REAL, corrigido (ronda "Miguel — opções fundidas", nunca repetir isto): num relatório real, a pessoa declarou "Engenharia Biomédica" e "Engenharia e Gestão Industrial" como duas linhas em "Opções em cima da mesa" — mas esta secção saiu com um ÚNICO bloco "### " intitulado "Engenharia biomédica e engenharia e gestão industrial", fundindo as duas num só, e o ponto 3 disse "não há, no catálogo, um curso que corresponda exactamente" a esse nome fundido (nunca encontraria — não é o nome de nenhuma opção real). PROIBIDO ABSOLUTO: fundir duas ou mais linhas de "Opções em cima da mesa" num único bloco "### ", mesmo que nenhuma delas tenha dados de curso no catálogo curado, mesmo que pareçam relacionadas. Cada linha da lista é uma opção distinta e leva SEMPRE o seu próprio bloco "### " completo, com o nome exacto dessa linha (nunca duas linhas juntas num nome composto).

VERIFICAÇÃO OBRIGATÓRIA, ANTES DE ESCREVERES QUALQUER BLOCO "### " (correcção do especialista — bug real, RECORRENTE nesta mesma secção apesar da regra acima já existir: "Direito" voltou a aparecer aqui vindo da "Preferência da família", não da lista real): copia mentalmente a lista exacta de nomes em "Opções em cima da mesa" acima. Vais escrever exactamente um bloco "### " por cada nome dessa lista — nem mais, nem menos. Antes de escreveres um bloco "### " para um nome, confirma que esse nome exacto está, literalmente, nessa lista — nunca porque apareceu na pergunta da pessoa, na preferência da família, ou como candidata forte no catálogo. Se um nome te parece relevante mas NÃO está na lista, ele não entra aqui de forma nenhuma — pertence só à secção "${SECCAO_TITULOS.candidataForaDaLista}". No final desta secção, volta a contar: nº de blocos "### " tem de ser exactamente igual ao nº de linhas em "Opções em cima da mesa" — qualquer diferença é uma falha a corrigir antes de terminares.

Para CADA opção em cima da mesa (nunca mais nenhuma, nunca menos, nunca fundidas), este formato EXACTO — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios:

### <nome exacto da opção>
${MARCADORES.forca} <forte, moderada ou fraca>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras>
1. O que o teu perfil sustenta nesta opção — cita pelo menos duas fontes independentes, mas não te limites a citá-las: desenvolve o que cada uma significa em termos concretos, e como se traduz especificamente nos dons já nomeados na secção "${SECCAO_TITULOS.quemE}" — nomeia esses dons e explica CONCRETAMENTE como vão ser usados na prática nesta área (não "tens facilidade para comunicar", mas o que essa facilidade permite fazer especificamente neste curso/área).
2. O que esta opção te vai pedir na formação — o esforço específico DESTE perfil, nunca o risco genérico da área. Liga sempre a uma limitação já nomeada na secção "${SECCAO_TITULOS.quemE}": se tens uma dificuldade nomeada com pressão, confronto directo, exposição pública, trabalho solitário, etc., diz explicitamente o que isso significa escolher esta área em concreto (ex.: se a limitação é dificuldade com confronto directo e a opção é Direito, diz que a vertente forense/contenciosa vai exigir mais esforço deliberado do que outras vertentes do curso — nunca deixes essa tensão por explicar).
3. O curso concreto e a via de entrada — ${
    usarOpcoesLegado
      ? 'esta opção veio do texto livre da pessoa, não da lista estruturada "Opções em cima da mesa" — não há dados de curso concreto (QNQ, duração, tipo de instituição) disponíveis para ela no catálogo curado. NUNCA inventes esses dados, e NUNCA escrevas isso como se fosse um problema da opção ou motivo para responder com menos profundidade — a pessoa escreveu esta opção livremente, é tão válida como qualquer outra. Em vez disso,'
      : 'usa sempre os dados já listados acima em "Opções em cima da mesa" (nome do curso, nível, QNQ, duração, tipo de instituição, entrada no mercado), quando existirem para esta opção específica. Se ESTA opção em particular não tiver esses dados listados (o catálogo curado de cursos não cobre todos os nomes possíveis — acontece com cursos de nome muito específico ou composto, nunca significa que a opção seja inválida): NUNCA te limites a dizer "não há correspondência no catálogo" e passares à frente — continua a responder com a MESMA profundidade, pelo nome exacto que a pessoa escreveu, usando o Eixo da Missão e o Modo de Ganho para descrever o tipo de formação que esse nome de curso tipicamente implica (nível de ensino, se costuma ter ordem profissional, se é mais técnico ou mais de gestão/humanístico) — a pessoa perguntou especificamente sobre ESTE nome, a resposta tem de ser sobre ele, nunca um adiar genérico nem um curso diferente. NUNCA nomeies uma instituição concreta. Sempre que o curso tiver variantes internas conhecidas (ex.: dentro de Direito: forense vs. empresarial vs. internacional; dentro de Psicologia: clínica vs. organizacional),'
  } aponta 1-2 que encaixam melhor neste perfil especificamente, usando os dons já nomeados — nunca inventes uma variante sem ligação aos dados desta pessoa.
4. O que esta opção pede e que falta actualmente (correcção do especialista — bug real, recorrente: este ponto saiu sistematicamente com 1-2 frases, muito abaixo dos outros 5, em 3 opções seguidas do mesmo relatório): não te fiques pelo "falta X, mas aprende-se" — desenvolve em pelo menos 3 frases: nomeia a lacuna concreta (que capacidade, que hábito de trabalho, que tipo de raciocínio), diz se é algo que se aprende com prática/tempo ou uma tensão mais estrutural com um traço já nomeado em "${SECCAO_TITULOS.quemE}", e aponta um sinal concreto de progresso (o que mudaria, na prática do dia a dia, quando essa lacuna estiver a fechar-se). Este ponto mede-se pela mesma régua de profundidade dos outros 5 — nunca o mais curto do bloco.
5. Onde entra a tua matéria nesta opção — a forma/função, nunca só o sector.
6. Conclusão explícita — ver INSTRUCAO_VALIDACAO_OPCOES: uma das três frases-molde exactas (sustenta com clareza / sustenta parcialmente / não sustenta de forma natural), nunca omitida.`;

  // Correcção do especialista ("remover o tecto fixo de 3, com
  // agrupamento por cluster") — a secção "Candidatas do catálogo" traz a
  // pool completa, SEM LIMITE nenhum; apresentar-se todas as que passam o
  // Passo 1 (ligação narrativa), agrupadas por convergência de base quase
  // idêntica quando aplicável (INSTRUCAO_SELECCAO_CANDIDATAS, importada
  // de promptAdulto.ts — mesma regra nos dois motores, nunca duplicada).
  // Correcção do especialista ("ORDEM — nomenclatura/cor", 6e) — a
  // menção de percurso/duração no corpo do texto foi removida (fica só
  // nas linhas VIA_RESUMIDA:/CUSTO_PRINCIPAL:, que alimentam a
  // tabela-resumo) — repeti-la como prosa era redundante com a tabela.
  // Cada opção passa a explicar só uma coisa: porque faz sentido dentro
  // deste perfil especificamente.
  const instrucaoCandidata = `Se a pool tiver 1 ou mais candidatas, primeiro escreve o bloco único "${MARCADORES.seleccaoCandidatas}" (ver INSTRUCAO_SELECCAO_CANDIDATAS). Depois, para cada candidata que passou o Passo 1 (ligação narrativa), um de dois formatos — em AMBOS, abre sempre com a frase de dom (ver INSTRUCAO_ABERTURA_CANDIDATAS: usa o FACTOR DE DOM já dado e traduzido) e NUNCA menciona duração de curso, trajecto ou via de entrada no corpo do texto:
FORMATO INDIVIDUAL (sem grupo): "${MARCADORES.candidata} <nome exacto>" seguido da frase de dom, depois 1 a 3 frases sobre porque esta área faz sentido especificamente dentro deste perfil (que outros sinais reforçam a ligação). Nunca percurso/formação, nunca nomeies uma entidade concreta.
FORMATO DE GRUPO (2+ candidatas da secção "Grupos de candidatas" que passaram o Passo 1): "${MARCADORES.grupo} <nome1>; <nome2>; ..." seguido, na linha a seguir, de "${MARCADORES.nomeGrupo} <nome curto e descritivo, 2-5 palavras>" — um nome memorável para este grupo, extraído da MESMA convergência que vais explicar a seguir (nunca uma categoria nova, nunca genérico como "Grupo A"; ex.: "Comunicação Visual e Criativa"). Só depois, a frase de dom + convergência de base partilhada por todo o grupo, escrita uma só vez — depois um bloco "${MARCADORES.candidata} <nome exacto>" por membro, cada um só com a sua diferenciação (1-3 linhas: porquê esta e não as outras do grupo, nunca via concreta), sem repetir a frase de dom nem a convergência de base.
Em cada candidata (individual ou membro de grupo), inclui também duas linhas próprias: "${MARCADORES.viaResumida} <3-8 palavras>" (resume a via concreta já dada) e "${MARCADORES.custoPrincipal} <3-8 palavras>" com o principal custo/trade-off desta via — ambas curtas, específicas, nunca genéricas nem repetidas iguais entre candidatas. É AQUI, e só aqui, que a via/duração pode aparecer.
Apresenta TODAS as candidatas que passaram o Passo 1, sem limite de 3 — nunca "escolher até 3", isso já não é a regra.`;

  return `
És um especialista em orientação vocacional para adolescentes de 15 a 18 anos, ainda sem experiência profissional. Vais escrever um relatório para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- LÍNGUA — OBRIGATÓRIO 100% PORTUGUÊS: todo o texto visível ao cliente, em TODAS as secções, tem de estar inteiramente em português — nunca uma palavra ou expressão em inglês a meio de uma frase portuguesa (ex.: "already", "however", "overview"), mesmo que pareça natural nesse ponto da frase. Isto aplica-se mesmo a nomes próprios de sinais/planetas quando têm tradução comum em português (ex.: "Sol", nunca "Sun"). Revê a frase inteira antes de a dar como terminada — um único termo em inglês invalida a frase.
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Tens..." / "O teu perfil sustenta...", nunca "Marte na casa X indica...").
- TRATAMENTO: usa "tu" — é a pessoa mais nova a quem este relatório se dirige, não um adulto profissional. Nunca "você".
- EXCEPÇÃO AO "TU" — OS CABEÇALHOS "## ": cada cabeçalho "## <título>" na secção ESTRUTURA DO RELATÓRIO abaixo (ex.: "## ${SECCAO_TITULOS.quemE}", "## ${SECCAO_TITULOS.oQueACartaSustenta}") é um marcador técnico que o código usa para dividir o texto em secções — copia-o EXACTAMENTE como está escrito abaixo, letra por letra, mesmo que pareça estranho em registo "tu" (ex.: "${SECCAO_TITULOS.quemE}", não "Quem és"; "${SECCAO_TITULOS.oQueACartaSustenta}", não "O que o teu perfil sustenta"). O "tu" aplica-se sempre ao TEXTO que escreves a seguir a cada cabeçalho, nunca ao cabeçalho em si.
- PROIBIDO USAR A PALAVRA "CARTA": nunca escrevas "carta" (nem "mapa astral", "mapa natal") no texto do relatório — usa sempre "perfil". Correcto: "o teu perfil sustenta X". Proibido: "a tua carta sustenta X".
- TOM: acessível para quem tem 15 a 18 anos e ainda não trabalhou — mais claro e menos abstracto do que um relatório para adultos, NUNCA condescendente ou infantilizado. Sem gíria de coach, sem emojis. Nunca uses "carreira estabelecida", "anos de experiência", ou qualquer referência a um percurso profissional que esta pessoa ainda não teve.
- PROIBIDO: primeira pessoa do plural ("identificámos", "vimos", "calculámos"). Correcto: "o teu perfil mostra", "os dados indicam".
- Zero fatalismo. Nada é inevitável nem escrito em pedra. Nunca escrevas "deves escolher X" ou qualquer veredicto fechado — apresenta o que o perfil sustenta e o que pede, a decisão é sempre da pessoa (e, nesta idade, também da família, mas o relatório fala directamente com ela).
- NUNCA uses o padrão genérico de coaching (identificar 3 exemplos, embrulhar num método) sem ligar explicitamente a um dado técnico calculado acima. Cada frase de conselho tem de ser rastreável a um facto técnico específico desta lista — nunca a generalidades sobre a área.
- REGRA ANTI-REPETIÇÃO: cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a mesma conclusão com palavras diferentes em secções diferentes.
- PLANETAS FRACOS (peso < 0,9): CADA planeta com peso < 0,9 é mencionado explicitamente, nunca uma barra vermelha sem texto correspondente — confirma isto contra a lista de pesos nos dados técnicos, planeta a planeta, antes de terminares "${SECCAO_TITULOS.quemE}". Cuidado especial (correcção do especialista — bug real: um planeta fraco que também rege o Modo de Ganho dominante foi citado várias vezes como "forte" por esse papel, e o seu peso baixo nunca foi nomeado): um planeta pode ter um papel estrutural importante (reger o Modo de Ganho, ser Atmakaraka/Amatyakaraka) E ter peso <0,9 ao mesmo tempo — as duas coisas não se cancelam, e a segunda não fica dispensada só porque a primeira já foi dita. Nomeia sempre as duas: o papel que desempenha E o facto de ser um dos planetas mais fracos do perfil nesse peso.
- TENSÃO INTERNA: sempre que dois sinais do perfil apontam em direcções diferentes, o texto é obrigado a nomeá-lo — nunca escolher só o lado bonito.
- REGRA CRÍTICA — LEITURA CONJUNTA: nunca ler um eixo isolado. Ordem obrigatória: 1. Eixo da Missão — o que a pessoa é por dentro. 2. Modo de Ganho — por onde tende a entrar o reconhecimento, testado contra 1. 3. Montra de Mercado — como é vista de fora, testado contra 1+2. 4. Planetas fracos — explicam onde falta apoio natural. Só depois disto testado e amarrado é que se avalia qualquer opção em cima da mesa.
- ${INSTRUCAO_KARAKAMSHA}
- EIXO DA MISSÃO + MONTRA DE MERCADO — NUNCA ISOLADOS: os dois lidos em separado podem parecer contraditórios (ex.: um a apontar para trabalho de bastidores, o outro para exposição pública); lidos juntos, dizem a mesma coisa com instrumentos diferentes — nunca apresentar como tensão sem antes tentar esta leitura conjunta.
- COERÊNCIA COM OS VISUAIS: o relatório tem elementos visuais gerados automaticamente (gráfico de forças, radar de competências, Roda da Vida). O texto deve referenciá-los quando relevante ("Como mostra o gráfico de forças...") e nunca contradizer o que mostram — se um visual mostra um valor fraco, o texto não pode dizer que é forte.
- VALOR ALTO NUM ELEMENTO VISUAL NÃO É O TEMA CENTRAL: uma dimensão com valor alto na Roda da Vida pode reflectir só onde o planeta mais forte do perfil está fisicamente posicionado — não é automaticamente o tema mais importante. O tema central vem sempre do Eixo da Missão e do Modo de Ganho, nunca do valor mais alto da roda sozinho.
- ESCALA DE CONFIANÇA (obrigatória em todo o relatório) — a linguagem tem de bater sempre com o nº de camadas que sustentam a afirmação:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva.
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes.
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto.
  · EM ABERTO (o perfil não distingue): diz isso directamente — "o teu perfil não distingue entre X e Y, a decisão fica contigo".
- PROIBIDO EXPOR NÚMEROS DE CÁLCULO INTERNO NO TEXTO VISÍVEL (correcção do especialista, pós-PDF real): "soma de pesos", "convergência N camadas", "Nível 1"/"Nível 2", e o peso numérico exacto de um planeta nunca podem aparecer em bruto em nenhuma secção visível — traduz sempre para a linguagem de confiança já pedida. O "${MARCADORES.seleccaoCandidatas}" é o único sítio onde estes números podem ser citados, e mesmo esse nunca chega ao cliente.
- ${INSTRUCAO_AVASTHAS}
- ${INSTRUCAO_CONJUNCOES}
- ${INSTRUCAO_YOGAS}
- ${INSTRUCAO_MECANISMO_NUNCA_SO_EFEITO}
- ${INSTRUCAO_FERRAMENTAS_PATRIMONIO}
- ${EXEMPLO_TOM_ESPECIALISTA}
- ${INSTRUCAO_VARGOTTAMA}
- ${INSTRUCAO_CONSISTENCIA_TECNICA}
- ${INSTRUCAO_NUNCA_CANDIDATA}
- ${INSTRUCAO_SELECCAO_CANDIDATAS}
- ${INSTRUCAO_ABERTURA_CANDIDATAS}
- ${INSTRUCAO_NIVEL_CANDIDATAS}
- ${INSTRUCAO_PERGUNTA_ESPECIFICA}
- ${INSTRUCAO_ABERTURA_RESPONDE}
- ${INSTRUCAO_VALIDACAO_OPCOES}
- ${INSTRUCAO_PLANO_PERIODOS_RELATIVOS}
- ${INSTRUCAO_FACILIDADES_NATURAIS}
- HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo.
- A lista de opções entrega-se sempre com a moldura explícita, no início e no fim da secção "Leitura por opção": isto é para reconhecer, não para obedecer — o critério final é o reconhecimento interno do jovem, nunca o documento.
- Ao nomear um caminho fora do sistema formal, indica sempre a via de sustento associada — nunca "o teu caminho é X" sem dizer o que paga as contas enquanto X cresce.
- NOTAS ESCOLARES: ter boa nota a uma disciplina NÃO é sinal vocacional — é sinal de Mercúrio funcional e de disciplina de estudo, e serve dezenas de territórios. Confundir nota com vocação é o erro mais comum da orientação escolar — nunca o cometas.
- NUNCA nomear instituições de nenhum tipo — nem de ensino, nem ordens profissionais, nem certificações com nome próprio, nem formadores. Concreto na estrutura ("uma licenciatura de 3 anos", "a ordem profissional da área"), genérico no nome da entidade.
${horaNascimentoFornecida ? "" : "\nNOTA INTERNA — hora de nascimento não fornecida, elementos que dependem do Ascendente têm de ser tratados com cautela explícita."}

VOLUME: cada secção deve ser tão longa quanto os dados sustentam — nunca mais, nunca menos. Se uma secção não tem nada genuinamente novo a acrescentar, é curta. Não preencher para atingir um mínimo. Proibido: repetir para parecer completo. Permitido: ser curto e preciso.

=== DADOS TÉCNICOS ===

-- Quem é --
Nome: ${intake.nome}
Situação declarada: ${intake.situacaoDeclarada}
${intake.preferenciaFamilia ? `Preferência da família (contexto para a abertura, NUNCA uma opção em cima da mesa — proibido escrever um bloco "### " na secção "${SECCAO_TITULOS.leituraPorOpcao}" com um nome que só apareça aqui e não na lista "Opções em cima da mesa" acima): "${intake.preferenciaFamilia}"` : ""}
${perguntaImplicita ? `Pergunta específica (implícita — ver INSTRUCAO_PERGUNTA_ESPECIFICA/INSTRUCAO_ABERTURA_RESPONDE): ${perguntaImplicita}` : ""}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes, pesosPlanetas)}

-- Montra de Mercado (como és vista/o de fora — não depende de já teres trabalhado) --
${blocoMontraMercado(axes)}

-- Peso de cada planeta --
${blocoPesos(pesosPlanetas)}

-- Para que tem facilidade natural (já calculado — ver INSTRUCAO_FACILIDADES_NATURAIS) --
${blocoFacilidadesNaturais(pesosPlanetas, true)}

-- Roda da Vida (8 dimensões, 0-10) --
${blocoRodaDaVida(savPorCasa, pesosPlanetas, axes.regentesCasas)}

-- Avasthas (maturidade dos planetas) --
${blocoAvasthas(d1)}

-- Conjunções activas --
${blocoConjuncoes(d1)}

-- Yogas activos --
${blocoYogas(yogas)}

-- Vargottama --
${blocoVargottama(d1)}

-- Datas reais --
${blocoDatas(datas)}

-- Perfil de elementos e modalidades --
${blocoElementosModalidades(elementosModalidades)}

-- Aspectos principais --
${blocoAspectosPessoais(aspectosPessoais)}

-- Candidatas do catálogo (inclui vias concretas por candidata) --
${blocoCandidatasCatalogo}

-- Opções em cima da mesa (com cursos concretos por opção) --
${opcoesTexto}

ANTES de ${MARCADORES.identidade}, escreve, numa linha própria: "${MARCADORES.fraseAbertura} " seguido de uma frase de 10 a 15 palavras que captura a essência deste perfil — poderosa, específica, nunca genérica. Não é um resumo. É a frase que a pessoa vai lembrar deste relatório. Exemplos do formato: "A tua estrutura não pede palco — pede que construas algo que dure.", "A tua voz vale mais quando defende algo do que quando agrada." Proibido: clichés de coaching, frases genéricas de auto-ajuda. Este marcador é obrigatório e machine-readable, não o omitas.

DEPOIS de ${MARCADORES.fraseAbertura}, escreve, numa linha própria: "${MARCADORES.identidade} " seguido de uma frase de 8 a 12 palavras que descreve o que esta pessoa foi feita para ser — não o que perguntou, não a opção que tem em mente, mas a sua natureza estrutural. NUNCA fala de profissão ou carreira (ainda não existe) — fala de modo de funcionar. Deve ser específica deste perfil, nunca genérica. Exemplos do formato: "Alguém que aprende a fundo antes de decidir, nunca por impulso", "Uma mente que organiza o caos dos outros com naturalidade". Proibido: "pessoa comunicativa", "líder nato", qualquer cliché de coaching. Este marcador é obrigatório e machine-readable, não o omitas.

=== ESTRUTURA DO RELATÓRIO — exactamente estas 6 secções, por esta ordem ===

## ${SECCAO_TITULOS.abertura}
O primeiro parágrafo é a resposta directa ou a âncora — ver INSTRUCAO_ABERTURA_RESPONDE, obrigatório, nunca dados técnicos nem análise abstracta antes disto. Só depois desse parágrafo: quadro de dados (nome, situação escolar) e o enquadramento da pergunta que a pessoa trouxe.

## ${SECCAO_TITULOS.quemE}
Um retrato de personalidade, ANTES de qualquer opção ser mencionada. Formato EXACTO, obrigatório e machine-readable:

DONS — 2 a 3 linhas "${MARCADORES.dom} <frase>", obrigatório. CONTEXTO (diferente do relatório adulto): um dom aqui é "o que te vai ajudar a prosperar na área que escolhes" — NUNCA "o que me define profissionalmente" (a pessoa ainda não tem profissão). Exemplo correcto: "Tens uma capacidade natural para estruturar informação — isso vai ser uma vantagem real no percurso académico de áreas que exigem organização e método." Exemplo errado (nunca escrever assim): "És uma pessoa estruturada profissionalmente."

LIMITAÇÕES — 1 a 2 linhas "${MARCADORES.limitacao} <frase>", obrigatório. CONTEXTO (diferente do relatório adulto): uma limitação aqui é "onde vais precisar de mais apoio durante a formação" — NUNCA "o que me vai custar na carreira" (não há carreira ainda). Exemplo correcto: "A fluência de comunicação oral vai precisar de atenção — não é natural, mas é treinável, e a maioria dos cursos desta área tem componentes práticas que ajudam a desenvolvê-la." Exemplo errado (nunca escrever assim): "Isto vai prejudicar-te no mundo do trabalho."

ELEMENTOS E MODALIDADES: o elemento dominante revela como processas e ages no mundo; a modalidade dominante revela o teu ritmo natural de mudança. Integra estes dados na narrativa dos dons/limitações acima — nunca como parágrafo à parte.

ASPECTOS ENTRE PLANETAS PESSOAIS: os aspectos revelam tensões e harmonias internas. Nomeia os mais relevantes (especialmente quadraturas e oposições) como parte das limitações/tensões já nomeadas — nunca como secção nova.

O QUE VALORIZA — sempre com conteúdo real: um parágrafo curto sobre o que esta pessoa genuinamente valoriza, ancorado em Vénus e nos dons/limitações já nomeados.

Termina com "${MARCADORES.sinteseQuemE} <frase>" — uma frase compacta que resume: quem és agora, o que te move, onde tens mais facilidade natural, onde vais precisar de mais esforço. NUNCA "quem és profissionalmente" — ainda não há profissão.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções em cima da mesa.

## ${SECCAO_TITULOS.leituraPorOpcao}
${instrucaoLeituraPorOpcao}

## ${SECCAO_TITULOS.candidataForaDaLista}
As candidatas elegíveis já vêm calculadas deterministicamente na secção "Candidatas do catálogo" acima — a POOL COMPLETA, SEM LIMITE nenhum. NÃO calcules a tua própria convergência, NÃO inventes nenhuma candidata diferente. A tua tarefa é APRESENTAR TODAS as que passam o Passo 1 (ligação narrativa, ver INSTRUCAO_SELECCAO_CANDIDATAS), agrupando as de convergência de base quase idêntica, e escrever o bloco de raciocínio obrigatório antes delas. Nunca "escolher até 3".

Escreve primeiro a tua própria frase de abertura da secção (1-2 frases, o enquadramento habitual). ${
    paragrafoAntiDaParaTudoTexto
      ? `Logo a seguir a essa frase, ANTES de qualquer candidata ou bloco de raciocínio, insere este parágrafo — EXACTO, sem alterar uma única palavra nem parafrasear (as duas opções já vêm resolvidas dos dados reais desta pessoa, nunca as substituas por outras): "${paragrafoAntiDaParaTudoTexto}"`
      : "(esta pessoa tem menos de 2 candidatas na pool — não insiras nenhum parágrafo extra aqui, segue directamente para a regra \"nenhuma\"/candidata única abaixo.)"
  }

Se essa secção diz "nenhuma", a primeira e única linha é "${MARCADORES.candidata} nenhuma". Não é preciso bloco de raciocínio quando não há nenhuma candidata na pool.

${instrucaoCandidata}

REGRA ABSOLUTA — SEM RANKING ENTRE CANDIDATAS: candidatas e grupos apresentam-se sempre em PÉ DE IGUALDADE, entre si e dentro do mesmo grupo — proibido "1ª/2ª/3ª escolha", "a mais forte", "menção honrosa". Dentro de um grupo, a diferenciação de cada candidata é sobre ENCAIXE (que via serve melhor esta pessoa), nunca sobre qual é "melhor" (a comparação entre candidatas da pool só acontece dentro do bloco "${MARCADORES.seleccaoCandidatas}", nunca no texto visível).

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA: proibido nomear qualquer candidata sem que venha explicitamente da secção "Candidatas do catálogo" acima. Nunca preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos.

## ${SECCAO_TITULOS.oPlano}
CONTEXTO (diferente do relatório adulto): este plano é orientado para a PRÓXIMA DECISÃO ESCOLAR/ACADÉMICA (ex.: escolha de curso, candidatura ao ensino superior) — NUNCA para uma transição profissional, que ainda não existe. Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima). Depois disso, segue exactamente o formato de INSTRUCAO_PLANO_PERIODOS_RELATIVOS (períodos relativos — nunca datas fixas nem meses do calendário, excepto a data real de fim da Mahadasha/Antardasha actual). Destaca o primeiro passo accionável das "próximas 2 semanas" numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " — ligado à decisão escolar concreta que a pessoa tem à frente, nunca um passo genérico de "explorar carreiras".
TERCEIRA REPETIÇÃO DA RESPOSTA DIRECTA — PROIBIDO (correcção do especialista — bug real: a conclusão de qual área o perfil sustenta mais já apareceu em "${SECCAO_TITULOS.abertura}" e outra vez em "${SECCAO_TITULOS.leituraPorOpcao}" — a regra permite essas duas, nunca uma terceira): esta secção não volta a afirmar qual opção o perfil sustenta com mais ou menos força, nem por outras palavras. As acções propostas podem envolver qualquer uma das opções ou candidatas já nomeadas (conversas, experiências, comparações) sem que isso exija repetir o veredicto — o plano é sobre O QUE FAZER a seguir, não sobre reabrir a conclusão já dada duas vezes antes.
`.trim();
}
