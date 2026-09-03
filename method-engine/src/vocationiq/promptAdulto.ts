// VOCATIONIQ-ADULTO-metodologia.md — construção do prompt para o ramo
// "trabalho-quero-mudar". Segue o documento secção a secção; qualquer
// desvio do texto literal do documento está assinalado num comentário
// "DESVIO" a explicar porquê.

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta } from "./pesosPlanetas";
import type { ClassicalGraha } from "../lifeReport/types";

/**
 * Dados já resolvidos para texto humano pelo chamador (o site) — os
 * slugs internos do formulário (ex.: "trabalho-conta-propria",
 * "consultoria") e as respectivas etiquetas em `lib/validation.ts`
 * pertencem à camada web, não ao motor astrológico.
 */
export interface VocationiqIntakeAdulto {
  nome: string;
  situacaoDeclarada: string;
  areaActual: string;
  anosExperiencia: string;
  oQueNaoFunciona?: string;
  paraOndeQuerIr?: string;
  perguntaEspecifica?: string;
  ideiaConcreta?: string;
  tipoMudanca: string[];
  /** Áreas de destino já traduzidas para etiqueta — exclui "outra" e "ainda-nao-sei", tratadas à parte abaixo. */
  areasDestino: string[];
  areasDestinoIncluiOutra: boolean;
  areasDestinoOutra?: string;
  areasDestinoIncluiAindaNaoSei: boolean;
}

/**
 * DESVIO — a assinatura do documento (`construirPromptAdulto(intake,
 * axes, pesosPlanetas): string`) não tem um parâmetro para as datas
 * reais que a Secção 5 exige ("Vimshottari + trânsitos"). Sem datas
 * calculadas aqui, a Secção 5 só poderia ser inventada pelo LLM — o que
 * a Secção 4 do documento ("nunca afirmar sem citar o facto técnico que
 * sustenta") proíbe directamente. Acrescentado um 4º parâmetro
 * `datas: DadosDatas`, construído a partir de `currentDasha` +
 * `computeTransits` (já existentes no motor) pelo chamador.
 *
 * DESVIO 2 — 5º parâmetro `horaNascimentoFornecida: boolean`,
 * acrescentado para a nota de cautela do Ascendente (correcção pedida
 * numa ronda seguinte): sem hora de nascimento real, a Arudha Lagna e as
 * casas usam meio-dia como convenção e podem estar erradas — o LLM tem
 * de saber disto para não afirmar com a mesma confiança elementos que
 * dependem da hora e elementos que não dependem.
 */
export interface DadosDatas {
  mahadashaAtual: { senhor: string; inicio: Date; fim: Date };
  antardashaAtual: { senhor: string; inicio: Date; fim: Date };
  /** As antardashas seguintes à actual, dentro da mesma mahadasha — para a "janela" da Secção 5 além do "agora". */
  proximasAntardashas: { senhor: string; inicio: Date; fim: Date }[];
  transitoJupiter: { signo: string; aspectosAoNatal: string[] };
  transitoSaturno: { signo: string; aspectosAoNatal: string[] };
}

/**
 * Títulos exactos das 5 secções — usados no prompt (o LLM tem de os
 * reproduzir literalmente como cabeçalho `## `) e exportados para quem
 * for fazer parsing do texto devolvido (ex.: o template HTML), para as
 * duas pontas nunca poderem divergir.
 */
export const SECCAO_TITULOS = {
  abertura: "Abertura",
  oQueACartaSustenta: "O que a carta sustenta",
  leituraPorOpcao: "Leitura por opção",
  candidataForaDaLista: "Candidata fora da lista",
  oPlano: "O plano",
} as const;

/**
 * Marcadores máquina-legíveis exigidos ao LLM dentro do texto (rótulos
 * ASCII fixos, nunca traduzidos) — necessários para o template HTML
 * (Passo 4, ronda seguinte) conseguir desenhar cards por opção com
 * indicador de força, decidir se há candidata fora da lista sem
 * heurísticas frágeis, e destacar o primeiro passo do plano. O conteúdo
 * a seguir a cada marcador continua a ser escrito pelo LLM — só a
 * etiqueta em si é fixa, para as duas pontas (prompt e parser) nunca
 * divergirem.
 */
export const MARCADORES = {
  forca: "FORÇA:",
  candidata: "CANDIDATA:",
  primeiroPasso: "PRIMEIRO PASSO:",
} as const;

