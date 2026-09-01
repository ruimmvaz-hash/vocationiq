import type { BirthDate } from "../numerology/lifePath";
import { toSidereal } from "./ayanamsa";
import { tropicalLongitudeOf } from "./geocentric";
import { SunPosition } from "astronomy-engine";

export type AspectType = "Conjunction" | "Sextile" | "Square" | "Trine" | "Opposition";

const ASPECT_ANGLES: Record<AspectType, number> = {
  Conjunction: 0,
  Sextile: 60,
  Square: 90,
  Trine: 120,
  Opposition: 180,
};

// Bloco 1 (reescrita do Snapshot) — o Nível 1 passou a usar só os
// aspectos do Sol com planetas LENTOS (Saturno/Júpiter/Plutão/Úrano/
// Neptuno), orbe <=4°, per especificação explícita. Mantém a mesma
// margem de estabilidade de 1.2° (absorve o movimento do Sol de ~1°/dia,
// já que o Nível 1 não tem hora de nascimento) só que recalibrada para o
// corte efectivo ficar exactamente em 4°.
const NOMINAL_ORB = 5.2;
const STABILITY_MARGIN = 1.2;
const STABLE_ORB = NOMINAL_ORB - STABILITY_MARGIN;

export type AspectPlanet = "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

const FULL_ASPECT_PLANETS: AspectPlanet[] = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const CONJUNCTION_ONLY_PLANETS: AspectPlanet[] = [];

export type AspectTone = "fluid" | "tense" | "mixed";

export interface AspectHit {
  planet: AspectPlanet;
  aspect: AspectType;
  orb: number;
  tone: AspectTone;
}

export interface SunAspectResult {
  primary: AspectHit | null;
  secondary: AspectHit | null;
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// M-002-A: square/opposition are "tense". Conjunction/sextile/trine are
// "fluid" EXCEPT Saturn/Pluto in conjunction, which carry mixed charge
// (their fiches list both fluid and tense facets even at conjunction).
function toneFor(planet: AspectPlanet, aspect: AspectType): AspectTone {
  if (aspect === "Square" || aspect === "Opposition") return "tense";
  if (aspect === "Conjunction" && (planet === "Saturn" || planet === "Pluto")) return "mixed";
  return "fluid";
}

function findAspect(sunSidereal: number, planetSidereal: number, planet: AspectPlanet): AspectHit | null {
  const allowed: AspectType[] = CONJUNCTION_ONLY_PLANETS.includes(planet)
    ? ["Conjunction"]
    : ["Conjunction", "Sextile", "Square", "Trine", "Opposition"];
  const separation = angularSeparation(sunSidereal, planetSidereal);

  let best: AspectHit | null = null;
  for (const aspect of allowed) {
    const orb = Math.abs(separation - ASPECT_ANGLES[aspect]);
    if (orb <= STABLE_ORB && (!best || orb < best.orb)) {
      best = { planet, aspect, orb, tone: toneFor(planet, aspect) };
    }
  }
  return best;
}

function tropicalLongitudeOfAspectPlanet(planet: AspectPlanet, date: Date): number {
  return tropicalLongitudeOf(planet, date);
}

/**
 * M-002-A Level 1 nugget: the Sun's sidereal (Lahiri) aspects to the slow
 * planets, evaluated at noon UTC of the given date (date-only input — no
 * birth time available at Level 1). Selection rule (M-002-A): conjunction
 * has priority; otherwise smallest orb; primary + at most one secondary.
 * Returns {primary: null, secondary: null} when no aspect is stable
 * (~<5% of people) — the caller falls back to the solar nakshatra
 * (M-002-B).
 */
export function computeSunAspects(birthDate: BirthDate): SunAspectResult {
  const date = new Date(Date.UTC(birthDate.year, birthDate.month - 1, birthDate.day, 12, 0, 0));
  const sunSidereal = toSidereal(SunPosition(date).elon, date);

  const hits: AspectHit[] = [];
  for (const planet of [...FULL_ASPECT_PLANETS, ...CONJUNCTION_ONLY_PLANETS]) {
    const planetSidereal = toSidereal(tropicalLongitudeOfAspectPlanet(planet, date), date);
    const hit = findAspect(sunSidereal, planetSidereal, planet);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => {
    const aConj = a.aspect === "Conjunction";
    const bConj = b.aspect === "Conjunction";
    if (aConj !== bConj) return aConj ? -1 : 1;
    return a.orb - b.orb;
  });

  return { primary: hits[0] ?? null, secondary: hits[1] ?? null };
}
