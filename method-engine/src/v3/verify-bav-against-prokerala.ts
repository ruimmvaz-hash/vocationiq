// Script de auditoria (23/08/2026) — compara BAV_TABLE (sarvashtakavarga.ts)
// célula a célula contra os dados exactos extraídos do DOM do Prokerala
// (prokerala.com/astrology/birth-chart/ → Ashtakavarga) para a carta da
// Melina. Mantido como registo de auditoria e para re-correr se as tabelas
// alguma vez mudarem — não faz parte da API do módulo v3, corre à parte
// com `tsx src/v3/verify-bav-against-prokerala.ts`. Resultado em 23/08/2026:
// as 7 tabelas batem 100% (0 diferenças) depois da correcção das 5 células
// erradas encontradas nessa mesma auditoria.
import { SIGNS_ORDER, CLASSICAL_GRAHAS, type ClassicalGraha } from "../lifeReport/types";

// Dados extraídos do DOM do Prokerala (JSON exacto, sem ambiguidade de espaços em branco).
const PROKERALA_TABLES: Record<string, string[][]> = {
  Sun: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "", "1", "1", "", "1", "1", "1", "1", "6"],
    ["Vrishabha", "1", "1", "1", "", "", "1", "1", "", "5"],
    ["Mithuna", "1", "", "", "1", "", "", "1", "1", "4"],
    ["Karka", "1", "", "", "1", "1", "", "1", "", "4"],
    ["Simha", "1", "", "1", "", "1", "1", "1", "", "5"],
    ["Kanya", "1", "1", "1", "", "1", "", "", "", "4"],
    ["Tula", "", "", "1", "", "1", "1", "1", "1", "5"],
    ["Vrischika", "1", "", "1", "", "1", "", "1", "1", "5"],
    ["Dhanu", "1", "1", "", "1", "", "", "", "1", "4"],
    ["Makara", "", "", "", "", "1", "", "1", "", "2"],
    ["Kumbha", "1", "", "1", "", "1", "", "", "", "3"],
    ["Meena", "", "", "", "", "", "", "", "1", "1"],
    ["Total", "8", "4", "7", "3", "8", "4", "8", "6", "48"],
  ],
  Moon: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "1", "1", "1", "1", "", "", "", "", "4"],
    ["Vrishabha", "1", "1", "", "1", "1", "", "", "", "4"],
    ["Mithuna", "1", "", "1", "", "1", "1", "", "1", "5"],
    ["Karka", "", "1", "1", "1", "", "1", "", "", "4"],
    ["Simha", "1", "", "", "", "", "", "1", "", "2"],
    ["Kanya", "1", "1", "1", "1", "1", "1", "", "", "6"],
    ["Tula", "", "", "1", "1", "1", "1", "", "1", "5"],
    ["Vrischika", "", "", "", "1", "1", "1", "", "1", "4"],
    ["Dhanu", "", "1", "1", "", "", "1", "1", "", "4"],
    ["Makara", "1", "1", "", "", "", "", "", "", "2"],
    ["Kumbha", "", "", "1", "", "1", "", "1", "", "3"],
    ["Meena", "", "", "1", "1", "1", "1", "1", "1", "6"],
    ["Total", "6", "6", "8", "7", "7", "7", "4", "4", "49"],
  ],
  Mercury: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "1", "1", "1", "1", "1", "", "1", "1", "7"],
    ["Vrishabha", "", "1", "1", "1", "", "1", "1", "", "5"],
    ["Mithuna", "", "", "", "", "", "", "1", "1", "2"],
    ["Karka", "1", "", "", "", "1", "1", "1", "", "4"],
    ["Simha", "", "1", "1", "1", "1", "", "1", "1", "6"],
    ["Kanya", "1", "", "1", "1", "1", "", "", "", "4"],
    ["Tula", "1", "1", "1", "", "1", "1", "1", "1", "7"],
    ["Vrischika", "", "", "1", "1", "1", "1", "1", "1", "6"],
    ["Dhanu", "", "1", "1", "", "", "", "", "", "2"],
    ["Makara", "", "", "", "1", "1", "", "1", "1", "4"],
    ["Kumbha", "", "1", "1", "1", "1", "", "", "1", "5"],
    ["Meena", "1", "", "", "1", "", "", "", "", "2"],
    ["Total", "5", "6", "8", "8", "8", "4", "8", "7", "54"],
  ],
  Venus: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "", "", "1", "1", "", "1", "", "1", "4"],
    ["Vrishabha", "", "1", "1", "1", "1", "", "1", "1", "6"],
    ["Mithuna", "1", "1", "", "", "1", "", "1", "", "4"],
    ["Karka", "", "1", "", "", "", "1", "1", "", "3"],
    ["Simha", "", "1", "1", "1", "", "1", "1", "1", "6"],
    ["Kanya", "1", "1", "", "1", "1", "1", "", "1", "6"],
    ["Tula", "1", "1", "1", "1", "", "1", "", "", "5"],
    ["Vrischika", "", "1", "", "1", "1", "", "", "1", "4"],
    ["Dhanu", "", "", "", "", "1", "", "1", "", "2"],
    ["Makara", "", "", "", "1", "", "", "1", "1", "3"],
    ["Kumbha", "", "1", "1", "1", "", "", "1", "1", "5"],
    ["Meena", "", "1", "", "1", "1", "", "", "1", "4"],
    ["Total", "3", "9", "5", "9", "6", "5", "7", "8", "52"],
  ],
  Mars: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "1", "", "1", "", "1", "", "1", "", "4"],
    ["Vrishabha", "", "1", "1", "", "", "1", "1", "", "4"],
    ["Mithuna", "", "", "", "1", "", "", "1", "1", "3"],
    ["Karka", "", "", "", "", "1", "", "1", "", "2"],
    ["Simha", "1", "", "", "1", "1", "", "1", "", "4"],
    ["Kanya", "1", "1", "", "", "", "1", "", "", "3"],
    ["Tula", "", "", "1", "", "1", "1", "1", "1", "5"],
    ["Vrischika", "", "", "", "1", "1", "1", "", "1", "4"],
    ["Dhanu", "", "1", "", "1", "", "", "", "", "2"],
    ["Makara", "1", "", "", "", "1", "", "1", "1", "4"],
    ["Kumbha", "", "", "1", "", "1", "", "", "", "2"],
    ["Meena", "1", "", "", "", "", "", "", "1", "2"],
    ["Total", "5", "3", "4", "4", "7", "4", "7", "5", "39"],
  ],
  Jupiter: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "", "", "1", "", "1", "", "", "1", "3"],
    ["Vrishabha", "1", "1", "1", "1", "", "", "", "1", "5"],
    ["Mithuna", "1", "", "", "1", "", "1", "", "1", "4"],
    ["Karka", "1", "", "", "", "1", "1", "", "1", "4"],
    ["Simha", "1", "1", "1", "", "1", "", "", "", "4"],
    ["Kanya", "1", "", "1", "1", "", "1", "1", "1", "6"],
    ["Tula", "", "", "1", "1", "1", "1", "", "1", "5"],
    ["Vrischika", "1", "1", "", "1", "1", "", "", "1", "5"],
    ["Dhanu", "1", "", "1", "", "", "1", "1", "", "4"],
    ["Makara", "1", "1", "1", "", "1", "1", "", "1", "6"],
    ["Kumbha", "1", "", "", "1", "1", "1", "1", "1", "6"],
    ["Meena", "", "1", "1", "", "", "1", "1", "", "4"],
    ["Total", "9", "5", "8", "6", "7", "8", "4", "9", "56"],
  ],
  Saturn: [
    ["", "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Total"],
    ["Mesha", "", "", "", "", "", "1", "", "1", "2"],
    ["Vrishabha", "1", "1", "1", "", "1", "1", "", "", "5"],
    ["Mithuna", "1", "", "", "1", "1", "", "", "1", "4"],
    ["Karka", "", "", "1", "", "", "", "", "", "1"],
    ["Simha", "1", "", "1", "", "", "", "1", "", "3"],
    ["Kanya", "1", "1", "1", "", "", "", "", "", "3"],
    ["Tula", "", "", "1", "", "1", "1", "", "1", "4"],
    ["Vrischika", "1", "", "1", "1", "1", "1", "", "1", "6"],
    ["Dhanu", "1", "1", "", "1", "1", "", "1", "", "5"],
    ["Makara", "", "", "", "", "", "", "", "1", "1"],
    ["Kumbha", "1", "", "", "", "", "", "1", "", "2"],
    ["Meena", "", "", "", "", "1", "", "1", "1", "3"],
    ["Total", "7", "3", "6", "3", "6", "4", "4", "6", "39"],
  ],
};

