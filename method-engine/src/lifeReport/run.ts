import { writeFileSync } from "node:fs";
import { computeD1Table } from "./d1Table";
import { formatD1TableMarkdown } from "./format";

// Rui Vaz — 14/02/1978, 19:00, Lisboa. Portugal was on WET (UTC+0, no DST
// in February) in 1978 — confirmed empirically: this offset reproduces
// GABARITO's Ascendente Leão 12°30' (got 12°31', 1' off) and every other
// cross-checked value.
const rui = computeD1Table({
  utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)),
  latitude: 38.7169,
  longitude: -9.1399,
});

// Alice Amorim — 10/01/1983, 15:02 WAT, Luanda, Angola. WAT = UTC+1 fixed
// (no DST in Angola) -> 14:02 UTC.
const alice = computeD1Table({
  utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)),
  latitude: -8.839,
  longitude: 13.2894,
});

const report = [formatD1TableMarkdown("Rui Vaz — 14/02/1978, 19:00, Lisboa", rui), formatD1TableMarkdown("Alice Amorim — 10/01/1983, 15:02 WAT, Luanda", alice)].join(
  "\n---\n\n",
);

writeFileSync("d1-table-generated.md", `# Tabela Técnica D-1 — gerada pelo motor (M-004 Parte C)\n\n${report}`, "utf-8");
console.log("Written to d1-table-generated.md");
