import type { ZodiacSign } from "../data/tables";
import { toSidereal } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { SIGNS_ORDER } from "./types";

export type SadeSatiPhase = "Rising" | "Peak" | "Setting";

export interface SadeSatiStatus {
  active: boolean;
  phase: SadeSatiPhase | null;
  saturnSiderealSign: ZodiacSign;
  saturnDegreeInSign: number;
  /** 1-12: which house transiting Saturn occupies counted from the natal Moon's sign. */
  houseFromMoon: number;
}

/** M-004 C-PRO-7.2 — Sade Sati: active while sidereal Saturn transits the 12th, 1st, or 2nd sign from the natal Moon (Rising/Peak/Setting respectively). */
export function sadeSatiStatus(natalMoonSign: ZodiacSign, atDate: Date): SadeSatiStatus {
  const saturnSidereal = toSidereal(tropicalLongitudeOf("Saturn", atDate), atDate);
  const { sign, degreeInSign } = siderealSignAndDegree(saturnSidereal);
  const houseFromMoon = ((SIGNS_ORDER.indexOf(sign) - SIGNS_ORDER.indexOf(natalMoonSign) + 12) % 12) + 1;
  const phase: SadeSatiPhase | null = houseFromMoon === 12 ? "Rising" : houseFromMoon === 1 ? "Peak" : houseFromMoon === 2 ? "Setting" : null;
  return { active: phase !== null, phase, saturnSiderealSign: sign, saturnDegreeInSign: degreeInSign, houseFromMoon };
}
