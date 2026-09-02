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
import type { ClassicalGraha } from "../lifeReport/types";
import type { DignityDetail } from "../data/dignity";
import type { ZodiacSign } from "../data/tables";
import { computeSarvashtakavarga, type SavContributor } from "../v3/sarvashtakavarga";

/**
 * Tabela de estado do documento de metodologia, secção 2. "Moolatrikona"
 * não consta da tabela do documento (que só define 6 estados) — mapeado
 * para o mesmo peso de "próprio" (1,25), a categoria classicamente mais
 * próxima (Moolatrikona é uma sub-zona de força dentro do signo de
 * domicílio do próprio planeta — ver SPEC-003).
 */
export const ESTADO_PESO: Record<DignityDetail, number> = {
  Exalted: 1.5,
  Own: 1.25,
  Moolatrikona: 1.25,
  Friend: 1.1,
  Neutral: 1.0,
  Enemy: 0.85,
  Debilitated: 0.6,
};

export interface PesoPlaneta {
  planeta: ClassicalGraha;
  casa: number;
  signo: ZodiacSign;
  estado: DignityDetail;
  savCasa: number;
  savMedia: number;
  peso: number;
}

const CLASSICAL_GRAHAS: ClassicalGraha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

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

/** Calcula o peso de cada um dos 7 planetas clássicos, segundo a fórmula da secção 2 do documento de metodologia. */
export function computePesosPlanetas(d1: D1TableResult): PesoPlaneta[] {
  const sav = calcularSav(d1);

  return CLASSICAL_GRAHAS.map((planeta) => {
    const row: GrahaRow = d1.rows[planeta];
    // "nunca null" para os 7 clássicos (GrahaRow.dignity, ver d1Table.ts)
    // — o fallback "Neutral" é só uma rede de segurança ao nível de tipos,
    // nunca esperado em runtime.
    const estado: DignityDetail = row.dignity ?? "Neutral";
    const savCasa = sav.byHouse.find((h) => h.casa === row.house)?.pontuacao ?? 0;
    const peso = Math.round(ESTADO_PESO[estado] * (savCasa / sav.media) * 1000) / 1000;
    return { planeta, casa: row.house, signo: row.sign, estado, savCasa, savMedia: sav.media, peso };
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
