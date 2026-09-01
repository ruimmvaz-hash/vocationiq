import type { ZodiacSign } from "../data/tables";

// Sidereal signs share the same 12 names as tropical signs (data/tables.ts
// ZodiacSign) — only the ecliptic reference point differs (Lahiri ayanamsa
// vs. the vernal equinox). No separate type needed.
const SIGNS_BY_LONGITUDE: ZodiacSign[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

export interface SiderealPosition {
  sign: ZodiacSign;
  degreeInSign: number; // 0-30
}

export function siderealSignAndDegree(siderealLongitude: number): SiderealPosition {
  const index = Math.floor(siderealLongitude / 30) % 12;
  const degreeInSign = siderealLongitude % 30;
  return { sign: SIGNS_BY_LONGITUDE[index], degreeInSign };
}
