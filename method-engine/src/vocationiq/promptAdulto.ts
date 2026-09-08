// VOCATIONIQ-ADULTO-metodologia.md — construção do prompt para o ramo
// "trabalho-quero-mudar". Segue o documento secção a secção; qualquer
// desvio do texto literal do documento está assinalado num comentário
// "DESVIO" a explicar porquê.

import type { VocationIQAxes, EarningModeHouse } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ClassicalGraha } from "../lifeReport/types";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import { computeRodaDaVida } from "./rodaDaVida";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";
import type { D1TableResult } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";

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
  /** Correcção do especialista (nova secção) — retrato de personalidade, entre "Abertura" e "O que o perfil sustenta". Ver TAREFA 3 no prompt abaixo. */
  quemE: "Quem é",
  // TAREFA 3D (correcção do especialista) — "carta" está agora proibido em
  // todo o texto do relatório (ver PROIBIDO USAR A PALAVRA "CARTA" no
  // prompt abaixo); este título é escrito literalmente pelo LLM como
  // cabeçalho "## ", por isso tinha de mudar aqui também, não só na prosa.
  oQueACartaSustenta: "O que o perfil sustenta",
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
  /** TAREFA #40 (mudança de arquitectura — selecção pelo LLM) — bloco único, antes das 3 (ou menos) secções CANDIDATA, explicando qual dom já nomeado em "Quem é" liga a cada candidata escolhida e por que as restantes da pool completa não foram escolhidas. Nunca aparece no relatório final entregue ao cliente — extraído e removido do HTML tal como os outros marcadores internos (ver `relatorioTemplate.ts`). */
  seleccaoCandidatas: "SELECÇÃO_CANDIDATAS:",
  /**
   * Correcção do especialista ("remover o tecto fixo de 3, com
   * agrupamento por cluster") — abre um grupo de candidatas com
   * convergência de base quase idêntica (ver `gruposCandidatas` em
   * ResultadoCatalogoVocacional). Formato exigido na mesma linha do
   * marcador: os nomes exactos dos membros do grupo, separados por ";"
   * (nunca por vírgula — nomes de destinos podem conter vírgula). O texto
   * a seguir ao marcador, até ao primeiro "CANDIDATA:" seguinte, é a
   * convergência de base PARTILHADA por todo o grupo — escrita uma só
   * vez. Cada "CANDIDATA:" que se segue (uma por membro do grupo, pela
   * mesma ordem dos nomes) traz só a diferenciação específica dessa
   * candidata, nunca repetindo a convergência de base já escrita aqui.
   */
  grupo: "GRUPO:",
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
    `Atmakaraka (o planeta que representa a vontade/missão mais forte da pessoa neste perfil): ${planetaPt(m.atmakaraka)}, na casa ${m.akHouse}, em ${m.akSign}, estado ${ESTADO_PT[m.akDignity ?? "Neutral"] ?? m.akDignity}.`,
    `Karakamsha (onde essa missão aterra em termos de expressão prática, lido no D9): signo ${m.karakamshaSign}, casa ${m.karakamshaHouse} a partir do Ascendente.`,
    `Amatyakaraka (o planeta que comanda a ferramenta de trabalho do dia a dia): ${planetaPt(axes.amatyakaraka)}.`,
  ].join("\n");
}

// Correcção do especialista ("Modo de Ganho — casa de bastidores") — a
// pontuação que decide qual casa (2/6/10) vence já incorpora onde o
// regente dessa casa está fisicamente sentado (via `peso`, que depende do
// SAV da casa que o regente ocupa — ver computeEarningModes,
// vocationIQ.ts). Mas o RÓTULO narrativo que descreve a casa vencedora ao
// LLM era um texto fixo por número de casa, sempre o mesmo independente
// de onde o regente estivesse — confirmado no diagnóstico da Alice:
// regente do Modo de Ganho (casa 10) sentado na casa 6 (bastidores,
// exaltado) recebia a mesma frase "assumir a cara pública, ser vista a
// fazer, não a assistir por trás" que receberia se estivesse na própria
// casa 10 ou na 1 — o oposto do que a posição real sustenta. Corrigido:
// quando o regente da casa vencedora está sentado numa casa de bastidores
// clássica (6/8/12 — dificuldade, serviço, oculto), o rótulo ganha uma
// cláusula de nuance própria para essa casa, em vez do genérico de
// exposição/visibilidade directa.
const CASAS_DE_BASTIDORES = new Set([6, 8, 12]);

const NUANCE_REGENTE_EM_BASTIDORES: Record<EarningModeHouse, string> = {
  2: " — mas o regente está sentado numa casa de bastidores (6, 8 ou 12): a voz que sustenta este perfil não é a mais sociável nem performática, ganha peso quando resolve algo difícil ou diz uma verdade que os outros evitam, não pelo charme da exposição",
  6: " — e o regente está também numa casa de bastidores (6, 8 ou 12), o que reforça o padrão: o reconhecimento vem de resolver o que ninguém mais quer tocar, quase sempre sem holofote",
  10: " — mas o regente está sentado numa casa de bastidores (6, 8 ou 12), não numa posição de exposição directa: o reconhecimento tende a chegar como consequência de resolver, estruturar ou servir com disciplina, nunca por procurar visibilidade — a leitura mais precisa não é 'ser vista a fazer', é 'tornar-se imprescindível através do que sustenta por trás'",
};

