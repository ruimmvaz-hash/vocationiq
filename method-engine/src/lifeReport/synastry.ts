import type { ZodiacSign } from "../data/tables";
import { normalizeDegrees } from "../astrology/ayanamsa";
import type { NakshatraName } from "../astrology/nakshatra";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, SIGNS_ORDER, type BirthInput, type ClassicalGraha, type Graha } from "./types";
import { computeD1Table, type D1TableResult } from "./d1Table";
import { houseOf } from "./positions";
import { SIGN_RULERS } from "./signRulers";
import { computeTropicalPosition, tropicalNorthNodeLongitude } from "./western/tropical";
import { computePlacidusHouses } from "./western/placidus";
import { currentDasha, type CurrentDasha } from "./dasha";

// M-004 Parte D — synastry engine. Orbs are valid in both systems
// because the ayanamsa cancels in the difference (D-1 note).

export interface SynastryPoint {
  name: string; // "Sun".."Saturn", "Ascendente", "MC", "Nodo Norte"
  longitude: number; // tropical
}

export type CrossAspectName = "Conjuncao" | "Sextil" | "Quadratura" | "Trigono" | "Oposicao";

const CROSS_ANGLES: { name: CrossAspectName; angle: number }[] = [
  { name: "Conjuncao", angle: 0 },
  { name: "Sextil", angle: 60 },
  { name: "Quadratura", angle: 90 },
  { name: "Trigono", angle: 120 },
  { name: "Oposicao", angle: 180 },
];

const CROSS_ORB = 7;
const EXACT_ORB = 2;

function separation(a: number, b: number): number {
  const d = Math.abs(normalizeDegrees(a - b));
  return d > 180 ? 360 - d : d;
}

export interface CrossAspect {
  fromA: string;
  toB: string;
  aspect: CrossAspectName;
  orb: number;
  exact: boolean; // <= 2 degrees
}

export interface PersonChart {
  name: string;
  birth: BirthInput;
  d1: D1TableResult;
  tropicalPoints: SynastryPoint[];
  currentDasha: CurrentDasha;
}

export function buildPersonChart(name: string, birth: BirthInput, dashaAt: Date): PersonChart {
  const d1 = computeD1Table(birth);
  const { ascendant, mc } = computePlacidusHouses(birth.utcDate, birth.latitude, birth.longitude);
  const tropicalPoints: SynastryPoint[] = [
    ...CLASSICAL_GRAHAS.map((p) => ({ name: p, longitude: computeTropicalPosition(p, birth.utcDate).longitude })),
    { name: "Ascendente", longitude: ascendant },
    { name: "MC", longitude: mc },
    { name: "Nodo Norte", longitude: tropicalNorthNodeLongitude(birth.utcDate) },
  ];
  return { name, birth, d1, tropicalPoints, currentDasha: currentDasha(birth.utcDate, dashaAt) };
}

