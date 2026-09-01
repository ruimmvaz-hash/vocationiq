import type { ZodiacSign } from "../data/tables";
import { toSidereal } from "./ayanamsa";
import { tropicalLongitudeOf } from "./geocentric";
import { meanLunarNodeLongitude } from "./lunarNode";
import { siderealSignAndDegree } from "./sidereal";

// M-002-C §DEC-027: 8 karakas WITH Rahu, WITHOUT Ketu (reserved for the
// Life Report).
export type Karaka = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu";
const KARAKAS: Karaka[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"];

export interface AtmakarakaResult {
  planet: Karaka;
  sign: ZodiacSign;
  /** The degree used for AK comparison (0-30). For Rahu this is 30 - degreeInSign (see below), not the raw degree. */
  effectiveDegree: number;
}

function effectiveDegreeOf(planet: Karaka, utcDate: Date): { sign: ZodiacSign; effectiveDegree: number } {
  const tropicalLongitude = planet === "Rahu" ? meanLunarNodeLongitude(utcDate) : tropicalLongitudeOf(planet, utcDate);
  const siderealLongitude = toSidereal(tropicalLongitude, utcDate);
  const { sign, degreeInSign } = siderealSignAndDegree(siderealLongitude);
  // M-002-C §5.2: "Rahu conta como 30° menos a longitude no signo" — Rahu's
  // AK-comparison degree runs in reverse because it's a shadow/retrograde point.
  const effectiveDegree = planet === "Rahu" ? 30 - degreeInSign : degreeInSign;
  return { sign, effectiveDegree };
}

/**
 * M-002-C Part 1: Atmakaraka = the karaka with the highest degree within its
 * own sign (0-30°), a deterministic, unambiguous rule. Requires a precise
 * UTC instant (Level 2 only — the Moon alone moves ~13°/day, so date-only
 * input isn't reliable; see M-002 v0.5.1 §2).
 */
export function computeAtmakaraka(utcDate: Date): AtmakarakaResult {
  let best: AtmakarakaResult | null = null;
  for (const planet of KARAKAS) {
    const { sign, effectiveDegree } = effectiveDegreeOf(planet, utcDate);
    if (!best || effectiveDegree > best.effectiveDegree) {
      best = { planet, sign, effectiveDegree };
    }
  }
  return best!;
}
