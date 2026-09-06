// VOCATIONIQ-ADULTO-metodologia.md — construção do prompt para o ramo
// "trabalho-quero-mudar". Segue o documento secção a secção; qualquer
// desvio do texto literal do documento está assinalado num comentário
// "DESVIO" a explicar porquê.

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ClassicalGraha } from "../lifeReport/types";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import { computeRodaDaVida } from "./rodaDaVida";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";

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
  /** Correcção do especialista (nova secção) — retrato de personalidade, entre "Abertura" e "O que a carta sustenta". Ver TAREFA 3 no prompt abaixo. */
  quemE: "Quem é",
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
  identidade: "IDENTIDADE:",
  /** Melhorias visuais ao template — a frase de abertura em destaque logo após a capa. */
  fraseAbertura: "FRASE_ABERTURA:",
  /** Melhorias visuais ao template — a frase de síntese no topo de cada card de opção. */
  insight: "INSIGHT:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): um dom (2-3 obrigatórios), uma linha por dom. */
  dom: "DOM:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): uma limitação (1-2 obrigatórias), uma linha por limitação. */
  limitacao: "LIMITAÇÃO:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): a frase de síntese final da secção. */
  sinteseQuemE: "SÍNTESE:",
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

export type Elemento = "Fogo" | "Terra" | "Água" | "Éter";

/** Elemento de cada planeta — mapeamento exacto pedido nesta ronda (nunca "Ar": não foi dado nenhum planeta para essa categoria). */
export const ELEMENTO_PLANETA: Record<string, Elemento> = {
  Sun: "Fogo",
  Mars: "Fogo",
  Jupiter: "Fogo",
  Mercury: "Terra",
  Venus: "Terra",
  Saturn: "Terra",
  Moon: "Água",
  Rahu: "Éter",
  Ketu: "Éter",
};

export interface ClassificacaoMahadashaEntry {
  tema: string;
  abertura: string;
}

/** Classificação do tom de cada Mahadasha — tabela exacta pedida nesta ronda (Parte 1D/4E). `abertura` é a frase-guia que a Secção "O plano" tem de usar para abrir, antes de qualquer data ou passo. */
export const MAHADASHA_CLASSIFICACAO: Record<string, ClassificacaoMahadashaEntry> = {
  Ketu: { tema: "dissolução/fecho", abertura: "prepare e feche, não colha" },
  Venus: { tema: "expansão/prazer/colheita", abertura: "avance, o ciclo favorece" },
  Sun: { tema: "afirmação/autoridade", abertura: "afirme e visibilize" },
  Moon: { tema: "emoção/fluxo/intuição", abertura: "siga o que sente, não o plano" },
  Mars: { tema: "acção/lançamento/conflito", abertura: "avance com força e decisão" },
  Rahu: { tema: "ambição/disrupção/ilusão", abertura: "risco real, oportunidade real" },
  Jupiter: { tema: "crescimento/sabedoria/expansão", abertura: "expanda com intenção" },
  Saturn: { tema: "estrutura/colheita lenta/responsabilidade", abertura: "construa devagar, vai durar" },
  Mercury: { tema: "comunicação/adaptação/aprendizagem", abertura: "aprenda e comunique" },
};

export const ESTADO_PT: Record<string, string> = {
  Exalted: "exaltado",
  Own: "próprio",
  Moolatrikona: "próprio (Moolatrikona)",
  Friend: "amigo",
  Neutral: "neutro",
  Enemy: "inimigo",
  Debilitated: "debilitado",
  NeechaBhanga: "debilitado com cancelação (Neecha Bhanga Raja Yoga) — lido como força",
  NeechaBhanga_Conjuncao: "debilitado com cancelação por conjunção de benéfico em Kendra — lido como força moderada",
};

/**
 * Termos proibidos no texto do relatório (correcção pedida — lista
 * expandida a partir dos 7 termos originais, alinhada com
 * FORBIDDEN_TERMS do motor da Naveya, mas escrita como enumeração em
 * português corrente para o LLM ler como instrução, não como regex).
 */