/** D-1: every A-point x B-point crossing within 7 degrees; <=2 flagged exact. */
export function crossAspects(a: PersonChart, b: PersonChart): CrossAspect[] {
  const out: CrossAspect[] = [];
  for (const pa of a.tropicalPoints) {
    for (const pb of b.tropicalPoints) {
      const sep = separation(pa.longitude, pb.longitude);
      for (const { name, angle } of CROSS_ANGLES) {
        const orb = Math.abs(sep - angle);
        if (orb <= CROSS_ORB) {
          out.push({ fromA: pa.name, toB: pb.name, aspect: name, orb, exact: orb <= EXACT_ORB });
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// --- D-2: Drishti cruzado (sign-based, whole-sign Parashari) ---

const SPECIAL_OFFSETS: Partial<Record<Graha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
};

function drishtiTargetSigns(fromSign: ZodiacSign, graha: Graha): { offset: number; sign: ZodiacSign }[] {
  const fromIndex = SIGNS_ORDER.indexOf(fromSign);
  const offsets = [7, ...(SPECIAL_OFFSETS[graha] ?? [])];
  return offsets.map((offset) => ({ offset, sign: SIGNS_ORDER[(fromIndex + offset - 1) % 12] }));
}

export interface CrossDrishti {
  fromA: Graha;
  offset: number;
  targetSign: ZodiacSign;
  hitsB: Graha[]; // B's grahas sitting in that sign (Moon hits are the headline finding per M-004 D-2)
}

export function crossDrishti(a: PersonChart, b: PersonChart): CrossDrishti[] {
  const out: CrossDrishti[] = [];
  for (const graha of ALL_GRAHAS) {
    const fromSign = a.d1.rows[graha].sign;
    for (const target of drishtiTargetSigns(fromSign, graha)) {
      const hitsB = ALL_GRAHAS.filter((g) => b.d1.rows[g].sign === target.sign);
      if (hitsB.length) out.push({ fromA: graha, offset: target.offset, targetSign: target.sign, hitsB });
    }
  }
  return out;
}

// --- D-3: house overlays (sidereal whole-sign) ---

export interface HouseOverlay {
  graha: Graha;
  sign: ZodiacSign;
  houseInPartner: number;
}

/** Where A's grahas fall in B's whole-sign houses (from B's Vedic Ascendant). */
export function houseOverlays(a: PersonChart, b: PersonChart): HouseOverlay[] {
  return ALL_GRAHAS.map((graha) => {
    const sign = a.d1.rows[graha].sign;
    return { graha, sign, houseInPartner: houseOf(sign, b.d1.ascendant.sign) };
  });
}

// --- PONTOS_VEDICOS_CASAL: couple vedic points ---
// (renomeado de "D-4" — esse rótulo era um número de secção arbitrário do
// documento gerado, sem qualquer relação com o varga real Chaturthamsha,
// que nunca foi implementado; causava confusão a quem procurasse "D-4" no
// código à espera do varga.)

export interface CoupleVedicPoints {
  atmakarakaA: ClassicalGraha;
  atmakarakaB: ClassicalGraha;
  moonNakshatraA: { name: NakshatraName; lord: Graha };
  moonNakshatraB: { name: NakshatraName; lord: Graha };
  sameMoonLord: boolean;
  /** Sun of one in the Moon-nakshatra of the other = sidereal confirmation of a luminary exchange. */
  sunAInMoonNakshatraB: boolean;
  sunBInMoonNakshatraA: boolean;
  /** Count from A's Moon sign to B's (inclusive) and reverse: 5/9 favorable, 6/8 demanding, 2/12 delicate. */
  moonCountAtoB: number;
  moonCountBtoA: number;
  mangalDoshaA: boolean;
  mangalDoshaB: boolean;
}

const MANGAL_HOUSES = [1, 2, 4, 7, 8, 12];

export function coupleVedicPoints(a: PersonChart, b: PersonChart): CoupleVedicPoints {
  const moonA = a.d1.rows.Moon;
  const moonB = b.d1.rows.Moon;
  const countAtoB = ((SIGNS_ORDER.indexOf(moonB.sign) - SIGNS_ORDER.indexOf(moonA.sign) + 12) % 12) + 1;
  const countBtoA = ((SIGNS_ORDER.indexOf(moonA.sign) - SIGNS_ORDER.indexOf(moonB.sign) + 12) % 12) + 1;

  const sunADetail = { nakshatra: a.d1.rows.Sun.nakshatra };
  const sunBDetail = { nakshatra: b.d1.rows.Sun.nakshatra };

  return {
    atmakarakaA: a.d1.karakas.atmakaraka,
    atmakarakaB: b.d1.karakas.atmakaraka,
    moonNakshatraA: { name: moonA.nakshatra, lord: moonA.nakshatraLord },
    moonNakshatraB: { name: moonB.nakshatra, lord: moonB.nakshatraLord },
    sameMoonLord: moonA.nakshatraLord === moonB.nakshatraLord,
    sunAInMoonNakshatraB: sunADetail.nakshatra === moonB.nakshatra,
    sunBInMoonNakshatraA: sunBDetail.nakshatra === moonA.nakshatra,
    moonCountAtoB: countAtoB,
    moonCountBtoA: countBtoA,
    mangalDoshaA: MANGAL_HOUSES.includes(a.d1.rows.Mars.house),
    mangalDoshaB: MANGAL_HOUSES.includes(b.d1.rows.Mars.house),
  };
}

// --- D-5: Circuito de Tensão Dinâmica data (the narrative choice happens at writing time; this computes the technical circuit) ---
// (renomeado de "Casa da Dor" — esse nome colidia com o conceito DIFERENTE
// de blessingPainHouses.ts, regra H6/H8, que mantém o nome "Casa da Dor".)

export interface PainHouseData {
  house: number;
  houseSign: ZodiacSign;
  ruler: ClassicalGraha;
  rulerSign: ZodiacSign;
  rulerHouse: number;
  /** Sign-based drishti the ruler casts that land on partner's personal points (Moon, Venus, 7th-house sign, ruler of partner's 7th). */
  drishtiOnPartnerPoints: { offset: number; targetSign: ZodiacSign; partnerPointsHit: string[] }[];
  /** Tight (<=3 deg) western aspects from the ruler to partner's Moon/Venus/Asc/7th ruler. */
  tightWesternAspects: CrossAspect[];
}

export function painHouseCircuit(person: PersonChart, partner: PersonChart, house: number): PainHouseData {
  const houseSign = SIGNS_ORDER[(SIGNS_ORDER.indexOf(person.d1.ascendant.sign) + house - 1) % 12];
  const ruler = SIGN_RULERS[houseSign];
  const rulerRow = person.d1.rows[ruler];

  const partnerSeventhSign = SIGNS_ORDER[(SIGNS_ORDER.indexOf(partner.d1.ascendant.sign) + 6) % 12];
  const partnerSeventhRuler = SIGN_RULERS[partnerSeventhSign];

  const partnerPoints: [string, ZodiacSign][] = [
    ["Lua", partner.d1.rows.Moon.sign],
    ["Vénus", partner.d1.rows.Venus.sign],
    ["Casa 7", partnerSeventhSign],
    [`Regente da 7 (${partnerSeventhRuler})`, partner.d1.rows[partnerSeventhRuler].sign],
  ];

  const drishtiOnPartnerPoints = drishtiTargetSigns(rulerRow.sign, ruler)
    .map((t) => ({
      offset: t.offset,
      targetSign: t.sign,
      partnerPointsHit: partnerPoints.filter(([, sign]) => sign === t.sign).map(([label]) => label),
    }))
    .filter((t) => t.partnerPointsHit.length > 0);

  const rulerLon = person.tropicalPoints.find((p) => p.name === ruler)!.longitude;
  // Deduped: partnerSeventhRuler is often Venus itself, which would
  // otherwise report the same aspect twice.
  const partnerTargets = [...new Set(["Moon", "Venus", "Ascendente", partnerSeventhRuler])];
  const tightWesternAspects: CrossAspect[] = [];
  for (const targetName of partnerTargets) {
    const target = partner.tropicalPoints.find((p) => p.name === targetName);
    if (!target) continue;
    const sep = separation(rulerLon, target.longitude);
    for (const { name, angle } of CROSS_ANGLES) {
      const orb = Math.abs(sep - angle);
      if (orb <= 3) tightWesternAspects.push({ fromA: ruler, toB: targetName, aspect: name, orb, exact: orb <= EXACT_ORB });
    }
  }

  return { house, houseSign, ruler, rulerSign: rulerRow.sign, rulerHouse: rulerRow.house, drishtiOnPartnerPoints, tightWesternAspects };
}
