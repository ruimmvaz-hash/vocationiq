// VOCATIONIQ-ADULTO-metodologia.md, secção 2 — "Peso de cada camada":
//   peso_planeta = estado × (SAV_da_casa_que_ocupa / 28,1)
// aplicado a CADA planeta relevante isoladamente (os 7 grahas clássicos —
// Rahu/Ketu não têm dignidade de tabela fixa por signo, ficam fora desta
// pontuação, consistente com Sarvashtakavarga clássico, que também só
// pontua os 7 clássicos).
//
// "28,1" não é um número mágico: é a média clássica de Sarvashtakavarga
// por casa (337 pontos totais / 12 casas = 28,08333... ≈ 28,1) — um
// invariante matemático de qualquer carta (ver SAV_GRAND_TOTAL em
// ../v3/sarvashtakavarga.ts). Aqui usa-se o valor calculado
// (`sav.media`), não o literal "28,1", para não fixar uma aproximação
// onde já há o número exacto disponível — os dois batem à primeira casa
// decimal, sempre.

import type { D1TableResult, GrahaRow } from "../lifeReport/d1Table";
import type { ClassicalGraha, Graha } from "../lifeReport/types";
import { DIGNITY_TABLE, type DignityDetail, type VedicPlanet } from "../data/dignity";
import type { ZodiacSign } from "../data/tables";
import { SIGN_RULERS } from "../lifeReport/signRulers";
import { computeSarvashtakavarga, type SavContributor } from "../v3/sarvashtakavarga";

/**
 * Estado efectivo de um planeta para efeitos de peso — os 7 estados
 * clássicos de dignidade, mais "NeechaBhanga" (debilitado com cancelação
 * clássica da debilidade — condições (a)/(b)/(c) de `detectarNeechaBhanga`
 * abaixo) e "NeechaBhanga_Conjuncao" (correcção do especialista —
 * cancelação por conjunção com benéfico em Kendra, condição (d), menos
 * directa que as 3 clássicas). Nunca escrito de volta em `GrahaRow.dignity`
 * (que continua a reportar a dignidade clássica sem cancelação) — só
 * existe aqui, em `PesoPlaneta`.
 */
export type EstadoPlaneta = DignityDetail | "NeechaBhanga" | "NeechaBhanga_Conjuncao";

/**
 * Tabela de estado do documento de metodologia, secção 2. "Moolatrikona"
 * não consta da tabela do documento (que só define 6 estados) — mapeado
 * para o mesmo peso de "próprio" (1,25), a categoria classicamente mais
 * próxima (Moolatrikona é uma sub-zona de força dentro do signo de
 * domicílio do próprio planeta — ver SPEC-003). "NeechaBhanga" (1,2) foi
 * um acrescento de uma ronda anterior — debilitado com cancelação
 * clássica lê-se como força, mas não tão forte como "amigo" (1,1 fica
 * abaixo). "NeechaBhanga_Conjuncao" (1,1, correcção do especialista) —
 * cancelação por conjunção com benéfico é uma condição menos directa do
 * que as 3 clássicas (não envolve a dignidade de um regente, só
 * proximidade planetária), por isso fica ligeiramente abaixo de
 * "NeechaBhanga" clássico, ao nível de "amigo" — valor aprovado
 * explicitamente pelo especialista, não calibrado por mim.
 */
export const ESTADO_PESO: Record<EstadoPlaneta, number> = {
  Exalted: 1.5,
  Own: 1.25,
  Moolatrikona: 1.25,
  Friend: 1.1,
  Neutral: 1.0,
  Enemy: 0.85,
  NeechaBhanga: 1.2,
  NeechaBhanga_Conjuncao: 1.1,
  Debilitated: 0.6,
};

export interface PesoPlaneta {
  planeta: ClassicalGraha;
  casa: number;
  signo: ZodiacSign;
  estado: EstadoPlaneta;
  /** Presente só quando `estado` é um dos dois "NeechaBhanga*" — a condição clássica exacta que cancelou a debilidade, para o dado técnico/prompt poderem citá-la. */
  notaCancelamento?: string;
  savCasa: number;
  savMedia: number;
  peso: number;
}

