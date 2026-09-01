import type { ZodiacSign } from "../data/tables";
import { CLASSICAL_GRAHAS, SIGNS_ORDER, type ClassicalGraha } from "./types";

/** Classical (Vedic) sign rulerships — 7 grahas only, no modern co-rulers. */
export const SIGN_RULERS: Record<ZodiacSign, ClassicalGraha> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

/**
 * M-004 C-1/C-PRO-1 point 3: "que casas cada graha rege a partir do
 * Ascendente" — for each of the 12 whole-sign houses (from the given
 * Vedic Ascendant), find that house's sign, then that sign's ruler, and
 * record the house against the ruler.
 */
export function functionalRulerships(ascendantSign: ZodiacSign): Record<ClassicalGraha, number[]> {
  const result = Object.fromEntries(CLASSICAL_GRAHAS.map((g) => [g, [] as number[]])) as Record<ClassicalGraha, number[]>;
  const ascIndex = SIGNS_ORDER.indexOf(ascendantSign);
  for (let house = 1; house <= 12; house++) {
    const signIndex = (ascIndex + house - 1) % 12;
    const sign = SIGNS_ORDER[signIndex];
    const ruler = SIGN_RULERS[sign];
    result[ruler].push(house);
  }
  return result;
}
