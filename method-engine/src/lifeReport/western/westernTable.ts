import type { ZodiacSign } from "../../data/tables";
import { DIGNITY_TABLE } from "../../data/dignity";
import { CLASSICAL_GRAHAS, SIGNS_ORDER, type BirthInput, type ClassicalGraha } from "../types";
import { SIGN_RULERS } from "../signRulers";
import { computeTropicalPosition, tropicalNorthNodeLongitude, tropicalSignAndDegree, type TropicalPosition } from "./tropical";
import { computePlacidusHouses, placidusHouseOf } from "./placidus";
import { findAspect, type AspectHit } from "./aspects";

const LUMINARIES: ClassicalGraha[] = ["Sun", "Moon"];
// Applying/separating needs the INSTANTANEOUS direction of the orb, not a
// snapshot far enough away to have possibly swept past the exact aspect
// (the Moon moves ~13deg/day — a half-day step can overshoot a
// sub-1-degree orb entirely and flip the reading). One minute is small
// enough that even the Moon moves well under a hundredth of a degree,
// nowhere near any real orb, while still resolving the sign of the change.
const FUTURE_STEP_DAYS = 1 / 1440;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function oppositeSign(sign: ZodiacSign): ZodiacSign {
  return SIGNS_ORDER[(SIGNS_ORDER.indexOf(sign) + 6) % 12];
}

// SPEC-003 (Implementação 0) — "neutro" explícito em vez de `null`, para
// bater certo com os 5 níveis pedidos (Domicílio/Exaltação/Detrimento/
// Queda/Neutro). Planetas exteriores (Urano/Neptuno/Plutão) não são
// calculados em lado nenhum do motor (confirmado por grep a todo o
// method-engine/src) — por isso "western_dignity = não calculado" nunca
// chega a ser um caso real; não há código a produzi-lo.
export type TropicalDignity = "domicilio" | "exaltacao" | "detrimento" | "queda" | "neutro";

/**
 * M-004 C-OCI-1 point 1 dignity, reusing the classical rulership/exaltation
 * facts already in DIGNITY_TABLE (Own -> domicilio, Exalted -> exaltacao
 * directly; detrimento/queda are the opposite sign's Own/Exalted).
 *
 * Precedência de colisão (Mercúrio Virgem = Domicílio+Exaltação; Mercúrio
 * Peixes = Detrimento+Queda) já resolvida pela própria DIGNITY_TABLE, que
 * só guarda UM valor por célula — Mercúrio.Virgem="Exalted" (nunca
 * "Own"+"Exalted" em simultâneo), por isso a ordem de checks abaixo
 * (Own→Exalted→oposto-Own→oposto-Exalted) já dá Exaltação/Queda a
 * precedência correcta sem lógica extra.
 */
export function tropicalDignity(planet: ClassicalGraha, sign: ZodiacSign): TropicalDignity {
  const here = DIGNITY_TABLE[planet][sign];
  if (here === "Own") return "domicilio";
  if (here === "Exalted") return "exaltacao";
  const there = DIGNITY_TABLE[planet][oppositeSign(sign)];
  if (there === "Own") return "detrimento";
  if (there === "Exalted") return "queda";
  return "neutro";
}

export interface AspectEntry {
  to: string; // other planet name, "Ascendente", "MC", or "Nodo Norte"
  hit: AspectHit;
}

export interface WesternPlanetRow {
  planet: ClassicalGraha;
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  house: number;
  dignity: TropicalDignity;
  aspects: AspectEntry[];
}

export interface AngleInfo {
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  ruler: ClassicalGraha;
}

export interface HouseCuspInfo {
  house: number;
  sign: ZodiacSign;
  ruler: ClassicalGraha;
}

export interface WesternResult {
  mc: AngleInfo;
  ascendant: AngleInfo;
  northNode: { longitude: number; sign: ZodiacSign; degreeInSign: number; house: number; conjunctions: { to: string; orb: number }[] };
  house2: HouseCuspInfo;
  house6: HouseCuspInfo;
  house11: HouseCuspInfo;
  planets: Record<ClassicalGraha, WesternPlanetRow>;
}

function houseCusp(cusps: number[], house: number): HouseCuspInfo {
  const { sign } = tropicalSignAndDegree(cusps[house - 1]);
  return { house, sign, ruler: SIGN_RULERS[sign] };
}