export const FORCA_VALORES = ["forte", "moderada", "fraca"] as const;
export type ForcaValor = (typeof FORCA_VALORES)[number];

const GLOSA_TECNICA: Record<string, string> = {
  Sun: "Sol",
  Moon: "Lua",
  Mars: "Marte",
  Mercury: "Mercúrio",
  Jupiter: "Júpiter",
  Venus: "Vénus",
  Saturn: "Saturno",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

const ESTADO_PT: Record<string, string> = {
  Exalted: "exaltado",
  Own: "próprio",
  Moolatrikona: "próprio (Moolatrikona)",
  Friend: "amigo",
  Neutral: "neutro",
  Enemy: "inimigo",
  Debilitated: "debilitado",
};

/**
 * Termos proibidos no texto do relatório (correcção pedida — lista
 * expandida a partir dos 7 termos originais, alinhada com
 * FORBIDDEN_TERMS do motor da Naveya, mas escrita como enumeração em
 * português corrente para o LLM ler como instrução, não como regex).
 */
const TERMOS_PROIBIDOS = [
  "Atmakaraka",
  "Karakamsha",
  "Amatyakaraka",
  "Sarvashtakavarga",
  "SAV",
  "bindu",
  "Mahadasha",
  "Antardasha",
  "Dasha",
  "Vimshottari",
  "Arudha Lagna",
  "D9",
  "D10",
  "Navamsha",
  "Dasamsha",
  "orbe",
  "grau",
  "minuto de arco",
  "Drishti",
  "aspecto",
  "Nakshatra",
  "Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati (os 27 nomes de Nakshatra)",
  "Rahu, Ketu, Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani (nomes de planetas em sânscrito)",
  "Aries/Áries, Taurus/Touro, Gemini/Gémeos, Cancer/Caranguejo, Leo/Leão, Virgo/Virgem, Libra/Balança, Scorpio/Escorpião, Sagittarius/Sagitário, Capricorn/Capricórnio, Aquarius/Aquário, Pisces/Peixes (nomes de signo, em inglês ou português)",
  "\"casa\" seguido de um número (ex.: \"casa 10\")",
  "signo",
  "dignidade",
  "regente",
  "trânsito (usa \"período actual\" ou \"este momento\")",
  "exaltado / exaltação",
  "debilitado / debilitação",
  "combusto / combustão",
  "em domicílio / signo próprio",
  "em queda / em exílio",
  "retrógrado / retrograde",
];

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-PT", { year: "numeric", month: "long" });
}

function planetaPt(g: ClassicalGraha | string): string {
  return GLOSA_TECNICA[g] ?? g;
}

/** Metodologia §1.1/§1.2 — deriva a lista de candidatas a partir de areasDestino/areasDestinoOutra. Vazio quando não há nada declarado (o LLM aplica o §1.3 nesse caso, ver texto do prompt). */
function candidatasDeclaradas(intake: VocationiqIntakeAdulto): string[] {
  const candidatas = [...intake.areasDestino];
  if (intake.areasDestinoIncluiOutra && intake.areasDestinoOutra?.trim()) candidatas.push(intake.areasDestinoOutra.trim());
  return candidatas;
}