const CLASSICAL_GRAHAS: ClassicalGraha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const CASAS_KENDRA = new Set([1, 4, 7, 10]);

/** Casa `alvo`, contada a partir da casa `referencia` (1 = a própria referência, 4/7/10 = kendra dela). */
function casaContadaDe(referencia: number, alvo: number): number {
  return ((alvo - referencia + 12) % 12) + 1;
}

function emKendraDe(referencia: number, alvo: number): boolean {
  return CASAS_KENDRA.has(casaContadaDe(referencia, alvo));
}

/** Signo onde `planeta` tem a dignidade `estado` ("Exalted"/"Debilitated") pela tabela clássica — nunca por grau (é sempre o signo inteiro que exalta/debilita, ao contrário de Moolatrikona). */
function signoDeDignidade(planeta: VedicPlanet, estado: "Exalted" | "Debilitated"): ZodiacSign | null {
  const entrada = (Object.entries(DIGNITY_TABLE[planeta]) as [ZodiacSign, DignityDetail][]).find(([, d]) => d === estado);
  return entrada ? entrada[0] : null;
}

/** Qual planeta (dos 8 com tabela de dignidade — 7 clássicos + Rahu) é exaltado no signo dado, se algum. */
function planetaExaltadoEm(signo: ZodiacSign): VedicPlanet | null {
  const planetas = Object.keys(DIGNITY_TABLE) as VedicPlanet[];
  return planetas.find((p) => DIGNITY_TABLE[p][signo] === "Exalted") ?? null;
}

export interface NeechaBhangaResultado {
  detectado: boolean;
  motivo?: string;
  /** Qual família de condição disparou — "dispositor" para (a)/(b)/(c) (as 3 clássicas, ligadas à dignidade de um regente), "conjuncao" para (d) (correcção do especialista — cancelação por conjunção com benéfico, menos directa). Ausente quando `detectado` é `false`. Usado por `computePesosPlanetas` para escolher entre os dois estados/pesos de cancelação. */
  tipo?: "dispositor" | "conjuncao";
}

const BENEFICOS_NATURAIS_NEECHA_BHANGA: ClassicalGraha[] = ["Jupiter", "Venus"];

/**
 * Neecha Bhanga Raja Yoga — 4 condições de cancelação da debilidade, cada
 * uma suficiente por si só. Só avalia planetas com `dignity ===
 * "Debilitated"` no D1 (nesse caso o signo de debilidade É o signo actual
 * do planeta).
 *
 * DESVIO — já existe uma detecção "Neechabhanga" em
 * `lifeReport/yogas.ts` (partilhada com o Life Report principal da
 * Naveya), mas testa só "regente em casa angular OU exaltado" — não as
 * condições completas implementadas aqui. Em vez de alterar aquele
 * ficheiro partilhado (risco para o outro produto), esta função
 * implementa as condições de raiz, só para o VocationIQ.
 */
