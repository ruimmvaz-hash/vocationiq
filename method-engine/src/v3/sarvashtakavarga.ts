// FASE 1 — Sarvashtakavarga (SAV), clássico Parashari (BPHS). Peça central
// em falta identificada em docs/ANALISE-MOTOR-vs-v2v3-22Ago.md: sustenta a
// secção 5 (a roda), o critério 9 (SAV<25 sem separar capacidade de
// retorno) e a fórmula de SPEC-pontuacao-catalogo.md (SAV/28,1 como eixo
// do rendimento).
//
// VERIFICADO — 23/08/2026, auditoria de cálculos astrológicos. As 7
// tabelas de bindus foram inicialmente reconstruídas de memória e tinham
// 5 células erradas em 3 tabelas (Lua×Lua, Lua×Júpiter, Júpiter×Vénus,
// Júpiter×Lagna, Vénus×Marte) — o total clássico por peça batia certo
// (Sol 48 · Lua 49 · Marte 39 · Mercúrio 54 · Júpiter 56 · Vénus 52 ·
// Saturno 39 · soma 337) mas a distribuição por casa não, o que mascarava
// o erro. Corrigidas célula a célula contra as tabelas do Prokerala
// (prokerala.com/astrology/birth-chart/ → Ashtakavarga) para a carta exacta
// da Melina, e confirmadas de novo contra a sequência publicada em
// CODE-4-melina-PASSA.md ("22·26·22·30·34·26·22·30·32·36·34·23") — as duas
// fontes batem 100%, célula a célula nas 8 colunas × 7 tabelas. Ver
// `sarvashtakavarga.test.ts` (passa) e `verify-bav-against-prokerala.ts`
// (script de auditoria, corre com tsx, não faz parte do módulo).

import { SIGNS_ORDER, CLASSICAL_GRAHAS, type ClassicalGraha } from "../lifeReport/types";
import type { ZodiacSign } from "../data/tables";

export type SavContributor = ClassicalGraha | "Lagna";
const CONTRIBUTORS: SavContributor[] = [...CLASSICAL_GRAHAS, "Lagna"];

/** Para cada planeta-alvo, e para cada um dos 8 contribuintes, as casas (contadas a partir da posição do contribuinte, 1-12) que recebem um ponto (bindu). Exportado só para auditoria (ver _diff-bav-prokerala.ts) — não é API pública do módulo. */
export const BAV_TABLE: Record<ClassicalGraha, Record<SavContributor, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

/** Total clássico de cada Bhinnashtakavarga — invariante, independente da carta. Usado só como auto-verificação de que a tabela acima não foi corrompida. */
export const BAV_CLASSICAL_TOTAL: Record<ClassicalGraha, number> = {
  Sun: 48,
  Moon: 49,
  Mars: 39,
  Mercury: 54,
  Jupiter: 56,
  Venus: 52,
  Saturn: 39,
};

export const SAV_GRAND_TOTAL = 337; // soma dos 7 totais acima — invariante clássico, qualquer carta

function signIndex(sign: ZodiacSign): number {
  return SIGNS_ORDER.indexOf(sign);
}

/** Auto-verificação de arranque: cada tabela tem de somar exactamente o total clássico da própria peça — falha aqui é sinal de erro de transcrição, não de bug de lógica. */
function assertTableIntegrity(): void {
  for (const target of CLASSICAL_GRAHAS) {
    const table = BAV_TABLE[target];
    const sum = CONTRIBUTORS.reduce((acc, c) => acc + table[c].length, 0);
    const expected = BAV_CLASSICAL_TOTAL[target];
    if (sum !== expected) {
      throw new Error(`[sarvashtakavarga] tabela de ${target} soma ${sum}, esperado ${expected} — tabela corrompida, não usar.`);
    }
  }
}
assertTableIntegrity();

export interface BhinnashtakavargaResult {
  planet: ClassicalGraha;
  /** Pontos (bindus) por signo, na ordem de SIGNS_ORDER (índice 0 = Áries). */
  bySign: number[];
}

/** Bhinnashtakavarga (ashtakavarga individual) de um planeta — os pontos que ele recebe em cada signo, vindos dos 8 contribuintes. */
export function computeBhinnashtakavarga(target: ClassicalGraha, contributorSigns: Record<SavContributor, ZodiacSign>): BhinnashtakavargaResult {
  const bySign = new Array(12).fill(0) as number[];
  const table = BAV_TABLE[target];
  for (const contributor of CONTRIBUTORS) {
    const fromIndex = signIndex(contributorSigns[contributor]);
    for (const houseOffset of table[contributor]) {
      const targetIndex = (fromIndex + houseOffset - 1) % 12;
      bySign[targetIndex] += 1;
    }
  }
  return { planet: target, bySign };
}

export interface SarvashtakavargaResult {
  /** Pontuação total (soma dos 7 Bhinnashtakavargas) por signo, na ordem de SIGNS_ORDER. */
  bySign: number[];
  /** Pontuação por casa (1-12, whole-sign a partir do ascendente). */
  byHouse: { casa: number; pontuacao: number }[];
  perPlanet: BhinnashtakavargaResult[];
  total: number;
  media: number;
}

/**
 * Sarvashtakavarga completo. `contributorSigns` tem de trazer o signo de
 * cada um dos 7 grahas clássicos + o signo do Ascendente ("Lagna") — a
 * MESMA leitura sideral (D-1, ayanamsa Lahiri) usada no resto do motor.
 * `ascendantSign` decide a casa 1 para a conversão signo→casa (whole-sign).
 */
export function computeSarvashtakavarga(contributorSigns: Record<SavContributor, ZodiacSign>, ascendantSign: ZodiacSign): SarvashtakavargaResult {
  const perPlanet = CLASSICAL_GRAHAS.map((p) => computeBhinnashtakavarga(p, contributorSigns));
  const bySign = new Array(12).fill(0) as number[];
  for (const p of perPlanet) {
    for (let i = 0; i < 12; i++) bySign[i] += p.bySign[i];
  }
  const total = bySign.reduce((a, b) => a + b, 0);
  const ascIndex = signIndex(ascendantSign);
  const byHouse = Array.from({ length: 12 }, (_, h) => {
    const signIdx = (ascIndex + h) % 12;
    return { casa: h + 1, pontuacao: bySign[signIdx] };
  });
  return { bySign, byHouse, perPlanet, total, media: total / 12 };
}

/** Critério 9 (v3/CASOS-VIOLADORES): SAV(casa) < 25 — não confundir com "abaixo da média" (a média ronda 28,1, e metade das casas de qualquer carta fica abaixo dela; ver SPEC-criterios-9-10-11.md). */
export const CRITERIO_9_LIMIAR = 25;

export function casasComApoioBaixo(sav: SarvashtakavargaResult): { casa: number; pontuacao: number }[] {
  return sav.byHouse.filter((h) => h.pontuacao < CRITERIO_9_LIMIAR);
}
