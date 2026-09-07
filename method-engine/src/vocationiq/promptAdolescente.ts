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

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import { viaSecundariaParaDestino, type CursosSugeridos } from "./catalogoCursos";
import type { D1TableResult } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";
import {
  blocoEixoMissao,
  blocoModoDeGanho,
  blocoPesos,
  blocoDatas,
  blocoCatalogoVocacional,
  blocoElementosModalidades,
  blocoAspectosPessoais,
  blocoAvasthas,
  blocoConjuncoes,
  blocoYogas,
  blocoVargottama,
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
  /** TAREFA 2 (correcção do especialista, aprovada) — migração 0020. `undefined`/`"pos-12"` nunca chegam a este prompt: `undefined` cai no formato "10-a-12" por omissão (formulário antigo, sem o campo preenchido); "pos-12" é decidido antes, na rota (ver DESVIO em relatorioAdultoCompute.ts). */
  anoEscolaridade?: "7-a-9" | "10-a-12" | "pos-12";
}

/** TAREFA 1C — formata os cursos concretos resolvidos para uma opção declarada (ver `sugerirCursosParaOpcoesAdolescente`), para quem está no 10º-12º ano. `[]` quando a opção não teve correspondência no mapeamento — o texto explica isso em vez de inventar. */
function formatarCursosDaOpcao(cursos: CursosSugeridos[]): string {
  if (!cursos.length) return "(esta opção não tem correspondência directa no catálogo de cursos — lê-a pelo Eixo da Missão e pelo Modo de Ganho acima, não por um curso específico.)";
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

/** TAREFA 2C — para quem está no 7º-9º ano, mostra a VIA do secundário (científico-humanística) em vez do curso concreto — a decisão real desta fase, ver aviso no topo do ficheiro. */
function formatarViaSecundariaDaOpcao(cursos: CursosSugeridos[]): string {
  if (!cursos.length) return "(esta opção não tem correspondência directa no catálogo — lê-a pelo Eixo da Missão e pelo Modo de Ganho acima.)";
  const vias = [...new Set(cursos.map((c) => viaSecundariaParaDestino(c.destinoId) ?? "fora do sistema formal — não corresponde a nenhuma via do secundário científico-humanístico"))];
  return vias.map((v) => `Via do secundário: ${v}`).join("\n");
}

/** TAREFA 2C — versão abreviada de blocoCatalogoVocacional para o 7º-9º ano: candidatas com VIA do secundário, nunca curso/QNQ/duração (prematuro nesta fase). */
function blocoCandidatasPorVia(catalogo: ResultadoCatalogoVocacional): string {
  const candidatasTexto = catalogo.candidatasForaDaLista.length
    ? catalogo.candidatasForaDaLista
        .map((c) => `- ${c.nome}: convergência ${c.convergencia} (${c.camadas.join("; ")}). ${formatarViaSecundariaDaOpcao([{ destinoId: c.id } as CursosSugeridos])}`)
        .join("\n")
    : "nenhuma — nenhum destino reuniu 4 camadas independentes incluindo o planeta de maior peso.";
  return `Candidatas com ≥4 convergências (inclui sempre o planeta de maior peso, até 3, em pé de igualdade — nunca ranking):\n${candidatasTexto}`;
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
  // TAREFA 2C — "pos-12" nunca chega aqui (a rota encaminha para o motor
  // adulto antes); só distingue 7-a-9 de tudo o resto (10-a-12, ou
  // ausente — formulários antigos sem o campo).
  const ehSeteANove = intake.anoEscolaridade === "7-a-9";

  const opcoesTexto = intake.opcoesAdolescente.length
    ? intake.opcoesAdolescente
        .map((o) => {
          const maisProvavel = intake.opcaoMaisProvavel && o.toLowerCase() === intake.opcaoMaisProvavel.toLowerCase();
          const detalhe = ehSeteANove ? formatarViaSecundariaDaOpcao(cursosPorOpcaoDeclarada[o] ?? []) : formatarCursosDaOpcao(cursosPorOpcaoDeclarada[o] ?? []);
          return `- ${o}${maisProvavel ? " (a que a pessoa acha mais provável hoje — trata como a hipótese em teste, não como decisão)" : ""}\n${detalhe}`;
        })
        .join("\n\n")
    : "(nenhuma opção declarada — escreve a partir do que o perfil sustenta em geral e da candidata fora da lista.)";

  const blocoCandidatasCatalogo = ehSeteANove ? blocoCandidatasPorVia(catalogo) : blocoCatalogoVocacional(catalogo, cursosPorDestino);

  const instrucaoLeituraPorOpcao = ehSeteANove
    ? `Para CADA opção em cima da mesa, este formato EXACTO — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios:

### <nome exacto da opção>
${MARCADORES.forca} <forte, moderada ou fraca>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras>
1. O que o teu perfil sustenta nesta opção — cita pelo menos duas fontes independentes.
2. O que esta opção te vai pedir mais à frente (o esforço específico DESTE perfil, nunca o risco genérico da área).
3. NESTA FASE (7º-9º ano), a decisão mais importante é a ÁREA — não o curso específico. Usa a via do secundário já listada acima em "Opções em cima da mesa" (nunca um nome de curso, nunca QNQ/duração — isso só se decide 3 anos depois). Formato: "Nesta fase, a decisão mais importante é a via — não o curso específico. O teu perfil aponta para [via] porque [razão técnica]."
4. Onde entra a tua matéria nesta opção — a forma/função, nunca só o sector.`
    : `Para CADA opção em cima da mesa, este formato EXACTO — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios:

### <nome exacto da opção>
${MARCADORES.forca} <forte, moderada ou fraca>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras>
1. O que o teu perfil sustenta nesta opção — cita pelo menos duas fontes independentes.
2. O que esta opção te vai pedir na formação (o esforço específico DESTE perfil, nunca o risco genérico da área).
3. O curso concreto e a via de entrada — usa sempre os dados já listados acima em "Opções em cima da mesa" (nome do curso, nível, QNQ, duração, tipo de instituição, entrada no mercado). NUNCA nomeies uma instituição concreta.
4. Onde entra a tua matéria nesta opção — a forma/função, nunca só o sector.`;

  const instrucaoCandidata = ehSeteANove
    ? `Se lista 1, 2 ou 3 candidatas, escreve um bloco próprio para CADA UMA: "${MARCADORES.candidata} <nome exacto>" seguido do texto explicativo. NESTA FASE (7º-9º ano), fala em termos de VIA do secundário (já listada acima), nunca de curso específico, QNQ ou instituição — a decisão real desta fase é a área, não o curso.`
    : `Se lista 1, 2 ou 3 candidatas, escreve um bloco próprio para CADA UMA: "${MARCADORES.candidata} <nome exacto>" seguido do texto explicativo, citando sempre a via concreta ("-- Via concreta para <nome> --" na secção "Candidatas do catálogo" acima) — tipo de formação, certificação, como se entra, tempo médio até trabalhar na área. Nunca nomeies uma entidade concreta.`;

  return `
[Versão de produção, TAREFA 2 — ver aviso de maturidade no topo de promptAdolescente.ts: prosa instrucional nova, nunca testada contra geração real antes de hoje.]

És um especialista em orientação vocacional para adolescentes de 15 a 18 anos, ainda sem experiência profissional. Vais escrever um relatório para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Tens..." / "O teu perfil sustenta...", nunca "Marte na casa X indica...").
- TRATAMENTO: usa "tu" — é a pessoa mais nova a quem este relatório se dirige, não um adulto profissional. Nunca "você".
- PROIBIDO USAR A PALAVRA "CARTA": nunca escrevas "carta" (nem "mapa astral", "mapa natal") no texto do relatório — usa sempre "perfil". Correcto: "o teu perfil sustenta X". Proibido: "a tua carta sustenta X".
- TOM: acessível para quem tem 15 a 18 anos e ainda não trabalhou — mais claro e menos abstracto do que um relatório para adultos, NUNCA condescendente ou infantilizado. Sem gíria de coach, sem emojis. Nunca uses "carreira estabelecida", "anos de experiência", ou qualquer referência a um percurso profissional que esta pessoa ainda não teve.
- PROIBIDO: primeira pessoa do plural ("identificámos", "vimos", "calculámos"). Correcto: "o teu perfil mostra", "os dados indicam".
- Zero fatalismo. Nada é inevitável nem escrito em pedra. Nunca escrevas "deves escolher X" ou qualquer veredicto fechado — apresenta o que o perfil sustenta e o que pede, a decisão é sempre da pessoa (e, nesta idade, também da família, mas o relatório fala directamente com ela).
- REGRA ANTI-REPETIÇÃO: cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a mesma conclusão com palavras diferentes em secções diferentes.
- PLANETAS FRACOS (peso < 0,9): sempre mencionados explicitamente, nunca uma barra vermelha sem texto correspondente.
- TENSÃO INTERNA: sempre que dois sinais do perfil apontam em direcções diferentes, o texto é obrigado a nomeá-lo — nunca escolher só o lado bonito.
- ESCALA DE CONFIANÇA (obrigatória em todo o relatório) — a linguagem tem de bater sempre com o nº de camadas que sustentam a afirmação:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva.
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes.
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto.
  · EM ABERTO (o perfil não distingue): diz isso directamente — "o teu perfil não distingue entre X e Y, a decisão fica contigo".
- AVASTHAS — OBRIGATÓRIO: A avastha de cada planeta modifica a sua leitura de forma crítica. Um planeta forte (peso ≥1,3) mas Mrita (morto) não consegue expressar a sua força — está bloqueado. Um planeta fraco (peso <0,9) mas Yuva (jovem adulto) tem mais capacidade de expressão do que o peso sugere. NUNCA ler o peso isolado da avastha.
- CONJUNÇÕES — OBRIGATÓRIO: Quando dois planetas estão no mesmo signo, a sua energia funde-se. Ler sempre os planetas em conjunção como uma unidade, não separados. Uma conjunção com Júpiter ou Vénus eleva; com Saturno ou Marte adiciona peso e responsabilidade.
- YOGAS — OBRIGATÓRIO: Os yogas modificam fundamentalmente o potencial do perfil. Um Raja Yoga activo significa que a pessoa tem capacidade estrutural real para posições de destaque — não é wishful thinking, é uma configuração técnica. Nomear cada yoga activo e o que significa em linguagem concreta.
- VARGOTTAMA — OBRIGATÓRIO: Um planeta Vargottama tem expressão muito mais consistente e duradoura do que o peso isolado sugere. Sempre nomear planetas Vargottama e elevar o nível de confiança das afirmações sobre eles.
- HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo.
- A lista de opções entrega-se sempre com a moldura explícita, no início e no fim da secção "Leitura por opção": isto é para reconhecer, não para obedecer — o critério final é o reconhecimento interno do jovem, nunca o documento.
- Ao nomear um caminho fora do sistema formal, indica sempre a via de sustento associada — nunca "o teu caminho é X" sem dizer o que paga as contas enquanto X cresce.
- NOTAS ESCOLARES: ter boa nota a uma disciplina NÃO é sinal vocacional — é sinal de Mercúrio funcional e de disciplina de estudo, e serve dezenas de territórios. Confundir nota com vocação é o erro mais comum da orientação escolar — nunca o cometas.
- NUNCA nomear instituições de nenhum tipo — nem de ensino, nem ordens profissionais, nem certificações com nome próprio, nem formadores. Concreto na estrutura ("uma licenciatura de 3 anos", "a ordem profissional da área"), genérico no nome da entidade.
${ehSeteANove ? '- MOMENTO DE DECISÃO (7º-9º ano): esta pessoa ainda não escolhe curso — escolhe a VIA do secundário (científico-humanística). Nunca recomendes um curso específico, QNQ ou duração de formação superior — isso é prematuro e confunde o momento real de decisão. Fala sempre em termos de área/via.' : ""}
${horaNascimentoFornecida ? "" : "\nNOTA INTERNA — hora de nascimento não fornecida, elementos que dependem do Ascendente têm de ser tratados com cautela explícita."}

=== DADOS TÉCNICOS ===

-- Quem é --
Nome: ${intake.nome}
Situação declarada: ${intake.situacaoDeclarada}
${intake.preferenciaFamilia ? `Preferência da família (contexto, nunca decide): "${intake.preferenciaFamilia}"` : ""}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes)}

-- Peso de cada planeta --
${blocoPesos(pesosPlanetas)}

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

-- Candidatas do catálogo ${ehSeteANove ? "(vias do secundário por candidata)" : "(inclui vias concretas por candidata)"} --
${blocoCandidatasCatalogo}

-- Opções em cima da mesa (${ehSeteANove ? "com via do secundário" : "com cursos concretos"} por opção) --
${opcoesTexto}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 6 secções, por esta ordem ===

## ${SECCAO_TITULOS.abertura}
Quadro de dados (nome, situação escolar) e o enquadramento da pergunta que a pessoa trouxe. Nunca abrir sem este quadro.

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
As candidatas já vêm calculadas deterministicamente na secção "Candidatas do catálogo" acima (até 3) — NÃO calcules a tua própria convergência, NÃO inventes nenhuma candidata diferente.

Se essa secção diz "nenhuma", a primeira e única linha é "${MARCADORES.candidata} nenhuma".

${instrucaoCandidata}

REGRA ABSOLUTA — SEM RANKING ENTRE CANDIDATAS: quando há 2 ou 3, apresentam-se em PÉ DE IGUALDADE — proibido "1ª/2ª/3ª escolha", "a mais forte", "menção honrosa".

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA: proibido nomear qualquer candidata sem que venha explicitamente da secção "Candidatas do catálogo" acima. Nunca preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos.

## ${SECCAO_TITULOS.oPlano}
CONTEXTO (diferente do relatório adulto): este plano é orientado para a PRÓXIMA DECISÃO ESCOLAR/ACADÉMICA (ex.: ${ehSeteANove ? "escolha de via no secundário" : "escolha de curso, candidatura ao ensino superior"}) — NUNCA para uma transição profissional, que ainda não existe. Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima). Usa as datas reais dessa secção. Destaca o primeiro passo accionável para esta semana numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " — ligado à decisão escolar concreta que a pessoa tem à frente, nunca um passo genérico de "explorar carreiras".
`.trim();
}
