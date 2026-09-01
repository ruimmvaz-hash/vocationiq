// M-004 Parte C — Life Report Vedic engine. Separate namespace from the
// Snapshot's engine/astrology (DEC-031: "o Snapshot congela — não mexer").
// Reuses only the pure-astronomy primitives (ayanamsa, geocentric
// longitude, lunar node, sidereal sign/degree, Ascendant) — never the
// Snapshot's product-specific modules (atmakaraka.ts, aspects.ts,
// vedicLayer.ts), since M-004 mandates different rules (e.g. Atmakaraka
// excludes Rahu/Ketu here, unlike the Snapshot's 8-karaka rule).
import type { ZodiacSign } from "../data/tables";

export type ClassicalGraha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export type Graha = ClassicalGraha | "Rahu" | "Ketu";

export const CLASSICAL_GRAHAS: ClassicalGraha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export const ALL_GRAHAS: Graha[] = [...CLASSICAL_GRAHAS, "Rahu", "Ketu"];

export const SIGNS_ORDER: ZodiacSign[] = [
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

/** A resolved birth instant: UTC time + geographic coordinates. Timezone/geocoding resolution happens in the caller (web layer), same pattern as the Snapshot's Level 2. */
export interface BirthInput {
  utcDate: Date;
  latitude: number;
  longitude: number;
}
