// Redesenho do motor VocationIQ, Parte 2 — integração do catálogo
// vocacional (183 destinos + índices por planeta/nakshatra/combinação +
// índice inverso), lido a partir de SPEC-vocacional.md/SPEC-espinha.md/
// ESTADO-catalogo-vocacional.md (todos em src/data/vocacional/).
//
// PRINCÍPIO NUNCA VIOLADO (SPEC-vocacional.md): "o catálogo deixa de
// escolher, passa a descrever." Nenhuma função aqui produz um ranking
// para mostrar ao cliente — `convergencia` é uma CONTAGEM de camadas
// independentes (mesmo método de SPEC-espinha.md, adaptado às camadas
// que este motor consegue medir de facto — ver DESVIO abaixo), usada só
// para decidir se uma "candidata fora da lista" é válida (≥4), nunca
// para ordenar ou "escolher o vencedor" entre os destinos da área
// actual ou as alternativas da carta.
//
// DESVIO (camadas) — SPEC-espinha.md define 9 camadas possíveis (D-1
// sideral, tropical, D-2/D-3/D-4/D-9/D-10/D-24, Sarvashtakavarga,
// arudhas, regência funcional, karakas, períodos, yogas), máximo teórico
// 14. Este motor não calcula D-2/D-3/D-4/D-24 nem arudhas múltiplas
// (só a Arudha Lagna) — inventar essas camadas violaria "não inventar".
// As camadas usadas aqui são as que o catálogo e o motor conseguem medir
// de facto, cada uma de um sistema distinto (karakas via índice de
// planetas, D-9 via nakshatra, combinação via índice de combinações,
// regência funcional via eixo do rendimento, sinais estruturados do
// índice inverso, e as duas camadas declaradas — área actual e ideia
// concreta, que não são medidas astrológicas mas são claramente
// independentes de todas as outras).

import catalogoDestinosJson from "../data/vocacional/catalogo-destinos.json";
import catalogoIndicePlanetasJson from "../data/vocacional/catalogo-indice-planetas.json";
import catalogoIndiceNakshatrasJson from "../data/vocacional/catalogo-indice-nakshatras.json";
import catalogoIndiceCombinacoesJson from "../data/vocacional/catalogo-indice-combinacoes.json";
import catalogoIndiceInversoJson from "../data/vocacional/catalogo-indice-inverso.json";
import catalogoIndiceCasasJson from "../data/vocacional/catalogo-indice-casas.json";
import catalogoRaridadeJson from "../data/vocacional/catalogo-raridade.json";

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta } from "./pesosPlanetas";
import type { SavPorCasa } from "./pesosPlanetas";
import type { ClassicalGraha, Graha } from "../lifeReport/types";
import type { NakshatraName } from "../astrology/nakshatra";

// ---------- Formas mínimas do catálogo (só os campos que este módulo lê) ----------

interface DestinoCatalogo {
  camada: "superior" | "tecnico" | "fora";
  labels: { PT: string };
}
const catalogoDestinos = catalogoDestinosJson.destinos as unknown as Record<string, DestinoCatalogo>;

interface EntradaPlaneta {
  destinos: { superior?: string[]; tecnico?: string[]; fora?: string[] };
}
const catalogoIndicePlanetas = catalogoIndicePlanetasJson.planetas as unknown as Record<string, EntradaPlaneta>;

interface EntradaNakshatra {
  destinos: string[];
}
const catalogoIndiceNakshatras = catalogoIndiceNakshatrasJson.nakshatras as unknown as Record<string, EntradaNakshatra>;

interface EntradaCombinacao {
  par: [string, string];
  destinos: string[];
}
const catalogoIndiceCombinacoes = catalogoIndiceCombinacoesJson.combinacoes as unknown as EntradaCombinacao[];

interface SinalExigido {
  tipo: "planeta_forte" | "planeta_funcional" | "casa_activa" | "combinacao";
  valores: unknown;
  modo: string;
}
interface EntradaAreaInversa {
  area: string;
  label: string;
  destinos: string[];
  sinais_exigidos: SinalExigido[];
}
const catalogoIndiceInverso = catalogoIndiceInversoJson.indice_inverso as unknown as EntradaAreaInversa[];

/** Correcção do especialista (TAREFA 4a) — as 5 leituras curadas de "eixo_do_rendimento" (catalogo-indice-inverso.json), nunca lidas pelo motor antes desta correcção. */
interface EntradaEixoRendimento {
  condicao: string;
  leitura: string;
  regra_de_escrita?: string;
}
const eixoDoRendimento = catalogoIndiceInversoJson.eixo_do_rendimento as unknown as EntradaEixoRendimento[];

// ---------- Normalização de nomes (catálogo usa nomes em pt-PT minúsculos) ----------

const PLANETA_PT_PARA_GRAHA: Record<string, Graha> = {
  sol: "Sun",
  lua: "Moon",
  marte: "Mars",
  mercurio: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturno: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};
const GRAHA_PARA_PLANETA_PT: Record<string, string> = Object.fromEntries(Object.entries(PLANETA_PT_PARA_GRAHA).map(([pt, g]) => [g, pt]));

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function nakshatraParaChave(nome: NakshatraName): string {
  return normalizar(nome).replace(/\s+/g, "_");
}

const PALAVRAS_PARAGEM = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com", "a", "o", "as", "os", "um", "uma", "que", "no", "na", "por", "sua", "seu"]);

/** Palavras com 4+ caracteres, sem preposições/artigos — usadas para casar texto livre contra os destinos do catálogo. */
function palavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_PARAGEM.has(p));
}

/** Procura destinos do catálogo cujo id ou nome (PT) partilhe uma palavra significativa com o texto dado. Nunca escolhe "o melhor" — devolve todos os que batem. */
function buscarDestinosPorTexto(texto: string): string[] {
  const palavras = palavrasSignificativas(texto);
  if (!palavras.length) return [];
  const encontrados: string[] = [];
  for (const [id, destino] of Object.entries(catalogoDestinos)) {
    const alvo = normalizar(`${id} ${destino.labels.PT}`);
    if (palavras.some((p) => alvo.includes(p))) encontrados.push(id);
  }
  return encontrados;
}

function pesoDe(pesos: PesoPlaneta[], planetaPtOuGraha: string): number | undefined {
  const graha = PLANETA_PT_PARA_GRAHA[planetaPtOuGraha] ?? planetaPtOuGraha;
  return pesos.find((p) => p.planeta === graha)?.peso;
}

function casaDe(pesos: PesoPlaneta[], graha: string): number | undefined {
  return pesos.find((p) => p.planeta === graha)?.casa;
}

function destinosDoPlaneta(graha: Graha): string[] {
  const entrada = catalogoIndicePlanetas[GRAHA_PARA_PLANETA_PT[graha] ?? graha.toLowerCase()];
  if (!entrada) return [];
  return [...(entrada.destinos.superior ?? []), ...(entrada.destinos.tecnico ?? []), ...(entrada.destinos.fora ?? [])];
}

// ---------- Avaliação de sinais do índice inverso (só para as 8 áreas tabeladas) ----------

