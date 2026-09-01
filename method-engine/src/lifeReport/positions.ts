import type { ZodiacSign } from "../data/tables";
import { normalizeDegrees, toSidereal } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";
import { meanLunarNodeLongitude } from "../astrology/lunarNode";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { ALL_GRAHAS, SIGNS_ORDER, type Graha } from "./types";

export interface GrahaPosition {
  graha: Graha;
  siderealLongitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  house: number; // 1-12, whole-sign from the Vedic Ascendant
}

function siderealLongitudeOfGraha(graha: Graha, utcDate: Date): number {
  if (graha === "Rahu") return toSidereal(meanLunarNodeLongitude(utcDate), utcDate);
  if (graha === "Ketu") return normalizeDegrees(toSidereal(meanLunarNodeLongitude(utcDate), utcDate) + 180);
  return toSidereal(tropicalLongitudeOf(graha, utcDate), utcDate);
}

/** Whole-sign house of `sign`, counted from `ascendantSign` (house 1). */
export function houseOf(sign: ZodiacSign, ascendantSign: ZodiacSign): number {
  const signIndex = SIGNS_ORDER.indexOf(sign);
  const ascIndex = SIGNS_ORDER.indexOf(ascendantSign);
  return ((signIndex - ascIndex + 12) % 12) + 1;
}

/** Inverse of `houseOf`: which sign occupies whole-sign house `house` (1-12) from `ascendantSign`. */
export function signOfHouse(house: number, ascendantSign: ZodiacSign): ZodiacSign {
  const ascIndex = SIGNS_ORDER.indexOf(ascendantSign);
  return SIGNS_ORDER[(ascIndex + house - 1) % 12];
}

export function computeGrahaPosition(graha: Graha, utcDate: Date, ascendantSign: ZodiacSign): GrahaPosition {
  const siderealLongitude = siderealLongitudeOfGraha(graha, utcDate);
  const { sign, degreeInSign } = siderealSignAndDegree(siderealLongitude);
  return { graha, siderealLongitude, sign, degreeInSign, house: houseOf(sign, ascendantSign) };
}

export function computeAllGrahaPositions(utcDate: Date, ascendantSign: ZodiacSign): Record<Graha, GrahaPosition> {
  const result = {} as Record<Graha, GrahaPosition>;
  for (const graha of ALL_GRAHAS) {
    result[graha] = computeGrahaPosition(graha, utcDate, ascendantSign);
  }
  return result;
}
