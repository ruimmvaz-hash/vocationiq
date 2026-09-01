import type { ZodiacSign } from "../data/tables";
import { DIGNITY_TABLE, type DignityDetail } from "../data/dignity";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, type Graha } from "./types";
import { houseOf } from "./positions";
import { dasamshaSign } from "./dasamsha";

export interface D10Row {
  graha: Graha;
  d1Sign: ZodiacSign;
  d10Sign: ZodiacSign;
  /** Whole-sign house relative to the D-10 Ascendant. */
  d10House: number;
  /** null for Rahu/Ketu, matching the D-1/D-9 tables' convention. */
  d10Dignity: DignityDetail | null;
}

export interface D10TableResult {
  ascendantD1Sign: ZodiacSign;
  ascendantD10Sign: ZodiacSign;
  rows: Record<Graha, D10Row>;
}

function isClassical(graha: Graha): graha is (typeof CLASSICAL_GRAHAS)[number] {
  return (CLASSICAL_GRAHAS as Graha[]).includes(graha);
}

/**
 * Bloco 2 (VocationIQ) — tabela D-10 (Dasamsha) completa. Usada
 * exclusivamente pela REGRA 3 (exclusão de cargos) do algoritmo de síntese
 * vocacional — nunca pelo Life Report adulto, que não referencia o D-10.
 */
export function computeD10Table(
  d1Positions: Record<Graha, { sign: ZodiacSign; degreeInSign: number }>,
  ascendantSign: ZodiacSign,
  ascendantDegreeInSign: number,
): D10TableResult {
  const ascendantD10Sign = dasamshaSign(ascendantSign, ascendantDegreeInSign);

  const rows = {} as Record<Graha, D10Row>;
  for (const graha of ALL_GRAHAS) {
    const pos = d1Positions[graha];
    const d10Sign = dasamshaSign(pos.sign, pos.degreeInSign);
    const classical = isClassical(graha);
    rows[graha] = {
      graha,
      d1Sign: pos.sign,
      d10Sign,
      d10House: houseOf(d10Sign, ascendantD10Sign),
      d10Dignity: classical ? DIGNITY_TABLE[graha][d10Sign] : null,
    };
  }

  return { ascendantD1Sign: ascendantSign, ascendantD10Sign, rows };
}
