import type { ZodiacSign } from "../data/tables";
import { ALL_GRAHAS, type Graha } from "./types";
import type { GrahaPosition } from "./positions";

export interface Conjunction {
  a: Graha;
  b: Graha;
  sign: ZodiacSign;
  distanceDegrees: number;
}

/** M-004 C-1/C-PRO-1 point 10: same-sign conjunctions, with the exact degree distance. */
export function computeConjunctions(positions: Record<Graha, GrahaPosition>): Conjunction[] {
  const conjunctions: Conjunction[] = [];
  for (let i = 0; i < ALL_GRAHAS.length; i++) {
    for (let j = i + 1; j < ALL_GRAHAS.length; j++) {
      const a = ALL_GRAHAS[i];
      const b = ALL_GRAHAS[j];
      if (positions[a].sign === positions[b].sign) {
        conjunctions.push({
          a,
          b,
          sign: positions[a].sign,
          distanceDegrees: Math.abs(positions[a].degreeInSign - positions[b].degreeInSign),
        });
      }
    }
  }
  return conjunctions;
}
