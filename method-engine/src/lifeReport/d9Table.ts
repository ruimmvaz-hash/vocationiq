import type { ZodiacSign } from "../data/tables";
import { DIGNITY_TABLE, type DignityDetail } from "../data/dignity";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, type Graha } from "./types";
import { houseOf, type GrahaPosition } from "./positions";
import { navamsaSign } from "./navamsa";

export interface D9Row {
  graha: Graha;
  d1Sign: ZodiacSign;
  d9Sign: ZodiacSign;
  /** Whole-sign house relative to the D-9 Ascendant. */
  d9House: number;
  /** null for Rahu/Ketu, matching the D-1 table's convention. */
  d9Dignity: DignityDetail | null;
  vargottama: boolean;
}

export interface D9TableResult {
  ascendantD1Sign: ZodiacSign;
  ascendantD9Sign: ZodiacSign;
  rows: Record<Graha, D9Row>;
}

function isClassical(graha: Graha): graha is (typeof CLASSICAL_GRAHAS)[number] {
  return (CLASSICAL_GRAHAS as Graha[]).includes(graha);
}

/** M-004 C-4/C-PRO-4 — full D-9 (Navamsa) table for every graha, not just the Karakas (which only need the AK/AmK rows). */
export function computeD9Table(d1Positions: Record<Graha, GrahaPosition>, ascendantSign: ZodiacSign, ascendantDegreeInSign: number): D9TableResult {
  const ascendantD9Sign = navamsaSign(ascendantSign, ascendantDegreeInSign);

  const rows = {} as Record<Graha, D9Row>;
  for (const graha of ALL_GRAHAS) {
    const pos = d1Positions[graha];
    const d9Sign = navamsaSign(pos.sign, pos.degreeInSign);
    const classical = isClassical(graha);
    rows[graha] = {
      graha,
      d1Sign: pos.sign,
      d9Sign,
      d9House: houseOf(d9Sign, ascendantD9Sign),
      d9Dignity: classical ? DIGNITY_TABLE[graha][d9Sign] : null,
      vargottama: d9Sign === pos.sign,
    };
  }

  return { ascendantD1Sign: ascendantSign, ascendantD9Sign, rows };
}
