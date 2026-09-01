import { writeFileSync } from "node:fs";
import { toSidereal } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { SIGNS_ORDER, type BirthInput } from "./types";
import { formatD1TableMarkdown, fmtDeg } from "./format";
import { houseOf } from "./positions";
import { vimshottariMahadashas } from "./dasha";
import { sadeSatiStatus } from "./sadeSati";
import { computeWesternTable, type WesternResult } from "./western/westernTable";
import { computeSolarReturn } from "./western/solarReturn";
import { computeTransits } from "./western/transits";
import { computeTropicalPosition } from "./western/tropical";
import { computePlacidusHouses } from "./western/placidus";
import { computeMinorPoint, minorAspects, tropicalLongitudeOfMinor, type MinorPoint } from "./western/chironLilith";
import { buildPersonChart, crossAspects, crossDrishti, coupleVedicPoints, houseOverlays, painHouseCircuit, type PersonChart } from "./synastry";

// SESSÃO 3 — Vera & Hugo, Fase 1 (deterministic tables only, no prose).
//
// Birth data resolution:
// - Vera: 15/06/1979, 08:00, Évora. Portugal was on WEST (UTC+1, summer
//   time ran 1 Apr–30 Sep in 1979) -> 07:00 UTC. Évora 38.5711, -7.9097.
// - Hugo: 17/02/1979, 09:10, Caracas. Venezuela was UTC-4 (1965–2007)
//   -> 13:10 UTC. Caracas 10.4806, -66.9036.
// - Residence for Solar Returns: Portugal -> Lisbon 38.7169, -9.1399.

const TODAY = new Date("2026-07-25T12:00:00Z");
const LISBON = { lat: 38.7169, lon: -9.1399 };

const veraBirth: BirthInput = { utcDate: new Date(Date.UTC(1979, 5, 15, 7, 0, 0)), latitude: 38.5711, longitude: -7.9097 };
const hugoBirth: BirthInput = { utcDate: new Date(Date.UTC(1979, 1, 17, 13, 10, 0)), latitude: 10.4806, longitude: -66.9036 };

const vera = buildPersonChart("Vera", veraBirth, TODAY);
const hugo = buildPersonChart("Hugo", hugoBirth, TODAY);

// ---------- internal consistency checks (no GABARITO exists for this couple; verify structural invariants instead) ----------
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`CONSISTENCY FAIL: ${msg}`);
}

for (const person of [vera, hugo]) {
  const grahas = Object.keys(person.d1.rows);
  assert(grahas.length === 9, `${person.name}: expected 9 grahas`);
  for (const [g, row] of Object.entries(person.d1.rows)) {
    assert(row.house >= 1 && row.house <= 12, `${person.name}/${g}: house out of range`);
    assert(row.degreeInSign >= 0 && row.degreeInSign < 30, `${person.name}/${g}: degree out of range`);
    for (const hit of row.drishtiEmitted) {
      assert(person.d1.rows[hit.to].drishtiReceived.some((r) => r.from === g && r.offset === hit.offset), `${person.name}: drishti asymmetry ${g}->${hit.to}`);
    }
  }
  assert(person.d1.karakas.atmakaraka !== person.d1.karakas.amatyakaraka, `${person.name}: AK === AmK`);
  const rahuHouse = person.d1.rows.Rahu.house;
  const ketuHouse = person.d1.rows.Ketu.house;
  assert((ketuHouse - rahuHouse + 12) % 12 === 6, `${person.name}: Rahu/Ketu not opposite`);
  const mahas = vimshottariMahadashas(person.birth.utcDate, 12);
  for (let i = 1; i < mahas.length; i++) assert(mahas[i].start.getTime() === mahas[i - 1].end.getTime(), `${person.name}: dasha gap at ${i}`);
}

const pts = coupleVedicPoints(vera, hugo);
assert(
  (pts.moonCountAtoB === 1 && pts.moonCountBtoA === 1) || pts.moonCountAtoB + pts.moonCountBtoA === 14,
  "moon count complement broken",
);

// ---------- formatting helpers ----------
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

