import { writeFileSync } from "node:fs";
import { toSidereal } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { CLASSICAL_GRAHAS, SIGNS_ORDER, type BirthInput } from "./types";
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

// M-004 Fase 1 — deterministic technical tables for a couple (no prose).
// Generic runner: one config per couple, so each new client is a thin
// script rather than a copy of this file.

export interface CouplePerson {
  name: string;
  birth: BirthInput;
  /** Human-readable birth line for the section header. */
  birthLabel: string;
  /** Solar Return year to compute (the SR that is currently running). */
  srYear: number;
}

export interface CoupleTablesConfig {
  title: string;
  outFile: string;
  /** "Today" for dashas, transits and Sade Sati. */
  today: Date;
  /** Residence used to cast the Solar Return charts. */
  residence: { lat: number; lon: number };
  /** Birth-data resolution note (timezones, coordinates) shown at the top. */
  dataNote: string;
  a: CouplePerson;
  b: CouplePerson;
  /** Complaint line for the D-5 section. */
  complaintNote: string;
  /** Houses to run the D-5 Circuito de Tensão Dinâmica circuit on (e.g. [3, 7, 10]). */
  painHouses: number[];
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`CONSISTENCY FAIL: ${msg}`);
}

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

function personSection(person: PersonChart, cfg: CoupleTablesConfig, meta: CouplePerson): string[] {
  const { today, residence } = cfg;
  const lines: string[] = [];
  lines.push(`## ${person.name} — ${meta.birthLabel}`);
  lines.push("");
  lines.push(formatD1TableMarkdown(`${person.name} — Védico D-1 + D-9`, person.d1));

  const mahas = vimshottariMahadashas(person.birth.utcDate, 10);
  lines.push("**Vimshottari Dasha — Mahadashas**");
  lines.push("");
  lines.push("| Mahadasha | Início | Fim |");
  lines.push("|---|---|---|");
  for (const m of mahas) {
    if (m.end < person.birth.utcDate) continue;
    const marker = today >= m.start && today < m.end ? " **(ATUAL)**" : "";
    lines.push(`| ${m.lord}${marker} | ${fmtDate(m.start < person.birth.utcDate ? person.birth.utcDate : m.start)} | ${fmtDate(m.end)} |`);
  }
  lines.push("");
  const cd = person.currentDasha;
  lines.push(`**Mahadasha atual: ${cd.mahadasha.lord}** (${fmtDate(cd.mahadasha.start)} → ${fmtDate(cd.mahadasha.end)}) · **Antardasha atual: ${cd.antardasha.lord}** (${fmtDate(cd.antardasha.start)} → ${fmtDate(cd.antardasha.end)})`);
  lines.push("");
  lines.push("| Antardasha (do Mahadasha atual) | Início | Fim |");
  lines.push("|---|---|---|");
  for (const a of cd.allAntardashas) {
    const marker = today >= a.start && today < a.end ? " **(ATUAL)**" : "";
    lines.push(`| ${cd.mahadasha.lord}–${a.lord}${marker} | ${fmtDate(a.start)} | ${fmtDate(a.end)} |`);
  }
  lines.push("");

  const ss = sadeSatiStatus(person.d1.rows.Moon.sign, today);
  lines.push(
    `**Sade Sati:** ${ss.active ? `ATIVO — fase ${ss.phase}` : "INATIVO"} (Saturno sideral em ${ss.saturnSiderealSign} ${fmtDeg(ss.saturnDegreeInSign)}, casa ${ss.houseFromMoon} a partir da Lua natal em ${person.d1.rows.Moon.sign})`,
  );
  lines.push("");

  lines.push(`**Ocidental (Placidus, tropical)**`);
  lines.push("");
  const natalWestern = computeWesternTable(person.birth);
  lines.push(...westernMarkdown(natalWestern));
  lines.push("");

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

  const natalSun = computeTropicalPosition("Sun", person.birth.utcDate).longitude;
  const sr = computeSolarReturn(person.birth, natalSun, meta.srYear, residence.lat, residence.lon);
  const srSunCheck = Math.abs(computeTropicalPosition("Sun", sr.instantUtc).longitude - natalSun);
  assert(srSunCheck < 0.001 || srSunCheck > 359.999, `${person.name}: SR sun mismatch`);
  lines.push(`**Retorno Solar ${meta.srYear} (residência)** — instante: ${sr.instantUtc.toISOString().replace("T", " ").slice(0, 16)} UTC`);
  lines.push("");
  lines.push(...westernMarkdown(sr.chart));
  lines.push("");

  const t = computeTransits(person.birth, today);
  lines.push(`**Trânsitos (${fmtDate(today)})**`);
  lines.push("");
  for (const key of ["saturn", "jupiter"] as const) {
    const p = t[key];
    const planetName = key === "saturn" ? "Saturn" : "Jupiter";
    const sid = siderealSignAndDegree(toSidereal(tropicalLongitudeOf(planetName, today), today));
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

export function generateCoupleTables(cfg: CoupleTablesConfig): string {
  const a = buildPersonChart(cfg.a.name, cfg.a.birth, cfg.today);
  const b = buildPersonChart(cfg.b.name, cfg.b.birth, cfg.today);

  // ---------- automatic verifier (no GABARITO exists for a new client, so
  // this checks independent structural invariants instead: anything that
  // must hold by construction, and any cross-system identity that would
  // break if a module drifted) ----------
  let checks = 0;
  const check = (cond: boolean, msg: string) => {
    checks++;
    assert(cond, msg);
  };

  for (const person of [a, b]) {
    const { d1 } = person;
    check(Object.keys(d1.rows).length === 9, `${person.name}: expected 9 grahas`);

    const ascIndex = SIGNS_ORDER.indexOf(d1.ascendant.sign);
    for (const [g, row] of Object.entries(d1.rows)) {
      check(row.house >= 1 && row.house <= 12, `${person.name}/${g}: house out of range`);
      check(row.degreeInSign >= 0 && row.degreeInSign < 30, `${person.name}/${g}: degree out of range`);
      // whole-sign house must equal the sign offset from the Vedic Ascendant
      check(
        row.house === ((SIGNS_ORDER.indexOf(row.sign) - ascIndex + 12) % 12) + 1,
        `${person.name}/${g}: house does not match whole-sign offset`,
      );
      for (const hit of row.drishtiEmitted) {
        check(
          d1.rows[hit.to].drishtiReceived.some((r) => r.from === g && r.offset === hit.offset),
          `${person.name}: drishti asymmetry ${g}->${hit.to}`,
        );
      }
    }

    // D-9 houses must be offsets from the D-9 Ascendant, and vargottama
    // must mean literally "same sign in D-1 and D-9".
    const d9AscIndex = SIGNS_ORDER.indexOf(d1.d9.ascendantD9Sign);
    for (const [g, row] of Object.entries(d1.d9.rows)) {
      check(
        row.d9House === ((SIGNS_ORDER.indexOf(row.d9Sign) - d9AscIndex + 12) % 12) + 1,
        `${person.name}/${g}: D-9 house mismatch`,
      );
      check(row.vargottama === (row.d9Sign === d1.rows[g as keyof typeof d1.rows].sign), `${person.name}/${g}: vargottama flag wrong`);
    }

    check(d1.karakas.atmakaraka !== d1.karakas.amatyakaraka, `${person.name}: AK === AmK`);
    // AK must really be the highest degree-in-sign among the 7 classical grahas
    const byDegree = CLASSICAL_GRAHAS.map((g) => ({ g, deg: d1.rows[g].degreeInSign })).sort((x, y) => y.deg - x.deg);
    check(d1.karakas.atmakaraka === byDegree[0].g, `${person.name}: AK is not the highest-degree classical graha`);
    check(d1.karakas.amatyakaraka === byDegree[1].g, `${person.name}: AmK is not the second-highest`);
    check(d1.karakas.atmakarakaD9Sign === d1.d9.rows[d1.karakas.atmakaraka].d9Sign, `${person.name}: Karakamsha sign inconsistent with D-9 table`);

    check(((d1.rows.Ketu.house - d1.rows.Rahu.house + 12) % 12) === 6, `${person.name}: Rahu/Ketu not opposite`);

    // Vimshottari: contiguous mahadashas, and the first lord must be the
    // lord of the natal Moon's nakshatra (the whole cycle hangs off this).
    const mahas = vimshottariMahadashas(person.birth.utcDate, 12);
    for (let i = 1; i < mahas.length; i++) {
      check(mahas[i].start.getTime() === mahas[i - 1].end.getTime(), `${person.name}: dasha gap at ${i}`);
    }
    check(mahas[0].lord === d1.rows.Moon.nakshatraLord, `${person.name}: first mahadasha lord != Moon's nakshatra lord`);

    // Cross-system: the Vedic Ascendant is the tropical Ascendant minus the
    // ayanamsa — if either module drifted, this breaks.
    const { ascendant: tropAsc } = computePlacidusHouses(person.birth.utcDate, person.birth.latitude, person.birth.longitude);
    const sidAsc = siderealSignAndDegree(toSidereal(tropAsc, person.birth.utcDate));
    check(sidAsc.sign === d1.ascendant.sign, `${person.name}: Vedic/Western Ascendant sign mismatch`);
    check(Math.abs(sidAsc.degreeInSign - d1.ascendant.degreeInSign) < 0.01, `${person.name}: Vedic/Western Ascendant degree mismatch`);
  }

  console.log(`Verificador: ${checks} invariantes verificados, 0 falhas.`);

  const pts = coupleVedicPoints(a, b);
  assert(
    (pts.moonCountAtoB === 1 && pts.moonCountBtoA === 1) || pts.moonCountAtoB + pts.moonCountBtoA === 14,
    "moon count complement broken",
  );

  const lines: string[] = [];
  lines.push(`# ${cfg.title}`);
  lines.push("");
  lines.push(cfg.dataNote);
  lines.push("");
  lines.push(...personSection(a, cfg, cfg.a));
  lines.push("---");
  lines.push("");
  lines.push(...personSection(b, cfg, cfg.b));
  lines.push("---");
  lines.push("");

  // ---------- synastry ----------
  lines.push("# Sinastria (M-004 Parte D)");
  lines.push("");

  const aspects = crossAspects(a, b);
  lines.push("## D-1: Cruzamentos por grau (tropical, orbe ≤7°; **negrito = exato ≤2°**)");
  lines.push("");
  lines.push(`| ${a.name} | Aspeto | ${b.name} | Orbe |`);
  lines.push("|---|---|---|---|");
  for (const x of aspects) {
    const bold = x.exact ? "**" : "";
    lines.push(`| ${bold}${x.fromA}${bold} | ${bold}${x.aspect}${bold} | ${bold}${x.toB}${bold} | ${bold}${fmtDeg(x.orb)}${bold} |`);
  }
  lines.push("");
  const mandatory: [string, string][] = [
    ["Sun", "Moon"],
    ["Moon", "Sun"],
    ["Mars", "Mars"],
    ["Saturn", "Sun"],
    ["Saturn", "Moon"],
    ["Venus", "Mercury"],
    ["Mercury", "Venus"],
    ["Mercury", "MC"],
    ["MC", "Mercury"],
  ];
  lines.push("**Verificações obrigatórias (D-1):**");
  lines.push("");
  for (const [pa, pb] of mandatory) {
    const found = aspects.filter((x) => x.fromA === pa && x.toB === pb);
    lines.push(`- ${a.name} ${pa} × ${b.name} ${pb}: ${found.length ? found.map((f) => `${f.aspect} ${fmtDeg(f.orb)}`).join("; ") : "sem aspeto ≤7°"}`);
  }
  lines.push(
    `- Saturno de ${b.name} × luminares de ${a.name}: ${aspects.filter((x) => x.toB === "Saturn" && (x.fromA === "Sun" || x.fromA === "Moon")).map((f) => `${f.fromA} ${f.aspect} ${fmtDeg(f.orb)}`).join("; ") || "sem aspeto ≤7°"}`,
  );
  lines.push("");

  lines.push("## D-2: Drishti cruzado (védico, signos inteiros)");
  lines.push("");
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    lines.push(`**De ${from.name} sobre pontos de ${to.name}:**`);
    lines.push("");
    for (const d of crossDrishti(from, to)) {
      const moonFlag = d.hitsB.includes("Moon") ? " ← **atinge a LUA**" : "";
      lines.push(`- ${d.fromA} (${from.d1.rows[d.fromA].sign}) lança ${d.offset}º sobre ${d.targetSign} → atinge ${d.hitsB.join("+")} de ${to.name}${moonFlag}`);
    }
    lines.push("");
  }

  lines.push("## D-3: Sobreposições de casas (whole-sign védico)");
  lines.push("");
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    lines.push(`| Graha de ${from.name} | Signo | Cai na casa de ${to.name} |`);
    lines.push("|---|---|---|");
    for (const o of houseOverlays(from, to)) lines.push(`| ${o.graha} | ${o.sign} | ${o.houseInPartner} |`);
    lines.push("");
  }

  lines.push("## PONTOS_VEDICOS_CASAL: Pontos védicos do casal");
  lines.push("");
  lines.push(`- Atmakaraka de ${a.name}: **${pts.atmakarakaA}** · Atmakaraka de ${b.name}: **${pts.atmakarakaB}**${pts.atmakarakaA === pts.atmakarakaB ? " — **IGUAIS**" : ""}`);
  lines.push(`- Nakshatra da Lua de ${a.name}: ${pts.moonNakshatraA.name} (regente ${pts.moonNakshatraA.lord}) · de ${b.name}: ${pts.moonNakshatraB.name} (regente ${pts.moonNakshatraB.lord})${pts.sameMoonLord ? " — **mesmo regente: mesma chave**" : ""}`);
  lines.push(`- Sol de ${a.name} no Nakshatra da Lua de ${b.name}: ${pts.sunAInMoonNakshatraB ? "**SIM**" : "não"} · Sol de ${b.name} no Nakshatra da Lua de ${a.name}: ${pts.sunBInMoonNakshatraA ? "**SIM**" : "não"}`);
  lines.push(`- Contagem lunar (Kuta): ${a.name}→${b.name} = ${pts.moonCountAtoB} · ${b.name}→${a.name} = ${pts.moonCountBtoA} (5/9 favorável; 6/8 exigente; 2/12 delicado)`);
  lines.push(`- Mangal Dosha: ${a.name} ${pts.mangalDoshaA ? "PRESENTE" : "ausente"} (Marte casa ${a.d1.rows.Mars.house}) · ${b.name} ${pts.mangalDoshaB ? "PRESENTE" : "ausente"} (Marte casa ${b.d1.rows.Mars.house})`);
  lines.push("");
  lines.push("**Sincronia de Dashas (hoje):**");
  lines.push("");
  for (const person of [a, b]) {
    const cd = person.currentDasha;
    lines.push(`- ${person.name}: Mahadasha **${cd.mahadasha.lord}** (${fmtDate(cd.mahadasha.start)}→${fmtDate(cd.mahadasha.end)}), Antardasha **${cd.antardasha.lord}** (${fmtDate(cd.antardasha.start)}→${fmtDate(cd.antardasha.end)})`);
  }
  lines.push("");

  lines.push("## D-extra: Quíron e Lilith cruzados (≤3°)");
  lines.push("");
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    const chironLon = tropicalLongitudeOfMinor("Quiron", from.birth.utcDate);
    const lilithLon = tropicalLongitudeOfMinor("Lilith", from.birth.utcDate);
    const personalTargets: [string, number][] = to.tropicalPoints
      .filter((p) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendente", "MC"].includes(p.name))
      .map((p): [string, number] => [p.name, p.longitude]);
    const lilithTargets: [string, number][] = to.tropicalPoints
      .filter((p) => ["Moon", "Venus", "Ascendente"].includes(p.name))
      .map((p): [string, number] => [p.name, p.longitude]);
    const chironHits = minorAspects(chironLon, personalTargets);
    const lilithHits = minorAspects(lilithLon, lilithTargets);
    lines.push(`**${from.name} → ${to.name}:**`);
    lines.push(`- Quíron: ${chironHits.length ? chironHits.map((h) => `**${h.aspect} ${h.target} ${fmtDeg(h.orb)}**`).join("; ") : "sem cruzamento ≤3° a pessoais/ângulos"}`);
    lines.push(`- Lilith: ${lilithHits.length ? lilithHits.map((h) => `**${h.aspect} ${h.target} ${fmtDeg(h.orb)}**`).join("; ") : "sem cruzamento ≤3° a Lua/Vénus/Asc"}`);
    lines.push("");
  }

  lines.push("## D-5: Circuito de Tensão Dinâmica (dados técnicos; a narrativa escolhe-se na Fase 2)");
  lines.push("");
  lines.push(cfg.complaintNote);
  lines.push("");
  for (const [person, partner] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const house of cfg.painHouses) {
      const p = painHouseCircuit(person, partner, house);
      lines.push(`**${person.name}, casa ${house}** (${p.houseSign}, regente ${p.ruler} em ${p.rulerSign}/casa ${p.rulerHouse}):`);
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

  const out = lines.join("\n");
  writeFileSync(cfg.outFile, out, "utf-8");
  return out;
}
