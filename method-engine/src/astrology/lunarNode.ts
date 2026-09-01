import { normalizeDegrees } from "./ayanamsa";

const J2000_JD = 2451545.0;

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Mean lunar ascending node (Rahu), tropical geocentric ecliptic longitude.
 * Standard Meeus polynomial (Astronomical Algorithms, mean node of date).
 * The MEAN node is used deliberately (not the true/osculating node): it
 * moves smoothly retrograde with no station/loop periods, matching the
 * "stable for the whole day" design goal of Level 1 (DEC-030 default,
 * founder-confirmed). Ketu = this longitude + 180°.
 */
export function meanLunarNodeLongitude(date: Date): number {
  const T = (julianDay(date) - J2000_JD) / 36525;
  const omega =
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000;
  return normalizeDegrees(omega);
}
