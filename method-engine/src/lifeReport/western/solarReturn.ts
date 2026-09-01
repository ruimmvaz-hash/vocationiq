import { SunPosition } from "astronomy-engine";
import { normalizeDegrees } from "../../astrology/ayanamsa";
import type { BirthInput } from "../types";
import { computeWesternTable, type WesternResult } from "./westernTable";

const SUN_DEG_PER_DAY = 0.9856;

function wrapSigned(deg: number): number {
  return ((deg + 540) % 360) - 180;
}

/**
 * M-004 C-PRO-7.5 — Solar Return: the instant the transiting tropical
 * Sun returns to its exact natal longitude in the given year, solved by
 * Newton iteration from the calendar birthday (converges in ~3 steps;
 * the Sun's motion is nearly linear over a few days).
 */
export function findSolarReturnInstant(natalSunLongitude: number, birthUtc: Date, returnYear: number): Date {
  const approx = new Date(Date.UTC(returnYear, birthUtc.getUTCMonth(), birthUtc.getUTCDate(), birthUtc.getUTCHours(), birthUtc.getUTCMinutes()));
  let t = approx.getTime();
  for (let i = 0; i < 10; i++) {
    const current = SunPosition(new Date(t)).elon;
    const diff = wrapSigned(natalSunLongitude - current);
    if (Math.abs(diff) < 1e-7) break;
    t += (diff / SUN_DEG_PER_DAY) * 86400000;
  }
  return new Date(t);
}

export interface SolarReturnResult {
  instantUtc: Date;
  chart: WesternResult;
}

/** Solar Return chart cast for the residence location (M-004: "astro.com, residência atual"), not the birthplace. */
export function computeSolarReturn(natal: BirthInput, natalSunLongitude: number, returnYear: number, residenceLat: number, residenceLon: number): SolarReturnResult {
  const instantUtc = findSolarReturnInstant(natalSunLongitude, natal.utcDate, returnYear);
  const chart = computeWesternTable({ utcDate: instantUtc, latitude: residenceLat, longitude: residenceLon });
  return { instantUtc, chart };
}