/** M-004 Parte C-OCI — Western tropical/Placidus layer: positions, houses, dignity, full aspect grid, MC/Ascendant + rulers, houses 2/6/11, North Node. */
export function computeWesternTable(birth: BirthInput): WesternResult {
  const { utcDate, latitude, longitude } = birth;
  const futureDate = addDays(utcDate, FUTURE_STEP_DAYS);

  const { mc, ascendant, cusps } = computePlacidusHouses(utcDate, latitude, longitude);
  const futureHouses = computePlacidusHouses(futureDate, latitude, longitude);

  const current: Record<ClassicalGraha, TropicalPosition> = {} as Record<ClassicalGraha, TropicalPosition>;
  const future: Record<ClassicalGraha, TropicalPosition> = {} as Record<ClassicalGraha, TropicalPosition>;
  for (const planet of CLASSICAL_GRAHAS) {
    current[planet] = computeTropicalPosition(planet, utcDate);
    future[planet] = computeTropicalPosition(planet, futureDate);
  }

  const nodeNow = tropicalNorthNodeLongitude(utcDate);
  const nodeFuture = tropicalNorthNodeLongitude(futureDate);

  const planets = {} as Record<ClassicalGraha, WesternPlanetRow>;
  for (const planet of CLASSICAL_GRAHAS) {
    const pos = current[planet];
    const aspects: AspectEntry[] = [];

    for (const other of CLASSICAL_GRAHAS) {
      if (other === planet) continue;
      const involvesLuminary = LUMINARIES.includes(planet) || LUMINARIES.includes(other);
      const hit = findAspect(pos.longitude, current[other].longitude, future[planet].longitude, future[other].longitude, involvesLuminary);
      if (hit) aspects.push({ to: other, hit });
    }

    const involvesLuminaryAngle = LUMINARIES.includes(planet);
    const ascHit = findAspect(pos.longitude, ascendant, future[planet].longitude, futureHouses.ascendant, involvesLuminaryAngle);
    if (ascHit) aspects.push({ to: "Ascendente", hit: ascHit });

    // M-004 C-OCI-2 point 2: aspects to the MC use a flat 4-degree orb.
    const mcHit = findAspect(pos.longitude, mc, future[planet].longitude, futureHouses.mc, involvesLuminaryAngle, 4);
    if (mcHit) aspects.push({ to: "MC", hit: mcHit });

    planets[planet] = {
      planet,
      longitude: pos.longitude,
      sign: pos.sign,
      degreeInSign: pos.degreeInSign,
      house: placidusHouseOf(pos.longitude, cusps),
      dignity: tropicalDignity(planet, pos.sign),
      aspects,
    };
  }

  // M-004 C-OCI-2 point 5: North Node conjunctions <= 3 degrees to personal planets/angles only.
  const nodeConjunctions: { to: string; orb: number }[] = [];
  const nodeTargets: [string, number][] = [...CLASSICAL_GRAHAS.map((p): [string, number] => [p, current[p].longitude]), ["Ascendente", ascendant], ["MC", mc]];
  for (const [name, lon] of nodeTargets) {
    const diff = Math.abs(((nodeNow - lon + 540) % 360) - 180);
    if (diff <= 3) nodeConjunctions.push({ to: name, orb: diff });
  }

  const ascSignDeg = tropicalSignAndDegree(ascendant);
  const mcSignDeg = tropicalSignAndDegree(mc);
  const nodeSignDeg = tropicalSignAndDegree(nodeNow);

  return {
    mc: { longitude: mc, sign: mcSignDeg.sign, degreeInSign: mcSignDeg.degreeInSign, ruler: SIGN_RULERS[mcSignDeg.sign] },
    ascendant: { longitude: ascendant, sign: ascSignDeg.sign, degreeInSign: ascSignDeg.degreeInSign, ruler: SIGN_RULERS[ascSignDeg.sign] },
    northNode: { longitude: nodeNow, sign: nodeSignDeg.sign, degreeInSign: nodeSignDeg.degreeInSign, house: placidusHouseOf(nodeNow, cusps), conjunctions: nodeConjunctions },
    house2: houseCusp(cusps, 2),
    house6: houseCusp(cusps, 6),
    house11: houseCusp(cusps, 11),
    planets,
  };
}
