// TEMPORARY DEBUG MODE — diagnostic only, does not change assignArchetype's
// logic or output. Delete this file once the diagnosis is done; it's a
// read-only window into the same computation archetypeEngine.ts already
// does, not a second implementation to keep in sync.

import { calculateLifePath, type BirthDate } from "../numerology/lifePath";
import { calculateExpressionNumber } from "../numerology/expression";
import { calculateSunSign } from "../astrology/sunSign";
import {
  ARCHETYPE_MATRIX,
  NUMBER_TABLE,
  SIGN_TABLE,
  WEIGHTS,
  type Element,
  type ElementModality,
  type Modality,
} from "../data/tables";
import type { EngineWeights, Profile } from "./archetypeEngine";
import { computeVedicLevel1, computeVedicLevel2, type VedicLevel1Result, type VedicLevel2Result } from "./vedicLayer";

export interface ModalityVoteDebug {
  source: "sunSign" | "lifePath" | "expression";
  rawValue: string | number;
  modality: Modality;
  weight: number;
}

export interface DebugAssignment {
  input: { fullName: string; birthDate: BirthDate };
  sunSign: string;
  sunElement: Element;
  sunOnlyModality: Modality;
  lifePath: number;
  lifePathModality: Modality;
  expressionNumber: number;
  expressionModality: Modality;
  votes: ModalityVoteDebug[];
  modalityScores: Record<Modality, number>;
  winningModality: Modality;
  tie: boolean;
  finalArchetype: string;
  solArchetype: string;
  displaced: boolean;
}

export function debugAssignArchetype(profile: Profile, weights: EngineWeights = WEIGHTS): DebugAssignment {
  const sunSign = calculateSunSign(profile.birthDate);
  const lifePath = calculateLifePath(profile.birthDate);
  const expressionNumber = calculateExpressionNumber(profile.fullName);

  const sunEM: ElementModality = SIGN_TABLE[sunSign];
  const lifePathEM: ElementModality = NUMBER_TABLE[lifePath];
  const expressionEM: ElementModality = NUMBER_TABLE[expressionNumber];

  const votes: ModalityVoteDebug[] = [
    { source: "sunSign", rawValue: sunSign, modality: sunEM.modality, weight: weights.sunSign },
    { source: "lifePath", rawValue: lifePath, modality: lifePathEM.modality, weight: weights.lifePath },
    { source: "expression", rawValue: expressionNumber, modality: expressionEM.modality, weight: weights.expression },
  ];

  const modalityScores: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const vote of votes) {
    modalityScores[vote.modality] += vote.weight;
  }

  const maxScore = Math.max(...Object.values(modalityScores));
  const winners = (Object.keys(modalityScores) as Modality[]).filter((m) => modalityScores[m] === maxScore);
  const tie = winners.length > 1;
  const winningModality = tie ? sunEM.modality : winners[0];

  const element = sunEM.element;
  const finalArchetype = ARCHETYPE_MATRIX[element][winningModality];
  const solArchetype = ARCHETYPE_MATRIX[sunEM.element][sunEM.modality];

  return {
    input: { fullName: profile.fullName, birthDate: profile.birthDate },
    sunSign,
    sunElement: element,
    sunOnlyModality: sunEM.modality,
    lifePath,
    lifePathModality: lifePathEM.modality,
    expressionNumber,
    expressionModality: expressionEM.modality,
    votes,
    modalityScores,
    winningModality,
    tie,
    finalArchetype,
    solArchetype,
    displaced: finalArchetype !== solArchetype,
  };
}