export const TERMOS_PROIBIDOS = [
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

export function planetaPt(g: ClassicalGraha | string): string {
  return GLOSA_TECNICA[g] ?? g;
}

/**
 * TAREFA 7 (correcção do especialista) — normaliza o texto livre escrito
 * pela própria pessoa (nunca o texto do LLM) antes de entrar no prompt ou
 * no template: sentence case simples (1ª letra maiúscula, resto
 * minúsculas). Nunca corrige ortografia — preserva as palavras exactas da
 * pessoa, erros incluídos — só deixa de amplificar visualmente um erro de
 * maiúsculas com mais maiúsculas. Aplicado nos dois pontos onde texto
 * livre entra (aqui e em `relatorioTemplate.ts`), a mesma função, nunca
 * duas versões. DESVIO conhecido e aceite: uma sigla que a pessoa tenha
 * escrito em maiúsculas a meio da frase (ex.: "SAP") também é descida
 * para minúsculas — a instrução pedida é literal ("resto minúsculas"),
 * sem excepção para siglas.
 */
export function normalizarTextoLivre(texto: string): string {
  const t = texto.trim();
  if (!t) return t;
  const minusculo = t.toLowerCase();
  return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
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
    intake.oQueNaoFunciona ? `O que não está a funcionar (nas palavras da pessoa): "${normalizarTextoLivre(intake.oQueNaoFunciona)}"` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

export function blocoEixoMissao(axes: VocationIQAxes): string {
  const m = axes.missionAxis;
  return [
    `Atmakaraka (o planeta que representa a vontade/missão mais forte da pessoa nesta carta): ${planetaPt(m.atmakaraka)}, na casa ${m.akHouse}, em ${m.akSign}, estado ${ESTADO_PT[m.akDignity ?? "Neutral"] ?? m.akDignity}.`,
    `Karakamsha (onde essa missão aterra em termos de expressão prática, lido no D9): signo ${m.karakamshaSign}, casa ${m.karakamshaHouse} a partir do Ascendente.`,
    `Amatyakaraka (o planeta que comanda a ferramenta de trabalho do dia a dia): ${planetaPt(axes.amatyakaraka)}.`,
  ].join("\n");
}

export function blocoModoDeGanho(axes: VocationIQAxes): string {
  const dominantes = axes.earningModeDominante;
  const ROTULO_HUMANO: Record<number, string> = {
    2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
    6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
    10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
  };
  // TAREFA 2 (correcção do especialista) — antes desta correcção, um
  // empate exacto entre duas casas resolvia-se por acidente da ordem do
  // array interno, nunca por decisão metodológica. Agora, empate real
  // (mesma pontuação E mesmo nº de camadas convergentes, ver
  // `resolverEarningModeDominante`) devolve as duas casas como
  // co-dominantes — o LLM tem de as apresentar como igualmente sustentadas,
  // nunca escolher uma só para simplificar.
  const linhaDominante =
    dominantes.length > 1
      ? `Modo de Ganho CO-DOMINANTE (empate real, mesma pontuação e mesmo nº de camadas convergentes — nunca escolhas só um dos dois): casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}) e casa ${dominantes[1].house} (${ROTULO_HUMANO[dominantes[1].house]}), ambas com pontuação ${dominantes[0].score}. Usa esta frase, ou uma equivalente, ao escrever sobre o Modo de Ganho: "Modo de Ganho co-dominante: casa ${dominantes[0].house} e casa ${dominantes[1].house} — a carta sustenta os dois com igual força."`
      : `Modo de Ganho dominante: casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}), pontuação ${dominantes[0].score}.`;
  const linhas = [
    linhaDominante,
    `Sinais que sustentam ${dominantes.length > 1 ? "estas casas" : "esta casa"}: ${dominantes
      .map((d) => `casa ${d.house}: ${d.signals.length ? d.signals.join("; ") : "nenhum sinal directo — só a dignidade base do regente"}`)
      .join(" | ")}`,
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

export function blocoPesos(pesos: PesoPlaneta[]): string {
  const linhas = pesos
    .slice()
    .sort((a, b) => b.peso - a.peso)
    .map((p) => {
      const base = `${planetaPt(p.planeta)}: casa ${p.casa} (${p.signo}), estado ${ESTADO_PT[p.estado] ?? p.estado}, SAV da casa ${p.savCasa} (média da carta ${p.savMedia.toFixed(1)}) → peso ${p.peso.toFixed(3)}.`;
      return p.notaCancelamento ? `${base} NOTA: ${p.notaCancelamento}.` : base;
    });
  return linhas.join("\n");
}

export function blocoDatas(datas: DadosDatas): string {
  const classificacao = MAHADASHA_CLASSIFICACAO[datas.mahadashaAtual.senhor];
  return [
    `Mahadasha actual: ${planetaPt(datas.mahadashaAtual.senhor)}, de ${formatarData(datas.mahadashaAtual.inicio)} a ${formatarData(datas.mahadashaAtual.fim)}.`,
    classificacao
      ? `Classificação deste ciclo (usa esta frase, ou uma equivalente, para abrir a secção "O plano", antes de qualquer data ou passo): tema "${classificacao.tema}" — "${classificacao.abertura}".`
      : null,
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

/** TAREFA 5 (correcção do especialista) — formata a via concreta de entrada de um destino, para adultos ("entrada no mercado", nunca cursos — ver `catalogoCursos.ts`). `undefined` quando o destino não está no catálogo de cursos (não deveria acontecer para um id vindo de `catalogarDestinos`, mas protege). */
function formatarViaConcreta(cursos: CursosSugeridos | undefined): string {
  if (!cursos) return "";
  return ` [Entrada no mercado: ${cursos.entradaMercadoAdulto.join("; ")}]`;
}

/** Redesenho do motor (Parte 2C) — traduz o resultado de `catalogarDestinos()` para o formato de dados técnicos pedido. Nunca lista mais do que o catálogo devolveu, nunca ordena por "força" (SPEC-vocacional.md: o catálogo descreve, não escolhe). */
export function blocoCatalogoVocacional(catalogo: ResultadoCatalogoVocacional, cursosPorDestino: Record<string, CursosSugeridos>): string {
  const listar = (destinos: ResultadoCatalogoVocacional["destinosDeAreaActual"]) =>
    destinos.length ? destinos.map((d) => `- ${d.nome}: convergência ${d.convergencia} (${d.camadas.join("; ") || "sem camada identificada"})${formatarViaConcreta(cursosPorDestino[d.id])}`).join("\n") : "(nenhum destino do catálogo corresponde)";

  return [
    catalogo.notaAreaGenerica ? `NOTA: ${catalogo.notaAreaGenerica}.` : null,
    `Derivadas da área actual:\n${listar(catalogo.destinosDeAreaActual)}`,
    `Alternativas pela carta (Atmakaraka, Amatyakaraka, Nakshatra, Modo de Ganho, combinações, eixo do rendimento):\n${listar(catalogo.destinosAlternativos)}`,
    catalogo.candidataForaDaLista.nome
      ? `Candidata com ≥4 convergências (inclui sempre o Atmakaraka): ${catalogo.candidataForaDaLista.nome} — camadas: ${catalogo.candidataForaDaLista.camadas.join("; ")}.${formatarViaConcreta(catalogo.candidataForaDaLista.id ? cursosPorDestino[catalogo.candidataForaDaLista.id] : undefined)}`
      : "Candidata com ≥4 convergências: nenhuma — nenhum destino reuniu 4 camadas independentes incluindo o Atmakaraka.",
    catalogo.notaEixoDoRendimento
      ? `NOTA sobre o eixo do rendimento (o que dá sentido vs. o que paga): ${catalogo.notaEixoDoRendimento.leitura}.${catalogo.notaEixoDoRendimento.regraDeEscrita ? ` Como escrever isto: ${catalogo.notaEixoDoRendimento.regraDeEscrita}` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Redesenho do motor (Parte 5A) — o LLM nunca via a Roda da Vida antes disto (só o template a desenhava, depois de o texto já estar escrito), por isso não podia cumprir a instrução de referenciar valores extremos. Calculada aqui com a mesma função que o template usa (`computeRodaDaVida`, movida para o method-engine), nunca inventada de novo. */
function blocoRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): string {
  const dimensoes = computeRodaDaVida(savPorCasa, pesos, regentesCasas);
  return dimensoes.map((d) => `${d.nome}: ${d.valor.toFixed(1)}/10${d.valor <= 4 || d.valor >= 7 ? " — EXTREMO, tem de ser referenciado no texto" : ""}`).join("\n");
}

const ASPECTO_PT: Record<string, string> = {
  Conjuncao: "conjunção",
  Sextil: "sextil",
  Quadratura: "quadratura",
  Trigono: "trígono",
  Oposicao: "oposição",
};

/** TAREFA 4 (correcção do especialista) — traduz `computeElementosModalidades` para o formato de dados técnicos pedido. */
export function blocoElementosModalidades(perfil: PerfilElementosModalidades): string {
  const el = perfil.distribuicaoElementos;
  const mod = perfil.distribuicaoModalidades;
  return [
    `Elemento dominante: ${perfil.elementoDominante}`,
    `Distribuição de elementos: Fogo ${el.Fogo} | Terra ${el.Terra} | Ar ${el.Ar} | Água ${el.Água}`,
    `Modalidade dominante: ${perfil.modalidadeDominante}`,
    `Distribuição de modalidades: Cardinal ${mod.Cardinal} | Fixa ${mod.Fixa} | Mutável ${mod.Mutável}`,
  ].join("\n");
}

/** TAREFA 4 (correcção do especialista) — traduz `computeAspectosPessoais` para o formato de dados técnicos pedido. */
export function blocoAspectosPessoais(aspectos: AspectoPessoal[]): string {
  if (!aspectos.length) return "(nenhum aspecto relevante entre os 5 planetas pessoais nesta carta)";
  return aspectos.map((a) => `${planetaPt(a.planetaA)} ${ASPECTO_PT[a.aspecto]} ${planetaPt(a.planetaB)}: ${a.significado}`).join("\n");
}

export function construirPromptAdulto(
  intake: VocationiqIntakeAdulto,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
  catalogo: ResultadoCatalogoVocacional,
  savPorCasa: SavPorCasa[],
  elementosModalidades: PerfilElementosModalidades,
  aspectosPessoais: AspectoPessoal[],
  cursosPorDestino: Record<string, CursosSugeridos>,
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
- REGRA ANTI-REPETIÇÃO (reforçada): Cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a MESMA CONCLUSÃO com palavras diferentes — mesmo que a frase literal seja nova. Se "você ganha pela voz" aparece em "O que a carta sustenta", não pode voltar a ser demonstrado em "Leitura por opção" nem em "Candidata fora da lista". Cada secção só pode usar um facto técnico como prova se acrescenta algo genuinamente novo — um custo, uma tensão, uma especificidade. Se não acrescenta nada novo, a secção é curta e remete, nunca repete.
- PLANETAS FRACOS (peso < 0,9): Devem ser mencionados explicitamente — nunca deixar uma barra vermelha na tabela sem texto correspondente. Se o planeta mais ligado à comunicação (Mercúrio) tem peso fraco, e a tese central é "você ganha pela voz", essa tensão TEM de ser nomeada. Não é contradição — é honestidade. Exemplo correcto: "A sua estrutura aponta para comunicação, mas o canal comunicativo em si é o elo mais fraco da carta — o que significa que esta competência precisa de ser construída, não é natural."
- ÁREA ACTUAL DA PESSOA: Nunca tratar como dado morto. É o ponto de partida obrigatório de qualquer leitura. Perguntas que o texto deve responder: o que na área actual já serve o que a carta pede? O que na área actual está a trabalhar contra? Que ponte existe entre o que já é e o que quer ser? A transição começa sempre de onde a pessoa está — nunca de zero. Quando a pessoa tem 5+ anos numa área, essa experiência é um activo real — não um obstáculo a ignorar. Nunca tratar a área actual como ponto de partida neutro — é capital acumulado, positivo ou negativo.
- IDEIA CONCRETA (ideiaConcreta): Quando a pessoa partilhou uma ideia concreta, usá-la para desdobrar a opção declarada — nunca tratar como contexto genérico. Se disse "consultoria SAP", o texto deve diferenciar: a carta sustenta mais "SAP" ou mais "consultoria"? Sustenta o modelo independente ou o modelo de empresa? A ideia concreta é a oportunidade de ser específico — nunca desperdiçar.
- TENSÃO INTERNA: Sempre que dois sinais da carta apontam em direcções diferentes, o texto É OBRIGADO a nomeá-lo. Nunca escolher só o lado bonito. Exemplos de tensões reais: tese central em "voz/comunicação" mas Mercúrio fraco — nomear. Modo de Ganho aponta para liderança pública mas Montra de Mercado aponta para bastidores — nomear. Missão de longo prazo mas período actual pede pausa — nomear. A tensão é informação, não ruído.
- O RELATÓRIO NÃO É PARA CONFIRMAR O QUE A PESSOA JÁ PENSA: é para mostrar o que a carta vê — mesmo que contradiga as opções declaradas. Se a carta aponta claramente para uma direcção que a pessoa não declarou, o motor tem de a nomear — não esperar que ela apareça nas opções. A "Candidata fora da lista" não é uma secção opcional — é o momento onde o relatório tem mais valor único. Se os dados convergem em 4 camadas para algo que a pessoa não viu, dizer isso com clareza é o trabalho.
- REGRA CRÍTICA — LEITURA CONJUNTA: Nunca ler um eixo isolado. Ordem obrigatória: 1. Atmakaraka — o que a pessoa é por dentro. 2. Karakamsha (signo + casa JUNTOS, sempre) — onde isso aterra. 3. Modo de Ganho — por onde entra o dinheiro, testado contra 1+2. 4. Planetas fracos — explicam o passado, apontam onde falta apoio. Só depois disto testado e amarrado é que se avalia a opção declarada.
- KARAKAMSHA — NUNCA ISOLADO: Atmakaraka casa 10 + Karakamsha casa 4 NÃO é contradição. É "autoridade que se constrói a partir de base própria, nunca dentro de estrutura alheia." Lidos juntos, os dois eixos dizem a mesma coisa com instrumentos diferentes.
- PLANETA FRACO + ÁREA ACTUAL: Se a área actual é governada por um planeta fraco (peso < 0,9), isso explica o porquê da insatisfação com precisão. É obrigatório nomear. EXEMPLO: Vénus fraca + estética = "passou anos no campo do planeta mais fraco da sua carta — explica o desgaste, não invalida o talento."
- OPÇÃO DECLARADA — TRADUZIR SEMPRE: A opção que a pessoa declarou é o vocabulário que tinha à mão. SEMPRE traduzir: o que quis dizer, nos termos da carta? "Quero ser consultora SAP" pode significar "quero ser autoridade que ensina e aconselha com nome próprio" — testar essa tradução, nunca aceitar a opção ao pé da letra.
- MAHADASHA — CLASSIFICAÇÃO E REGRA: O tom da Mahadasha actual ABRE a secção do plano, antes de qualquer data ou passo. Classificação: Ketu = dissolução/fecho ("prepare e feche, não colha"); Vénus = expansão/prazer/colheita ("avance, o ciclo favorece"); Sol = afirmação/autoridade ("afirme e visibilize"); Lua = emoção/fluxo/intuição ("siga o que sente, não o plano"); Marte = acção/lançamento/conflito ("avance com força e decisão"); Rahu = ambição/disrupção/ilusão ("risco real, oportunidade real"); Júpiter = crescimento/sabedoria/expansão ("expanda com intenção"); Saturno = estrutura/colheita lenta/responsabilidade ("construa devagar, vai durar"); Mercúrio = comunicação/adaptação/aprendizagem ("aprenda e comunique"). A colheita a sério só abre depois do fim da Mahadasha actual — sempre nomear essa data.
- MARCADORES OBRIGATÓRIOS (recapitulação — cada um já está descrito no lugar exacto onde vai abaixo, mas fica aqui reunido para nunca esquecer nenhum): antes de ${MARCADORES.identidade} "${MARCADORES.fraseAbertura} <frase de 10-15 palavras, poderosa e específica>"; dentro de cada bloco "### <opção>", antes do ponto 1: "${MARCADORES.insight} <frase de síntese em menos de 15 palavras>". São machine-readable e obrigatórios — nunca omitir.
- COERÊNCIA COM OS VISUAIS: o relatório tem elementos visuais gerados automaticamente — gráfico de forças (7 planetas com pesos calculados), radar de competências (6 eixos), Roda da Vida (8 dimensões), tabela de tensões. O texto DEVE referenciar estes visuais quando relevante ("Como mostra o gráfico de forças...", "A sua roda de vida revela...", "O radar de competências confirma..."). NUNCA contradizer o que os visuais mostram — se um visual mostra um valor fraco, o texto não pode dizer que é forte.
- VALOR ALTO NUM ELEMENTO VISUAL NÃO É O TEMA CENTRAL DA VIDA (correcção do especialista): uma casa com valor alto no gráfico (Roda da Vida, Anexo) pode reflectir onde o planeta mais forte da carta está fisicamente posicionado — não necessariamente o tema mais importante da vida da pessoa. O tema central é determinado pelo Eixo da Missão e pelo Modo de Ganho, nunca pelo valor mais alto da roda. Exemplo: se "Saúde/Energia" ou "Como lida com obstáculos e o trabalho do dia a dia" (casa 6) aparecer com o valor mais alto de toda a Roda da Vida só porque o planeta mais forte da carta está fisicamente aí, o texto nunca pode tratar essa área como o propósito central da pessoa — referencia o valor (é obrigatório, ver regra dos extremos), mas contextualiza-o como "onde a força física da carta se concentra", nunca como substituto do Eixo da Missão/Modo de Ganho ao decidir do que este relatório trata.
- ESCALA DE CONFIANÇA (correcção do especialista, obrigatória em todo o relatório) — a linguagem usada tem de bater sempre com o nº de camadas que sustentam a afirmação, nunca mais confiante do que os dados permitem:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva. Ex.: "A sua carta sustenta X com clareza."
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes. Ex.: "Dois sinais independentes apontam para X — o Eixo da Missão e o Modo de Ganho convergem aqui."
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto. Ex.: "Uma leitura possível desta carta é X — não como facto, mas como direcção."
  · EM ABERTO (a carta não distingue): diz isso directamente. Ex.: "A carta não distingue entre X e Y — a decisão fica com você."
  Proibido usar linguagem de "Convergência forte" para algo que só tem um "Sinal forte" — o nível de confiança da frase tem de corresponder exactamente ao nível de convergência que a sustenta.
- Tom adulto, directo, sem gíria de coach, sem emojis.

VOLUME: Cada secção deve ser tão longa quanto os dados sustentam — nunca mais, nunca menos. Se uma secção não tem nada genuinamente novo a acrescentar, é curta. Não preencher para atingir um mínimo. Proibido: repetir para parecer completo. Permitido: ser curto e preciso.
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

-- Candidatas do catálogo --
${blocoCatalogoVocacional(catalogo, cursosPorDestino)}

-- Roda da Vida (8 dimensões, 0-10) --
${blocoRodaDaVida(savPorCasa, pesosPlanetas, axes.regentesCasas)}
Para cada dimensão marcada EXTREMO (≤4 ou ≥7), o texto tem de ter pelo menos uma frase que explique o que esse valor significa para esta pessoa especificamente — nunca deixar um extremo sem menção.

-- Perfil de elementos e modalidades --
${blocoElementosModalidades(elementosModalidades)}

-- Aspectos principais --
${blocoAspectosPessoais(aspectosPessoais)}

-- Opções declaradas --
${
  candidatas.length
    ? `A pessoa declarou estas opções (avalia TODAS, mesmo as que a carta sustenta fracamente):\n${candidatas.map((c) => `- ${c}`).join("\n")}`
    : `A pessoa NÃO declarou opções concretas${intake.areasDestinoIncluiAindaNaoSei ? ' (escolheu "ainda não sei")' : ""}. Deriva até 3 candidatas plausíveis a partir do texto livre abaixo — se não conseguires nenhuma candidata clara, NÃO bloqueies o relatório: escreve a Secção 2 (o que a carta sustenta, em geral) e resolve o relatório inteiro pela Secção 4 (candidata fora da lista). Texto livre disponível:`
}
${!candidatas.length ? [intake.paraOndeQuerIr && `"Para onde queres ir": ${normalizarTextoLivre(intake.paraOndeQuerIr)}`, intake.perguntaEspecifica && `Pergunta específica: ${normalizarTextoLivre(intake.perguntaEspecifica)}`, intake.ideiaConcreta && `Ideia concreta: ${normalizarTextoLivre(intake.ideiaConcreta)}`].filter(Boolean).join("\n") || "(nenhum texto livre preenchido — escreve só a partir do que a carta sustenta em geral.)" : ""}
${intake.tipoMudanca.length ? `\nTipo de mudança que a pessoa diz querer (usa para calibrar a parte 4 de cada leitura — ex.: se inclui trabalhar por conta própria ou abrir negócio, responde explicitamente se a carta sustenta trabalho a solo nessa opção): ${intake.tipoMudanca.join(", ")}.` : ""}
${intake.ideiaConcreta && candidatas.length ? `\nIdeia concreta partilhada (contexto adicional, não é uma opção à parte): ${normalizarTextoLivre(intake.ideiaConcreta)}` : ""}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 5 secções, por esta ordem ===

ANTES de ${MARCADORES.identidade}, escreve, numa linha própria: "${MARCADORES.fraseAbertura} " seguido de uma frase de 10 a 15 palavras que captura a essência desta carta — poderosa, específica, nunca genérica. Não é um resumo. É a frase que a pessoa vai lembrar deste relatório. Exemplos do formato: "Saturno exaltado não pede que seja reconhecida — pede que construa algo que dure.", "A voz que ensina vale mais do que o cargo que ostenta." Proibido: clichés de coaching, frases genéricas de auto-ajuda. Este marcador é obrigatório e machine-readable, não o omitas.

DEPOIS de ${MARCADORES.fraseAbertura}, escreve, numa linha própria: "${MARCADORES.identidade} " seguido de uma frase de 8 a 12 palavras que descreve o que esta pessoa foi feita para ser — não o que perguntou, não a sua opção, mas a sua natureza estrutural. Deve ser específica desta carta, nunca genérica. Exemplos do formato: "Autoridade que forma e transmite pelo exemplo directo", "Arquitecta de sistemas que comunica o que outros não conseguem ver". Proibido: "pessoa comunicativa", "líder nato", qualquer cliché de coaching. Este marcador é obrigatório e machine-readable, não o omitas.

FORMATO DE SAÍDA (obrigatório): escreve em Markdown. Cada secção começa com um cabeçalho de nível 2, EXACTAMENTE com este texto (sem números, sem variações):
## ${SECCAO_TITULOS.abertura}
## ${SECCAO_TITULOS.quemE}
## ${SECCAO_TITULOS.oQueACartaSustenta}
## ${SECCAO_TITULOS.leituraPorOpcao}
## ${SECCAO_TITULOS.candidataForaDaLista}
## ${SECCAO_TITULOS.oPlano}
Se não houver candidata fora da lista (4 camadas não convergiram), inclui o cabeçalho "## ${SECCAO_TITULOS.candidataForaDaLista}" na mesma, seguido só da frase que explica que não há — nunca omitas o cabeçalho.

## ${SECCAO_TITULOS.abertura}
Quadro de dados (nome, situação, área actual) e o enquadramento da pergunta que a pessoa trouxe. Nunca abrir sem este quadro. O texto da pergunta do cliente deve ser apresentado tal como foi escrito — não o coloques em maiúsculas nem em destaque tipográfico. Usa-o como contexto, não como título.

## ${SECCAO_TITULOS.quemE}
Secção nova (correcção do especialista) — um retrato de personalidade, ANTES de qualquer opção ser mencionada. Formato EXACTO, obrigatório e machine-readable — não omitas nem reordenes os marcadores:

DONS — 2 a 3 linhas "${MARCADORES.dom} <frase>", obrigatório:
- Um dom = um planeta com peso ≥ 1,3. Se nenhum planeta atingir 1,3, usa os dois planetas de maior peso da carta (mesmo abaixo de 1,3) — nunca deixes esta secção sem dons.
- Cada dom cita o planeta + a casa + a dignidade, traduzidos para linguagem simples (nunca o nome técnico do planeta/casa/dignidade em jargão — mesma lista de termos proibidos de sempre). Nunca um adjectivo solto ("é comunicativa") sem estar rastreável a este dado técnico específico.
- A confiança da frase deve corresponder ao peso real (um peso de 1,8 não se escreve com a mesma força que um de 1,32 — ver ESCALA DE CONFIANÇA acima).

LIMITAÇÕES — 1 a 2 linhas "${MARCADORES.limitacao} <frase>", obrigatório:
- Uma limitação = um planeta com peso < 0,9.
- Frase PRÓPRIA e ESPECÍFICA para cada planeta fraco — PROIBIDO repetir a mesma frase genérica para planetas diferentes. Cada planeta tem uma implicação prática concreta, nunca genérica: Mercúrio fraco afecta a fluidez de explicar e ser entendida; Vénus fraca afecta o sentido de valor próprio e o à-vontade a cobrar; Lua fraca afecta a gestão emocional e a intuição em decisões; Marte fraco afecta a capacidade de agir com rapidez e decisão; Sol fraco afecta a afirmação pública da identidade profissional; Júpiter fraco afecta a expansão/crescimento (custa mais do que para outros); Saturno fraco afecta a estrutura e a disciplina de longo prazo (precisa de sistemas externos). Usa estas implicações como ponto de partida, nunca como frase a copiar literalmente duas vezes.
- REGRA DE NÃO-DUPLICAÇÃO: o relatório já tem, mais abaixo, uma tabela determinística ("Onde a carta tem atrito") com a implicação prática detalhada de CADA planeta fraco. Se vais nomear aqui um planeta fraco que essa tabela já desenvolve, NÃO repitas a explicação inteira — uma frase curta que o nomeia e remete (ex.: "Vénus, a área mais fraca da carta, aparece desenvolvida mais à frente") chega; o desenvolvimento completo fica só na tabela.

O QUE VALORIZA — sempre com conteúdo real (nunca omitir, mesmo quando Vénus é a camada mais fraca da carta — "o que valoriza" nunca fica só como um número solto no gráfico de pesos, sem explicação no texto): um parágrafo curto, sem marcador, sobre o que esta pessoa genuinamente valoriza, ancorado em Vénus e nos dons/limitações já nomeados.

ELEMENTOS E MODALIDADES (correcção do especialista): o elemento dominante revela como a pessoa processa e actua no mundo. A modalidade dominante revela o seu ritmo natural de mudança. Usa estes dados para enriquecer o retrato de personalidade nesta secção — não como lista, mas integrados na narrativa dos dons/limitações já escritos, nunca como parágrafo à parte só sobre elementos.

ASPECTOS ENTRE PLANETAS PESSOAIS (correcção do especialista): os aspectos revelam tensões e harmonias internas. Nomeia os aspectos mais relevantes (especialmente quadraturas e oposições, ver "-- Aspectos principais --" acima) como parte das limitações ou tensões internas do perfil — nunca como secção nova, sempre integrados onde já estás a nomear dons/limitações/tensões.

Termina a secção com uma linha "${MARCADORES.sinteseQuemE} <frase>" — uma frase compacta que resume: quem é, o que a move, o que a trava, onde rende mais, onde rende menos. Nunca introduzas aqui um facto novo que não vá aparecer depois no corpo do relatório — é síntese do que já foi dito, não uma antecipação de algo só explicado mais tarde.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções declaradas.

## ${SECCAO_TITULOS.leituraPorOpcao}
Para CADA opção candidata (declarada ou derivada), este formato EXACTO, por esta ordem — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios e machine-readable, não os omitas nem os traduzas:

### <nome exacto da opção, tal como foi declarada ou derivada>
${MARCADORES.forca} <forte, moderada ou fraca — forte se ≥2 fontes independentes fortes convergem, moderada se há suporte real mas não forte, fraca se só um sinal fraco isolado sustenta a opção>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras — específica desta carta, nunca genérica. Obrigatório e machine-readable, não o omitas.>
1. O que a carta sustenta nesta opção. Para dizer que a carta sustenta uma opção, cita pelo menos duas fontes independentes (Eixo da Missão, Modo de Ganho, peso de planeta, Montra de Mercado). Uma opção sustentada por um único sinal fraco não é sustentada — diz isso, e usa "${MARCADORES.forca} fraca" nesse caso.
2. O que esta opção lhe vai custar (o custo específico DESTA carta nesta escolha, nunca o risco genérico da profissão).
3. O que esta opção pede e que falta actualmente — e se é algo que se aprende ou algo que não muda.
4. Onde entra a matéria desta pessoa nesta opção — nunca o sector como resposta, sempre a forma/função (usa o Modo de Ganho para decidir se entra pela voz, pela resolução directa, ou pela liderança/execução pública).

Repete o bloco "### <nome> / ${MARCADORES.forca} / ${MARCADORES.insight} / 1. / 2. / 3. / 4." para cada opção candidata, uma a seguir à outra.

## ${SECCAO_TITULOS.candidataForaDaLista}
A candidata já vem calculada deterministicamente na secção "Candidatas do catálogo" acima — NÃO calcules a tua própria convergência, NÃO inventes uma candidata diferente. Se essa secção diz "nenhuma", a primeira linha é "${MARCADORES.candidata} nenhuma" e escreves isso explicitamente — "a sua carta não aponta a nada fora do que já pensava" é uma resposta válida e completa, não a evites. Se essa secção nomeia uma candidata concreta, a primeira linha é "${MARCADORES.candidata} <esse nome exacto>", seguida do texto explicativo usando as camadas exactas já listadas (nunca inventes camadas novas nem omitas as que vêm calculadas). A primeira linha é sempre obrigatória e machine-readable, não a omitas.

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA (correcção do especialista): PROIBIDO nomear qualquer candidata, mesmo como pista abaixo do limiar, sem que venha explicitamente da secção "Candidatas do catálogo" acima. Se nenhuma candidata do catálogo atingiu ≥4 camadas, a resposta é "${MARCADORES.candidata} nenhuma" — explica honestamente que a carta não aponta a nada fora do que já foi pensado. NUNCA preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos. Exemplo do que NÃO fazer: sugerir "engenharia, auditoria, saúde pública" por associação livre a "Saturno = estrutura/rigor" — essas profissões não vieram do catálogo, vieram de associação livre; isto é invenção, não leitura, e é exactamente o que esta regra proíbe.

## ${SECCAO_TITULOS.oPlano}
Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima) — antes de qualquer data ou passo. Usa as datas reais dessa secção (nunca datas inventadas). Escreve o corpo do plano livremente, e destaca o primeiro passo accionável para esta semana numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " (obrigatório, machine-readable, não o omitas) — ex.: "${MARCADORES.primeiroPasso} Contacte duas pessoas que já fazem consultoria a solo e pergunte-lhes o que ninguém conta sobre o primeiro ano." Nunca um plano genérico de 90 dias sem ligação às datas calculadas.

HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, afirmações com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo, nunca como previsão. A Mahadasha até ao fim do seu ciclo é contexto, não calendário.
`.trim();
}