export function detectarNeechaBhanga(planeta: ClassicalGraha, d1: D1TableResult): NeechaBhangaResultado {
  const row = d1.rows[planeta];
  if (row.dignity !== "Debilitated") return { detectado: false };

  const signoDebilidade = row.sign;
  const casaAscendente = 1; // as casas em d1.rows já vêm contadas a partir do Ascendente
  const casaLua = d1.rows.Moon.house;

  // (a) o regente do signo onde o planeta está debilitado está exaltado ou em signo próprio.
  const regenteSignoDebilidade = SIGN_RULERS[signoDebilidade];
  const dignidadeRegente = d1.rows[regenteSignoDebilidade].dignity;
  if (dignidadeRegente === "Exalted" || dignidadeRegente === "Own" || dignidadeRegente === "Moolatrikona") {
    return {
      detectado: true,
      tipo: "dispositor",
      motivo: `o regente do signo de debilidade (${regenteSignoDebilidade}) está ${dignidadeRegente === "Exalted" ? "exaltado" : "em signo próprio"}`,
    };
  }

  // (b) o planeta que seria exaltado no mesmo signo está em Kendra do Ascendente ou da Lua.
  const planetaExaltadoNesteSigno = planetaExaltadoEm(signoDebilidade);
  if (planetaExaltadoNesteSigno) {
    const casaDoExaltado = d1.rows[planetaExaltadoNesteSigno as Graha].house;
    if (emKendraDe(casaAscendente, casaDoExaltado) || emKendraDe(casaLua, casaDoExaltado)) {
      return {
        detectado: true,
        tipo: "dispositor",
        motivo: `${planetaExaltadoNesteSigno} (que seria exaltado em ${signoDebilidade}) está em Kendra do Ascendente/Lua (casa ${casaDoExaltado})`,
      };
    }
  }

  // (c) o regente do signo de exaltação do próprio planeta debilitado está em Kendra do Ascendente.
  const signoExaltacaoPlaneta = signoDeDignidade(planeta, "Exalted");
  if (signoExaltacaoPlaneta) {
    const regenteExaltacao = SIGN_RULERS[signoExaltacaoPlaneta];
    const casaRegenteExaltacao = d1.rows[regenteExaltacao].house;
    if (emKendraDe(casaAscendente, casaRegenteExaltacao)) {
      return {
        detectado: true,
        tipo: "dispositor",
        motivo: `o regente do signo de exaltação de ${planeta} (${regenteExaltacao}) está em Kendra do Ascendente (casa ${casaRegenteExaltacao})`,
      };
    }
  }

  // (d) — correcção do especialista (4ª condição, aprovada explicitamente):
  // o planeta debilitado está em conjunção (MESMO SIGNO — critério de
  // admissão, nunca orbe em graus) com Júpiter ou Vénus (benéficos
  // naturais, nunca Lua/Mercúrio), E a casa dessa conjunção é Kendra do
  // Ascendente. Neste sistema de casas inteiras, "mesmo signo" implica
  // sempre "mesma casa" — por isso "pelo menos um deles em Kendra"
  // (conforme aprovado) é equivalente a testar a casa partilhada uma
  // única vez. A distância em grau entra só no texto, como modificador de
  // força do sinal — nunca decide se a condição passa ou falha.
  for (const beneficoPlaneta of BENEFICOS_NATURAIS_NEECHA_BHANGA) {
    if (beneficoPlaneta === planeta) continue;
    const beneficoRow = d1.rows[beneficoPlaneta];
    if (beneficoRow.sign !== signoDebilidade) continue;
    const casaConjuncao = row.house;
    if (!emKendraDe(casaAscendente, casaConjuncao)) continue;
    const distancia = Math.abs(row.degreeInSign - beneficoRow.degreeInSign);
    return {
      detectado: true,
      tipo: "conjuncao",
      motivo: `conjunção com ${beneficoPlaneta} em Kendra do Ascendente (casa ${casaConjuncao}, a ${distancia.toFixed(1)}° de distância)`,
    };
  }

  return { detectado: false };
}

function calcularSav(d1: D1TableResult) {
  const contributorSigns = {
    Sun: d1.rows.Sun.sign,
    Moon: d1.rows.Moon.sign,
    Mars: d1.rows.Mars.sign,
    Mercury: d1.rows.Mercury.sign,
    Jupiter: d1.rows.Jupiter.sign,
    Venus: d1.rows.Venus.sign,
    Saturn: d1.rows.Saturn.sign,
    Lagna: d1.ascendant.sign,
  } satisfies Record<SavContributor, ZodiacSign>;
  return computeSarvashtakavarga(contributorSigns, d1.ascendant.sign);
}