function westernMarkdown(w: WesternResult): string[] {
  const lines: string[] = [];
  lines.push(`**Ascendente ${w.ascendant.sign} ${fmtDeg(w.ascendant.degreeInSign)} (regente ${w.ascendant.ruler}) | MC ${w.mc.sign} ${fmtDeg(w.mc.degreeInSign)} (regente ${w.mc.ruler})**`);
  lines.push("");
  lines.push(`Nodo Norte ${w.northNode.sign} ${fmtDeg(w.northNode.degreeInSign)}, Casa ${w.northNode.house}${w.northNode.conjunctions.length ? " | conj ≤3°: " + w.northNode.conjunctions.map((c) => `${c.to} (${fmtDeg(c.orb)})`).join(", ") : " | sem conjunções ≤3°"}`);
  lines.push("");
  lines.push("| Planeta | Posição | Casa | Dignidade | Aspetos (orbe; A/S) |");
  lines.push("|---|---|---|---|---|");
  for (const planet of Object.keys(w.planets) as (keyof typeof w.planets)[]) {
    const row = w.planets[planet];
    const aspectStr = row.aspects.map((a) => `${a.hit.aspect} ${a.to} ${fmtDeg(a.hit.orb)} ${a.hit.applying ? "A" : "S"}`).join("; ");
    lines.push(`| ${planet} | ${row.sign} ${fmtDeg(row.degreeInSign)} | ${row.house} | ${row.dignity ?? "—"} | ${aspectStr || "—"} |`);
  }
  return lines;
}

function personSection(person: PersonChart, birthLabel: string, srYear: number): string[] {
  const lines: string[] = [];
  lines.push(`## ${person.name} — ${birthLabel}`);
  lines.push("");
  lines.push(formatD1TableMarkdown(`${person.name} — Védico D-1 + D-9`, person.d1));

  // Vimshottari
  const mahas = vimshottariMahadashas(person.birth.utcDate, 10);
  lines.push("**Vimshottari Dasha — Mahadashas**");
  lines.push("");
  lines.push("| Mahadasha | Início | Fim |");
  lines.push("|---|---|---|");
  for (const m of mahas) {
    if (m.end < person.birth.utcDate) continue;
    const marker = TODAY >= m.start && TODAY < m.end ? " **(ATUAL)**" : "";
    lines.push(`| ${m.lord}${marker} | ${fmtDate(m.start < person.birth.utcDate ? person.birth.utcDate : m.start)} | ${fmtDate(m.end)} |`);
  }
  lines.push("");
  const cd = person.currentDasha;
  lines.push(`**Mahadasha atual: ${cd.mahadasha.lord}** (${fmtDate(cd.mahadasha.start)} → ${fmtDate(cd.mahadasha.end)}) · **Antardasha atual: ${cd.antardasha.lord}** (${fmtDate(cd.antardasha.start)} → ${fmtDate(cd.antardasha.end)})`);
  lines.push("");
  lines.push("| Antardasha (do Mahadasha atual) | Início | Fim |");
  lines.push("|---|---|---|");
  for (const a of cd.allAntardashas) {
    const marker = TODAY >= a.start && TODAY < a.end ? " **(ATUAL)**" : "";
    lines.push(`| ${cd.mahadasha.lord}–${a.lord}${marker} | ${fmtDate(a.start)} | ${fmtDate(a.end)} |`);
  }
  lines.push("");

  // Sade Sati
  const ss = sadeSatiStatus(person.d1.rows.Moon.sign, TODAY);
  lines.push(
    `**Sade Sati:** ${ss.active ? `ATIVO — fase ${ss.phase}` : "INATIVO"} (Saturno sideral em ${ss.saturnSiderealSign} ${fmtDeg(ss.saturnDegreeInSign)}, casa ${ss.houseFromMoon} a partir da Lua natal em ${person.d1.rows.Moon.sign})`,
  );
  lines.push("");

  // Western natal
  lines.push(`**Ocidental (Placidus, tropical)**`);
  lines.push("");
  const natalWestern = computeWesternTable(person.birth);
  lines.push(...westernMarkdown(natalWestern));
  lines.push("");
  // Chiron + Mean Lilith (Swiss Ephemeris; validated against GABARITO-Rui astro.com values to the arcminute)
  const cusps = computePlacidusHouses(person.birth.utcDate, person.birth.latitude, person.birth.longitude).cusps;
  const natalTargets: [string, number][] = person.tropicalPoints.filter((p) => p.name !== "Nodo Norte").map((p): [string, number] => [p.name, p.longitude]);
  lines.push("**Quíron e Lilith Média (Swiss Ephemeris)**");
  lines.push("");
  for (const point of ["Quiron", "Lilith"] as MinorPoint[]) {
    const pos = computeMinorPoint(point, person.birth, person.d1.ascendant.sign, cusps);
    const hits = minorAspects(pos.tropicalLongitude, natalTargets);
    const label = point === "Quiron" ? "Quíron" : "Lilith Média";
    const aspectStr = hits.length ? hits.map((h) => `**${h.aspect} ${h.target} ${fmtDeg(h.orb)}**`).join("; ") : "sem aspeto relevante (≤3°)";
    lines.push(`- **${label}**: tropical ${pos.tropicalSign} ${fmtDeg(pos.tropicalDegreeInSign)} (casa Placidus ${pos.placidusHouse}) · sideral ${pos.siderealSign} ${fmtDeg(pos.siderealDegreeInSign)} (casa védica ${pos.vedicHouse}) · ${aspectStr}`);
  }
  lines.push("");

  // Solar Return
  const natalSun = computeTropicalPosition("Sun", person.birth.utcDate).longitude;
  const sr = computeSolarReturn(person.birth, natalSun, srYear, LISBON.lat, LISBON.lon);
  const srSunCheck = Math.abs(computeTropicalPosition("Sun", sr.instantUtc).longitude - natalSun);
  assert(srSunCheck < 0.001 || srSunCheck > 359.999, `${person.name}: SR sun mismatch`);
  lines.push(`**Retorno Solar ${srYear} (Lisboa)** — instante: ${sr.instantUtc.toISOString().replace("T", " ").slice(0, 16)} UTC`);
  lines.push("");
  lines.push(...westernMarkdown(sr.chart));
  lines.push("");

  // Transits
  const t = computeTransits(person.birth, TODAY);
  lines.push(`**Trânsitos (${fmtDate(TODAY)})**`);
  lines.push("");
  for (const key of ["saturn", "jupiter"] as const) {
    const p = t[key];
    const planetName = key === "saturn" ? "Saturn" : "Jupiter";
    const sid = siderealSignAndDegree(toSidereal(tropicalLongitudeOf(planetName, TODAY), TODAY));
    const sidHouseAsc = houseOf(sid.sign, person.d1.ascendant.sign);
    const sidHouseMoon = ((SIGNS_ORDER.indexOf(sid.sign) - SIGNS_ORDER.indexOf(person.d1.rows.Moon.sign) + 12) % 12) + 1;
    const aspects = p.aspectsToNatal.map((a) => `${a.aspect} ${a.to} ${fmtDeg(a.orb)}`).join("; ");
    lines.push(
      `- **${planetName}** tropical: ${p.sign} ${fmtDeg(p.degreeInSign)}, casa natal Placidus ${p.natalHouse}${aspects ? ` | aspetos duros ≤2°: ${aspects}` : " | sem aspetos duros ≤2°"} · sideral: ${sid.sign} ${fmtDeg(sid.degreeInSign)}, casa ${sidHouseAsc} do Asc védico, ${sidHouseMoon} a partir da Lua`,
    );
  }
  lines.push("");
  return lines;
}

