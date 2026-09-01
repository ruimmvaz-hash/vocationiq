import { generateCoupleTables } from "./coupleTables";
import type { BirthInput } from "./types";

// SESSÃO 4 — Beatriz Costa & Fernando, Fase 1 (deterministic tables only).
//
// Birth data resolution:
// - Beatriz: 01/12/1995, 00:30, Lisboa. Portugal on WET (UTC+0) in
//   December -> 00:30 UTC. Lisboa 38.7169, -9.1399.
// - Fernando: 25/02/1994, 10:00, Luanda. Angola on WAT (UTC+1, no DST)
//   -> 09:00 UTC. Luanda -8.8390, 13.2894.
// - Residence for both Solar Returns: Lisboa.
//
// Solar Return years differ because the birthdays sit on opposite sides
// of the current date (26/07/2026): Beatriz's running SR started
// 01/12/2025; Fernando's started 25/02/2026.

const TODAY = new Date("2026-07-26T12:00:00Z");
const LISBON = { lat: 38.7169, lon: -9.1399 };

const beatrizBirth: BirthInput = { utcDate: new Date(Date.UTC(1995, 11, 1, 0, 30, 0)), latitude: 38.7169, longitude: -9.1399 };
const fernandoBirth: BirthInput = { utcDate: new Date(Date.UTC(1994, 1, 25, 9, 0, 0)), latitude: -8.839, longitude: 13.2894 };

generateCoupleTables({
  title: "Tabelas Técnicas — Casal Beatriz Costa & Fernando (Fase 1, determinístico)",
  outFile: "couple-beatriz-fernando-tables.md",
  today: TODAY,
  residence: LISBON,
  dataNote:
    "Resolução de dados: Beatriz 01/12/1995 00:30 Lisboa → 00:30 UTC (WET/UTC+0, inverno); Fernando 25/02/1994 10:00 Luanda → 09:00 UTC (WAT/UTC+1, sem DST). Retornos Solares calculados para Lisboa (residência atual de ambos). Data de referência para fases e trânsitos: 26/07/2026.",
  a: { name: "Beatriz", birth: beatrizBirth, birthLabel: "01/12/1995, 00:30, Lisboa", srYear: 2025 },
  b: { name: "Fernando", birth: fernandoBirth, birthLabel: "25/02/1994, 10:00, Luanda", srYear: 2026 },
  complaintNote:
    "Queixa: pequenas fricções na relação + dificuldades de comunicação (casas 7 e 3). Áreas pedidas: relacionamento (7) e propósito/vocação (10). Beatriz: formada em Direito, em busca de propósito. Fernando: profissão não indicada — derivar apenas do desenho.",
  painHouses: [3, 7, 10],
});

console.log("OK — written couple-beatriz-fernando-tables.md; all internal consistency checks passed");
