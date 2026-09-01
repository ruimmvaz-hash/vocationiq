import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runSimulation, ALL_ARCHETYPES } from "./simulate";
import { buildReport, type RobustnessRow } from "./report";
import { WEIGHTS } from "../data/tables";

const SEED = 42;
const COUNT = 1000;
const YEAR_RANGE = { minYear: 1950, maxYear: 2010 };
const ROBUSTNESS_SEEDS = [1, 2, 3, 42, 99];

function robustnessRow(seed: number): RobustnessRow {
  const r = runSimulation({ count: COUNT, seed, ...YEAR_RANGE, weights: WEIGHTS });
  const archetypePcts = ALL_ARCHETYPES.map((key) => ((r.archetypeCounts[key] ?? 0) / r.count) * 100);
  return {
    seed,
    displacementPct: (r.displacedCount / r.count) * 100,
    minArchetypePct: Math.min(...archetypePcts),
    maxArchetypePct: Math.max(...archetypePcts),
  };
}

function main() {
  const mainResult = runSimulation({ count: COUNT, seed: SEED, ...YEAR_RANGE, weights: WEIGHTS });
  const robustness = ROBUSTNESS_SEEDS.map(robustnessRow);

  const report = buildReport(mainResult, robustness);

  const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../simulation-report.md");
  writeFileSync(outPath, report, "utf-8");

  console.log(`Report written to ${outPath}`);
  console.log(`Displacement: ${((mainResult.displacedCount / mainResult.count) * 100).toFixed(2)}%`);
}

main();