type Contributor = ClassicalGraha | "Lagna";
const CONTRIBUTOR_COLS: Contributor[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Lagna"];
const COL_NAME_IN_TABLE: Record<Contributor, string> = {
  Sun: "Sun", Moon: "Moon", Mercury: "Mercury", Venus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturn: "Saturn", Lagna: "Ascendant",
};

// Posições de Melina neste mapa (índice em SIGNS_ORDER).
const MELINA_SIGN_INDEX: Record<Contributor, number> = {
  Sun: SIGNS_ORDER.indexOf("Scorpio"),
  Moon: SIGNS_ORDER.indexOf("Cancer"),
  Mercury: SIGNS_ORDER.indexOf("Sagittarius"),
  Venus: SIGNS_ORDER.indexOf("Capricorn"),
  Mars: SIGNS_ORDER.indexOf("Capricorn"),
  Jupiter: SIGNS_ORDER.indexOf("Sagittarius"),
  Saturn: SIGNS_ORDER.indexOf("Libra"),
  Lagna: SIGNS_ORDER.indexOf("Capricorn"),
};

// A ordem de signos do Prokerala é sempre Mesha..Meena = Aries..Pisces, igual a SIGNS_ORDER.
function deriveOffsetTable(target: ClassicalGraha): Record<Contributor, number[]> {
  const table = PROKERALA_TABLES[target];
  const header = table[0];
  const result = {} as Record<Contributor, number[]>;
  for (const contributor of CONTRIBUTOR_COLS) {
    const colIndex = header.indexOf(COL_NAME_IN_TABLE[contributor]);
    const fromIndex = MELINA_SIGN_INDEX[contributor];
    const offsets: number[] = [];
    for (let r = 1; r <= 12; r++) {
      const row = table[r];
      if (row[colIndex] === "1") {
        const signIdx = r - 1; // row 1 = Mesha = index 0
        const offset = ((signIdx - fromIndex + 12) % 12) + 1;
        offsets.push(offset);
      }
    }
    offsets.sort((a, b) => a - b);
    result[contributor] = offsets;
  }
  return result;
}

import { BAV_TABLE } from "./sarvashtakavarga.js";

let anyDiff = false;
for (const target of CLASSICAL_GRAHAS) {
  const correct = deriveOffsetTable(target);
  const mine = BAV_TABLE[target];
  let targetHasDiff = false;
  const lines: string[] = [];
  for (const c of CONTRIBUTOR_COLS) {
    const a = JSON.stringify(correct[c]);
    const b = JSON.stringify([...mine[c]].sort((x, y) => x - y));
    if (a !== b) {
      targetHasDiff = true;
      anyDiff = true;
      lines.push(`  ${c.padEnd(8)} PROKERALA=[${correct[c].join(",")}]  MOTOR=[${[...mine[c]].sort((x, y) => x - y).join(",")}]`);
    }
  }
  if (targetHasDiff) {
    console.log(`\n=== ${target} — DIFERENÇAS ===`);
    console.log(lines.join("\n"));
  } else {
    console.log(`${target}: OK, todas as 8 colunas batem certo.`);
  }
}
console.log(anyDiff ? "\nRESULTADO: há diferenças a corrigir." : "\nRESULTADO: as 7 tabelas batem 100% com o Prokerala.");