/** Calcula o peso de cada um dos 7 planetas clássicos, segundo a fórmula da secção 2 do documento de metodologia — com verificação de Neecha Bhanga Raja Yoga antes de aplicar o estado base. */
export function computePesosPlanetas(d1: D1TableResult): PesoPlaneta[] {
  const sav = calcularSav(d1);

  return CLASSICAL_GRAHAS.map((planeta) => {
    const row: GrahaRow = d1.rows[planeta];
    // "nunca null" para os 7 clássicos (GrahaRow.dignity, ver d1Table.ts)
    // — o fallback "Neutral" é só uma rede de segurança ao nível de tipos,
    // nunca esperado em runtime.
    const dignidadeBase: DignityDetail = row.dignity ?? "Neutral";
    const neechaBhanga = dignidadeBase === "Debilitated" ? detectarNeechaBhanga(planeta, d1) : { detectado: false };
    const estado: EstadoPlaneta = neechaBhanga.detectado ? (neechaBhanga.tipo === "conjuncao" ? "NeechaBhanga_Conjuncao" : "NeechaBhanga") : dignidadeBase;
    const notaCancelamento = neechaBhanga.detectado
      ? neechaBhanga.tipo === "conjuncao"
        ? `debilitado com cancelação por conjunção de benéfico em Kendra → lido como força moderada: ${neechaBhanga.motivo}`
        : `debilitado com cancelação (Neecha Bhanga Raja Yoga) → lido como força: ${neechaBhanga.motivo}`
      : undefined;
    const savCasa = sav.byHouse.find((h) => h.casa === row.house)?.pontuacao ?? 0;
    const peso = Math.round(ESTADO_PESO[estado] * (savCasa / sav.media) * 1000) / 1000;
    return { planeta, casa: row.house, signo: row.sign, estado, notaCancelamento, savCasa, savMedia: sav.media, peso };
  });
}

export type ClassificacaoApoio = "forte" | "medio" | "fraco";

export interface SavPorCasa {
  casa: number;
  pontuacao: number;
  media: number;
  classificacao: ClassificacaoApoio;
}

/**
 * Sarvashtakavarga das 12 casas (Anexo — "Apoio por área de vida"), sem
 * o factor de dignidade do peso_planeta — é o apoio estrutural da CASA
 * em si, não de um planeta específico nela. Mesmos limiares do gráfico
 * de peso (≥1,3× a média = forte, 0,9-1,3× = médio, abaixo = fraco),
 * aplicados ao rácio pontuacao/média em vez de ao peso ponderado, para
 * as duas classificações do relatório usarem sempre o mesmo critério.
 */
export function computeSavPorCasa(d1: D1TableResult): SavPorCasa[] {
  const sav = calcularSav(d1);
  return sav.byHouse.map((h) => {
    const razao = h.pontuacao / sav.media;
    const classificacao: ClassificacaoApoio = razao >= 1.3 ? "forte" : razao >= 0.9 ? "medio" : "fraco";
    return { casa: h.casa, pontuacao: h.pontuacao, media: sav.media, classificacao };
  });
}

export interface ApoioPorAreaDeVida {
  casa: number;
  /** SAV bruto da casa — preservado tal qual, para quem quiser continuar a citar o número clássico. */
  pontuacaoSav: number;
  /** 0-10, fórmula unificada (ver `valorCasaUnificado`). */
  valor: number;
  classificacao: ClassificacaoApoio;
}

