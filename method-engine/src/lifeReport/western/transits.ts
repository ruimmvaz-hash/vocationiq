import type { ZodiacSign } from "../../data/tables";
import type { BirthInput } from "../types";
import { computeTropicalPosition } from "./tropical";
import { computePlacidusHouses, placidusHouseOf } from "./placidus";
import { normalizeDegrees } from "../../astrology/ayanamsa";

// M-004 C-OCI-3: Saturn (tropical) to angles and personal planets, hard
// aspects only (conjunction/square/opposition), orb 2 degrees. Jupiter
// (tropical) by Placidus house + conjunctions to angles/MC ruler.
// Current-snapshot only this session — no date-range pass-finding
// (stations/retrogrades across the transit's full duration), which
// would need a separate ephemeris scan; flagged in the status report.

const HARD_ASPECTS: { name: "Conjuncao" | "Quadratura" | "Oposicao"; angle: number }[] = [
  { name: "Conjuncao", angle: 0 },
  { name: "Quadratura", angle: 90 },
  { name: "Oposicao", angle: 180 },
];

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

export interface TransitAspectHit {
  to: string;
  aspect: "Conjuncao" | "Quadratura" | "Oposicao";
  orb: number;
}

function hardAspectsToTargets(transitLon: number, targets: [string, number][], orbLimit: number): TransitAspectHit[] {
  const hits: TransitAspectHit[] = [];
  for (const [name, lon] of targets) {
    const sep = angularSeparation(transitLon, lon);
    for (const { name: aspectName, angle } of HARD_ASPECTS) {
      const orb = Math.abs(sep - angle);
      if (orb <= orbLimit) hits.push({ to: name, aspect: aspectName, orb });
    }
  }
  return hits;
}

export interface TransitingPlanet {
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  natalHouse: number;
  aspectsToNatal: TransitAspectHit[];
}

export interface TransitResult {
  transitDate: Date;
  saturn: TransitingPlanet;
  jupiter: TransitingPlanet;
}

export function computeTransits(natal: BirthInput, transitDate: Date): TransitResult {
  const { cusps, ascendant, mc } = computePlacidusHouses(natal.utcDate, natal.latitude, natal.longitude);
  const natalTargets: [string, number][] = [
    ["Sun", computeTropicalPosition("Sun", natal.utcDate).longitude],
    ["Moon", computeTropicalPosition("Moon", natal.utcDate).longitude],
    ["Mercury", computeTropicalPosition("Mercury", natal.utcDate).longitude],
    ["Venus", computeTropicalPosition("Venus", natal.utcDate).longitude],
    ["Mars", computeTropicalPosition("Mars", natal.utcDate).longitude],
    ["Ascendente", ascendant],
    ["MC", mc],
  ];

  const saturnPos = computeTropicalPosition("Saturn", transitDate);
  const jupiterPos = computeTropicalPosition("Jupiter", transitDate);

  return {
    transitDate,
    saturn: {
      longitude: saturnPos.longitude,
      sign: saturnPos.sign,
      degreeInSign: saturnPos.degreeInSign,
      natalHouse: placidusHouseOf(saturnPos.longitude, cusps),
      aspectsToNatal: hardAspectsToTargets(saturnPos.longitude, natalTargets, 2),
    },
    jupiter: {
      longitude: jupiterPos.longitude,
      sign: jupiterPos.sign,
      degreeInSign: jupiterPos.degreeInSign,
      natalHouse: placidusHouseOf(jupiterPos.longitude, cusps),
      aspectsToNatal: hardAspectsToTargets(jupiterPos.longitude, [["Ascendente", ascendant], ["MC", mc]], 2),
    },
  };
}
