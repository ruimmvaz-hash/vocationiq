import { DEG2RAD, MakeTime, RAD2DEG, SiderealTime, e_tilt } from "astronomy-engine";
import { normalizeDegrees } from "../../astrology/ayanamsa";
import { computeAscendant } from "../../astrology/ascendant";

/**
 * Placidus house cusps — M-004 C-OCI-1 ("Placidus, tropical"). Standard
 * semi-arc method: intermediate cusps (11, 12, 2, 3) are ecliptic points
 * whose OWN semi-diurnal (11/12) or semi-nocturnal (2/3) arc, taken in
 * thirds from RAMC, matches their own current hour angle — solved by
 * iteration since a point's arc depends on its own declination, which
 * depends on the very longitude being solved for. Houses 5,6,8,9 are the
 * opposite-point mirror of 11,12,2,3 (every house system's cusps come in
 * antipodal pairs); 4/7 mirror the MC/Ascendant.
 */

function ramcAndObliquity(utcDate: Date, geoLongitude: number): { ramcDeg: number; obliquityDeg: number } {
  const gastHours = SiderealTime(utcDate);
  const ramcDeg = normalizeDegrees(gastHours * 15 + geoLongitude);
  const obliquityDeg = e_tilt(MakeTime(utcDate)).tobl;
  return { ramcDeg, obliquityDeg };
}

/** lambda(RA) = atan2(sin(RA), cos(eps) cos(RA)) — inverse of RA(lambda) = atan2(cos(eps) sin(lambda), cos(lambda)). */
function eclipticOfRa(raDeg: number, obliquityDeg: number): number {
  const ra = raDeg * DEG2RAD;
  const e = obliquityDeg * DEG2RAD;
  return normalizeDegrees(Math.atan2(Math.sin(ra), Math.cos(e) * Math.cos(ra)) * RAD2DEG);
}

function declinationOfEcliptic(lambdaDeg: number, obliquityDeg: number): number {
  const l = lambdaDeg * DEG2RAD;
  const e = obliquityDeg * DEG2RAD;
  return Math.asin(Math.sin(e) * Math.sin(l)) * RAD2DEG;
}

/** Semi-diurnal arc (degrees) for a point of this declination at this latitude — clamped for numerical safety near the poles (not reached at Lisbon/Luanda latitudes). */
function semiDiurnalArc(declinationDeg: number, latitudeDeg: number): number {
  const tanPhiTanDelta = Math.tan(latitudeDeg * DEG2RAD) * Math.tan(declinationDeg * DEG2RAD);
  const clamped = Math.max(-1, Math.min(1, -tanPhiTanDelta));
  return Math.acos(clamped) * RAD2DEG;
}

function iterateCusp(ramcDeg: number, latitudeDeg: number, obliquityDeg: number, targetRa: (arcDeg: number) => number, useNocturnalArc: boolean): number {
  let lambda = normalizeDegrees(ramcDeg + 45); // seed
  for (let i = 0; i < 15; i++) {
    const dec = declinationOfEcliptic(lambda, obliquityDeg);
    const sda = semiDiurnalArc(dec, latitudeDeg);
    const arc = useNocturnalArc ? 180 - sda : sda;
    const ra = normalizeDegrees(targetRa(arc));
    lambda = eclipticOfRa(ra, obliquityDeg);
  }
  return lambda;
}

export interface PlacidusHouses {
  mc: number;
  ascendant: number;
  /** Tropical ecliptic longitude of each cusp, index 0 = house 1 ... index 11 = house 12. */
  cusps: number[];
}

export function computePlacidusHouses(utcDate: Date, latitude: number, geoLongitude: number): PlacidusHouses {
  const { ramcDeg, obliquityDeg } = ramcAndObliquity(utcDate, geoLongitude);
  const mc = eclipticOfRa(ramcDeg, obliquityDeg);
  const ascendant = computeAscendant(utcDate, latitude, geoLongitude).tropicalLongitude;

  const cusp11 = iterateCusp(ramcDeg, latitude, obliquityDeg, (sda) => ramcDeg + sda / 3, false);
  const cusp12 = iterateCusp(ramcDeg, latitude, obliquityDeg, (sda) => ramcDeg + (2 * sda) / 3, false);
  const cusp2 = iterateCusp(ramcDeg, latitude, obliquityDeg, (sna) => ramcDeg + 180 - (2 * sna) / 3, true);
  const cusp3 = iterateCusp(ramcDeg, latitude, obliquityDeg, (sna) => ramcDeg + 180 - sna / 3, true);

  const cusps = [
    ascendant,
    cusp2,
    cusp3,
    normalizeDegrees(mc + 180),
    normalizeDegrees(cusp11 + 180),
    normalizeDegrees(cusp12 + 180),
    normalizeDegrees(ascendant + 180),
    normalizeDegrees(cusp2 + 180),
    normalizeDegrees(cusp3 + 180),
    mc,
    cusp11,
    cusp12,
  ].map(normalizeDegrees);

  return { mc, ascendant, cusps };
}

function forwardDistance(from: number, to: number): number {
  return normalizeDegrees(to - from);
}

/** Which Placidus house (1-12) a tropical longitude falls in, given the 12 cusps in house-1..12 order. */
export function placidusHouseOf(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const span = forwardDistance(cusps[i], cusps[(i + 1) % 12]);
    const pos = forwardDistance(cusps[i], longitude);
    if (pos < span) return i + 1;
  }
  return 12;
}
