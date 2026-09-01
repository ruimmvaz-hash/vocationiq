import { describe, expect, it } from "vitest";
import { ALL_GRAHAS, type Graha } from "../src/lifeReport/types.js";
import type { GrahaPosition } from "../src/lifeReport/positions.js";
import { computeAllDrishti } from "../src/lifeReport/drishti.js";
import { computeAllDrishtiV3, aspectedHousesV3 } from "../src/v3/drishtiNodal.js";

// FASE 1 — verificado 23/08/2026 contra a carta da Melina
// (CODE-4-melina-PASSA.md): casas Sol 11, Lua 7, Mercúrio 12, Vénus 1,
// Marte 1, Júpiter 12, Saturno 10, Rahu 5, Ketu 11. Sem 2ª fonte externa
// disponível para drishti (ver AUDITORIA-CALCULOS-23Ago.md) — a regra em
// si é fechada (fórmula, não tabela de dados), por isso a verificação é
// por consistência de fórmula e por paridade exacta com o módulo antigo
// nos 7 clássicos (nenhuma regressão), mais a confirmação directa de que
// Rahu/Ketu passam a ter o aspecto de 5ª/9ª que antes não tinham.
function fakePosition(house: number): GrahaPosition {
  return { graha: "Sun", siderealLongitude: 0, sign: "Aries", degreeInSign: 0, house };
}

const MELINA_HOUSES: Record<Graha, number> = {
  Sun: 11,
  Moon: 7,
  Mercury: 12,
  Venus: 1,
  Mars: 1,
  Jupiter: 12,
  Saturn: 10,
  Rahu: 5,
  Ketu: 11,
};

function positionsFor(houses: Record<Graha, number>): Record<Graha, GrahaPosition> {
  const out = {} as Record<Graha, GrahaPosition>;
  for (const g of ALL_GRAHAS) out[g] = fakePosition(houses[g]);
  return out;
}

describe("drishtiNodal — extensão de Rahu/Ketu (5ª/9ª, escola Parashari)", () => {
  const positions = positionsFor(MELINA_HOUSES);

  it("Rahu (casa 5) passa a aspectar as casas 11 (7ª), 9 (5ª) e 1 (9ª)", () => {
    expect(aspectedHousesV3("Rahu", positions).sort((a, b) => a - b)).toEqual([1, 9, 11]);
  });

  it("Ketu (casa 11) passa a aspectar as casas 5 (7ª), 3 (5ª) e 7 (9ª)", () => {
    expect(aspectedHousesV3("Ketu", positions).sort()).toEqual([3, 5, 7]);
  });

  it("antes da extensão, Rahu/Ketu só tinham a 7ª (confirma que a lacuna era real)", () => {
    const hitsAntigo = computeAllDrishti(positions);
    const rahuAntigo = hitsAntigo.filter((h) => h.from === "Rahu");
    expect(rahuAntigo.every((h) => h.offset === 7)).toBe(true);
  });

  it("paridade exacta com o módulo antigo para os 7 clássicos — nenhuma regressão", () => {
    const antigo = computeAllDrishti(positions).filter((h) => h.from !== "Rahu" && h.from !== "Ketu");
    const novo = computeAllDrishtiV3(positions).filter((h) => h.from !== "Rahu" && h.from !== "Ketu");
    const key = (h: { from: string; to: string; offset: number }) => `${h.from}-${h.to}-${h.offset}`;
    expect(novo.map(key).sort()).toEqual(antigo.map(key).sort());
  });
});
