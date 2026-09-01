import { writeFileSync } from "node:fs";
import { computeWesternTable } from "./westernTable";
import { fmtDeg } from "../format";

function report(name: string, birth: Parameters<typeof computeWesternTable>[0]): string {
  const w = computeWesternTable(birth);
  const lines: string[] = [];
  lines.push(`### ${name}`);
  lines.push("");
  lines.push(`**Ascendente ${w.ascendant.sign} ${fmtDeg(w.ascendant.degreeInSign)} (regente ${w.ascendant.ruler}) | MC ${w.mc.sign} ${fmtDeg(w.mc.degreeInSign)} (regente ${w.mc.ruler})**`);
  lines.push("");
  lines.push(
    `Nodo Norte ${w.northNode.sign} ${fmtDeg(w.northNode.degreeInSign)}, Casa ${w.northNode.house}${w.northNode.conjunctions.length ? " | conj: " + w.northNode.conjunctions.map((c) => `${c.to}(${fmtDeg(c.orb)})`).join(", ") : ""}`,
  );
  lines.push("");
  lines.push(`Casa 2: ${w.house2.sign} (regente ${w.house2.ruler}) | Casa 6: ${w.house6.sign} (regente ${w.house6.ruler}) | Casa 11: ${w.house11.sign} (regente ${w.house11.ruler})`);
  lines.push("");
  lines.push("| Planeta | Posição | Casa | Dignidade | Aspetos (orbe; A/S) |");
  lines.push("|---|---|---|---|---|");
  for (const planet of Object.keys(w.planets) as (keyof typeof w.planets)[]) {
    const row = w.planets[planet];
    const aspectStr = row.aspects.map((a) => `${a.hit.aspect} ${a.to} ${fmtDeg(a.hit.orb)} ${a.hit.applying ? "A" : "S"}`).join("; ");
    lines.push(`| ${planet} | ${row.sign} ${fmtDeg(row.degreeInSign)} | ${row.house} | ${row.dignity ?? "—"} | ${aspectStr || "—"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const report1 = report("Rui Vaz — 14/02/1978, 19:00, Lisboa", { utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)), latitude: 38.7169, longitude: -9.1399 });
const report2 = report("Alice Amorim — 10/01/1983, 15:02 WAT, Luanda", { utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)), latitude: -8.839, longitude: 13.2894 });

const full = `# Tabela Técnica Ocidental (Placidus) — gerada pelo motor (M-004 Parte C-OCI)\n\n${report1}\n---\n\n${report2}`;
writeFileSync("western-table-generated.md", full, "utf-8");
console.log(full);