// ---------- build document ----------
const lines: string[] = [];
lines.push("# Tabelas Técnicas — Casal Vera & Hugo (Fase 1, determinístico)");
lines.push("");
lines.push("Resolução de dados: Vera 15/06/1979 08:00 Évora → 07:00 UTC (WEST/UTC+1, DST português de 1979); Hugo 17/02/1979 09:10 Caracas → 13:10 UTC (Venezuela UTC-4). Retornos Solares calculados para Lisboa (residência: Portugal).");
lines.push("");
lines.push(...personSection(vera, "15/06/1979, 08:00, Évora", 2026));
lines.push("---");
lines.push("");
lines.push(...personSection(hugo, "17/02/1979, 09:10, Caracas", 2026));
lines.push("---");
lines.push("");

// ---------- synastry ----------
lines.push("# Sinastria (M-004 Parte D)");
lines.push("");

const aspects = crossAspects(vera, hugo);
lines.push("## D-1: Cruzamentos por grau (tropical, orbe ≤7°; **negrito = exato ≤2°**)");
lines.push("");
lines.push("| Vera | Aspeto | Hugo | Orbe |");
lines.push("|---|---|---|---|");
for (const a of aspects) {
  const bold = a.exact ? "**" : "";
  lines.push(`| ${bold}${a.fromA}${bold} | ${bold}${a.aspect}${bold} | ${bold}${a.toB}${bold} | ${bold}${fmtDeg(a.orb)}${bold} |`);
}
lines.push("");
const mandatory = [
  ["Sun", "Moon"],
  ["Moon", "Sun"],
  ["Mars", "Mars"],
  ["Saturn", "Sun"],
  ["Saturn", "Moon"],
  ["Venus", "Mercury"],
  ["Mercury", "Venus"],
];
const mandatoryChecks = mandatory.map(([va, hb]) => {
  const found = aspects.filter((a) => a.fromA === va && a.toB === hb);
  return `- Vera ${va} × Hugo ${hb}: ${found.length ? found.map((f) => `${f.aspect} ${fmtDeg(f.orb)}`).join("; ") : "sem aspeto ≤7°"}`;
});
lines.push("**Verificações obrigatórias (D-1):**");
lines.push("");
lines.push(...mandatoryChecks);
lines.push(`- Saturno de Hugo × luminares de Vera: ${aspects.filter((a) => a.toB === "Saturn" && (a.fromA === "Sun" || a.fromA === "Moon")).map((f) => `${f.fromA} ${f.aspect} ${fmtDeg(f.orb)}`).join("; ") || "sem aspeto ≤7°"}`);
lines.push("");

