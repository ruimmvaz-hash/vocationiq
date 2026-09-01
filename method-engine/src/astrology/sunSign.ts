import { SunPosition } from "astronomy-engine";
import type { BirthDate } from "../numerology/lifePath";
import type { ZodiacSign } from "../data/tables";

// Tropical zodiac signs in ecliptic-longitude order, each spanning 30°
// starting at the vernal equinox (0° Aries).
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

/**
 * Sun sign via apparent geocentric ecliptic longitude of date (astronomy-engine's
 * SunPosition, VSOP87/aberration-corrected), NOT fixed calendar-date tables — the
 * sign boundary crossing shifts by up to ~1-2 days year to year. Since M-002 §2
 * uses only date of birth (no time/place), the Sun's position is evaluated at
 * 12:00 UTC on the given date, the conventional reference time for date-only
 * solar calculations.
 */
export function calculateSunSign({ day, month, year }: BirthDate): ZodiacSign {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const { elon } = SunPosition(date);
  const index = Math.floor(elon / 30) % 12;
  return SIGNS_BY_LONGITUDE[index];
}
