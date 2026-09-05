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
 * da debilidade detectada, ver `detectarNeechaBhanga` abaixo). Nunca
 * escrito de volta em `GrahaRow.dignity` (que continua a reportar a
 * dignidade clássica sem cancelação) — só existe aqui, em `PesoPlaneta`.
 */
export type EstadoPlaneta = DignityDetail | "NeechaBhanga";

/**
 * Tabela de estado do documento de metodologia, secção 2. "Moolatrikona"
 * não consta da tabela do documento (que só define 6 estados) — mapeado
 * para o mesmo peso de "próprio" (1,25), a categoria classicamente mais
 * próxima (Moolatrikona é uma sub-zona de força dentro do signo de
 * domicílio do próprio planeta — ver SPEC-003). "NeechaBhanga" (1,2) é
 * um acrescento desta ronda — pedido explícito: debilitado com
 * cancelação lê-se como força, mas não tão forte como "amigo" (1,1 fica
 * abaixo; ver nota no pedido: valor exacto 1,2 dado, não calibrado por
 * mim).
 */
export const ESTADO_PESO: Record<EstadoPlaneta, number> = {
  Exalted: 1.5,
  Own: 1.25,
  Moolatrikona: 1.25,
  Friend: 1.1,
  Neutral: 1.0,
  Enemy: 0.85,
  NeechaBhanga: 1.2,
  Debilitated: 0.6,
};

export interface PesoPlaneta {
  planeta: ClassicalGraha;
  casa: number;
  signo: ZodiacSign;
  estado: EstadoPlaneta;
  /** Presente só quando `estado === "NeechaBhanga"` — a condição clássica exacta que cancelou a debilidade, para o dado técnico/prompt poderem citá-la. */
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
}

/**
 * Neecha Bhanga Raja Yoga — as 3 condições clássicas de cancelação da
 * debilidade pedidas nesta ronda, cada uma suficiente por si só. Só
 * avalia planetas com `dignity === "Debilitated"` no D1 (nesse caso o
 * signo de debilidade É o signo actual do planeta).
 *
 * DESVIO — já existe uma detecção "Neechabhanga" em
 * `lifeReport/yogas.ts` (partilhada com o Life Report principal da
 * Naveya), mas testa só "regente em casa angular OU exaltado" — não as
 * 3 condições completas pedidas aqui (que incluem "em signo próprio",
 * "o planeta exaltado no mesmo signo em Kendra do Ascendente/Lua", e "o
 * regente do signo de EXALTAÇÃO do próprio planeta em Kendra"). Em vez
 * de alterar aquele ficheiro partilhado (risco para o outro produto),
 * esta função implementa as 3 condições de raiz, só para o VocationIQ.
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
        motivo: `o regente do signo de exaltação de ${planeta} (${regenteExaltacao}) está em Kendra do Ascendente (casa ${casaRegenteExaltacao})`,
      };
    }
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
    const estado: EstadoPlaneta = neechaBhanga.detectado ? "NeechaBhanga" : dignidadeBase;
    const notaCancelamento = neechaBhanga.detectado ? `debilitado com cancelação (Neecha Bhanga Raja Yoga) → lido como força: ${neechaBhanga.motivo}` : undefined;
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