lines.push("## D-2: Drishti cruzado (védico, signos inteiros)");
lines.push("");
lines.push("**De Vera sobre pontos de Hugo:**");
lines.push("");
for (const d of crossDrishti(vera, hugo)) {
  const moonFlag = d.hitsB.includes("Moon") ? " ← **atinge a LUA**" : "";
  lines.push(`- ${d.fromA} (${vera.d1.rows[d.fromA].sign}) lança ${d.offset}º sobre ${d.targetSign} → atinge ${d.hitsB.join("+")} de Hugo${moonFlag}`);
}
lines.push("");
lines.push("**De Hugo sobre pontos de Vera:**");
lines.push("");
for (const d of crossDrishti(hugo, vera)) {
  const moonFlag = d.hitsB.includes("Moon") ? " ← **atinge a LUA**" : "";
  lines.push(`- ${d.fromA} (${hugo.d1.rows[d.fromA].sign}) lança ${d.offset}º sobre ${d.targetSign} → atinge ${d.hitsB.join("+")} de Vera${moonFlag}`);
}
lines.push("");

lines.push("## D-3: Sobreposições de casas (whole-sign védico)");
lines.push("");
lines.push("| Graha de Vera | Signo | Cai na casa de Hugo |");
lines.push("|---|---|---|");
for (const o of houseOverlays(vera, hugo)) lines.push(`| ${o.graha} | ${o.sign} | ${o.houseInPartner} |`);
lines.push("");
lines.push("| Graha de Hugo | Signo | Cai na casa de Vera |");
lines.push("|---|---|---|");
for (const o of houseOverlays(hugo, vera)) lines.push(`| ${o.graha} | ${o.sign} | ${o.houseInPartner} |`);
lines.push("");

lines.push("## PONTOS_VEDICOS_CASAL: Pontos védicos do casal");
lines.push("");
lines.push(`- Atmakaraka de Vera: **${pts.atmakarakaA}** · Atmakaraka de Hugo: **${pts.atmakarakaB}**${pts.atmakarakaA === pts.atmakarakaB ? " — **IGUAIS**" : ""}`);
lines.push(`- Nakshatra da Lua de Vera: ${pts.moonNakshatraA.name} (regente ${pts.moonNakshatraA.lord}) · de Hugo: ${pts.moonNakshatraB.name} (regente ${pts.moonNakshatraB.lord})${pts.sameMoonLord ? " — **mesmo regente: mesma chave**" : ""}`);
lines.push(`- Sol de Vera no Nakshatra da Lua de Hugo: ${pts.sunAInMoonNakshatraB ? "**SIM**" : "não"} · Sol de Hugo no Nakshatra da Lua de Vera: ${pts.sunBInMoonNakshatraA ? "**SIM**" : "não"}`);
lines.push(`- Contagem lunar (Kuta): Vera→Hugo = ${pts.moonCountAtoB} · Hugo→Vera = ${pts.moonCountBtoA} (5/9 favorável; 6/8 exigente; 2/12 delicado)`);
lines.push(`- Mangal Dosha: Vera ${pts.mangalDoshaA ? "PRESENTE" : "ausente"} (Marte casa ${vera.d1.rows.Mars.house}) · Hugo ${pts.mangalDoshaB ? "PRESENTE" : "ausente"} (Marte casa ${hugo.d1.rows.Mars.house})`);
lines.push("");
lines.push("**Sincronia de Dashas (hoje):**");
lines.push("");
lines.push(`- Vera: Mahadasha **${vera.currentDasha.mahadasha.lord}** (${fmtDate(vera.currentDasha.mahadasha.start)}→${fmtDate(vera.currentDasha.mahadasha.end)}), Antardasha **${vera.currentDasha.antardasha.lord}** (${fmtDate(vera.currentDasha.antardasha.start)}→${fmtDate(vera.currentDasha.antardasha.end)})`);
lines.push(`- Hugo: Mahadasha **${hugo.currentDasha.mahadasha.lord}** (${fmtDate(hugo.currentDasha.mahadasha.start)}→${fmtDate(hugo.currentDasha.mahadasha.end)}), Antardasha **${hugo.currentDasha.antardasha.lord}** (${fmtDate(hugo.currentDasha.antardasha.start)}→${fmtDate(hugo.currentDasha.antardasha.end)})`);
lines.push("");