export function printDebugAssignment(d: DebugAssignment): void {
  const { birthDate, fullName } = d.input;
  console.log(`\n=== Naveya archetype debug: ${fullName}, ${birthDate.day}/${birthDate.month}/${birthDate.year} ===\n`);

  console.log(`Sun sign: ${d.sunSign}`);
  console.log(`  Element (fixed, no vote): ${d.sunElement}`);
  console.log(`  Modality the sun alone gives: ${d.sunOnlyModality}\n`);

  console.log(`Life Path: ${d.lifePath}`);
  console.log(`  -> votes modality: ${d.lifePathModality} (weight ${d.votes[1].weight})\n`);

  console.log(`Expression Number: ${d.expressionNumber}`);
  console.log(`  -> votes modality: ${d.expressionModality} (weight ${d.votes[2].weight})\n`);

  console.log(`Sun votes modality: ${d.sunOnlyModality} (weight ${d.votes[0].weight})\n`);

  console.log("Modality vote tally:");
  for (const [modality, score] of Object.entries(d.modalityScores)) {
    const contributors = d.votes.filter((v) => v.modality === modality).map((v) => `${v.source}(${v.weight})`);
    console.log(`  ${modality}: ${score}${contributors.length ? ` [${contributors.join(" + ")}]` : ""}`);
  }
  console.log(`  Tie: ${d.tie} ${d.tie ? "-> sun's modality prevails" : ""}\n`);

  console.log(`Winning modality: ${d.winningModality}`);
  console.log(`Element (always sun's): ${d.sunElement}`);
  console.log(`Final archetype: ${d.finalArchetype}`);
  console.log(`Sun-only archetype would have been: ${d.solArchetype}`);
  console.log(`Displaced: ${d.displaced}\n`);
}

// M-002 v0.5.1 — Level 1/Level 2 nugget debug (aspects, Atmakaraka, dignity).

export interface DebugVedic {
  level1: VedicLevel1Result;
  level2: VedicLevel2Result | null;
}

/** `utcDate`/`latitude`/`longitude` are optional — pass them to also compute Level 2 (Atmakaraka/Ascendant). Omit for a Level-1-only (date-only) inspection. */
export function debugVedicNugget(birthDate: BirthDate, utcDate?: Date, latitude?: number, longitude?: number): DebugVedic {
  const level1 = computeVedicLevel1(birthDate);
  const level2 = utcDate !== undefined && latitude !== undefined && longitude !== undefined ? computeVedicLevel2(utcDate, latitude, longitude) : null;
  return { level1, level2 };
}

export function printDebugVedic(d: DebugVedic): void {
  console.log(`--- Vedic nugget (M-002 v0.5.1) ---`);
  console.log(`Sun sidereal sign (Lahiri): ${d.level1.sunSiderealSign}`);

  if (d.level1.primaryAspect) {
    const p = d.level1.primaryAspect;
    console.log(`Level 1 primary aspect: Sun-${p.planet} ${p.aspect} (orb ${p.orb.toFixed(2)}°, tone: ${p.tone})`);
    if (d.level1.secondaryAspect) {
      const s = d.level1.secondaryAspect;
      console.log(`Level 1 secondary aspect: Sun-${s.planet} ${s.aspect} (orb ${s.orb.toFixed(2)}°, tone: ${s.tone})`);
    } else {
      console.log(`Level 1 secondary aspect: none`);
    }
  } else if (d.level1.fallbackNakshatra) {
    console.log(`Level 1: no stable aspect (<5% case) -> fallback nakshatra: ${d.level1.fallbackNakshatra.name} (#${d.level1.fallbackNakshatra.index + 1})`);
  }

  if (d.level2) {
    console.log(`\nLevel 2 (birth time+place given):`);
    console.log(`  Atmakaraka: ${d.level2.atmakaraka} in ${d.level2.atmakarakaSign} (dignity: ${d.level2.atmakarakaDignity})`);
    console.log(`  Ascendant (Sob Pressão): ${d.level2.ascendantSign}`);
    console.log(`  Moon (Âncora): ${d.level2.moonSign}, nakshatra ${d.level2.moonNakshatra.name}`);
  } else {
    console.log(`\nLevel 2: not computed (no birth time+place provided)`);
  }
  console.log("");
}
