import { tropicalLongitudeOf } from "../../astrology/geocentric";
import { meanLunarNodeLongitude } from "../../astrology/lunarNode";
import { normalizeDegrees } from "../../astrology/ayanamsa";
import { SIGNS_ORDER, type ClassicalGraha } from "../types";
import type { ZodiacSign } from "../../data/tables";

export interface TropicalSignDegree {
  sign: ZodiacSign;
  degreeInSign: number;
}

export function tropicalSignAndDegree(longitude: number): TropicalSignDegree {
  const norm = normalizeDegrees(longitude);
  const index = Math.floor(norm / 30);
  return { sign: SIGNS_ORDER[index], degreeInSign: norm - index * 30 };
}

export interface TropicalPosition extends TropicalSignDegree {
  longitude: number;
}

export function computeTropicalPosition(planet: ClassicalGraha, date: Date): TropicalPosition {
  const longitude = tropicalLongitudeOf(planet, date);
  return { longitude, ...tropicalSignAndDegree(longitude) };
}

/** Mean North Node (Rahu), tropical — same underlying longitude as the Vedic engine's Rahu, just not shifted by the ayanamsa. */
export function tropicalNorthNodeLongitude(date: Date): number {
  return meanLunarNodeLongitude(date);
}
