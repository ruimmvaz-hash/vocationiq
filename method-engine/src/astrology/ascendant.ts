import { DEG2RAD, MakeTime, RAD2DEG, SiderealTime, e_tilt } from "astronomy-engine";
import type { ZodiacSign } from "../data/tables";
import { normalizeDegrees, toSidereal } from "./ayanamsa";
import { siderealSignAndDegree } from "./sidereal";

export interface AscendantResult {
  sign: ZodiacSign;
  tropicalLongitude: number;
  /** Sidereal (Lahiri) ecliptic longitude, 0-360°. Additive field (M-004 Life Report needs it for Bhava Madhya); unused by the Snapshot, which only reads `sign`. */
  siderealLongitude: number;
  /** Degree within `sign`, 0-30 — the Life Report's Bhava Madhya "peak" reference. */
  degreeInSign: number;
}

/**
 * Ascendant (rising sign), the standard spherical-astronomy formula:
 * tan(lambda) = cos(theta) / (-sin(theta)*cos(eps) - tan(phi)*sin(eps))
 * where theta = local sidereal time (deg), eps = true obliquity of date,
 * phi = geographic latitude. Requires a precise UTC instant and
 * geographic coordinates — Level 2 only.
 *
 * BUGFIX (found while validating the Life Report's D-1 table against
 * hand-calculated GABARITO tables, M-004/DEC-031): the previous sign
 * convention here computed the DESCENDANT, not the Ascendant — it was
 * off by exactly 180° (confirmed against a known Ascendant: Leo 12°30'
 * came back as Aquarius 12°31', the opposite sign at essentially the
 * same degree — the unmistakable signature of an Asc/Desc swap). This
 * also affects the Snapshot's "Under Pressure" (Ascendant) section,
 * which shares this function — flagged separately since the Snapshot is
 * otherwise frozen this session.
 */
export function computeAscendant(utcDate: Date, latitude: number, longitude: number): AscendantResult {
  const gastHours = SiderealTime(utcDate);
  const lstDeg = normalizeDegrees(gastHours * 15 + longitude);
  const obliquityDeg = e_tilt(MakeTime(utcDate)).tobl;

  const lstRad = lstDeg * DEG2RAD;
  const oblRad = obliquityDeg * DEG2RAD;
  const latRad = latitude * DEG2RAD;

  const y = Math.cos(lstRad);
  const x = -Math.sin(lstRad) * Math.cos(oblRad) - Math.tan(latRad) * Math.sin(oblRad);
  const tropicalLongitude = normalizeDegrees(Math.atan2(y, x) * RAD2DEG);

  const sidereal = toSidereal(tropicalLongitude, utcDate);
  const { sign, degreeInSign } = siderealSignAndDegree(sidereal);
  return { sign, tropicalLongitude, siderealLongitude: sidereal, degreeInSign };
}
