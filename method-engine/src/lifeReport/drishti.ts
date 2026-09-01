import { ALL_GRAHAS, type ClassicalGraha, type Graha } from "./types";
import type { GrahaPosition } from "./positions";

// M-004 C-1/C-PRO-1 point 4/5: every graha aspects the 7th sign from
// itself (whole-sign, no orb); Mars/Jupiter/Saturn get extra special
// aspects.
const SPECIAL_ASPECT_OFFSETS: Partial<Record<ClassicalGraha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
};

function aspectOffsetsOf(graha: Graha): number[] {
  const special = SPECIAL_ASPECT_OFFSETS[graha as ClassicalGraha] ?? [];
  return [7, ...special];
}

/** Every house `graha` aspects (Parashari whole-sign), independent of who else occupies them — used for "Drishti received on House 1" (the Ascendant, not a graha). */
export function aspectedHouses(graha: Graha, positions: Record<Graha, GrahaPosition>): number[] {
  const fromHouse = positions[graha].house;
  return aspectOffsetsOf(graha).map((offset) => ((fromHouse + offset - 2) % 12) + 1);
}

export interface DrishtiHit {
  from: Graha;
  to: Graha;
  /** Which numbered aspect (7, 4, 8, 5, 9, 3, or 10) produced this hit. */
  offset: number;
}

/** All Parashari whole-sign aspects among the 9 grahas. Read `hits` for "received by" (filter to === graha) or "emitted by" (filter from === graha). */
export function computeAllDrishti(positions: Record<Graha, GrahaPosition>): DrishtiHit[] {
  const hits: DrishtiHit[] = [];
  for (const from of ALL_GRAHAS) {
    const fromHouse = positions[from].house;
    for (const offset of aspectOffsetsOf(from)) {
      const targetHouse = ((fromHouse + offset - 2) % 12) + 1;
      for (const to of ALL_GRAHAS) {
        if (to === from) continue;
        if (positions[to].house === targetHouse) {
          hits.push({ from, to, offset });
        }
      }
    }
  }
  return hits;
}

export function received(hits: DrishtiHit[], graha: Graha): DrishtiHit[] {
  return hits.filter((h) => h.to === graha);
}

export function emitted(hits: DrishtiHit[], graha: Graha): DrishtiHit[] {
  return hits.filter((h) => h.from === graha);
}

export interface EmittedTarget {
  offset: number;
  targetHouse: number;
  isAscendant: boolean;
  /** Other grahas occupying `targetHouse` — empty when the aspect lands on an unoccupied house (still a real aspect, per both GABARITO tables, which note these too, e.g. "5º→Libra/3"). */
  occupants: Graha[];
}

/** Every aspect `graha` emits, including ones landing on an empty house or on the Ascendant (house 1) — `computeAllDrishti`/`emitted` only report hits on OTHER GRAHAS, which silently drops these. */
export function emittedTargets(graha: Graha, positions: Record<Graha, GrahaPosition>): EmittedTarget[] {
  const fromHouse = positions[graha].house;
  return aspectOffsetsOf(graha).map((offset) => {
    const targetHouse = ((fromHouse + offset - 2) % 12) + 1;
    const occupants = ALL_GRAHAS.filter((g) => g !== graha && positions[g].house === targetHouse);
    return { offset, targetHouse, isAscendant: targetHouse === 1, occupants };
  });
}
