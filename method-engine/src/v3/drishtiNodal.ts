// FASE 1 — extensão do drishti para incluir o aspecto especial de
// Rahu/Ketu (escola Parashari: 5ª e 9ª, além da 7ª universal), que
// `lifeReport/drishti.ts` não calcula (`SPECIAL_ASPECT_OFFSETS` ali é
// tipado `Partial<Record<ClassicalGraha, ...>>`, que exclui os nós por
// construção — confirmado na auditoria de 23/08/2026, ver
// docs/AUDITORIA-CALCULOS-23Ago.md).
//
// Ficheiro NOVO — `lifeReport/drishti.ts` não é alterado; este módulo é
// a versão v3, com a tabela de aspectos especiais estendida aos 9 grahas.
// Reimplementa as mesmas 4 funções que `drishti.ts` expõe (mesma
// assinatura e mesmo comportamento para os 7 clássicos — só Rahu/Ketu
// mudam) para que `camada-a.ts` possa trocar um import pelo outro sem
// reescrever chamadores.

import { ALL_GRAHAS, type Graha } from "../lifeReport/types";
import type { GrahaPosition } from "../lifeReport/positions";

/**
 * Aspectos especiais, estendidos aos 9 grahas. Os 3 clássicos (Marte,
 * Júpiter, Saturno) são cópia exacta de `lifeReport/drishti.ts` — não
 * inventados de novo aqui. Rahu/Ketu 5ª/9ª é o acrescento desta auditoria,
 * citado no próprio pedido como "escola Parashari".
 */
const SPECIAL_ASPECT_OFFSETS_V3: Partial<Record<Graha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
  Rahu: [5, 9],
  Ketu: [5, 9],
};

function aspectOffsetsOfV3(graha: Graha): number[] {
  return [7, ...(SPECIAL_ASPECT_OFFSETS_V3[graha] ?? [])];
}

/** Equivalente a `aspectedHouses` de drishti.ts, com os offsets estendidos. */
export function aspectedHousesV3(graha: Graha, positions: Record<Graha, GrahaPosition>): number[] {
  const fromHouse = positions[graha].house;
  return aspectOffsetsOfV3(graha).map((offset) => ((fromHouse + offset - 2) % 12) + 1);
}

export interface DrishtiHitV3 {
  from: Graha;
  to: Graha;
  offset: number;
}

/** Equivalente a `computeAllDrishti` de drishti.ts, com os offsets estendidos. */
export function computeAllDrishtiV3(positions: Record<Graha, GrahaPosition>): DrishtiHitV3[] {
  const hits: DrishtiHitV3[] = [];
  for (const from of ALL_GRAHAS) {
    const fromHouse = positions[from].house;
    for (const offset of aspectOffsetsOfV3(from)) {
      const targetHouse = ((fromHouse + offset - 2) % 12) + 1;
      for (const to of ALL_GRAHAS) {
        if (to === from) continue;
        if (positions[to].house === targetHouse) hits.push({ from, to, offset });
      }
    }
  }
  return hits;
}

export function receivedV3(hits: DrishtiHitV3[], graha: Graha): DrishtiHitV3[] {
  return hits.filter((h) => h.to === graha);
}

export function emittedV3(hits: DrishtiHitV3[], graha: Graha): DrishtiHitV3[] {
  return hits.filter((h) => h.from === graha);
}

export interface EmittedTargetV3 {
  offset: number;
  targetHouse: number;
  isAscendant: boolean;
  occupants: Graha[];
}

/** Equivalente a `emittedTargets` de drishti.ts, com os offsets estendidos — inclui casas vazias e o Ascendente. */
export function emittedTargetsV3(graha: Graha, positions: Record<Graha, GrahaPosition>): EmittedTargetV3[] {
  const fromHouse = positions[graha].house;
  return aspectOffsetsOfV3(graha).map((offset) => {
    const targetHouse = ((fromHouse + offset - 2) % 12) + 1;
    const occupants = ALL_GRAHAS.filter((g) => g !== graha && positions[g].house === targetHouse);
    return { offset, targetHouse, isAscendant: targetHouse === 1, occupants };
  });
}
