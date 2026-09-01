import { ALL_GRAHAS, CLASSICAL_GRAHAS } from "./types";
import type { D1TableResult, GrahaRow } from "./d1Table";
import type { DrishtiHit, EmittedTarget } from "./drishti";

export function fmtDeg(d: number): string {
  let deg = Math.floor(d);
  let min = Math.round((d - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, "0")}'`;
}

function fmtDrishtiReceived(hits: DrishtiHit[]): string {
  if (hits.length === 0) return "—";
  return hits.map((h) => `${h.from}(${h.offset}º)`).join("; ");
}

/** Prints every emitted aspect, including empty-house and Ascendant targets (matches GABARITO practice, e.g. "5º→Casa3"). */
function fmtDrishtiEmitted(targets: EmittedTarget[]): string {
  return targets
    .map((t) => {
      const label = t.isAscendant ? "Casa 1 (Asc)" : `Casa ${t.targetHouse}`;
      const who = t.occupants.length ? `(${t.occupants.join("+")})` : "";
      return `${t.offset}º→${label}${who}`;
    })
    .join("; ");
}

function fmtRow(row: GrahaRow): string {
  const rules = row.functionalRulershipHouses.length ? row.functionalRulershipHouses.join(",") : "—";
  const dignity = row.dignity ?? "—";
  const avastha = row.avastha ?? "—";
  return [
    row.graha,
    `${row.sign} ${fmtDeg(row.degreeInSign)}`,
    String(row.house),
    dignity,
    rules,
    `${row.nakshatra} p${row.pada} (${row.nakshatraLord})`,
    avastha,
    `${fmtDeg(row.bhavaMadhyaDistance)} -> ${row.bhavaMadhyaBand}`,
    fmtDrishtiReceived(row.drishtiReceived),
    fmtDrishtiEmitted(row.drishtiEmittedTargets),
  ].join(" | ");
}

function formatD9Section(result: D1TableResult): string[] {
  const lines: string[] = [];
  lines.push(`**D-9 (Navamsa) — Ascendente ${result.d9.ascendantD9Sign}**`);
  lines.push("");
  lines.push("| Graha | D-1 | D-9 | Casa (D-9) | Dignidade (D-9) | Vargottama |");
  lines.push("|---|---|---|---|---|---|");
  for (const graha of ALL_GRAHAS) {
    const row = result.d9.rows[graha];
    lines.push(`| ${graha} | ${row.d1Sign} | ${row.d9Sign} | ${row.d9House} | ${row.d9Dignity ?? "—"} | ${row.vargottama ? "sim" : "—"} |`);
  }
  lines.push("");
  return lines;
}

export function formatD1TableMarkdown(name: string, result: D1TableResult): string {
  const lines: string[] = [];
  lines.push(`### ${name}`);
  lines.push("");
  lines.push(
    `**Ascendente ${result.ascendant.sign} ${fmtDeg(result.ascendant.degreeInSign)}, Nakshatra ${result.ascendant.nakshatra} pada ${result.ascendant.pada} (regente ${result.ascendant.nakshatraLord}). Drishti recebido na Casa 1: ${result.ascendant.drishtiReceivedBy.join(", ") || "—"}.**`,
  );
  lines.push("");
  lines.push("| Graha | Posição | Casa | Dignidade | Rege (casas) | Nakshatra (pada, regente) | Avastha | Bhava Madhya | Drishti recebido | Drishti emitido |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const graha of ALL_GRAHAS) {
    lines.push(`| ${fmtRow(result.rows[graha])} |`);
  }
  lines.push("");
  lines.push(
    `**Conjunções:** ${result.conjunctions.length ? result.conjunctions.map((c) => `${c.a}+${c.b} em ${c.sign} (${fmtDeg(c.distanceDegrees)})`).join("; ") : "nenhuma"}`,
  );
  lines.push("");
  lines.push(
    `**Karakas:** Atmakaraka = ${result.karakas.atmakaraka} · Amatyakaraka = ${result.karakas.amatyakaraka} · D-9 Ascendente = ${result.karakas.d9AscendantSign} · Karakamsha (AK no D-9) = ${result.karakas.atmakarakaD9Sign}, Casa ${result.karakas.karakamshaHouse} · AmK no D-9 = ${result.karakas.amatyakarakaD9Sign}, Casa ${result.karakas.amatyakarakaD9House} · Vargottama: ${result.karakas.vargottama.join(", ") || "nenhum"}`,
  );
  lines.push("");
  lines.push(...formatD9Section(result));
  return lines.join("\n");
}

export { CLASSICAL_GRAHAS };