lines.push("## D-extra: Quíron e Lilith cruzados (≤3°)");
lines.push("");
for (const [label, a, b] of [
  ["Vera → Hugo", vera, hugo] as const,
  ["Hugo → Vera", hugo, vera] as const,
]) {
  const chironLon = tropicalLongitudeOfMinor("Quiron", a.birth.utcDate);
  const lilithLon = tropicalLongitudeOfMinor("Lilith", a.birth.utcDate);
  const personalTargets: [string, number][] = b.tropicalPoints
    .filter((p) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendente"].includes(p.name))
    .map((p): [string, number] => [p.name, p.longitude]);
  const lilithTargets: [string, number][] = b.tropicalPoints
    .filter((p) => ["Moon", "Venus", "Ascendente"].includes(p.name))
    .map((p): [string, number] => [p.name, p.longitude]);
  const chironHits = minorAspects(chironLon, personalTargets);
  const lilithHits = minorAspects(lilithLon, lilithTargets);
  lines.push(`**${label}:**`);
  lines.push(`- Quíron: ${chironHits.length ? chironHits.map((h) => `**${h.aspect} ${h.target} ${fmtDeg(h.orb)}**`).join("; ") : "sem cruzamento ≤3° a pessoais/Asc"}`);
  lines.push(`- Lilith: ${lilithHits.length ? lilithHits.map((h) => `**${h.aspect} ${h.target} ${fmtDeg(h.orb)}**`).join("; ") : "sem cruzamento ≤3° a Lua/Vénus/Asc"}`);
  lines.push("");
}

lines.push("## D-5: Circuito de Tensão Dinâmica (dados técnicos; a narrativa escolhe-se na Fase 2)");
lines.push("");
lines.push("Queixa: atritos na relação + comunicação (casa 7) · carreira/valor (casa 10 — Vera abriu clínica; Hugo em transição de engenheiro para coach).");
lines.push("");
for (const [label, person, partner] of [
  ["Vera", vera, hugo] as const,
  ["Hugo", hugo, vera] as const,
]) {
  for (const house of [7, 10]) {
    const p = painHouseCircuit(person, partner, house);
    lines.push(`**${label}, casa ${house}** (${p.houseSign}, regente ${p.ruler} em ${p.rulerSign}/casa ${p.rulerHouse}):`);
    if (p.drishtiOnPartnerPoints.length === 0 && p.tightWesternAspects.length === 0) {
      lines.push(`- sem contacto direto do regente com pontos pessoais do parceiro`);
    }
    for (const d of p.drishtiOnPartnerPoints) {
      lines.push(`- Drishti ${d.offset}º do regente sobre ${d.targetSign} → **${d.partnerPointsHit.join(" + ")}** do parceiro`);
    }
    for (const w of p.tightWesternAspects) {
      lines.push(`- Ocidental: ${w.fromA} ${w.aspect} ${w.toB} do parceiro, orbe ${fmtDeg(w.orb)}${w.exact ? " **(exato)**" : ""}`);
    }
    lines.push("");
  }
}

writeFileSync("couple-vera-hugo-tables.md", lines.join("\n"), "utf-8");
console.log("OK — written couple-vera-hugo-tables.md; all internal consistency checks passed");
