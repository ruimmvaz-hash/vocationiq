import { getNakshatra, NAKSHATRAS, type NakshatraName, type NakshatraPosition } from "../astrology/nakshatra";
import type { Graha } from "./types";

// Vimshottari dasha-lord sequence, cycling every 9 nakshatras (3 full
// cycles across the 27). Standard, fixed order.
const LORD_CYCLE: Graha[] = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

export const NAKSHATRA_LORDS: Record<NakshatraName, Graha> = Object.fromEntries(
  NAKSHATRAS.map((name, index) => [name, LORD_CYCLE[index % 9]]),
) as Record<NakshatraName, Graha>;

const NAKSHATRA_SPAN = 360 / 27;
const PADA_SPAN = NAKSHATRA_SPAN / 4;

export interface NakshatraDetail extends NakshatraPosition {
  pada: number; // 1-4
  lord: Graha;
}

export function getNakshatraDetail(siderealLongitude: number): NakshatraDetail {
  const position = getNakshatra(siderealLongitude);
  const degreeWithinNakshatra = siderealLongitude - position.index * NAKSHATRA_SPAN;
  const pada = Math.min(Math.floor(degreeWithinNakshatra / PADA_SPAN) + 1, 4);
  return { ...position, pada, lord: NAKSHATRA_LORDS[position.name] };
}
