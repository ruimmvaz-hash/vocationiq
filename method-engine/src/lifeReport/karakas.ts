import type { ZodiacSign } from "../data/tables";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, type ClassicalGraha, type Graha } from "./types";
import { houseOf, type GrahaPosition } from "./positions";
import { navamsaSign } from "./navamsa";

export interface KarakaResult {
  atmakaraka: ClassicalGraha;
  amatyakaraka: ClassicalGraha;
  atmakarakaD9Sign: ZodiacSign;
  amatyakarakaD9Sign: ZodiacSign;
  d9AscendantSign: ZodiacSign;
  karakamshaHouse: number;
  amatyakarakaD9House: number;
  /** Every graha (not just AK) whose D-9 sign equals its D-1 sign. */
  vargottama: Graha[];
}

/**
 * M-004 §FASE 2 correction + C-5/C-PRO-3: Atmakaraka = highest degree
 * within sign among the 7 CLASSICAL grahas only (excludes Rahu/Ketu —
 * this supersedes the Snapshot's 8-karaka rule per M-004's explicit
 * mandate, DEC-031). Amatyakaraka = 2nd highest. Karakamsha = AK's D-9
 * sign/house; Vargottama = same sign in D-1 and D-9.
 */
export function computeKarakas(
  d1Positions: Record<Graha, GrahaPosition>,
  ascendantSign: ZodiacSign,
  ascendantDegreeInSign: number,
): KarakaResult {
  const ranked = CLASSICAL_GRAHAS.map((graha) => ({ graha, degree: d1Positions[graha].degreeInSign })).sort(
    (a, b) => b.degree - a.degree,
  );
  const atmakaraka = ranked[0].graha;
  const amatyakaraka = ranked[1].graha;

  const d9AscendantSign = navamsaSign(ascendantSign, ascendantDegreeInSign);

  const d9SignOf = {} as Record<Graha, ZodiacSign>;
  const vargottama: Graha[] = [];
  for (const graha of ALL_GRAHAS) {
    const pos = d1Positions[graha];
    const d9Sign = navamsaSign(pos.sign, pos.degreeInSign);
    d9SignOf[graha] = d9Sign;
    if (d9Sign === pos.sign) vargottama.push(graha);
  }

  const atmakarakaD9Sign = d9SignOf[atmakaraka];
  const amatyakarakaD9Sign = d9SignOf[amatyakaraka];

  return {
    atmakaraka,
    amatyakaraka,
    atmakarakaD9Sign,
    amatyakarakaD9Sign,
    d9AscendantSign,
    karakamshaHouse: houseOf(atmakarakaD9Sign, d9AscendantSign),
    amatyakarakaD9House: houseOf(amatyakarakaD9Sign, d9AscendantSign),
    vargottama,
  };
}