function blocoAbertura(intake: VocationiqIntakeAdulto): string {
  const linhas = [
    `Nome: ${intake.nome}`,
    `Situação declarada: ${intake.situacaoDeclarada}`,
    `Área actual: ${intake.areaActual}`,
    `Anos de experiência na área actual: ${intake.anosExperiencia}`,
    intake.oQueNaoFunciona ? `O que não está a funcionar (nas palavras da pessoa): "${intake.oQueNaoFunciona}"` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

function blocoEixoMissao(axes: VocationIQAxes): string {
  const m = axes.missionAxis;
  return [
    `Atmakaraka (o planeta que representa a vontade/missão mais forte da pessoa nesta carta): ${planetaPt(m.atmakaraka)}, na casa ${m.akHouse}, em ${m.akSign}, estado ${ESTADO_PT[m.akDignity ?? "Neutral"] ?? m.akDignity}.`,
    `Karakamsha (onde essa missão aterra em termos de expressão prática, lido no D9): signo ${m.karakamshaSign}, casa ${m.karakamshaHouse} a partir do Ascendente.`,
    `Amatyakaraka (o planeta que comanda a ferramenta de trabalho do dia a dia): ${planetaPt(axes.amatyakaraka)}.`,
  ].join("\n");
}

function blocoModoDeGanho(axes: VocationIQAxes): string {
  const dominante = axes.earningMode;
  const ROTULO_HUMANO: Record<number, string> = {
    2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
    6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
    10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
  };
  const linhas = [
    `Modo de Ganho dominante: casa ${dominante.house} (${ROTULO_HUMANO[dominante.house]}), pontuação ${dominante.score}.`,
    `Sinais que sustentam esta casa: ${dominante.signals.length ? dominante.signals.join("; ") : "nenhum sinal directo — só a dignidade base do regente."}`,
    `As três Artha Trikonas, por ordem de força nesta carta: ${axes.earningModeAll.map((e) => `casa ${e.house} (pontuação ${e.score})`).join(", ")}.`,
  ];
  return linhas.join("\n");
}

function blocoMontraMercado(axes: VocationIQAxes): string {
  const m = axes.marketShowcase;
  const casa11 = m.house11FromAL;
  return [
    `Arudha Lagna (como esta pessoa é vista de fora, a "montra"): signo ${m.arudhaLagnaSign}, casa ${m.arudhaLagnaHouseFromAscendant} a partir do Ascendente.`,
    `Casa 11 a partir da Arudha Lagna (o que o mercado reconhece e paga): signo ${casa11.sign}, regente ${planetaPt(casa11.lord)}${casa11.planets.length ? `, com ${casa11.planets.map(planetaPt).join(" e ")} presente(s)` : ""}.`,
  ].join("\n");
}

function blocoPesos(pesos: PesoPlaneta[]): string {
  const linhas = pesos
    .slice()
    .sort((a, b) => b.peso - a.peso)
    .map((p) => `${planetaPt(p.planeta)}: casa ${p.casa} (${p.signo}), estado ${ESTADO_PT[p.estado] ?? p.estado}, SAV da casa ${p.savCasa} (média da carta ${p.savMedia.toFixed(1)}) → peso ${p.peso.toFixed(3)}.`);
  return linhas.join("\n");
}

function blocoDatas(datas: DadosDatas): string {
  return [
    `Mahadasha actual: ${planetaPt(datas.mahadashaAtual.senhor)}, de ${formatarData(datas.mahadashaAtual.inicio)} a ${formatarData(datas.mahadashaAtual.fim)}.`,
    `Antardasha actual (o período mais fino, o que está activo agora): ${planetaPt(datas.antardashaAtual.senhor)}, de ${formatarData(datas.antardashaAtual.inicio)} a ${formatarData(datas.antardashaAtual.fim)}.`,
    datas.proximasAntardashas.length
      ? `Antardashas seguintes, dentro da mesma mahadasha: ${datas.proximasAntardashas.map((a) => `${planetaPt(a.senhor)} (${formatarData(a.inicio)} a ${formatarData(a.fim)})`).join("; ")}.`
      : null,
    `Trânsito de Júpiter: em ${datas.transitoJupiter.signo}${datas.transitoJupiter.aspectosAoNatal.length ? `, ${datas.transitoJupiter.aspectosAoNatal.join("; ")}` : ", sem aspecto duro activo aos pontos natais principais"}.`,
    `Trânsito de Saturno: em ${datas.transitoSaturno.signo}${datas.transitoSaturno.aspectosAoNatal.length ? `, ${datas.transitoSaturno.aspectosAoNatal.join("; ")}` : ", sem aspecto duro activo aos pontos natais principais"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function construirPromptAdulto(
  intake: VocationiqIntakeAdulto,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
): string {
  const candidatas = candidatasDeclaradas(intake);

  return `
És um especialista em análise vocacional. Vais escrever um relatório personalizado para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Você tem..." / "A sua carta sustenta...", nunca "Marte na casa X indica...").
- REGRA CRÍTICA DE TRATAMENTO: Usa SEMPRE "você" — nunca "tu", nunca "teu/tua", nunca "tens". Esta regra não tem excepção. Exemplos correctos: "você tem", "o seu perfil", "a sua carta", "para si". Exemplos proibidos: "tu tens", "o teu perfil", "a tua carta", "para ti".
- PROIBIDO: primeira pessoa do plural. Nunca escrever "identificámos", "vimos", "calculámos", "sabemos". O relatório fala só da pessoa. Correcto: "a carta mostra", "os dados indicam". Proibido: "identificámos", "analisámos", "concluímos".
- Zero fatalismo. Nada é inevitável nem escrito em pedra.
- Nunca escrevas "deves ir para X" ou qualquer veredicto fechado. Apresenta o que a carta sustenta e o que custa — a decisão é sempre da pessoa.
- Nunca uses o padrão genérico de coaching (identificar 3 exemplos, embrulhar num método, oferecer um serviço) sem ligar explicitamente a uma camada técnica calculada abaixo. Cada frase de conselho tem de ser rastreável a um facto técnico específico desta lista — nunca a generalidades sobre a profissão.
- Cada facto técnico serve de base a UMA frase central — nunca repitas o mesmo facto em secções diferentes. Se a mesma camada técnica é relevante para duas secções, cita-a numa e remete para ela na outra, nunca copiando a frase. Isto não é uma desculpa para escrever pouco: desenvolve cada facto com profundidade (implicações, exemplos concretos, nuance), só não repitas a MESMA frase ou afirmação já feita.
- Tom adulto, directo, sem gíria de coach, sem emojis.

VOLUME OBRIGATÓRIO: este relatório deve ter entre 8 a 10 páginas A4 quando impresso. Cada secção deve ser desenvolvida com profundidade real — não resumos. Volume mínimo por secção:
· Abertura: 1 parágrafo.
· O que a carta sustenta: mínimo 3 parágrafos desenvolvidos, cobrindo o Eixo da Missão, o Modo de Ganho e a Montra de Mercado em detalhe (secções separadas dentro desta, cada uma com espaço próprio).
· Leitura por opção: cada uma das 4 partes numeradas, para CADA opção, com mínimo 2 parágrafos — nunca uma frase só.
· Candidata fora da lista: mínimo 3 parágrafos, se existir.
· O plano: mínimo 3 parágrafos, mais o primeiro passo (marcado com "${MARCADORES.primeiroPasso}") detalhado, não uma frase solta.
${
  horaNascimentoFornecida
    ? ""
    : `
NOTA INTERNA — hora de nascimento não fornecida. A Arudha Lagna e os regentes das casas angulares foram calculados com hora de meio-dia como convenção — podem estar errados. Trata todos os elementos que dependem do Ascendente (Arudha Lagna, Montra de Mercado, posições de casas) com cautela explícita no texto — nunca os apresentes com a mesma confiança dos elementos que não dependem da hora (Atmakaraka, Modo de Ganho por dignidade, dashas).`
}

=== DADOS TÉCNICOS ===

-- Quem é, e a pergunta --
${blocoAbertura(intake)}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes)}

-- Montra de Mercado --
${blocoMontraMercado(axes)}

-- Peso de cada planeta (estado × SAV da casa / média da carta) --
${blocoPesos(pesosPlanetas)}

Usa estes pesos para calibrar a força de cada afirmação:
· Peso ≥ 1,3: a carta apoia com força — podes afirmar com clareza
· Peso 0,9 a 1,3: suporte moderado — afirma mas sem excesso de confiança
· Peso < 0,9: suporte fraco — diz isso com clareza, nunca escrevas com a mesma confiança sobre um planeta de peso 0,58 e um de 1,87
Nunca trates todos os planetas como equivalentes.

-- Datas reais (Vimshottari + trânsitos) --
${blocoDatas(datas)}

-- Opções declaradas --
${
  candidatas.length
    ? `A pessoa declarou estas opções (avalia TODAS, mesmo as que a carta sustenta fracamente):\n${candidatas.map((c) => `- ${c}`).join("\n")}`
    : `A pessoa NÃO declarou opções concretas${intake.areasDestinoIncluiAindaNaoSei ? ' (escolheu "ainda não sei")' : ""}. Deriva até 3 candidatas plausíveis a partir do texto livre abaixo — se não conseguires nenhuma candidata clara, NÃO bloqueies o relatório: escreve a Secção 2 (o que a carta sustenta, em geral) e resolve o relatório inteiro pela Secção 4 (candidata fora da lista). Texto livre disponível:`
}
${!candidatas.length ? [intake.paraOndeQuerIr && `"Para onde queres ir": ${intake.paraOndeQuerIr}`, intake.perguntaEspecifica && `Pergunta específica: ${intake.perguntaEspecifica}`, intake.ideiaConcreta && `Ideia concreta: ${intake.ideiaConcreta}`].filter(Boolean).join("\n") || "(nenhum texto livre preenchido — escreve só a partir do que a carta sustenta em geral.)" : ""}
${intake.tipoMudanca.length ? `\nTipo de mudança que a pessoa diz querer (usa para calibrar a parte 4 de cada leitura — ex.: se inclui trabalhar por conta própria ou abrir negócio, responde explicitamente se a carta sustenta trabalho a solo nessa opção): ${intake.tipoMudanca.join(", ")}.` : ""}
${intake.ideiaConcreta && candidatas.length ? `\nIdeia concreta partilhada (contexto adicional, não é uma opção à parte): ${intake.ideiaConcreta}` : ""}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 5 secções, por esta ordem ===

FORMATO DE SAÍDA (obrigatório): escreve em Markdown. Cada secção começa com um cabeçalho de nível 2, EXACTAMENTE com este texto (sem números, sem variações):
## ${SECCAO_TITULOS.abertura}
## ${SECCAO_TITULOS.oQueACartaSustenta}
## ${SECCAO_TITULOS.leituraPorOpcao}
## ${SECCAO_TITULOS.candidataForaDaLista}
## ${SECCAO_TITULOS.oPlano}
Se não houver candidata fora da lista (4 camadas não convergiram), inclui o cabeçalho "## ${SECCAO_TITULOS.candidataForaDaLista}" na mesma, seguido só da frase que explica que não há — nunca omitas o cabeçalho.

## ${SECCAO_TITULOS.abertura}
Quadro de dados (nome, situação, área actual) e o enquadramento da pergunta que a pessoa trouxe. Nunca abrir sem este quadro. O texto da pergunta do cliente deve ser apresentado tal como foi escrito — não o coloques em maiúsculas nem em destaque tipográfico. Usa-o como contexto, não como título.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções declaradas.

## ${SECCAO_TITULOS.leituraPorOpcao}
Para CADA opção candidata (declarada ou derivada), este formato EXACTO, por esta ordem — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios e machine-readable, não os omitas nem os traduzas:

### <nome exacto da opção, tal como foi declarada ou derivada>
${MARCADORES.forca} <forte, moderada ou fraca — forte se ≥2 fontes independentes fortes convergem, moderada se há suporte real mas não forte, fraca se só um sinal fraco isolado sustenta a opção>
1. O que a carta sustenta nesta opção. Para dizer que a carta sustenta uma opção, cita pelo menos duas fontes independentes (Eixo da Missão, Modo de Ganho, peso de planeta, Montra de Mercado). Uma opção sustentada por um único sinal fraco não é sustentada — diz isso, e usa "${MARCADORES.forca} fraca" nesse caso.
2. O que esta opção lhe vai custar (o custo específico DESTA carta nesta escolha, nunca o risco genérico da profissão).
3. O que esta opção pede e que falta actualmente — e se é algo que se aprende ou algo que não muda.
4. Onde entra a matéria desta pessoa nesta opção — nunca o sector como resposta, sempre a forma/função (usa o Modo de Ganho para decidir se entra pela voz, pela resolução directa, ou pela liderança/execução pública).

Repete o bloco "### <nome> / ${MARCADORES.forca} / 1. / 2. / 3. / 4." para cada opção candidata, uma a seguir à outra.

## ${SECCAO_TITULOS.candidataForaDaLista}
A primeira linha é sempre "${MARCADORES.candidata} <nome da opção>" ou "${MARCADORES.candidata} nenhuma" — obrigatória e machine-readable, não a omitas. No máximo uma opção que a pessoa não declarou, e só se pelo menos 4 camadas independentes convergirem (Eixo da Missão, Modo de Ganho, Montra de Mercado, peso por planeta/casa, regência funcional, ou outra camada dos dados acima). Depois da primeira linha, o texto explicativo: se houver candidata, porque é que as 4 camadas convergem; se não houver ("${MARCADORES.candidata} nenhuma"), escreve isso explicitamente — "a tua carta não aponta a nada fora do que já pensaste" é uma resposta válida e completa, não a evites.

## ${SECCAO_TITULOS.oPlano}
Usa as datas reais da secção "Datas reais" acima (nunca datas inventadas). Escreve o corpo do plano livremente, e destaca o primeiro passo accionável para esta semana numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " (obrigatório, machine-readable, não o omitas) — ex.: "${MARCADORES.primeiroPasso} Contacta duas pessoas que já fazem consultoria a solo e pergunta-lhes o que ninguém conta sobre o primeiro ano." Nunca um plano genérico de 90 dias sem ligação às datas calculadas.
`.trim();
}