export function blocoModoDeGanho(axes: VocationIQAxes, pesosPlanetas: PesoPlaneta[]): string {
  const dominantes = axes.earningModeDominante;
  const ROTULO_HUMANO_BASE: Record<number, string> = {
    2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
    6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
    10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
  };
  const casaDoRegente = (lord: ClassicalGraha) => pesosPlanetas.find((p) => p.planeta === lord)?.casa;
  const ROTULO_HUMANO: Record<number, string> = Object.fromEntries(
    dominantes.map((d) => {
      const casaRegente = casaDoRegente(d.lord);
      const nuance = casaRegente !== undefined && CASAS_DE_BASTIDORES.has(casaRegente) ? NUANCE_REGENTE_EM_BASTIDORES[d.house] : "";
      return [d.house, `${ROTULO_HUMANO_BASE[d.house]}${nuance}`];
    }),
  );
  // TAREFA 2 (correcção do especialista) — antes desta correcção, um
  // empate exacto entre duas casas resolvia-se por acidente da ordem do
  // array interno, nunca por decisão metodológica. Agora, empate real
  // (mesma pontuação E mesmo nº de camadas convergentes, ver
  // `resolverEarningModeDominante`) devolve as duas casas como
  // co-dominantes — o LLM tem de as apresentar como igualmente sustentadas,
  // nunca escolher uma só para simplificar.
  const linhaDominante =
    dominantes.length > 1
      ? `Modo de Ganho CO-DOMINANTE (empate real, mesma pontuação e mesmo nº de camadas convergentes — nunca escolhas só um dos dois): casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}) e casa ${dominantes[1].house} (${ROTULO_HUMANO[dominantes[1].house]}), ambas com pontuação ${dominantes[0].score}. Usa esta frase, ou uma equivalente, ao escrever sobre o Modo de Ganho: "Modo de Ganho co-dominante: casa ${dominantes[0].house} e casa ${dominantes[1].house} — o perfil sustenta os dois com igual força."`
      : `Modo de Ganho dominante: casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}), pontuação ${dominantes[0].score}.`;
  const linhas = [
    linhaDominante,
    `Sinais que sustentam ${dominantes.length > 1 ? "estas casas" : "esta casa"}: ${dominantes
      .map((d) => `casa ${d.house}: ${d.signals.length ? d.signals.join("; ") : "nenhum sinal directo — só a dignidade base do regente"}`)
      .join(" | ")}`,
    `As três Artha Trikonas, por ordem de força neste perfil: ${axes.earningModeAll.map((e) => `casa ${e.house} (pontuação ${e.score})`).join(", ")}.`,
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
      const base = `${planetaPt(p.planeta)}: casa ${p.casa} (${p.signo}), estado ${ESTADO_PT[p.estado] ?? p.estado}, SAV da casa ${p.savCasa} (média do perfil ${p.savMedia.toFixed(1)}) → peso ${p.peso.toFixed(3)}.`;
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

  // TAREFA #40 (mudança de arquitectura — substitui a TAREFA 1 e a TAREFA
  // #39) — `catalogarDestinos()` já não escolhe as 3 finais; entrega a
  // POOL COMPLETA de candidatas que atingem ≥4 camadas (Nível 1 ou 2, sem
  // limite de 3). A escolha de até 3 passa a ser feita AQUI, pelo LLM, na
  // mesma chamada que escreve "Quem é" — ver INSTRUCAO_SELECCAO_CANDIDATAS
  // logo abaixo. Cada linha da pool traz o nível (TAREFA #38) e a soma de
  // pesos das camadas (`somaPesoCamadas`) explícita, para o LLM ter um
  // número concreto a citar quando usar isso como desempate — nunca como
  // critério principal.
  const candidatasTexto = catalogo.candidatasForaDaLista.length
    ? catalogo.candidatasForaDaLista
        .map(
          (c) =>
            `- ${c.nome}: convergência ${c.convergencia}, Nível ${c.nivelConfianca} (${c.nivelConfianca === 1 ? "inclui o planeta de maior peso — confiança plena" : "âncora pessoal (Atmakaraka/Amatyakaraka/Stellium/Regente de casa dignificado), sem o planeta de maior peso — confiança reduzida"}), soma de pesos das camadas ${c.somaPesoCamadas.toFixed(2)} (${c.camadas.join("; ")}).`,
        )
        .join("\n")
    : "nenhuma — nenhum destino reuniu 4 camadas independentes incluindo um indicador pessoal (planeta de maior peso, Atmakaraka ou Amatyakaraka).";

  // Correcção do especialista ("remover o tecto fixo de 3, com
  // agrupamento por cluster") — `gruposCandidatas` (catalogoVocacional.ts)
  // já vem calculado deterministicamente: listas de nomes cuja
  // assinatura de TIPOS de camada é idêntica ou difere em, no máximo, 1
  // tipo. Exposto aqui em texto simples para o LLM usar como base do
  // agrupamento na apresentação final (ver INSTRUCAO_SELECCAO_CANDIDATAS)
  // — o LLM NUNCA decide sozinho quem se parece com quem, usa sempre este
  // cálculo já feito.
  const gruposTexto = catalogo.gruposCandidatas.length
    ? catalogo.gruposCandidatas.map((g, i) => `Grupo ${i + 1} (${g.length} candidatas, convergência de base quase idêntica): ${g.join(", ")}.`).join("\n")
    : "nenhum — todas as candidatas da pool têm assinatura de camadas própria (sem par a ≤1 tipo de distância).";

  // TAREFA 3 (correcção do especialista, ronda seguinte) — cada candidata
  // da pool ganha o seu próprio bloco "-- Via concreta para [destino] --",
  // separado da listagem acima (antes vinha só inline, apensa à linha da
  // candidata). Formato exacto pedido: tipo de formação, certificação,
  // como se entra, tempo médio até à primeira actividade remunerada. Com a
  // pool completa (TAREFA #40), isto cobre TODAS as candidatas elegíveis,
  // não só as 3 que vierem a ser escolhidas — necessário para o LLM poder
  // escolher qualquer uma da pool com a via concreta já disponível.
  const viasConcretasCandidatas = catalogo.candidatasForaDaLista
    .map((c) => {
      const cursos = cursosPorDestino[c.id];
      if (!cursos) return null;
      return `-- Via concreta para ${c.nome} --\n${cursos.entradaMercadoAdulto.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    catalogo.notaAreaGenerica ? `NOTA: ${catalogo.notaAreaGenerica}.` : null,
    `Derivadas da área actual:\n${listar(catalogo.destinosDeAreaActual)}`,
    `Alternativas pelo perfil (Atmakaraka, Amatyakaraka, Nakshatra, Modo de Ganho, combinações, eixo do rendimento):\n${listar(catalogo.destinosAlternativos)}`,
    `Candidatas do catálogo — pool completa (≥4 convergências, Nível 1 ou 2 conforme indicado, SEM LIMITE nenhum — apresentam-se TODAS as que passam o filtro de ligação narrativa, ver INSTRUCAO_SELECCAO_CANDIDATAS):\n${candidatasTexto}`,
    `Grupos de candidatas (assinatura de camadas idêntica ou quase idêntica — usar para agrupar a apresentação, ver INSTRUCAO_SELECCAO_CANDIDATAS):\n${gruposTexto}`,
    viasConcretasCandidatas || null,
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
  if (!aspectos.length) return "(nenhum aspecto relevante entre os 5 planetas pessoais neste perfil)";
  return aspectos.map((a) => `${planetaPt(a.planetaA)} ${ASPECTO_PT[a.aspecto]} ${planetaPt(a.planetaB)}: ${a.significado}`).join("\n");
}

// ── CAMADA 1 (correcção do especialista) — Avasthas Baladi (maturidade de
// cada planeta clássico, já calculada por `computeD1Table` → `d1.rows[g].avastha`,
// nunca recalculada aqui). Rahu/Ketu não têm avastha (sempre `null` na
// tabela D1, sem excepção clássica documentada) — omitidos por desenho.
const AVASTHA_PT: Record<string, string> = {
  Bala: "criança — energia bruta, ainda não controlada, forte em impulso mas fraca em consistência",
  Kumara: "jovem — energia em desenvolvimento, cheia de promessa mas ainda não testada",
  Yuva: "jovem adulto — força máxima, plena expressão",
  Vriddha: "idoso — energia madura mas a declinar, mais sabedoria do que força",
  Mrita: "morta — energia bloqueada, dificuldade real de expressão",
};

// `d1.rows[g].avastha`/`.degreeInSign` já vêm calculados por
// `computeD1Table()` — não existe (nem é preciso) um `computeAvasthaBaladi(d1)`
// à parte; seria só um invólucro a reler o mesmo valor.
export function blocoAvasthas(d1: D1TableResult): string {
  const linhas: string[] = [];
  for (const r of Object.values(d1.rows)) {
    if (!r.avastha) continue;
    linhas.push(`${planetaPt(r.graha)}: ${r.avastha} (${r.degreeInSign.toFixed(1)}°) — ${AVASTHA_PT[r.avastha]}`);
  }
  return linhas.join("\n");
}

// ── CAMADA 2 — conjunções (mesmo signo, já calculadas por `computeD1Table`
// → `d1.conjunctions`, nunca recalculadas aqui). Classificação de natureza
// por pares exactos (correcção do especialista, ronda seguinte — lista
// fechada, não uma regra geral de benéfico/maléfico): Júpiter+Vénus,
// Júpiter+Lua e Vénus+Lua são benéficas; Saturno+Marte, Sol+Saturno e
// Marte+Lua são tensão (Marte+Lua = Angaraka Yoga, volatilidade emocional
// clássica — não é "maléfico toca neutro", é o par em si); qualquer outro
// par é neutro.
const CONJUNCOES_BENEFICAS: [string, string][] = [
  ["Jupiter", "Venus"],
  ["Jupiter", "Moon"],
  ["Venus", "Moon"],
];
const CONJUNCOES_TENSAO: [string, string][] = [
  ["Saturn", "Mars"],
  ["Sun", "Saturn"],
  ["Mars", "Moon"],
];

function parCoincide(par: [string, string], a: string, b: string): boolean {
  return (par[0] === a && par[1] === b) || (par[0] === b && par[1] === a);
}

function naturezaConjuncao(a: string, b: string): "benéfica" | "tensão" | "neutra" {
  if (CONJUNCOES_BENEFICAS.some((par) => parCoincide(par, a, b))) return "benéfica";
  if (CONJUNCOES_TENSAO.some((par) => parCoincide(par, a, b))) return "tensão";
  return "neutra";
}

export function blocoConjuncoes(d1: D1TableResult): string {
  if (!d1.conjunctions.length) return "(nenhuma conjunção entre os 9 grahas neste perfil)";
  return d1.conjunctions.map((c) => `${planetaPt(c.a)} conjunção ${planetaPt(c.b)} (casa ${d1.rows[c.a].house}, natureza ${naturezaConjuncao(c.a, c.b)})`).join("\n");
}

// ── CAMADA 3 (correcção do especialista, ronda seguinte) — 3 yogas
// vocacionais construídos de raiz em `vocationiq/yogasVocationais.ts`
// (Raja/Dhana/Viparita Raja, condições específicas pedidas — não a versão
// genérica de `lifeReport/yogas.ts`, que cobre 8 yogas com condições mais
// largas e nunca foi desenhada para este produto). Nunca inclui Neecha
// Bhanga — o VocationIQ já tem o seu próprio detector, mais rigoroso (4
// condições clássicas, `pesosPlanetas.ts`), usado no peso de cada planeta.
export function blocoYogas(yogas: YogaHit[]): string {
  if (!yogas.length) return "(nenhum yoga clássico detectado neste perfil)";
  return yogas.map((y) => `${y.label}: ${y.detail}`).join("\n");
}

// ── CAMADA 4 — Vargottama (mesmo signo em D-1 e D-9), já calculado por
// `computeD9Table` → `d1.d9.rows[g].vargottama`, nunca recalculado aqui.
export function blocoVargottama(d1: D1TableResult): string {
  const linhas = Object.values(d1.d9.rows)
    .filter((r) => r.vargottama)
    .map((r) => `${planetaPt(r.graha)}: Vargottama (mesmo signo ${r.d1Sign} em D-1 e D-9)`);
  return linhas.length ? linhas.join("\n") : "(nenhum planeta Vargottama neste perfil)";
}

/**
 * 4 instruções "REGRAS OBRIGATÓRIAS" das camadas técnicas (correcção do
 * especialista, ronda seguinte — a versão anterior era genérica demais e
 * o LLM não as estava a seguir). Partilhadas entre `construirPromptAdulto`
 * e `construirPromptAdolescente` (FALTA 1 dessa ronda: nunca só um dos
 * dois motores) — o texto dos exemplos não usa "tu"/"você" em lado
 * nenhum, por isso funciona sem alteração nos dois registos.
 *
 * DESVIO (correcção do especialista, FALTA 2 dessa ronda) — o texto
 * original pedia "se a área actual é governada por um planeta Mrita",
 * mas não existe no motor nenhum facto único "o planeta que governa a
 * área actual": `intake.areaActual` é texto livre, casado contra o
 * catálogo por `buscarDestinosPorTexto` (`catalogoVocacional.ts`), e os
 * planetas relevantes só aparecem dentro das CAMADAS de cada destino
 * correspondente (ex.: "Regente do Modo de Ganho dominante (Venus, casa
 * 10)"). Verificado com os dados reais da Melina antes de escrever isto:
 * a área dela ("Estética") liga-se a Vénus (regente do Modo de Ganho,
 * peso 0,86, Vriddha) — NUNCA à Lua (peso 0,98, Mrita, mas em casa 7,
 * sem nenhuma ligação a "Estética" nas camadas do catálogo). A instrução
 * abaixo aponta para o mecanismo real (as camadas de "Derivadas da área
 * actual", já no prompt) em vez de inventar um facto "planeta que
 * governa a área actual" que o motor não calcula.
 */
export const INSTRUCAO_AVASTHAS = `AVASTHAS — REGRAS OBRIGATÓRIAS na secção "${SECCAO_TITULOS.quemE}":
· PLANETA LIGADO À ÁREA ACTUAL EM MRITA: olha para os planetas citados nas camadas de "Derivadas da área actual" (dados técnicos, "Candidatas do catálogo"). Se um deles está em Mrita, nomeia-o explicitamente: "Trabalhou durante X anos no campo de [planeta] — mas [planeta] Mrita está bloqueado neste perfil, o que explica com precisão porque essa área nunca trouxe realização plena. Não é falta de talento — é falta de ressonância estrutural."
· PLANETA FORTE (peso ≥1,3) EM MRITA: nomeia a contradição: "[Planeta] tem força técnica alta (peso X) mas está em Mrita — o potencial existe mas a expressão está bloqueada. O que parece capacidade adormecida é na verdade uma barreira real a trabalhar."
· PLANETA FRACO (peso <0,9) EM YUVA: nomeia a surpresa positiva: "[Planeta] tem peso baixo (X) mas está em Yuva — tem mais capacidade de expressão do que os números sugerem. É um músculo que responde bem ao treino."
NUNCA listar avasthas sem as usar para explicar algo concreto sobre a pessoa.`;

export const INSTRUCAO_CONJUNCOES = `CONJUNÇÕES — REGRAS OBRIGATÓRIAS: para cada conjunção activa, a secção "${SECCAO_TITULOS.quemE}" TEM de ter uma frase que explique a fusão ou tensão.
· CONJUNÇÃO BENÉFICA (com Júpiter ou Vénus): "[Planeta] conjunção [Júpiter/Vénus] — [Planeta] recebe elevação natural. O que seria apenas [qualidade do planeta] torna-se [qualidade elevada]."
· CONJUNÇÃO DE TENSÃO (Saturno+Marte, Sol+Saturno, Marte+Lua): "[Planeta A] conjunção [Planeta B] — dois impulsos opostos no mesmo espaço. O que parece contradição ([impulso A] vs [impulso B]) é na verdade a tensão criativa que define como esta pessoa age. Resolver esta tensão é o trabalho de uma vida — mas também é a fonte de energia mais original deste perfil."
NUNCA ignorar conjunções activas.`;

// CORRECÇÃO 2 (correcção do especialista, ronda seguinte) — a versão
// anterior ("cada yoga tem de se ligar a uma candidata... que já citam o
// MESMO planeta") já pedia a mesma verificação de planeta partilhado, mas
// não distinguia "o yoga confirma esta candidata especificamente" de "o
// yoga só reforça capacidade geral", nem obrigava a testar as 3
// candidatas (só falava de "uma candidata"). Versão mais precisa e
// exaustiva, com frase-molde quase literal.
export const INSTRUCAO_YOGAS = `YOGAS — INSTRUÇÃO OBRIGATÓRIA PARA CANDIDATAS: para CADA candidata fora da lista apresentada, verifica se algum yoga activo (Raja Yoga, Dhana Yoga, Viparita Raja Yoga) cita pelo menos um dos planetas que fazem parte das camadas de convergência dessa candidata.
Se sim, a leitura desta candidata DEVE incluir uma frase com este padrão exacto: "Existe também, [de forma independente desta convergência / reforçando esta convergência], uma configuração técnica neste perfil ([nome do yoga em português simples, ex.: 'Raja Yoga', 'configuração de autoridade real']) que [confirma directamente esta candidata / reforça o teu/seu potencial nesta área de forma mais geral]"
Distingue sempre:
· Yoga cujos planetas coincidem com os desta candidata: "confirmação directa" — usa "confirma directamente esta candidata".
· Yoga que reforça capacidade geral sem ligação aos planetas desta candidata: "reforço geral" — usa "reforça o teu/seu potencial nesta área de forma mais geral".
Se NÃO houver nenhum yoga cujos planetas coincidam com os planetas da candidata, não menciones yogas nessa candidata — PROIBIDO inventar ligação para preencher espaço.
Esta verificação é obrigatória para TODAS as candidatas escolhidas (até 3), não só a primeira. Se todas tiverem yogas aplicáveis, todas devem citá-los.`;

// CORRECÇÃO 3 (correcção do especialista, ronda seguinte) — obriga o
// mesmo formato de nomeação técnica nos dois motores (adulto e
// adolescente), para as avasthas e as conjunções nunca aparecerem como
// prosa livre sem o termo técnico entre parênteses — torna o critério 18/
// 19 da crítica automática verificável por padrão de texto, não por
// interpretação.
export const INSTRUCAO_CONSISTENCIA_TECNICA = `CONSISTÊNCIA TÉCNICA ENTRE MOTORES — obrigatório em ambos, adulto e adolescente:
Sempre que o texto descrever o estado de maturidade de um planeta, a frase DEVE incluir entre parênteses a palavra "avastha" e o nome técnico do estado (Bala/Yuva/Vriddha/Mrita), no formato: "...está numa fase (avastha) de declínio (Vriddha)..."
Sempre que o texto descrever uma conjunção (dois traços "fundidos" ou "quase como uma coisa só"), a frase DEVE incluir entre parênteses os dois planetas envolvidos: "...(Lua+Marte fundidos)..."`;

/**
 * CORRECÇÃO 4 (correcção do especialista, ronda seguinte).
 *
 * DESVIO — o texto pedido dizia "que já viste acima" (registo "tu").
 * Esta é uma constante partilhada entre `construirPromptAdulto`
 * ("você") e `construirPromptAdolescente` ("tu") — "viste" (2ª pessoa
 * do singular, pretérito) está certo para o adolescente mas seria
 * gramaticalmente errado no relatório adulto ("você viu", nunca "você
 * viste"). Substituído por "que já foi nomeado acima" — construção
 * impessoal, correcta nos dois registos, sem perder o sentido pedido
 * (referenciar um dom já nomeado antes na secção "Quem é").
 */
// TAREFA #40 (correcção do especialista — MUDANÇA DE ARQUITECTURA) —
// depois de quatro rondas a afinar limiares/gates/desempates dentro de
// `catalogarDestinos()` (cada um resolvendo o caso que o motivou e
// quebrando outro — ver comentário TAREFA #40 em catalogoVocacional.ts),
// a escolha de QUAIS até 3 candidatas mostrar deixa de ser uma fórmula
// numérica e passa a ser um julgamento do próprio LLM, no mesmo sítio
// onde já se confia nele para escrever "Quem é" — porque é aí, e só aí,
// que "esta candidata liga-se com clareza a um dom já nomeado" pode ser
// avaliado de facto, não aproximado por peso ou contagem de camadas.
// CORRECÇÃO (correcção do especialista, ronda seguinte à mudança de
// arquitectura) — a primeira versão desta instrução ("ligação narrativa
// é o critério principal, soma de pesos só desempate") deixava espaço
// para o LLM tratar "Nível 1" como sinónimo de "liga-se melhor" — não
// era essa a intenção (nível é só sobre confiança da escrita, nunca
// sobre elegibilidade), mas na prática, na carta real da Alice, a
// selecção preferiu 3 candidatas Nível 1 (somas 3.86/3.76/3.76, já
// deduplicadas) a "Ciências da Educação" (Nível 2, soma 4.19 — A MAIS
// ALTA DAS 5), só por causa do nível. Correcção: a LIGAÇÃO NARRATIVA
// continua a ser um FILTRO DE ELEGIBILIDADE (nunca escolher uma
// candidata que não se ligue genuinamente a um dom já nomeado) — mas
// deixa de decidir a ORDEM/PRIORIDADE entre as elegíveis. Essa ordem
// passa a ser SEMPRE a soma de pesos (já deduplicada por planeta, ver
// catalogoVocacional.ts), nunca o nível.
// CORRECÇÃO (correcção do especialista — "remover o tecto fixo de 3, com
// agrupamento por cluster") — a versão anterior desta instrução limitava
// a apresentação a "até 3", com a soma de pesos a decidir quais 3 vagas
// eram preenchidas. O especialista pediu para remover esse tecto por
// inteiro: mostrar TODAS as candidatas que passam o Passo 1, sem limite
// artificial nem ranking de "mais importante" — e, quando várias
// partilham a mesma convergência de base (ex.: o cluster de 13 destinos
// ligados à casa 9 exaltada da Alice), agrupá-las na apresentação em vez
// de repetir a mesma explicação astrológica 13 vezes. O Passo 1 (filtro
// de ligação narrativa) e a lógica de soma de pesos NÃO mudam — só deixam
// de servir para CORTAR a três; passam a servir para decidir QUEM fica de
// fora (só quem reprova o Passo 1) e em que ORDEM de apresentação as
// restantes aparecem (nunca como hierarquia de importância).
export const INSTRUCAO_SELECCAO_CANDIDATAS = `APRESENTAÇÃO DAS CANDIDATAS FORA DA LISTA — SEM TECTO DE 3: a secção "Candidatas do catálogo" traz a pool completa (Nível 1 ou 2), sem limite nenhum. A tua tarefa NÃO é escolher até 3 — é decidir quais passam o filtro de ligação narrativa (Passo 1) e apresentar TODAS as que passam, agrupando as que partilham convergência de base quase idêntica (Passo 3). Nunca inventar nenhuma candidata fora da pool; nunca omitir uma candidata elegível só para manter a secção curta.
Processo em TRÊS PASSOS, nesta ordem exacta:
PASSO 1 — FILTRO DE ELEGIBILIDADE (ligação narrativa, único filtro que existe): de toda a pool, elimina qualquer candidata cujas camadas NÃO consigas ligar com clareza a um dom ou traço JÁ NOMEADO na secção "${SECCAO_TITULOS.quemE}" — essa ligação é a mesma que vais citar na frase de abertura obrigatória (ver INSTRUCAO_ABERTURA_CANDIDATAS). Filtro binário (liga-se genuinamente, ou não) — nunca uma escala de "liga-se melhor/pior" entre candidatas que já se ligam, e nunca um segundo filtro de "quantas quero mostrar". TODAS as que passam ficam, sem limite.
PASSO 2 — ORDEM DE APRESENTAÇÃO (soma de pesos, nunca ranking): entre as candidatas que passaram o Passo 1, ordena a apresentação (grupos e candidatas individuais) pela soma de pesos mais alta primeiro — serve só para dar uma ordem estável ao texto, nunca como hierarquia de importância (ver a regra "SEM RANKING" na secção "${SECCAO_TITULOS.candidataForaDaLista}"). O Nível (1 ou 2) nunca decide inclusão nem ordem — só a linguagem de confiança de cada candidata (INSTRUCAO_NIVEL_CANDIDATAS).
PASSO 3 — AGRUPAMENTO POR ASSINATURA (apresentação, nunca qualificação): os dados técnicos trazem "Grupos de candidatas" — listas de nomes já calculadas deterministicamente cuja convergência de base (o CONJUNTO de tipos de camada, não o texto exacto) é idêntica ou quase idêntica. Para cada grupo em que 2 ou mais membros passaram o Passo 1: escreve a convergência astrológica de base UMA SÓ VEZ para o grupo inteiro num bloco "${MARCADORES.grupo}" (que camadas partilham, o que isso significa em conjunto) — depois, para CADA membro desse grupo que passou o Passo 1, um bloco "${MARCADORES.candidata}" curto (2-4 linhas): porquê esta e não as outras do mesmo grupo, a via concreta dela, prós e contras específicos. NUNCA repetir a convergência de base dentro do bloco de cada candidata — já foi escrita uma vez, no bloco "${MARCADORES.grupo}". Se um grupo, depois do Passo 1, fica com só 1 membro sobrevivente, essa candidata deixa de ser "grupo" — escreve-a no formato individual completo (ver formato exacto na secção "${SECCAO_TITULOS.candidataForaDaLista}"), sem bloco "${MARCADORES.grupo}". Candidatas sem grupo (assinatura própria, nenhuma outra a ≤1 tipo de distância) mantêm sempre o formato individual completo.
Nunca escolhas só pela contagem de camadas (convergência) — usa sempre a soma de pesos para ordenar.
Antes de qualquer bloco "${MARCADORES.grupo}" ou "${MARCADORES.candidata}", escreve OBRIGATORIAMENTE um bloco único "${MARCADORES.seleccaoCandidatas}" (machine-readable, nunca omitido), explicando em prosa curta: (a) a que dom já nomeado em "${SECCAO_TITULOS.quemE}" cada candidata que passou o Passo 1 se liga, (b) quais candidatas da pool completa (nomeia-as pelo nome, com a sua soma de pesos) reprovaram o Passo 1 e porquê, (c) como as que passaram ficaram agrupadas — que grupos, com que nomes, e quais ficaram individuais. Este bloco nunca aparece no relatório entregue ao cliente — é só para auditoria interna do raciocínio.`;

export const INSTRUCAO_ABERTURA_CANDIDATAS = `CANDIDATA FORA DA LISTA — LIGAÇÃO OBRIGATÓRIA A DOM JÁ NOMEADO: antes de qualquer menção às camadas técnicas (Atmakaraka, eixo do rendimento, sinais estruturados, etc.), cada candidata INDIVIDUAL (sem grupo) DEVE abrir com uma frase que a ligue explicitamente a um dom ou traço já nomeado na secção "${SECCAO_TITULOS.quemE}" deste mesmo relatório.
Padrão obrigatório: "Isto liga-se directamente a [nome do dom/traço já nomeado em ${SECCAO_TITULOS.quemE}, citado quase literalmente] que já foi nomeado acima — é essa mesma força aplicada a um território concreto."
Só depois desta frase é que o texto pode introduzir as camadas técnicas de convergência.
GRUPOS (correcção do especialista — agrupamento por cluster): quando várias candidatas partilham bloco "${MARCADORES.grupo}", esta ligação a um dom já nomeado é feita UMA VEZ no bloco "${MARCADORES.grupo}" (a convergência de base do grupo inteiro nasce desse dom) — os blocos "${MARCADORES.candidata}" dentro do grupo NÃO repetem a frase de abertura, vão directos à diferenciação específica de cada uma.
Obrigatório em todas as candidatas apresentadas, individuais ou em grupo (uma vez por grupo, uma vez por individual), sem excepção — nunca omitir só porque a pool tem muitas candidatas.`;

// TAREFA #38 (correcção do especialista, sistema em dois níveis) —
// dados técnicos: cada candidata fora da lista chega com "Nível 1" ou
// "Nível 2" (ver blocoCatalogoVocacional acima). Sem esta instrução, o
// LLM trataria as duas com a mesma confiança, porque ambas passam o
// limiar de ≥4 camadas — mas ≥4 camadas com Atmakaraka/Amatyakaraka
// sozinho (Nível 2) é um sinal genuíno e mais fraco do que ≥4 camadas
// com o planeta de maior peso (Nível 1), pelo mesmo princípio já usado
// para yogas (INSTRUCAO_YOGAS: "confirmação directa" vs "reforço
// geral") e para a ESCALA DE CONFIANÇA geral do relatório (nº de
// camadas ↔ força da linguagem) — aqui aplicado dentro da própria
// categoria "≥4 camadas", que a escala geral trata sempre como
// "convergência forte, sem reserva".
export const INSTRUCAO_NIVEL_CANDIDATAS = `NÍVEL DE CONFIANÇA DA CANDIDATA FORA DA LISTA — cada candidata vem marcada nos dados técnicos como "Nível 1" ou "Nível 2". Nunca as escrevas com a mesma confiança:
· Nível 1 (inclui o planeta de maior peso): escreve com confiança plena, sem qualquer qualificador — é a peça mais forte do perfil a confirmar esta direcção.
· Nível 2 (âncora pessoal — Atmakaraka, Amatyakaraka, Stellium, ou Regente de casa dignificado — mas sem o planeta de maior peso): é um sinal real, nunca inventado — mas mais específico e menos robusto do que Nível 1. A frase tem de o dizer, com linguagem como "há aqui um fio que vale a pena puxar" / "não é o sinal mais forte do perfil, mas é genuíno e específico" / "vale explorar, sem ser ainda uma certeza estrutural". PROIBIDO escrever uma candidata Nível 2 com a mesma linguagem sem reserva de "o seu perfil sustenta X com clareza" que a escala de confiança geral reserva para convergência forte — aqui a convergência existe, mas a sua origem (um indicador pessoal específico, não o planeta mais forte da carta) pede a reserva.
Nunca omitir nem suavizar a diferença chamando as duas de "candidata" sem mais nada — o nível tem de ser audível na frase, não só presente nos dados.
GRUPOS COM NÍVEIS MISTOS (correcção do especialista — agrupamento por cluster): um grupo pode ter membros de Nível 1 e Nível 2 ao mesmo tempo (a convergência de base é quase idêntica, mas o indicador pessoal que ancora cada destino pode ser diferente). O bloco "${MARCADORES.grupo}" nunca assume um nível único para o grupo inteiro — a linguagem de confiança (plena ou com reserva) é sempre decidida dentro do bloco "${MARCADORES.candidata}" de cada membro, de acordo com o Nível PRÓPRIO dessa candidata.`;

// CORRECÇÃO 1 (correcção do especialista, confirmada com 3 relatórios
// reais) — a versão anterior ("TEM de incluir... este traço é
// estrutural...") já era obrigatória em teoria, mas deixava a frase
// exacta ao critério do LLM; nos 3 relatórios reais revistos, Vargottama
// nunca apareceu apesar de estar calculado (confirmado por diagnóstico:
// tanto esta instrução como os dados "-- Vargottama --" chegam ao prompt
// real, ver relatório da ronda). Versão mais directiva: um padrão de
// frase quase literal, não uma paráfrase livre. "Carta" substituído por
// "perfil" no texto pedido — a palavra "carta" está proibida em todo o
// relatório desde uma correcção anterior (TAREFA 3D).
export const INSTRUCAO_VARGOTTAMA = `VARGOTTAMA — INSTRUÇÃO OBRIGATÓRIA: se existe planeta Vargottama, a secção "${SECCAO_TITULOS.quemE}" DEVE conter uma frase com este padrão exacto: "[Nome do planeta em português] é o traço mais estável deste perfil — aparece com a mesma força em duas dimensões independentes do perfil, o que significa que não muda com as circunstâncias nem depende de esforço para existir." Esta frase é obrigatória. Se não existe planeta Vargottama, não mencionar.`;

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
  /** 4 camadas técnicas (correcção do especialista) — avastha/conjunções/Vargottama vêm todos de `d1` (já calculados por `computeD1Table`, nunca recalculados aqui); `yogas` vem de `detectYogas(d1)`, já filtrado pelo chamador (sem os hits `neechabhanga_*`, ver `blocoYogas`). */
  d1: D1TableResult,
  yogas: YogaHit[],
): string {
  const candidatas = candidatasDeclaradas(intake);

  return `
És um especialista em análise vocacional. Vais escrever um relatório personalizado para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Você tem..." / "O seu perfil sustenta...", nunca "Marte na casa X indica...").
- REGRA CRÍTICA DE TRATAMENTO: Usa SEMPRE "você" — nunca "tu", nunca "teu/tua", nunca "tens". Esta regra não tem excepção. Exemplos correctos: "você tem", "o seu perfil", "para si". Exemplos proibidos: "tu tens", "o teu perfil", "para ti".
- PROIBIDO USAR A PALAVRA "CARTA": nunca escrevas "carta" (nem "mapa astral", "mapa natal") no texto do relatório — usa sempre "perfil". Correcto: "o seu perfil sustenta X". Proibido: "a sua carta sustenta X".
- PROIBIDO: primeira pessoa do plural. Nunca escrever "identificámos", "vimos", "calculámos", "sabemos". O relatório fala só da pessoa. Correcto: "o perfil mostra", "os dados indicam". Proibido: "identificámos", "analisámos", "concluímos".
- Zero fatalismo. Nada é inevitável nem escrito em pedra.
- Nunca escrevas "deves ir para X" ou qualquer veredicto fechado. Apresenta o que o perfil sustenta e o que custa — a decisão é sempre da pessoa.
- Nunca uses o padrão genérico de coaching (identificar 3 exemplos, embrulhar num método, oferecer um serviço) sem ligar explicitamente a uma camada técnica calculada abaixo. Cada frase de conselho tem de ser rastreável a um facto técnico específico desta lista — nunca a generalidades sobre a profissão.
- REGRA ANTI-REPETIÇÃO (reforçada): Cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a MESMA CONCLUSÃO com palavras diferentes — mesmo que a frase literal seja nova. Se "você ganha pela voz" aparece em "O que o perfil sustenta", não pode voltar a ser demonstrado em "Leitura por opção" nem em "Candidata fora da lista". Cada secção só pode usar um facto técnico como prova se acrescenta algo genuinamente novo — um custo, uma tensão, uma especificidade. Se não acrescenta nada novo, a secção é curta e remete, nunca repete.
- PLANETAS FRACOS (peso < 0,9): Devem ser mencionados explicitamente — nunca deixar uma barra vermelha na tabela sem texto correspondente. Se o planeta mais ligado à comunicação (Mercúrio) tem peso fraco, e a tese central é "você ganha pela voz", essa tensão TEM de ser nomeada. Não é contradição — é honestidade. Exemplo correcto: "A sua estrutura aponta para comunicação, mas o canal comunicativo em si é o elo mais fraco do perfil — o que significa que esta competência precisa de ser construída, não é natural."
- ÁREA ACTUAL DA PESSOA: Nunca tratar como dado morto. É o ponto de partida obrigatório de qualquer leitura. Perguntas que o texto deve responder: o que na área actual já serve o que o perfil pede? O que na área actual está a trabalhar contra? Que ponte existe entre o que já é e o que quer ser? A transição começa sempre de onde a pessoa está — nunca de zero. Quando a pessoa tem 5+ anos numa área, essa experiência é um activo real — não um obstáculo a ignorar. Nunca tratar a área actual como ponto de partida neutro — é capital acumulado, positivo ou negativo.
- IDEIA CONCRETA (ideiaConcreta): Quando a pessoa partilhou uma ideia concreta, usá-la para desdobrar a opção declarada — nunca tratar como contexto genérico. Se disse "consultoria SAP", o texto deve diferenciar: o perfil sustenta mais "SAP" ou mais "consultoria"? Sustenta o modelo independente ou o modelo de empresa? A ideia concreta é a oportunidade de ser específico — nunca desperdiçar.
- TENSÃO INTERNA: Sempre que dois sinais do perfil apontam em direcções diferentes, o texto É OBRIGADO a nomeá-lo. Nunca escolher só o lado bonito. Exemplos de tensões reais: tese central em "voz/comunicação" mas Mercúrio fraco — nomear. Modo de Ganho aponta para liderança pública mas Montra de Mercado aponta para bastidores — nomear. Missão de longo prazo mas período actual pede pausa — nomear. A tensão é informação, não ruído.
- O RELATÓRIO NÃO É PARA CONFIRMAR O QUE A PESSOA JÁ PENSA: é para mostrar o que o perfil vê — mesmo que contradiga as opções declaradas. Se o perfil aponta claramente para uma direcção que a pessoa não declarou, o motor tem de a nomear — não esperar que ela apareça nas opções. A "Candidata fora da lista" não é uma secção opcional — é o momento onde o relatório tem mais valor único. Se os dados convergem em 4 camadas para algo que a pessoa não viu, dizer isso com clareza é o trabalho.
- REGRA CRÍTICA — LEITURA CONJUNTA: Nunca ler um eixo isolado. Ordem obrigatória: 1. Atmakaraka — o que a pessoa é por dentro. 2. Karakamsha (signo + casa JUNTOS, sempre) — onde isso aterra. 3. Modo de Ganho — por onde entra o dinheiro, testado contra 1+2. 4. Planetas fracos — explicam o passado, apontam onde falta apoio. Só depois disto testado e amarrado é que se avalia a opção declarada.
- KARAKAMSHA — NUNCA ISOLADO: Atmakaraka casa 10 + Karakamsha casa 4 NÃO é contradição. É "autoridade que se constrói a partir de base própria, nunca dentro de estrutura alheia." Lidos juntos, os dois eixos dizem a mesma coisa com instrumentos diferentes.
- PLANETA FRACO + ÁREA ACTUAL: Se a área actual é governada por um planeta fraco (peso < 0,9), isso explica o porquê da insatisfação com precisão. É obrigatório nomear. EXEMPLO: Vénus fraca + estética = "passou anos no campo do planeta mais fraco do seu perfil — explica o desgaste, não invalida o talento."
- OPÇÃO DECLARADA — TRADUZIR SEMPRE: A opção que a pessoa declarou é o vocabulário que tinha à mão. SEMPRE traduzir: o que quis dizer, nos termos do perfil? "Quero ser consultora SAP" pode significar "quero ser autoridade que ensina e aconselha com nome próprio" — testar essa tradução, nunca aceitar a opção ao pé da letra.
- MAHADASHA — CLASSIFICAÇÃO E REGRA: O tom da Mahadasha actual ABRE a secção do plano, antes de qualquer data ou passo. Classificação: Ketu = dissolução/fecho ("prepare e feche, não colha"); Vénus = expansão/prazer/colheita ("avance, o ciclo favorece"); Sol = afirmação/autoridade ("afirme e visibilize"); Lua = emoção/fluxo/intuição ("siga o que sente, não o plano"); Marte = acção/lançamento/conflito ("avance com força e decisão"); Rahu = ambição/disrupção/ilusão ("risco real, oportunidade real"); Júpiter = crescimento/sabedoria/expansão ("expanda com intenção"); Saturno = estrutura/colheita lenta/responsabilidade ("construa devagar, vai durar"); Mercúrio = comunicação/adaptação/aprendizagem ("aprenda e comunique"). A colheita a sério só abre depois do fim da Mahadasha actual — sempre nomear essa data.
- MARCADORES OBRIGATÓRIOS (recapitulação — cada um já está descrito no lugar exacto onde vai abaixo, mas fica aqui reunido para nunca esquecer nenhum): antes de ${MARCADORES.identidade} "${MARCADORES.fraseAbertura} <frase de 10-15 palavras, poderosa e específica>"; dentro de cada bloco "### <opção>", antes do ponto 1: "${MARCADORES.insight} <frase de síntese em menos de 15 palavras>"; na secção "${SECCAO_TITULOS.candidataForaDaLista}", antes de qualquer "${MARCADORES.candidata}": "${MARCADORES.seleccaoCandidatas} <raciocínio da escolha entre a pool completa>" (só quando há pelo menos 1 candidata na pool). São machine-readable e obrigatórios — nunca omitir.
- COERÊNCIA COM OS VISUAIS: o relatório tem elementos visuais gerados automaticamente — gráfico de forças (7 planetas com pesos calculados), radar de competências (6 eixos), Roda da Vida (8 dimensões), tabela de tensões. O texto DEVE referenciar estes visuais quando relevante ("Como mostra o gráfico de forças...", "A sua roda de vida revela...", "O radar de competências confirma..."). NUNCA contradizer o que os visuais mostram — se um visual mostra um valor fraco, o texto não pode dizer que é forte.
- VALOR ALTO NUM ELEMENTO VISUAL NÃO É O TEMA CENTRAL DA VIDA (correcção do especialista): uma casa com valor alto no gráfico (Roda da Vida, Anexo) pode reflectir onde o planeta mais forte do perfil está fisicamente posicionado — não necessariamente o tema mais importante da vida da pessoa. O tema central é determinado pelo Eixo da Missão e pelo Modo de Ganho, nunca pelo valor mais alto da roda. Exemplo: se "Saúde/Energia" ou "Como lida com obstáculos e o trabalho do dia a dia" (casa 6) aparecer com o valor mais alto de toda a Roda da Vida só porque o planeta mais forte do perfil está fisicamente aí, o texto nunca pode tratar essa área como o propósito central da pessoa — referencia o valor (é obrigatório, ver regra dos extremos), mas contextualiza-o como "onde a força física do perfil se concentra", nunca como substituto do Eixo da Missão/Modo de Ganho ao decidir do que este relatório trata.
- ESCALA DE CONFIANÇA (correcção do especialista, obrigatória em todo o relatório) — a linguagem usada tem de bater sempre com o nº de camadas que sustentam a afirmação, nunca mais confiante do que os dados permitem:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva. Ex.: "O seu perfil sustenta X com clareza."
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes. Ex.: "Dois sinais independentes apontam para X — o Eixo da Missão e o Modo de Ganho convergem aqui."
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto. Ex.: "Uma leitura possível deste perfil é X — não como facto, mas como direcção."
  · EM ABERTO (o perfil não distingue): diz isso directamente. Ex.: "O perfil não distingue entre X e Y — a decisão fica com você."
  Proibido usar linguagem de "Convergência forte" para algo que só tem um "Sinal forte" — o nível de confiança da frase tem de corresponder exactamente ao nível de convergência que a sustenta.
- ${INSTRUCAO_AVASTHAS}
- ${INSTRUCAO_CONJUNCOES}
- ${INSTRUCAO_YOGAS}
- ${INSTRUCAO_VARGOTTAMA}
- ${INSTRUCAO_CONSISTENCIA_TECNICA}
- ${INSTRUCAO_SELECCAO_CANDIDATAS}
- ${INSTRUCAO_ABERTURA_CANDIDATAS}
- ${INSTRUCAO_NIVEL_CANDIDATAS}
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
${blocoModoDeGanho(axes, pesosPlanetas)}

-- Montra de Mercado --
${blocoMontraMercado(axes)}

-- Peso de cada planeta (estado × SAV da casa / média do perfil) --
${blocoPesos(pesosPlanetas)}

Usa estes pesos para calibrar a força de cada afirmação:
· Peso ≥ 1,3: o perfil apoia com força — podes afirmar com clareza
· Peso 0,9 a 1,3: suporte moderado — afirma mas sem excesso de confiança
· Peso < 0,9: suporte fraco — diz isso com clareza, nunca escrevas com a mesma confiança sobre um planeta de peso 0,58 e um de 1,87
Nunca trates todos os planetas como equivalentes.

-- Avasthas (maturidade dos planetas) --
${blocoAvasthas(d1)}

-- Conjunções activas --
${blocoConjuncoes(d1)}

-- Yogas activos --
${blocoYogas(yogas)}

-- Vargottama --
${blocoVargottama(d1)}

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
    ? `A pessoa declarou estas opções (avalia TODAS, mesmo as que o perfil sustenta fracamente):\n${candidatas.map((c) => `- ${c}`).join("\n")}`
    : `A pessoa NÃO declarou opções concretas${intake.areasDestinoIncluiAindaNaoSei ? ' (escolheu "ainda não sei")' : ""}. Deriva até 3 candidatas plausíveis a partir do texto livre abaixo — se não conseguires nenhuma candidata clara, NÃO bloqueies o relatório: escreve a Secção 2 (o que o perfil sustenta, em geral) e resolve o relatório inteiro pela Secção 4 (candidata fora da lista). Texto livre disponível:`
}
${!candidatas.length ? [intake.paraOndeQuerIr && `"Para onde queres ir": ${normalizarTextoLivre(intake.paraOndeQuerIr)}`, intake.perguntaEspecifica && `Pergunta específica: ${normalizarTextoLivre(intake.perguntaEspecifica)}`, intake.ideiaConcreta && `Ideia concreta: ${normalizarTextoLivre(intake.ideiaConcreta)}`].filter(Boolean).join("\n") || "(nenhum texto livre preenchido — escreve só a partir do que o perfil sustenta em geral.)" : ""}
${intake.tipoMudanca.length ? `\nTipo de mudança que a pessoa diz querer (usa para calibrar a parte 4 de cada leitura — ex.: se inclui trabalhar por conta própria ou abrir negócio, responde explicitamente se o perfil sustenta trabalho a solo nessa opção): ${intake.tipoMudanca.join(", ")}.` : ""}
${intake.ideiaConcreta && candidatas.length ? `\nIdeia concreta partilhada (contexto adicional, não é uma opção à parte): ${normalizarTextoLivre(intake.ideiaConcreta)}` : ""}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 5 secções, por esta ordem ===

ANTES de ${MARCADORES.identidade}, escreve, numa linha própria: "${MARCADORES.fraseAbertura} " seguido de uma frase de 10 a 15 palavras que captura a essência deste perfil — poderosa, específica, nunca genérica. Não é um resumo. É a frase que a pessoa vai lembrar deste relatório. Exemplos do formato: "Saturno exaltado não pede que seja reconhecida — pede que construa algo que dure.", "A voz que ensina vale mais do que o cargo que ostenta." Proibido: clichés de coaching, frases genéricas de auto-ajuda. Este marcador é obrigatório e machine-readable, não o omitas.

DEPOIS de ${MARCADORES.fraseAbertura}, escreve, numa linha própria: "${MARCADORES.identidade} " seguido de uma frase de 8 a 12 palavras que descreve o que esta pessoa foi feita para ser — não o que perguntou, não a sua opção, mas a sua natureza estrutural. Deve ser específica deste perfil, nunca genérica. Exemplos do formato: "Autoridade que forma e transmite pelo exemplo directo", "Arquitecta de sistemas que comunica o que outros não conseguem ver". Proibido: "pessoa comunicativa", "líder nato", qualquer cliché de coaching. Este marcador é obrigatório e machine-readable, não o omitas.

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
- Um dom = um planeta com peso ≥ 1,3. Se nenhum planeta atingir 1,3, usa os dois planetas de maior peso do perfil (mesmo abaixo de 1,3) — nunca deixes esta secção sem dons.
- Cada dom cita o planeta + a casa + a dignidade, traduzidos para linguagem simples (nunca o nome técnico do planeta/casa/dignidade em jargão — mesma lista de termos proibidos de sempre). Nunca um adjectivo solto ("é comunicativa") sem estar rastreável a este dado técnico específico.
- A confiança da frase deve corresponder ao peso real (um peso de 1,8 não se escreve com a mesma força que um de 1,32 — ver ESCALA DE CONFIANÇA acima).

LIMITAÇÕES — 1 a 2 linhas "${MARCADORES.limitacao} <frase>", obrigatório:
- Uma limitação = um planeta com peso < 0,9.
- Frase PRÓPRIA e ESPECÍFICA para cada planeta fraco — PROIBIDO repetir a mesma frase genérica para planetas diferentes. Cada planeta tem uma implicação prática concreta, nunca genérica: Mercúrio fraco afecta a fluidez de explicar e ser entendida; Vénus fraca afecta o sentido de valor próprio e o à-vontade a cobrar; Lua fraca afecta a gestão emocional e a intuição em decisões; Marte fraco afecta a capacidade de agir com rapidez e decisão; Sol fraco afecta a afirmação pública da identidade profissional; Júpiter fraco afecta a expansão/crescimento (custa mais do que para outros); Saturno fraco afecta a estrutura e a disciplina de longo prazo (precisa de sistemas externos). Usa estas implicações como ponto de partida, nunca como frase a copiar literalmente duas vezes.
- REGRA DE NÃO-DUPLICAÇÃO: o relatório já tem, mais abaixo, uma tabela determinística ("Onde o perfil tem atrito") com a implicação prática detalhada de CADA planeta fraco. Se vais nomear aqui um planeta fraco que essa tabela já desenvolve, NÃO repitas a explicação inteira — uma frase curta que o nomeia e remete (ex.: "Vénus, a área mais fraca do perfil, aparece desenvolvida mais à frente") chega; o desenvolvimento completo fica só na tabela.

O QUE VALORIZA — sempre com conteúdo real (nunca omitir, mesmo quando Vénus é a camada mais fraca do perfil — "o que valoriza" nunca fica só como um número solto no gráfico de pesos, sem explicação no texto): um parágrafo curto, sem marcador, sobre o que esta pessoa genuinamente valoriza, ancorado em Vénus e nos dons/limitações já nomeados.

ELEMENTOS E MODALIDADES (correcção do especialista): o elemento dominante revela como a pessoa processa e actua no mundo. A modalidade dominante revela o seu ritmo natural de mudança. Usa estes dados para enriquecer o retrato de personalidade nesta secção — não como lista, mas integrados na narrativa dos dons/limitações já escritos, nunca como parágrafo à parte só sobre elementos.

ASPECTOS ENTRE PLANETAS PESSOAIS (correcção do especialista): os aspectos revelam tensões e harmonias internas. Nomeia os aspectos mais relevantes (especialmente quadraturas e oposições, ver "-- Aspectos principais --" acima) como parte das limitações ou tensões internas do perfil — nunca como secção nova, sempre integrados onde já estás a nomear dons/limitações/tensões.

Termina a secção com uma linha "${MARCADORES.sinteseQuemE} <frase>" — uma frase compacta que resume: quem é, o que a move, o que a trava, onde rende mais, onde rende menos. Nunca introduzas aqui um facto novo que não vá aparecer depois no corpo do relatório — é síntese do que já foi dito, não uma antecipação de algo só explicado mais tarde.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções declaradas.

## ${SECCAO_TITULOS.leituraPorOpcao}
Para CADA opção candidata (declarada ou derivada), este formato EXACTO, por esta ordem — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios e machine-readable, não os omitas nem os traduzas:

### <nome exacto da opção, tal como foi declarada ou derivada>
${MARCADORES.forca} <forte, moderada ou fraca — forte se ≥2 fontes independentes fortes convergem, moderada se há suporte real mas não forte, fraca se só um sinal fraco isolado sustenta a opção>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras — específica deste perfil, nunca genérica. Obrigatório e machine-readable, não o omitas.>
1. O que o perfil sustenta nesta opção. Para dizer que o perfil sustenta uma opção, cita pelo menos duas fontes independentes (Eixo da Missão, Modo de Ganho, peso de planeta, Montra de Mercado). Uma opção sustentada por um único sinal fraco não é sustentada — diz isso, e usa "${MARCADORES.forca} fraca" nesse caso.
2. O que esta opção lhe vai custar (o custo específico DESTE perfil nesta escolha, nunca o risco genérico da profissão).
3. O que esta opção pede e que falta actualmente — e se é algo que se aprende ou algo que não muda.
4. Onde entra a matéria desta pessoa nesta opção — nunca o sector como resposta, sempre a forma/função (usa o Modo de Ganho para decidir se entra pela voz, pela resolução directa, ou pela liderança/execução pública).

Repete o bloco "### <nome> / ${MARCADORES.forca} / ${MARCADORES.insight} / 1. / 2. / 3. / 4." para cada opção candidata, uma a seguir à outra.

## ${SECCAO_TITULOS.candidataForaDaLista}
As candidatas elegíveis já vêm calculadas deterministicamente na secção "Candidatas do catálogo" acima — a POOL COMPLETA, SEM LIMITE nenhum. NÃO calcules a tua própria convergência, NÃO inventes nenhuma candidata diferente das listadas lá. A tua tarefa nesta secção é APRESENTAR TODAS as candidatas da pool que passam o Passo 1 — ligação narrativa a um dom já nomeado (ver INSTRUCAO_SELECCAO_CANDIDATAS) —, agrupando as que partilham convergência de base quase idêntica (Passo 3, mesma instrução), e escrever o bloco de raciocínio obrigatório antes delas. Nunca "escolher até 3" — isso já não é a regra.

Se essa secção diz "nenhuma", a primeira e única linha é "${MARCADORES.candidata} nenhuma" — "o seu perfil não aponta a nada fora do que já pensava" é uma resposta válida e completa, não a evites. Não é preciso bloco de raciocínio quando não há nenhuma candidata na pool.

Se essa secção lista 1 ou mais candidatas, primeiro escreve o bloco único "${MARCADORES.seleccaoCandidatas}" (ver INSTRUCAO_SELECCAO_CANDIDATAS para o conteúdo exacto exigido). Depois, para cada candidata que passou o Passo 1, um de dois formatos — nunca misturar os dois para a mesma candidata:

FORMATO INDIVIDUAL (candidata sem grupo, ou grupo reduzido a 1 sobrevivente depois do Passo 1) — igual ao formato já usado antes desta correcção: "${MARCADORES.candidata} <nome exacto>" seguido do texto explicativo COMPLETO dessa candidata (ligação ao dom, camadas, via concreta, prós/contras), usando só as camadas exactas já listadas para ela na pool (nunca inventes camadas novas nem omitas as que vêm calculadas).

FORMATO DE GRUPO (2 ou mais candidatas da secção "Grupos de candidatas" acima que passaram o Passo 1) — "${MARCADORES.grupo} <nome1>; <nome2>; <nome3 ...>" (os nomes exactos dos membros deste grupo que passaram o Passo 1, separados por ";", pela ordem em que os blocos "${MARCADORES.candidata}" a seguir vão aparecer) seguido do texto da convergência astrológica de base PARTILHADA por todo o grupo — o que estas candidatas têm em comum, escrito UMA SÓ VEZ. Logo a seguir, um bloco "${MARCADORES.candidata} <nome exacto>" por cada membro listado no "${MARCADORES.grupo}", nesta ordem, cada um com só a sua diferenciação específica (2-4 linhas: porquê esta e não as outras do mesmo grupo, a via concreta dela, prós e contras específicos) — NUNCA repetir a convergência de base já escrita no bloco "${MARCADORES.grupo}".

Repete este padrão (individual ou de grupo) para toda a pool que passou o Passo 1 — nunca pares a meio, nunca omitas uma candidata elegível para "não alongar a secção". A ordem de aparição dos grupos/individuais no texto segue o Passo 2 (soma de pesos) — a ordem NÃO é ranking (ver regra abaixo).

VIA CONCRETA (correcção do especialista, TAREFA 3): cada candidata da pool tem um bloco próprio "-- Via concreta para <nome> --" na secção "Candidatas do catálogo" acima, com o tipo de formação, a certificação profissional, como se entra, e o tempo médio até trabalhar na área. Cita esta informação no texto de CADA candidata apresentada (individual ou dentro de um grupo) — nunca a omitas, nunca a inventes, nunca nomeies uma entidade concreta (nem "a escola", nem uma ordem profissional pelo nome) mesmo que o dado bruto pareça convidar a isso.

REGRA ABSOLUTA — SEM RANKING ENTRE CANDIDATAS (correcção do especialista, estendida ao agrupamento por cluster): candidatas e grupos apresentam-se sempre em PÉ DE IGUALDADE — nunca entre si, nem dentro do mesmo grupo. PROIBIDO: "1ª escolha", "2ª escolha", "a mais forte", "a mais provável", "em primeiro lugar", qualquer numeração ordinal, ou tratar uma candidata/grupo como "menção honrosa"/"nota à parte"/de segunda categoria. Dentro de um grupo, "porquê esta e não as outras" (a diferenciação pedida) é sobre ENCAIXE (que via concreta serve melhor esta pessoa), nunca sobre qual candidata é "melhor" ou "mais forte" do que a outra — todas no grupo já convergem com a mesma força de base, só a via difere. Cada candidata/grupo tem a sua própria justificação, completa e independente das outras — a comparação entre candidatas da pool só acontece dentro do bloco "${MARCADORES.seleccaoCandidatas}", nunca no texto visível ao cliente.

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA (correcção do especialista): PROIBIDO nomear qualquer candidata, mesmo como pista abaixo do limiar, sem que venha explicitamente da secção "Candidatas do catálogo" acima. Se nenhuma candidata do catálogo atingiu ≥4 camadas, a resposta é "${MARCADORES.candidata} nenhuma" — explica honestamente que o perfil não aponta a nada fora do que já foi pensado. NUNCA preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos. Exemplo do que NÃO fazer: sugerir "engenharia, auditoria, saúde pública" por associação livre a "Saturno = estrutura/rigor" — essas profissões não vieram do catálogo, vieram de associação livre; isto é invenção, não leitura, e é exactamente o que esta regra proíbe.

## ${SECCAO_TITULOS.oPlano}
Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima) — antes de qualquer data ou passo. Usa as datas reais dessa secção (nunca datas inventadas). Escreve o corpo do plano livremente, e destaca o primeiro passo accionável para esta semana numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " (obrigatório, machine-readable, não o omitas) — ex.: "${MARCADORES.primeiroPasso} Contacte duas pessoas que já fazem consultoria a solo e pergunte-lhes o que ninguém conta sobre o primeiro ano." Nunca um plano genérico de 90 dias sem ligação às datas calculadas.

HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, afirmações com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo, nunca como previsão. A Mahadasha até ao fim do seu ciclo é contexto, não calendário.
`.trim();
}