function avaliarSinal(sinal: SinalExigido, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[]): boolean {
  if (sinal.tipo === "planeta_forte") {
    const valores = sinal.valores as string[];
    const testados = valores.map((v) => pesoDe(pesos, v) ?? 0);
    return sinal.modo === "qualquer" ? testados.some((p) => p >= 1.3) : testados.every((p) => p >= 1.3);
  }
  if (sinal.tipo === "planeta_funcional") {
    const valores = sinal.valores as string[];
    const testados = valores.map((v) => pesoDe(pesos, v) ?? 0);
    return sinal.modo === "obrigatorio" ? testados.every((p) => p >= 0.9) : testados.some((p) => p >= 0.9);
  }
  if (sinal.tipo === "casa_activa") {
    const casas = (sinal.valores as string[]).map(Number);
    const algumaForte = casas.some((c) => savPorCasa.find((h) => h.casa === c)?.classificacao === "forte");
    const algumPlanetaForte = casas.some((c) => pesos.some((p) => p.casa === c && p.peso >= 1.3));
    return algumaForte || algumPlanetaForte;
  }
  if (sinal.tipo === "combinacao") {
    const pares = sinal.valores as string[][];
    return pares.some(([a, b]) => {
      const casaA = casaDe(pesos, PLANETA_PT_PARA_GRAHA[a] ?? a);
      const casaB = casaDe(pesos, PLANETA_PT_PARA_GRAHA[b] ?? b);
      return casaA !== undefined && casaA === casaB;
    });
  }
  return false;
}

/** Uma área do índice inverso "confirma" se pelo menos um dos seus sinais exigidos disparar — conta como UMA camada ("area_tabelada"), não uma por sinal (mesmo tipo de sinal em posições diferentes não infla a contagem). */
function areaTabeladaConfirma(area: EntradaAreaInversa, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[]): boolean {
  return area.sinais_exigidos.some((s) => avaliarSinal(s, pesos, savPorCasa));
}

// ---------- Eixo do rendimento (TAREFA 4a) ----------

/** `regentesCasas[casaRegente]` está fisicamente sentado na `casaAlvo`. */
function regenteEstaNaCasa(axes: VocationIQAxes, pesos: PesoPlaneta[], casaRegente: number, casaAlvo: number): boolean {
  return casaDe(pesos, axes.regentesCasas[casaRegente]) === casaAlvo;
}

/** `a` lança Drishti (aspecto) sobre a casa onde `b` está, ou vice-versa — "ligação" por aspecto, nunca por proximidade de signo. A ocupação mútua de casa (regente de uma na casa da outra) é testada à parte por `regenteEstaNaCasa`, chamada directamente onde relevante — nunca duplicada aqui. */
function planetasLigados(axes: VocationIQAxes, pesos: PesoPlaneta[], a: ClassicalGraha, b: ClassicalGraha): boolean {
  if (a === b) return true;
  const casaA = casaDe(pesos, a);
  const casaB = casaDe(pesos, b);
  const aAspectaB = casaB !== undefined && (axes.drishtiEmitidoPorPlaneta[a] ?? []).includes(casaB);
  const bAspectaA = casaA !== undefined && (axes.drishtiEmitidoPorPlaneta[b] ?? []).includes(casaA);
  return aAspectaB || bAspectaA;
}

function pesoDoPlaneta(pesos: PesoPlaneta[], graha: ClassicalGraha): number {
  return pesos.find((p) => p.planeta === graha)?.peso ?? 0;
}

export interface NotaEixoRendimento {
  leitura: string;
  regraDeEscrita?: string;
}

/**
 * Avalia as 5 condições de "eixo_do_rendimento" (catalogo-indice-inverso.json)
 * — texto curado em prosa, não uma gramática genérica como
 * `sinais_exigidos`, por isso cada condição é interpretada explicitamente
 * (nunca um parser de string) contra `axes.regentesCasas`/
 * `axes.drishtiEmitidoPorPlaneta`. Devolve, para cada condição activa, os
 * planetas envolvidos (para creditar camadas aos destinos certos — ver
 * `camadasParaDestino`) e a nota (para o prompt, quando a condição não é
 * "apontável" a um destino específico — caso da condição 5).
 */
function avaliarEixoDoRendimento(axes: VocationIQAxes, pesos: PesoPlaneta[]): { planetas: ClassicalGraha[]; nota: NotaEixoRendimento }[] {
  const ativas: { planetas: ClassicalGraha[]; nota: NotaEixoRendimento }[] = [];
  const BENEFICOS: ClassicalGraha[] = ["Jupiter", "Venus", "Moon"];
  const regente2 = axes.regentesCasas[2];
  const regente10 = axes.regentesCasas[10];
  const regente11 = axes.regentesCasas[11];

  // 1. "regente da 2 ligado ao regente da 10" — ocupação mútua OU aspecto.
  const ligacao2e10 =
    regente2 === regente10 || regenteEstaNaCasa(axes, pesos, 2, 10) || regenteEstaNaCasa(axes, pesos, 10, 2) || planetasLigados(axes, pesos, regente2, regente10);
  if (ligacao2e10) ativas.push({ planetas: [regente2, regente10], nota: { leitura: eixoDoRendimento[0].leitura } });

  // 2. "regente da 11 forte, ou benéficos na 11"
  const regente11Forte = pesoDoPlaneta(pesos, regente11) >= 1.3;
  const beneficoNa11 = BENEFICOS.some((b) => casaDe(pesos, b) === 11);
  if (regente11Forte || beneficoNa11) ativas.push({ planetas: [regente11, ...BENEFICOS], nota: { leitura: eixoDoRendimento[1].leitura } });

  // 3. "regente da 2 na 6"
  if (regenteEstaNaCasa(axes, pesos, 2, 6)) ativas.push({ planetas: [regente2], nota: { leitura: eixoDoRendimento[2].leitura } });

  // 4. "regente da 2 ou da 11 ligado a Vénus ou Júpiter"
  const ligadoAVenusOuJupiter = (["Venus", "Jupiter"] as ClassicalGraha[]).some((p) => regente2 === p || regente11 === p || planetasLigados(axes, pesos, regente2, p) || planetasLigados(axes, pesos, regente11, p));
  if (ligadoAVenusOuJupiter) ativas.push({ planetas: [regente2, regente11, "Venus", "Jupiter"], nota: { leitura: eixoDoRendimento[3].leitura } });

  // 5. "casas 2 e 11 sem ligação à 10" — nota estrutural, nunca aponta para um destino específico (ver regra_de_escrita: "nunca como condenação").
  const regente2LigadoA10 = regente2 === regente10 || regenteEstaNaCasa(axes, pesos, 2, 10) || regenteEstaNaCasa(axes, pesos, 10, 2) || planetasLigados(axes, pesos, regente2, regente10);
  const regente11LigadoA10 = regente11 === regente10 || regenteEstaNaCasa(axes, pesos, 11, 10) || regenteEstaNaCasa(axes, pesos, 10, 11) || planetasLigados(axes, pesos, regente11, regente10);
  if (!regente2LigadoA10 && !regente11LigadoA10) {
    ativas.push({ planetas: [], nota: { leitura: eixoDoRendimento[4].leitura, regraDeEscrita: eixoDoRendimento[4].regra_de_escrita } });
  }

  return ativas;
}