/**
 * Correcção do especialista — FÓRMULA FINAL, aprovada após 3 rondas de
 * diagnóstico com dados reais (Nádia/Melina/Porto). Substitui as 2
 * versões anteriores (SAV_max relativo à carta + só peso do regente;
 * depois SAV_max=56 absoluto) — ambas testadas e descartadas por não
 * produzirem NENHUMA casa "Forte" nas 3 cartas reais, mesmo com regentes
 * exaltados (ver docs da ronda: Opções A/B do diagnóstico descartadas,
 * só a Opção C — multiplicativa — produzia diferenciação real).
 *
 * `peso_efectivo = peso_mais_forte + 0,3 × peso_segundo_mais_forte`, onde
 * `peso_mais_forte`/`peso_segundo_mais_forte` são o 1º e 2º maiores pesos
 * entre { regente da casa, todos os ocupantes físicos } — nunca só o
 * regente (diagnóstico confirmou 7 casas nas 3 cartas onde um ocupante é
 * mais forte do que o regente, nalguns casos bem mais).
 *
 * `valor_raw = (SAV_da_casa / 56) × peso_efectivo × 10` — 56 é o máximo
 * teórico ABSOLUTO do SAV clássico (8 contribuintes × 7 bindus, nunca um
 * valor relativo a esta carta — testado e confirmado que a normalização
 * relativa por si só não resolve o problema).
 *
 * Tecto suave a partir de 8: valores até 8 passam tal qual; acima de 8,
 * comprime exponencialmente para nunca ultrapassar 10 (testado: sem isto,
 * a fórmula ultrapassa 10 com pesos e SAV perfeitamente reais, não só em
 * extremos teóricos — ex.: casa 6 da Nádia com Saturno como ocupante dava
 * valor_raw ≈ 10,4).
 *
 * Cortes: ≥7 forte, 4-6 médio, <4 fraco — os MESMOS nos 3 sítios que usam
 * esta função (Anexo, Roda da Vida, Radar de competências), exigência
 * explícita do especialista.
 */
const SAV_MAX_ABSOLUTO = 56;
const TECTO_SUAVE_A_PARTIR_DE = 8;

function pesoEfectivoDaCasa(casa: number, pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): number {
  const regente = regentesCasas[casa];
  const pesoRegente = pesos.find((p) => p.planeta === regente)?.peso ?? 0;
  const pesosOcupantes = pesos.filter((p) => p.casa === casa).map((p) => p.peso);
  const todosOsPesos = [pesoRegente, ...pesosOcupantes].sort((a, b) => b - a);
  const pesoMaisForte = todosOsPesos[0] ?? 0;
  const pesoSegundoMaisForte = todosOsPesos[1] ?? 0;
  return pesoMaisForte + 0.3 * pesoSegundoMaisForte;
}

function aplicarTectoSuave(valorRaw: number): number {
  if (valorRaw <= TECTO_SUAVE_A_PARTIR_DE) return valorRaw;
  return TECTO_SUAVE_A_PARTIR_DE + 2 * (1 - Math.exp(-(valorRaw - TECTO_SUAVE_A_PARTIR_DE) / 2));
}

function classificarApoio(valor: number): ClassificacaoApoio {
  return valor >= 7 ? "forte" : valor >= 4 ? "medio" : "fraco";
}

/**
 * O valor 0-10 (e classificação) de UMA casa, pela fórmula final — usado
 * pelos 3 sítios (Anexo, Roda da Vida, Radar) para nunca divergirem entre
 * si. `savDaCasa` vem de `computeSavPorCasa`/`SavPorCasa.pontuacao`.
 */
export function valorCasaUnificado(savDaCasa: number, casa: number, pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): { valor: number; classificacao: ClassificacaoApoio } {
  const pesoEfectivo = pesoEfectivoDaCasa(casa, pesos, regentesCasas);
  const valorRaw = (savDaCasa / SAV_MAX_ABSOLUTO) * pesoEfectivo * 10;
  const valor = Math.round(Math.min(10, Math.max(0, aplicarTectoSuave(valorRaw))) * 10) / 10;
  return { valor, classificacao: classificarApoio(valor) };
}

/**
 * O Anexo "Apoio por área de vida" — cada uma das 12 casas, pela fórmula
 * final unificada (`valorCasaUnificado`). Substitui a classificação
 * anterior baseada só em SAV bruto (`computeSavPorCasa`, que continua a
 * existir inalterada — usada por `catalogoVocacional.ts` para o sinal
 * "casa_activa" do índice inverso, um consumo diferente que não foi
 * pedido para mudar).
 */
export function computeApoioPorAreaDeVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): ApoioPorAreaDeVida[] {
  return savPorCasa.map((h) => {
    const { valor, classificacao } = valorCasaUnificado(h.pontuacao, h.casa, pesos, regentesCasas);
    return { casa: h.casa, pontuacaoSav: h.pontuacao, valor, classificacao };
  });
}
