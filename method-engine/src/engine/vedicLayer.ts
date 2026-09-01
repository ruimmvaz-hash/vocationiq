import type { BirthDate } from "../numerology/lifePath";
import type { ZodiacSign } from "../data/tables";
import { computeSunAspects, type AspectHit } from "../astrology/aspects";
import { toSidereal, normalizeDegrees } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";
import { getNakshatra, type NakshatraPosition } from "../astrology/nakshatra";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { computeAtmakaraka, type Karaka } from "../astrology/atmakaraka";
import { computeAscendant } from "../astrology/ascendant";
import { getDignityLevel, type DignityLevel } from "../data/dignity";
import { tropicalNorthNodeLongitude, tropicalSignAndDegree } from "../lifeReport/western/tropical";
import { computeAllGrahaPositions, computeGrahaPosition } from "../lifeReport/positions";
import { computeArudhaLagna } from "../lifeReport/arudhaLagna";
import { SunPosition } from "astronomy-engine";

export interface VedicLevel1Result {
  sunSiderealSign: ZodiacSign;
  primaryAspect: AspectHit | null;
  secondaryAspect: AspectHit | null;
  /** Set only when primaryAspect is null (M-002-A: <5% of people). */
  fallbackNakshatra: NakshatraPosition | null;
  /** Bloco 1 (reescrita do Snapshot) — Nodo Sul (Ketu) por signo OCIDENTAL (tropical), Secção 1 do N1. Nós lunares são sempre exactamente opostos: Ketu = Rahu + 180°. */
  southNodeWesternSign: ZodiacSign;
}

/**
 * M-002 v0.5.1 §5.1 — Level 1 nugget (date only). Sidereal (Lahiri) Sun
 * aspects to the slow planets; falls back to the solar nakshatra when no
 * aspect is stable across the unknown time-of-day.
 */
export function computeVedicLevel1(birthDate: BirthDate): VedicLevel1Result {
  const noonUtc = new Date(Date.UTC(birthDate.year, birthDate.month - 1, birthDate.day, 12, 0, 0));
  const sunSidereal = toSidereal(SunPosition(noonUtc).elon, noonUtc);
  const { sign: sunSiderealSign } = siderealSignAndDegree(sunSidereal);

  const { primary, secondary } = computeSunAspects(birthDate);
  const fallbackNakshatra = primary ? null : getNakshatra(sunSidereal);

  const southNodeTropicalLongitude = normalizeDegrees(tropicalNorthNodeLongitude(noonUtc) + 180);
  const southNodeWesternSign = tropicalSignAndDegree(southNodeTropicalLongitude).sign;

  return { sunSiderealSign, primaryAspect: primary, secondaryAspect: secondary, fallbackNakshatra, southNodeWesternSign };
}

export interface VedicLevel2Result {
  atmakaraka: Karaka;
  atmakarakaSign: ZodiacSign;
  atmakarakaDignity: DignityLevel;
  ascendantSign: ZodiacSign;
  moonSign: ZodiacSign;
  moonNakshatra: NakshatraPosition;
  /** Bloco 1 — Nodo Sul (Ketu) védico: signo sideral + casa inteira a partir do Ascendente (Secção 1 do N2). */
  southNodeSign: ZodiacSign;
  southNodeHouse: number;
  /** Bloco 1 — Rahu védico: signo sideral + casa inteira (Secção 2 do N2). */
  northNodeSign: ZodiacSign;
  northNodeHouse: number;
  /**
   * Bloco 1 — Arudha Lagna (a imagem no mundo, Secção 3 do N2). Reaproveita
   * o mesmo cálculo puro e universal do Life Report (computeArudhaLagna) —
   * a técnica de Arudha Lagna não é uma regra interpretativa específica de
   * produto (ao contrário do Atmakaraka, que tem definições DIFERENTES no
   * Snapshot vs Life Report, DEC-031); é o mesmo algoritmo matemático em
   * qualquer contexto, por isso a reutilização aqui não infringe a
   * separação de motores entre Snapshot e Life Report.
   */
  arudhaLagnaSign: ZodiacSign;
  arudhaLagnaHouseFromAscendant: number;
}

/**
 * M-002 v0.5.1 §5.2 — Level 2 nugget (date + precise UTC time + location).
 * `utcDate` must already be the resolved UTC instant of birth (local birth
 * time converted via the birth location's timezone — that conversion
 * happens in the web layer, which has geocoding access; this function is
 * pure/deterministic given a UTC instant + coordinates).
 */
export function computeVedicLevel2(utcDate: Date, latitude: number, longitude: number): VedicLevel2Result {
  const ak = computeAtmakaraka(utcDate);
  const akDignity = getDignityLevel(ak.planet, ak.sign);

  const ascendant = computeAscendant(utcDate, latitude, longitude);

  const moonSidereal = toSidereal(tropicalLongitudeOf("Moon", utcDate), utcDate);
  const { sign: moonSign } = siderealSignAndDegree(moonSidereal);
  const moonNakshatra = getNakshatra(moonSidereal);

  const rahuPosition = computeGrahaPosition("Rahu", utcDate, ascendant.sign);
  const ketuPosition = computeGrahaPosition("Ketu", utcDate, ascendant.sign);
  const allPositions = computeAllGrahaPositions(utcDate, ascendant.sign);
  const arudhaLagna = computeArudhaLagna(ascendant.sign, allPositions);

  return {
    atmakaraka: ak.planet,
    atmakarakaSign: ak.sign,
    atmakarakaDignity: akDignity,
    ascendantSign: ascendant.sign,
    moonSign,
    moonNakshatra,
    southNodeSign: ketuPosition.sign,
    southNodeHouse: ketuPosition.house,
    northNodeSign: rahuPosition.sign,
    northNodeHouse: rahuPosition.house,
    arudhaLagnaSign: arudhaLagna.sign,
    arudhaLagnaHouseFromAscendant: arudhaLagna.houseFromAscendant,
  };
}