// ---------- Casa temática forte (correcção do especialista) ----------

/**
 * Correcção do especialista — `catalogo-indice-casas.json`: cada uma das
 * 12 casas liga directamente a um cluster de destinos curado
 * (`catalogo-destinos.json`), independente de quem a rege nesta carta
 * específica. Substitui o mecanismo anterior (via `destinosDoPlaneta` do
 * regente) — antes, "casa temática forte" só conseguia apontar para os
 * destinos já indexados sob o PLANETA regente (ex.: Saturno nunca aponta
 * para ensino/dharma, por mais forte que a casa 9 seja); agora aponta
 * directamente para o TEMA da casa em si.
 */
interface EntradaCasaTematica {
  tema: string;
  destinos: string[];
}
const catalogoIndiceCasas = catalogoIndiceCasasJson.casas as unknown as Record<string, EntradaCasaTematica>;

/** `raridade(destino) = log(total_de_fontes / nº_de_fontes_que_o_nomeiam)` (SPEC-pontuacao-catalogo.md) — maior valor = mais raro (nomeado por menos fontes). Usado só no 3º critério de desempate entre candidatas (ver `escolherMelhorCandidata`). */
const catalogoRaridade = catalogoRaridadeJson as unknown as Record<string, number>;

/** As 12 casas — todas têm tema atribuído em `catalogo-indice-casas.json`. Não é uma tabela de destinos em si — só a lista de quais casas avaliar; o cruzamento com o catálogo vem sempre de `catalogoIndiceCasas`. */
const CASAS_TEMATICAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Uma casa qualifica como "temática forte" com ≥2 dos 3 sinais internos
 * independentes pedidos — o 3º sinal ("regente do Ascendente nesta
 * casa") conta uma vez só mesmo que TANTO o regente védico COMO o
 * ocidental estejam lá (é um sinal, "o Ascendente está representado
 * aqui", não dois). `regenteAscendenteOcidental` é opcional — quando
 * ausente (chamador ainda não calculou o D1 ocidental), este sinal cai
 * de volta a testar só o regente védico.
 */
function casaTematicaForte(casa: number, axes: VocationIQAxes, pesos: PesoPlaneta[], regenteAscendenteOcidental?: ClassicalGraha): boolean {
  let sinais = 0;

  const regenteDaCasa = axes.regentesCasas[casa];
  if (pesoDoPlaneta(pesos, regenteDaCasa) >= 1.3) sinais += 1;

  if (axes.missionAxis.karakamshaHouse === casa) sinais += 1;

  const regenteAscVedico = axes.regentesCasas[1];
  const regenteAscVedicoNaCasa = casaDe(pesos, regenteAscVedico) === casa;
  const regenteAscOcidentalNaCasa = regenteAscendenteOcidental !== undefined && casaDe(pesos, regenteAscendenteOcidental) === casa;
  if (regenteAscVedicoNaCasa || regenteAscOcidentalNaCasa) sinais += 1;

  return sinais >= 2;
}

/** As casas temáticas que qualificam como "fortes" nesta carta — avaliado uma vez por pedido (nunca recalculado por destino), mesmo padrão de `avaliarEixoDoRendimento`. */
function avaliarCasasTematicasFortes(axes: VocationIQAxes, pesos: PesoPlaneta[], regenteAscendenteOcidental?: ClassicalGraha): number[] {
  return CASAS_TEMATICAS.filter((casa) => casaTematicaForte(casa, axes, pesos, regenteAscendenteOcidental));
}

// ---------- Camadas independentes por destino ----------

export interface AtmakarakaInfo {
  planeta: ClassicalGraha;
  nakshatra: NakshatraName;
}

interface ContextoAvaliacao {
  axes: VocationIQAxes;
  pesos: PesoPlaneta[];
  savPorCasa: SavPorCasa[];
  atmakarakaInfo: AtmakarakaInfo;
  palavrasAreaActual: string[];
  palavrasIdeiaConcreta: string[];
  /** Correcção do especialista (TAREFA 4a) — as condições de eixo_do_rendimento já avaliadas uma vez por pedido (nunca recalculadas por destino). */
  eixoDoRendimentoActivo: { planetas: ClassicalGraha[]; nota: NotaEixoRendimento }[];
  /** Correcção do especialista (Correcção 3) — as casas temáticas que qualificam como "fortes" nesta carta, já avaliadas uma vez por pedido. */
  casasTematicasFortes: number[];
  /** Correcção do especialista — o planeta com maior `peso_planeta` desta carta, usado (Correcção 2) como portão da candidata fora da lista em vez do Atmakaraka. */
  planetaDeMaiorPeso: ClassicalGraha;
}

/** Correcção do especialista (Correcção 2) — "peça mais forte da carta" ≠ Atmakaraka (posição técnica, maior grau) — é o planeta com maior `peso_planeta` (estado × SAV/média), a mesma força já usada em todo o resto do motor (Modo de Ganho, Roda da Vida, Radar). */
function planetaDeMaiorPeso(pesos: PesoPlaneta[]): ClassicalGraha {
  return pesos.reduce((a, b) => (b.peso > a.peso ? b : a)).planeta;
}

/** As camadas independentes que sustentam UM destino específico — nunca duas vezes o mesmo sistema (ver DESVIO no topo do ficheiro). */
function camadasParaDestino(destinoId: string, ctx: ContextoAvaliacao): string[] {
  const camadas: string[] = [];

  // Correcção do especialista (Correcção 2) — quando o Atmakaraka TAMBÉM
  // é o planeta de maior peso (mesmo planeta), a camada tem de citar
  // explicitamente "Planeta de maior peso" — é essa etiqueta, não
  // "Atmakaraka", que `catalogarDestinos` usa como portão da candidata
  // fora da lista. Nunca as duas camadas ao mesmo tempo para o mesmo
  // facto (violaria "nunca duas vezes o mesmo sistema").
  const atmakarakaEhTambemMaiorPeso = ctx.atmakarakaInfo.planeta === ctx.planetaDeMaiorPeso;
  if (destinosDoPlaneta(ctx.atmakarakaInfo.planeta).includes(destinoId)) {
    if (atmakarakaEhTambemMaiorPeso) {
      camadas.push(`Planeta de maior peso — também o Atmakaraka (${ctx.planetaDeMaiorPeso}, peso ${pesoDoPlaneta(ctx.pesos, ctx.planetaDeMaiorPeso).toFixed(2)}) aponta para este destino`);
    } else {
      camadas.push(`Atmakaraka (${ctx.atmakarakaInfo.planeta}) aponta para este destino`);
    }
  }
  if (destinosDoPlaneta(ctx.axes.amatyakaraka).includes(destinoId)) camadas.push(`Amatyakaraka (${ctx.axes.amatyakaraka}) aponta para este destino`);

  // Camada própria para o planeta de maior peso — portão da candidata
  // fora da lista (ver `catalogarDestinos`). Só entra aqui quando NÃO
  // coincide com o Atmakaraka (esse caso já foi coberto acima, com a
  // etiqueta certa, sem duplicar o facto).
  if (!atmakarakaEhTambemMaiorPeso && destinosDoPlaneta(ctx.planetaDeMaiorPeso).includes(destinoId)) {
    camadas.push(`Planeta de maior peso (${ctx.planetaDeMaiorPeso}, peso ${pesoDoPlaneta(ctx.pesos, ctx.planetaDeMaiorPeso).toFixed(2)}) aponta para este destino`);
  }

  const entradaNakshatra = catalogoIndiceNakshatras[nakshatraParaChave(ctx.atmakarakaInfo.nakshatra)];
  if (entradaNakshatra?.destinos.includes(destinoId)) camadas.push(`Nakshatra do Atmakaraka (${ctx.atmakarakaInfo.nakshatra}) aponta para este destino`);

  const combinacaoActiva = catalogoIndiceCombinacoes.find((c) => {
    const [a, b] = c.par.map((p) => PLANETA_PT_PARA_GRAHA[p] ?? p);
    const casaA = casaDe(ctx.pesos, a);
    const casaB = casaDe(ctx.pesos, b);
    return casaA !== undefined && casaA === casaB && c.destinos.includes(destinoId);
  });
  if (combinacaoActiva) camadas.push(`Combinação ${combinacaoActiva.par.join("+")} (mesma casa) aponta para este destino`);

  // Correcção do especialista (TAREFA 4b) — antes desta correcção, só o
  // 1º elemento de earningModeDominante (axes.earningMode.lord, singular)
  // era testado. Em co-dominância (dois Modos de Ganho empatados, ver
  // resolverEarningModeDominante em vocationIQ.ts) isto perdia metade do
  // sinal — testado com a carta real da Melina, cujo Modo de Ganho está
  // co-dominante (casa 2/Saturno e casa 10/Vénus): agora os DOIS lords são
  // testados, cada um podendo gerar a sua própria camada independente.
  for (const dominante of ctx.axes.earningModeDominante) {
    if (destinosDoPlaneta(dominante.lord).includes(destinoId)) {
      camadas.push(`Regente do Modo de Ganho dominante (${dominante.lord}, casa ${dominante.house}) — eixo do rendimento aponta para este destino`);
    }
  }

  // Correcção do especialista (TAREFA 4a, REIMPLEMENTADA) — as 5 leituras
  // curadas de "eixo_do_rendimento" (catalogo-indice-inverso.json), nunca
  // lidas antes da primeira versão desta correcção. A 1ª versão pecava por
  // dois lados, confirmados ao testar com a carta real da Melina: (1)
  // creditava uma camada POR CONDIÇÃO ACTIVA — condições 1 e 4 são factos
  // do NÍVEL DA CARTA (verdadeiro/falso uma vez só, nunca por destino), por
  // isso qualquer destino ligado a Vénus recebia sempre as MESMAS 3 linhas
  // ("Regente do Modo de Ganho" + as duas condições do eixo), inflando a
  // convergência ao contar o mesmo facto (Vénus forte) três vezes com
  // etiquetas diferentes — violava a regra do próprio ficheiro ("nunca
  // duas vezes o mesmo sistema"); (2) estas leituras entravam também em
  // `idsCarta` (ver `catalogarDestinos`), EXPANDINDO a lista de
  // alternativas em vez de só reforçar quem já lá estava — daí a lista ir
  // de 44 para 86 destinos para a Melina. Correcção: no máximo 1 camada de
  // eixo_do_rendimento por destino (`.find`, não um loop que acumula), e
  // esta camada só pode REFORÇAR um destino que já esteja na lista por
  // outra via — nunca entra em `idsCarta` (ver lá o comentário
  // correspondente). A condição 5 (mismatch) nunca aponta para um destino
  // específico, fica só como nota geral (`catalogarDestinos.notaEixoDoRendimento`).
  const condicaoEixoActiva = ctx.eixoDoRendimentoActivo.find((ativo) => ativo.planetas.length > 0 && ativo.planetas.some((p) => destinosDoPlaneta(p).includes(destinoId)));
  if (condicaoEixoActiva) {
    camadas.push(`Eixo do rendimento: ${condicaoEixoActiva.nota.leitura}`);
  }

  // Correcção do especialista — "casa temática forte": uma camada por
  // CASA que qualifica (≥2 sinais internos, ver `casaTematicaForte`) E
  // cujo CLUSTER TEMÁTICO (catalogo-indice-casas.json — independente de
  // quem rege a casa nesta carta) inclui este destino — nunca mais do que
  // 1 camada por casa (os sinais internos decidem SE a casa qualifica,
  // não quantas camadas ela dá), mas casas temáticas DIFERENTES que ambas
  // qualifiquem e apontem para o mesmo destino contam como camadas
  // independentes (o mesmo princípio já usado para co-dominância no Modo
  // de Ganho). Substitui a 1ª versão desta correcção (que usava
  // `destinosDoPlaneta(regente)` — por isso Saturno, regente forte da
  // casa 9 da Nádia, nunca conseguia apontar para ensino/dharma: o índice
  // de planetas nunca liga Saturno a esses destinos, só o índice de
  // casas, novo, o faz).
  for (const casa of ctx.casasTematicasFortes) {
    const entradaCasa = catalogoIndiceCasas[String(casa)];
    if (entradaCasa?.destinos.includes(destinoId)) {
      camadas.push(`Casa temática forte (casa ${casa}): ${entradaCasa.tema}`);
    }
  }

  const areaTabelada = catalogoIndiceInverso.find((a) => a.destinos.includes(destinoId));
  if (areaTabelada && areaTabeladaConfirma(areaTabelada, ctx.pesos, ctx.savPorCasa)) {
    camadas.push(`Sinais estruturados da área "${areaTabelada.label}" confirmam (índice inverso)`);
  }

  if (ctx.palavrasAreaActual.length) {
    const alvo = normalizar(`${destinoId} ${catalogoDestinos[destinoId]?.labels.PT ?? ""}`);
    if (ctx.palavrasAreaActual.some((p) => alvo.includes(p))) camadas.push("Área actual declarada (capital acumulado) aponta para este destino");
  }
  if (ctx.palavrasIdeiaConcreta.length) {
    const alvo = normalizar(`${destinoId} ${catalogoDestinos[destinoId]?.labels.PT ?? ""}`);
    if (ctx.palavrasIdeiaConcreta.some((p) => alvo.includes(p))) camadas.push("Ideia concreta partilhada aponta para este destino");
  }

  return camadas;
}

// ========================================================================
// REGRA PERMANENTE DE DESEMPATE ENTRE CANDIDATAS — aprovada pelo
// especialista. NÃO ALTERAR SEM APROVAÇÃO DO ESPECIALISTA.
//
// Quando mais do que uma candidata atinge ≥4 camadas e passa o portão do
// planeta de maior peso (ver `catalogarDestinos`), o desempate segue,
// nesta ordem, o primeiro critério que não empatar:
//
// 1º — soma dos pesos das camadas (peso do planeta que originou cada
//      camada, quando aplicável; 1,0 para camadas sem planeta específico
//      — ex.: "Casa temática forte", "Sinais estruturados da área").
// 2º — nº de subsistemas distintos entre as camadas: D-1/casa (posição
//      na carta natal), D-9/Karakamsha (via Nakshatra do Atmakaraka),
//      Dasha (período temporal — nenhuma camada actual usa este
//      subsistema, ver nota em `analisarCamada`), Índice do catálogo
//      (eixo do rendimento, área tabelada, área actual, ideia concreta).
// 3º — `catalogo-raridade.json`: o destino mais raro (maior valor) vence.
//
// Se os 3 critérios empatarem por completo (nunca observado com dados
// reais até à data), a ordem de inserção em `idsCarta` decide — o mesmo
// comportamento residual já documentado para o Modo de Ganho.
// ========================================================================

type SubsistemaCamada = "d1_posicao" | "d9_karakamsha" | "dasha" | "indice_catalogo";

/**
 * Extrai o peso associado a uma camada e o subsistema de onde vem — nunca
 * por regex genérica: por prefixos exactos das strings que
 * `camadasParaDestino` produz (controladas neste mesmo ficheiro, nunca
 * texto do LLM nem de outra fonte externa).
 *
 * DESVIO — nenhuma camada actual usa dados de Dasha (Mahadasha/
 * Antardasha); o subsistema "dasha" existe na regra de desempate porque o
 * especialista o pediu explicitamente, mas nunca é atribuído na prática
 * até o motor ganhar uma camada ligada a períodos — não inventado aqui.
 */
/**
 * `planeta` — quando a camada atribui o seu peso a UM planeta específico
 * e identificável (Atmakaraka, Amatyakaraka, Planeta de maior peso,
 * Regente do Modo de Ganho, Nakshatra do Atmakaraka — esta última mede a
 * posição do MESMO planeta que é o Atmakaraka, não um facto à parte),
 * usado por `construirDestinoConvergente` para nunca somar o peso do
 * mesmo planeta duas vezes na soma de desempate (ver DESVIO ali). `null`
 * para camadas de "Combinação" (sinal conjunto de 2 planetas, não uma
 * repetição de um facto já contado) e para as genéricas sem planeta
 * único (Casa temática forte, Eixo do rendimento, Sinais estruturados,
 * Área actual, Ideia concreta).
 */
function analisarCamada(camada: string, ctx: ContextoAvaliacao): { pesoAssociado: number; subsistema: SubsistemaCamada; planeta: ClassicalGraha | null } {
  if (camada.startsWith("Atmakaraka")) return { pesoAssociado: pesoDoPlaneta(ctx.pesos, ctx.atmakarakaInfo.planeta), subsistema: "d1_posicao", planeta: ctx.atmakarakaInfo.planeta as ClassicalGraha };
  if (camada.startsWith("Amatyakaraka")) return { pesoAssociado: pesoDoPlaneta(ctx.pesos, ctx.axes.amatyakaraka), subsistema: "d1_posicao", planeta: ctx.axes.amatyakaraka as ClassicalGraha };
  if (camada.startsWith("Planeta de maior peso")) return { pesoAssociado: pesoDoPlaneta(ctx.pesos, ctx.planetaDeMaiorPeso), subsistema: "d1_posicao", planeta: ctx.planetaDeMaiorPeso as ClassicalGraha };
  if (camada.startsWith("Nakshatra do Atmakaraka")) return { pesoAssociado: pesoDoPlaneta(ctx.pesos, ctx.atmakarakaInfo.planeta), subsistema: "d9_karakamsha", planeta: ctx.atmakarakaInfo.planeta as ClassicalGraha };
  if (camada.startsWith("Combinação")) {
    const match = camada.match(/^Combinação ([a-z]+)\+([a-z]+) /);
    if (match) {
      const a = (PLANETA_PT_PARA_GRAHA[match[1]] ?? match[1]) as ClassicalGraha;
      const b = (PLANETA_PT_PARA_GRAHA[match[2]] ?? match[2]) as ClassicalGraha;
      return { pesoAssociado: (pesoDoPlaneta(ctx.pesos, a) + pesoDoPlaneta(ctx.pesos, b)) / 2, subsistema: "d1_posicao", planeta: null };
    }
    return { pesoAssociado: 1.0, subsistema: "d1_posicao", planeta: null };
  }
  if (camada.startsWith("Regente do Modo de Ganho dominante")) {
    const match = camada.match(/^Regente do Modo de Ganho dominante \(([A-Za-z]+),/);
    const planeta = match ? (match[1] as ClassicalGraha) : undefined;
    return { pesoAssociado: planeta ? pesoDoPlaneta(ctx.pesos, planeta) : 1.0, subsistema: "d1_posicao", planeta: planeta ?? null };
  }
  if (camada.startsWith("Casa temática forte")) return { pesoAssociado: 1.0, subsistema: "d1_posicao", planeta: null };
  // Eixo do rendimento, Sinais estruturados da área, Área actual declarada,
  // Ideia concreta partilhada — sinais do índice do catálogo, sem um único
  // planeta a que se possa atribuir o peso.
  return { pesoAssociado: 1.0, subsistema: "indice_catalogo", planeta: null };
}

/**
 * Compara duas candidatas EMPATADAS em convergência pelos 3 critérios da
 * regra permanente — devolve negativo se `a` vence, positivo se `b`
 * vence, 0 só no empate total residual (decidido depois por ordem de
 * inserção, nunca aqui).
 */
function compararCandidatasEmpatadas(a: DestinoConvergente, b: DestinoConvergente): number {
  if (a.somaPesoCamadas !== b.somaPesoCamadas) return b.somaPesoCamadas - a.somaPesoCamadas;
  if (a.subsistemasDistintos !== b.subsistemasDistintos) return b.subsistemasDistintos - a.subsistemasDistintos;
  const raridadeA = catalogoRaridade[a.id] ?? 0;
  const raridadeB = catalogoRaridade[b.id] ?? 0;
  return raridadeB - raridadeA;
}

export interface DestinoConvergente {
  id: string;
  nome: string;
  descricao: string;
  convergencia: number;
  camadas: string[];
  /** Regra permanente de desempate, 1º critério — soma dos pesos das camadas. */
  somaPesoCamadas: number;
  /** Regra permanente de desempate, 2º critério — nº de subsistemas distintos entre as camadas. */
  subsistemasDistintos: number;
}

function construirDestinoConvergente(id: string, ctx: ContextoAvaliacao): DestinoConvergente {
  const destino = catalogoDestinos[id];
  const camadas = camadasParaDestino(id, ctx);
  const analisadas = camadas.map((c) => analisarCamada(c, ctx));
  // DESVIO (correcção do especialista) — confirmado com a carta real da
  // Alice: Saturno é simultaneamente "Planeta de maior peso" E "Regente
  // do Modo de Ganho dominante" (os dois papéis coincidem no mesmo
  // planeta), e cada um gera a sua própria camada — correcto para a
  // CONTAGEM (são 2 factos independentes, SPEC-vocacional.md), mas
  // ERRADO para a SOMA DE PESOS: somar o peso de Saturno duas vezes
  // inflaciona o desempate por o mesmo planeta "aparecer com dois
  // nomes", não porque a carta tenha dois planetas fortes. Sem esta
  // correcção, "Ciências da Informação e Documentação" (Saturno em 2
  // papéis) vencia "Ciências da Educação" (Lua só em 1 papel) só por
  // este artefacto de contagem, não por convergência real mais forte.
  // Correcção: cada planeta contribui UMA SÓ VEZ para a soma, seja qual
  // for o nº de camadas com peso a ele atribuído (Atmakaraka,
  // Amatyakaraka, Planeta de maior peso, Regente do Modo de Ganho,
  // Nakshatra do Atmakaraka — esta última é o mesmo planeta Atmakaraka,
  // nunca um planeta à parte). Camadas sem planeta único (Combinação,
  // Casa temática forte, Eixo do rendimento, Sinais estruturados, Área
  // actual, Ideia concreta) continuam a somar 1 vez cada, sem dedup —
  // não repetem o peso de um planeta já contado, são sinais à parte.
  const pesoPorPlaneta = new Map<string, number>();
  let somaSemPlanetaUnico = 0;
  for (const a of analisadas) {
    if (a.planeta) pesoPorPlaneta.set(a.planeta, a.pesoAssociado);
    else somaSemPlanetaUnico += a.pesoAssociado;
  }
  const somaPesoCamadas = Math.round(([...pesoPorPlaneta.values()].reduce((s, p) => s + p, 0) + somaSemPlanetaUnico) * 1000) / 1000;
  const subsistemasDistintos = new Set(analisadas.map((a) => a.subsistema)).size;
  return {
    id,
    nome: destino?.labels.PT ?? id,
    descricao: destino ? `Via ${destino.camada === "superior" ? "ensino superior" : destino.camada === "tecnico" ? "técnica/profissional" : "fora do sistema formal"}.` : "",
    convergencia: camadas.length,
    somaPesoCamadas,
    subsistemasDistintos,
    camadas,
  };
}

export interface CandidataForaDaLista {
  nome: string;
  /** id do catálogo (TAREFA 5 — correcção do especialista) — permite a `sugerirCursos()` encontrar as vias concretas desta candidata sem ter de re-derivar o id a partir do nome. */
  id: string;
  camadas: string[];
  convergencia: number;
  /**
   * TAREFA #38 (sistema em dois níveis) — 1 quando uma das camadas é
   * "Planeta de maior peso" (confiança plena, comportamento histórico);
   * 2 quando o único indicador pessoal é Atmakaraka/Amatyakaraka, sem
   * "Planeta de maior peso" (candidata real, mas o prompt deve assinalar
   * confiança reduzida — ver INSTRUCAO_NIVEL_CANDIDATAS em
   * promptAdulto.ts). Nunca um 3º valor — quem não atinge nível 1 nem 2
   * já foi filtrado antes de chegar aqui.
   */
  nivelConfianca: 1 | 2;
  /**
   * TAREFA #40 (mudança de arquitectura — selecção pelo LLM) — soma dos
   * pesos das camadas desta candidata (a mesma métrica já usada na regra
   * permanente de desempate, `compararCandidatasEmpatadas`). Exposta aqui
   * para o LLM a poder citar como critério de DESEMPATE quando a ligação
   * narrativa a um dom já nomeado em "Quem é" não distingue duas
   * candidatas da pool — nunca como critério principal de escolha.
   */
  somaPesoCamadas: number;
}

export interface IntakeParaCatalogo {
  areaActual: string;
  anosExperiencia: string;
  ideiaConcreta?: string;
}

export interface ResultadoCatalogoVocacional {
  destinosDeAreaActual: DestinoConvergente[];
  destinosAlternativos: DestinoConvergente[];
  /**
   * TAREFA #40 (mudança de arquitectura) — a POOL COMPLETA de candidatas
   * que atingem a fasquia (≥4 camadas independentes incluindo um
   * indicador pessoal — Planeta de maior peso, Atmakaraka ou
   * Amatyakaraka; ver `nivelConfianca` em cada candidata, TAREFA #38),
   * SEM limite de 3. `catalogarDestinos()` já não escolhe as 3 finais —
   * isso é feito pelo LLM na mesma chamada que escreve "Quem é", com
   * acesso a esta pool completa (ver INSTRUCAO_SELECCAO_CANDIDATAS em
   * promptAdulto.ts). Array vazio quando 0 destinos atingem a fasquia. A
   * ORDEM do array é só um artefacto de apresentação estável nos dados
   * técnicos (convergência desc, depois a regra permanente de desempate)
   * — nunca implica ranking nem limita a escolha do LLM às primeiras da
   * lista.
   */
  candidatasForaDaLista: CandidataForaDaLista[];
  /** Presente só quando a área actual não tem sector específico (ex.: "Empresária", "Gestão") — nota para o prompt citar explicitamente. */
  notaAreaGenerica: string | null;
  /** Correcção do especialista (TAREFA 4a) — a condição 5 de eixo_do_rendimento ("casas 2 e 11 sem ligação à 10") nunca aponta para um destino específico; quando activa, fica aqui para o prompt citar com a `regraDeEscrita` curada (nunca como condenação). `null` quando a condição não se verifica nesta carta. */
  notaEixoDoRendimento: NotaEixoRendimento | null;
}

const LIMIAR_MINIMO_CANDIDATA = 4;

/** Termos de cargo/função sem sector — não dão nenhuma palavra significativa própria para casar contra o catálogo (ver `procedimento_area_nao_tabelada`, 1.7a — decompor exigiria uma chamada à Anthropic que este passo, determinístico, não faz). */
const CARGOS_SEM_SECTOR = new Set(["empresaria", "empresario", "consultora", "consultor", "gestora", "gestor", "diretora", "diretor", "autonoma", "autonomo", "freelancer", "empreendedora", "empreendedor"]);

function areaActualEGenerica(areaActual: string): boolean {
  const palavras = palavrasSignificativas(areaActual);
  if (!palavras.length) return true;
  return palavras.every((p) => CARGOS_SEM_SECTOR.has(p));
}

/**
 * Integração do catálogo vocacional (Parte 2 do redesenho) — nunca
 * escolhe, só descreve (SPEC-vocacional.md) e deriva a candidata fora da
 * lista pelo mesmo critério de SPEC-espinha.md (≥4 camadas
 * independentes), nunca por popularidade nem por "o destino mais
 * nomeado". Determinístico — nunca chama a Anthropic.
 */
/**
 * Depuração — camadas de UM destino específico, sem o limiar de ≥2 que
 * `catalogarDestinos` aplica às alternativas. Útil para responder "porque
 * é que X não apareceu?" sem ter de repetir a lógica de contexto.
 */
export function depurarCamadasDestino(
  destinoId: string,
  axes: VocationIQAxes,
  pesos: PesoPlaneta[],
  savPorCasa: SavPorCasa[],
  intake: IntakeParaCatalogo,
  atmakarakaInfo: AtmakarakaInfo,
  regenteAscendenteOcidental?: ClassicalGraha,
): string[] {
  const ctx: ContextoAvaliacao = {
    axes,
    pesos,
    savPorCasa,
    atmakarakaInfo,
    palavrasAreaActual: palavrasSignificativas(intake.areaActual),
    palavrasIdeiaConcreta: intake.ideiaConcreta ? palavrasSignificativas(intake.ideiaConcreta) : [],
    eixoDoRendimentoActivo: avaliarEixoDoRendimento(axes, pesos),
    casasTematicasFortes: avaliarCasasTematicasFortes(axes, pesos, regenteAscendenteOcidental),
    planetaDeMaiorPeso: planetaDeMaiorPeso(pesos),
  };
  return camadasParaDestino(destinoId, ctx);
}

export function catalogarDestinos(
  axes: VocationIQAxes,
  pesos: PesoPlaneta[],
  savPorCasa: SavPorCasa[],
  intake: IntakeParaCatalogo,
  atmakarakaInfo: AtmakarakaInfo,
  regenteAscendenteOcidental?: ClassicalGraha,
): ResultadoCatalogoVocacional {
  const eixoDoRendimentoActivo = avaliarEixoDoRendimento(axes, pesos);
  const casasTematicasFortes = avaliarCasasTematicasFortes(axes, pesos, regenteAscendenteOcidental);
  const maiorPeso = planetaDeMaiorPeso(pesos);
  const ctx: ContextoAvaliacao = {
    axes,
    pesos,
    savPorCasa,
    atmakarakaInfo,
    palavrasAreaActual: palavrasSignificativas(intake.areaActual),
    palavrasIdeiaConcreta: intake.ideiaConcreta ? palavrasSignificativas(intake.ideiaConcreta) : [],
    eixoDoRendimentoActivo,
    casasTematicasFortes,
    planetaDeMaiorPeso: maiorPeso,
  };

  const areaGenerica = areaActualEGenerica(intake.areaActual);

  // Passo 1 — destinos da área actual (só quando há sector específico).
  const idsAreaActual = areaGenerica ? [] : buscarDestinosPorTexto(intake.areaActual);
  const destinosDeAreaActual = idsAreaActual.map((id) => construirDestinoConvergente(id, ctx));

  // Passo 2 — destinos pela carta: união dos destinos apontados pelo
  // Atmakaraka, Amatyakaraka, Nakshatra do Atmakaraka, combinações
  // activas, e regente(s) do Modo de Ganho dominante (TAREFA 4b — ambos os
  // lords em co-dominância, nunca só o primeiro) — nunca ordenados, nunca
  // cortados a um "top N" (isso seria voltar ao ranking rejeitado).
  //
  // eixo_do_rendimento (TAREFA 4a) NÃO entra aqui — correcção à 1ª versão
  // desta ronda: as suas leituras são factos do nível da carta, não sinais
  // por destino, por isso NUNCA expandem esta lista; só reforçam (com no
  // máximo 1 camada extra, ver `camadasParaDestino`) um destino que já
  // esteja presente por uma das vias acima.
  const idsCarta = new Set<string>([
    ...destinosDoPlaneta(atmakarakaInfo.planeta),
    ...destinosDoPlaneta(axes.amatyakaraka),
    ...(catalogoIndiceNakshatras[nakshatraParaChave(atmakarakaInfo.nakshatra)]?.destinos ?? []),
    ...axes.earningModeDominante.flatMap((e) => destinosDoPlaneta(e.lord)),
    // Correcção do especialista — "casa temática forte" É destino-
    // específica por natureza (liga-se sempre ao cluster de
    // catalogo-indice-casas.json, mesmo padrão de Atmakaraka/
    // Amatyakaraka), ao contrário do eixo_do_rendimento (facto do nível
    // da carta) — por isso, ao contrário daquele, entra legitimamente
    // aqui.
    ...casasTematicasFortes.flatMap((casa) => catalogoIndiceCasas[String(casa)]?.destinos ?? []),
    ...catalogoIndiceCombinacoes
      .filter((c) => {
        const [a, b] = c.par.map((p) => PLANETA_PT_PARA_GRAHA[p] ?? p);
        const casaA = casaDe(pesos, a);
        const casaB = casaDe(pesos, b);
        return casaA !== undefined && casaA === casaB;
      })
      .flatMap((c) => c.destinos),
  ]);
  // Nunca repetir como "alternativa" um destino já coberto pela área actual.
  for (const id of idsAreaActual) idsCarta.delete(id);

  // Passo 3 — ideia concreta: entra na mesma lista de alternativas (a
  // convergência de cada destino já conta a camada "ideia concreta"
  // quando aplicável) — não é uma terceira lista à parte.
  if (intake.ideiaConcreta) {
    for (const id of buscarDestinosPorTexto(intake.ideiaConcreta)) {
      if (!idsAreaActual.includes(id)) idsCarta.add(id);
    }
  }

  // Um destino com uma só camada GENÉRICA (ex.: só "eixo do rendimento
  // aponta para aqui") não é uma alternativa com informação real — é
  // ruído de catálogo, o mesmo tipo de problema que SPEC-vocacional.md
  // documenta ("nomeado por muitas fontes" não é o mesmo que
  // "sustentado"). Exigir ≥2 camadas nesse caso evita inundar o prompt
  // com dezenas de destinos de sinal único.
  //
  // DESVIO (encontrado ao testar com a carta real da Melina) — um
  // destino com UMA SÓ camada, quando essa camada vem do Atmakaraka OU
  // do Amatyakaraka (os karakas pessoais, não um sinal genérico), fica de
  // fora do limiar. Sem esta excepção, "Negócio próprio com marca
  // pessoal" (f_marca_pessoal, via Amatyakaraka=Sol) nunca chegava a
  // aparecer no prompt — exactamente o sinal que levou o especialista a
  // apontar "marca própria" para ela. Um sinal de karaka pessoal, mesmo
  // sozinho, pesa mais do que dois sinais genéricos coincidentes (ver
  // também o gate de Atmakaraka obrigatório na candidata fora da lista,
  // abaixo — o mesmo princípio).
  const LIMIAR_MINIMO_ALTERNATIVA = 2;
  const destinosAlternativos = [...idsCarta]
    .map((id) => construirDestinoConvergente(id, ctx))
    .filter((d) => d.convergencia >= LIMIAR_MINIMO_ALTERNATIVA || d.camadas.some((c) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka")));

  // Passo 4 — candidata fora da lista: só entre as ALTERNATIVAS (nunca
  // repete uma opção que a área actual já descreve), só se ≥4 camadas
  // independentes convergirem, E só se pelo menos uma dessas camadas for
  // um INDICADOR PESSOAL da carta (não um sinal genérico) — Atmakaraka,
  // Amatyakaraka, ou o Planeta de maior peso.
  //
  // Correcção do especialista (Correcção 2) — o portão usava o Atmakaraka
  // como proxy para "peça mais forte da carta", mas são coisas diferentes:
  // Atmakaraka é uma posição TÉCNICA (maior grau, ligado ao propósito da
  // alma), nunca uma medida de força. Confirmado com a carta real da
  // Nádia: o Atmakaraka é o Sol (peso 1,02), mas Saturno (exaltado,
  // regente de duas casas) tem peso 1,76 — muito mais forte. O portão
  // original deixava "Direito" passar por uma ligação genérica e
  // arquetípica do Sol (materia_prima "decidir e responder pela decisão"
  // → Direito/Política, independente da casa onde o Sol está), enquanto
  // ignorava sinais muito mais específicos da carta ligados a Saturno.
  //
  // DESVIO (diagnóstico da Alice — mesma carta da Nádia acima) — a
  // Correcção 2 tinha, sem intenção, deixado de fora o próprio caso que a
  // motivou: para a Alice, "Direito" atinge 4-5 camadas independentes,
  // uma delas o Atmakaraka (Sol), mas nenhuma é "Planeta de maior peso"
  // (Saturno) — o portão bloqueia-o por inteiro, mesmo tendo um indicador
  // pessoal genuíno a apoiá-lo.
  //
  // Três tentativas de resolver isto com um único limiar binário
  // (aceitar Atmakaraka/Amatyakaraka sempre; exigir também "Casa temática
  // forte"/"Sinais estruturados"; exigir peso próprio ≥1,3 do AK/AmK)
  // foram testadas por regressão contra Rui, João, Melina e Alice e
  // REPROVARAM TODAS — os dados provam que não há um limiar único capaz
  // de discriminar "Direito da Alice" (Atmakaraka Sol, peso 1,02 — sinal
  // real mas tecnicamente fraco) de "Direito do Rui/Melina" (Atmakaraka/
  // Amatyakaraka Sol, peso 1,06/1,33 — sinal espúrio, direcções opostas
  // ao que qualquer limiar de peso previa). Ver relatório da ronda de
  // diagnóstico para os números.
  //
  // TAREFA #38 — SISTEMA EM DOIS NÍVEIS (solução final): em vez de um
  // portão binário passa/reprova, cada candidata que atinge ≥4 camadas
  // ganha um NÍVEL DE CONFIANÇA, nunca uma exclusão:
  //   Nível 1 — inclui uma camada "Planeta de maior peso": comportamento
  //             e linguagem inalterados (confiança plena).
  //   Nível 2 — só inclui Atmakaraka/Amatyakaraka, nunca "Planeta de
  //             maior peso": candidata continua a ser mostrada (não é
  //             suprimida), mas o prompt (INSTRUCAO_NIVEL_CANDIDATAS,
  //             promptAdulto.ts) instrui o LLM a assinalar confiança
  //             reduzida — o mesmo espírito da distinção "confirmação
  //             directa" vs "reforço geral" já usada para yogas
  //             (INSTRUCAO_YOGAS). Nunca suprimir o sinal — só nomear a
  //             sua força relativa, que é informação real (a pessoa quer
  //             saber se é "o perfil converge com clareza" ou "há um fio
  //             a puxar, vale explorar mas não é o mesmo tipo de certeza").
  // Não introduz nenhum novo limiar de contagem/peso — só reclassifica os
  // que já passavam os limiares existentes (≥4 camadas + indicador
  // pessoal). Aplica-se por igual à Alice (Nível 2) e ao Rui/Melina
  // (Nível 2) — a diferença nunca esteve em bloquear uns e passar outros,
  // está em como o texto fala de cada nível.
  const temPlanetaDeMaiorPeso = (camadas: string[]) => camadas.some((c) => c.startsWith("Planeta de maior peso"));
  const temIndicadorPessoalFraco = (camadas: string[]) => camadas.some((c) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka"));
  const nivelDeConfianca = (camadas: string[]): 1 | 2 | null => {
    if (temPlanetaDeMaiorPeso(camadas)) return 1;
    if (temIndicadorPessoalFraco(camadas)) return 2;
    return null;
  };
  // TAREFA #40 (correcção do especialista — MUDANÇA DE ARQUITECTURA,
  // substitui a TAREFA #39) — quatro rondas seguidas de gates/limiares/
  // desempates diferentes (Correcção 2 original; "aceitar Atmakaraka/
  // Amatyakaraka sempre"; "exigir também sinal estrutural"; "exigir peso
  // próprio ≥1,3"; sistema em dois níveis; vaga reservada à melhor Nível
  // 2) provaram, cada uma, resolver o caso que a motivou e quebrar outro
  // — porque todas tentavam decidir "quais são as 3 melhores candidatas"
  // com uma FÓRMULA fixa, e nenhuma fórmula fixa capta o que realmente
  // distingue uma boa candidata: se liga com clareza a um dom já
  // reconhecido na pessoa (secção "Quem é/Quem és"), algo que só se avalia
  // por leitura, não por peso numérico. A vaga reservada (TAREFA #39)
  // confirmou isto da pior forma — corrigiu a Alice mas à custa de tirar
  // ao João uma candidata Nível 1 genuína (Ensino próprio) sem nenhuma
  // razão que lhe dissesse respeito.
  //
  // Daqui para a frente, `catalogarDestinos()` PÁRA de escolher as 3
  // finais. Produz a POOL COMPLETA — todas as candidatas que atingem
  // ≥4 camadas independentes com um indicador pessoal (Nível 1 ou 2),
  // sem limite de 3, na mesma ordem de sempre (convergência desc, depois
  // a regra permanente de desempate — usada aqui só para uma apresentação
  // estável nos dados técnicos, nunca para decidir quem fica de fora). O
  // cálculo de camadas/pesos/nível não muda em nada — só deixa de haver
  // corte às 3 melhores aqui. A escolha final (até 3, preferindo ligação
  // narrativa a um dom já nomeado em "Quem é", com a soma de pesos só como
  // desempate quando a ligação não distingue) passa para o mesmo LLM que
  // já escreve "Quem é" — ver INSTRUCAO_SELECCAO_CANDIDATAS em
  // promptAdulto.ts — porque é aí, não aqui, que "liga-se a um dom já
  // nomeado" pode ser avaliado de facto, não aproximado por uma fórmula.
  const elegveis = destinosAlternativos
    .filter((d) => d.convergencia >= LIMIAR_MINIMO_CANDIDATA)
    .map((d) => ({ destino: d, nivel: nivelDeConfianca(d.camadas) }))
    .filter((x): x is { destino: DestinoConvergente; nivel: 1 | 2 } => x.nivel !== null);
  const poolOrdenada = [...elegveis].sort((a, b) => {
    if (b.destino.convergencia !== a.destino.convergencia) return b.destino.convergencia - a.destino.convergencia;
    return compararCandidatasEmpatadas(a.destino, b.destino);
  });
  const candidatasForaDaLista: CandidataForaDaLista[] = poolOrdenada.map(({ destino: d, nivel }) => ({
    nome: d.nome,
    id: d.id,
    camadas: d.camadas,
    convergencia: d.convergencia,
    nivelConfianca: nivel,
    somaPesoCamadas: d.somaPesoCamadas,
  }));

  const notaCondicao5 = eixoDoRendimentoActivo.find((a) => a.planetas.length === 0);

  return {
    destinosDeAreaActual,
    destinosAlternativos,
    candidatasForaDaLista,
    notaAreaGenerica: areaGenerica ? `área actual não tem sector específico ("${intake.areaActual}") — candidatas derivadas só do perfil (Atmakaraka, Amatyakaraka, Nakshatra, Modo de Ganho, combinações activas)` : null,
    notaEixoDoRendimento: notaCondicao5 ? notaCondicao5.nota : null,
  };
}
