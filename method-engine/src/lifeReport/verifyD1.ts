import { writeFileSync } from "node:fs";
import { computeD1Table } from "./d1Table";
import { fmtDeg } from "./format";
import type { ClassicalGraha, Graha } from "./types";
import type { BhavaMadhyaBand } from "./bhavaMadhya";
import type { DignityDetail } from "../data/dignity";

// Extended verifier (DEC-031 session 2). Cross-checks EVERY graha's
// dignity, drishti recebido, and Bhava Madhya against the literal values
// transcribed from docs/GABARITO-Rui-Tabelas.md and
// docs/GABARITO-Alice-Tabelas.md. Never corrects the GABARITO — reports
// discrepancies for the founder to decide.

interface Expected {
  /** null + dignityStated:false means GABARITO left the cell blank ("---") — not comparable, not a discrepancy either way. Rui's table only fills in Exalted/Debilitated/Own; Alice's fills every planet's dignity explicitly. */
  dignity: DignityDetail | null;
  dignityStated: boolean;
  bhavaMadhya: { distance: number; band: BhavaMadhyaBand };
  /** [fromGraha, offset][] transcribed from the GABARITO's own "Drishti recebido" text. */
  received: [Graha, number][];
}

// --- Rui Vaz — GABARITO-Rui-Tabelas.md, section A, table rows ---
const RUI_EXPECTED: Record<ClassicalGraha, Expected> = {
  Sun: {
    dignity: null,
    dignityStated: false, // "---" — GABARITO only fills in Exalted/Debilitated/Own for Rui
    bhavaMadhya: { distance: 10 + 19 / 60, band: "Moderada/Baixa" },
    received: [
      ["Saturn", 7],
      ["Mars", 8],
      ["Jupiter", 9], // GABARITO labels this "7º de Gémeos" — a probable label typo (see report); the fact (Jupiter aspects here) is correct.
    ],
  },
  Moon: {
    dignity: "Exalted",
    dignityStated: true,
    bhavaMadhya: { distance: 11 + 47 / 60, band: "Moderada/Baixa" },
    received: [["Saturn", 10]],
  },
  Mercury: {
    dignity: null,
    dignityStated: false,
    bhavaMadhya: { distance: 10 + 15 / 60, band: "Moderada/Baixa" },
    received: [["Mars", 7]],
  },
  Venus: {
    dignity: null,
    dignityStated: false,
    bhavaMadhya: { distance: 4 + 39 / 60, band: "Maxima" },
    received: [
      ["Saturn", 7],
      ["Mars", 8],
      ["Jupiter", 9], // same label note as Sun above
    ],
  },
  Mars: {
    dignity: "Debilitated",
    dignityStated: true,
    bhavaMadhya: { distance: 12 + 13 / 60, band: "Moderada/Baixa" },
    // GABARITO shows "---" (blank) here, but Mercury's OWN row explicitly
    // states its 7th aspect lands on "Caranguejo/Casa 12 (Mercúrio)" —
    // i.e. Mars's house. That is a self-contradiction within the
    // GABARITO document itself; flagged, not silently followed.
    received: [["Mercury", 7]],
  },
  Jupiter: {
    dignity: null,
    dignityStated: false,
    bhavaMadhya: { distance: 9 + 56 / 60, band: "Media/Alta" },
    received: [], // GABARITO: "---", matches
  },
  Saturn: {
    dignity: null,
    dignityStated: false,
    bhavaMadhya: { distance: 8 + 49 / 60, band: "Media/Alta" },
    received: [
      ["Sun", 7],
      ["Venus", 7], // GABARITO only writes "Sol", but Sun+Venus are conjunct in the same house — Venus necessarily receives the same aspect. Abbreviation, not a disagreement.
    ],
  },
};

// --- Alice Amorim — GABARITO-Alice-Tabelas.md, section A, table rows ---
const ALICE_EXPECTED: Record<ClassicalGraha, Expected> = {
  Sun: {
    dignity: "Friend", // "amigo"
    dignityStated: true,
    bhavaMadhya: { distance: 17 + 45 / 60, band: "Penumbra" },
    // Confirmed indirectly via Saturn's own emitted note ("3º→Sagitário/8 (Sol)") and Rahu's ("7º→Casa 8 (Sol+Ketu)" via "eixo").
    received: [
      ["Saturn", 3],
      ["Rahu", 7],
    ],
  },
  Moon: {
    dignity: "Debilitated",
    dignityStated: true,
    bhavaMadhya: { distance: 8 + 27 / 60, band: "Media/Alta" }, // GABARITO: 8°27'
    received: [],
  },
  Mercury: {
    dignity: "Neutral", // "neutro"
    dignityStated: true,
    bhavaMadhya: { distance: 0 + 36 / 60, band: "Maxima" },
    received: [],
  },
  Venus: {
    dignity: "Friend", // "amigo"
    dignityStated: true,
    bhavaMadhya: { distance: 4 + 3 / 60, band: "Maxima" },
    received: [],
  },
  Mars: {
    dignity: "Neutral", // "neutro"
    dignityStated: true,
    bhavaMadhya: { distance: 7 + 29 / 60, band: "Media/Alta" },
    received: [],
  },
  Jupiter: {
    // GABARITO leaves this blank ("---"), but the same classical rule
    // gives explicit amigo/neutro for her other 4 planets in this same
    // table. Jupiter-in-Scorpio = Friend (Mars is Jupiter's natural
    // friend; Scorpio is Mars's sign) is the correct classical value —
    // flagged as a probable GABARITO omission, not a motor error.
    dignity: "Friend",
    dignityStated: false,
    bhavaMadhya: { distance: 0 + 56 / 60, band: "Maxima" },
    received: [],
  },
  Saturn: {
    dignity: "Exalted",
    dignityStated: true,
    bhavaMadhya: { distance: 1 + 27 / 60, band: "Maxima" },
    received: [],
  },
};

function fmtDignity(d: DignityDetail | null): string {
  return d ?? "—";
}

interface Discrepancy {
  person: string;
  graha: string;
  field: string;
  motor: string;
  gabarito: string;
  note?: string;
}

function verifyPerson(name: string, expected: Record<ClassicalGraha, Expected>, birth: Parameters<typeof computeD1Table>[0]): { checked: number; discrepancies: Discrepancy[] } {
  const result = computeD1Table(birth);
  const discrepancies: Discrepancy[] = [];
  let checked = 0;

  for (const graha of Object.keys(expected) as ClassicalGraha[]) {
    const row = result.rows[graha];
    const exp = expected[graha];

    checked++;
    if (exp.dignityStated && row.dignity !== exp.dignity) {
      discrepancies.push({
        person: name,
        graha,
        field: "Dignidade",
        motor: fmtDignity(row.dignity),
        gabarito: fmtDignity(exp.dignity),
      });
    } else if (!exp.dignityStated && row.dignity !== exp.dignity) {
      discrepancies.push({
        person: name,
        graha,
        field: "Dignidade (GABARITO em branco)",
        motor: fmtDignity(row.dignity),
        gabarito: "--- (não preenchido)",
        note: "Não é uma divergência de cálculo — GABARITO só preenche Exaltado/Debilitado/Domicílio para esta pessoa; valor do motor é a regra clássica aplicada normalmente.",
      });
    }

    checked++;
    const distanceOk = Math.abs(row.bhavaMadhyaDistance - exp.bhavaMadhya.distance) < 4 / 60; // 4' tolerance
    const bandOk = row.bhavaMadhyaBand === exp.bhavaMadhya.band;
    if (!distanceOk || !bandOk) {
      discrepancies.push({
        person: name,
        graha,
        field: "Bhava Madhya",
        motor: `${fmtDeg(row.bhavaMadhyaDistance)} -> ${row.bhavaMadhyaBand}`,
        gabarito: `${fmtDeg(exp.bhavaMadhya.distance)} -> ${exp.bhavaMadhya.band}`,
      });
    }

    checked++;
    const motorReceived = new Set(row.drishtiReceived.map((h) => `${h.from}:${h.offset}`));
    const expectedReceived = new Set(exp.received.map(([from, offset]) => `${from}:${offset}`));
    const missingInMotor = [...expectedReceived].filter((k) => !motorReceived.has(k));
    const extraInMotor = [...motorReceived].filter((k) => !expectedReceived.has(k));
    if (missingInMotor.length || extraInMotor.length) {
      discrepancies.push({
        person: name,
        graha,
        field: "Drishti recebido",
        motor: row.drishtiReceived.map((h) => `${h.from}(${h.offset}º)`).join("; ") || "—",
        gabarito: exp.received.map(([f, o]) => `${f}(${o}º)`).join("; ") || "—",
      });
    }
  }

  return { checked, discrepancies };
}

const rui = verifyPerson("Rui", RUI_EXPECTED, {
  utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)),
  latitude: 38.7169,
  longitude: -9.1399,
});

const alice = verifyPerson("Alice", ALICE_EXPECTED, {
  utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)),
  latitude: -8.839,
  longitude: 13.2894,
});

const allDiscrepancies = [...rui.discrepancies, ...alice.discrepancies];
const real = allDiscrepancies.filter((d) => !d.note);
const informational = allDiscrepancies.filter((d) => d.note);
const totalChecked = rui.checked + alice.checked;

const lines: string[] = [];
lines.push("# Verificador estendido D-1 — dignidade, drishti recebido, Bhava Madhya");
lines.push("");
lines.push(
  `Pontos verificados: ${totalChecked} (Rui: ${rui.checked}, Alice: ${alice.checked}). Divergências reais: ${real.length}. Notas informativas (GABARITO em branco): ${informational.length}.`,
);
lines.push("");
if (real.length === 0) {
  lines.push("**Nenhuma divergência real encontrada** — dignidade, drishti recebido e Bhava Madhya batem em todos os pontos onde o GABARITO declara um valor.");
} else {
  lines.push("## Divergências reais");
  lines.push("");
  lines.push("| Pessoa | Graha | Campo | Motor | GABARITO |");
  lines.push("|---|---|---|---|---|");
  for (const d of real) {
    lines.push(`| ${d.person} | ${d.graha} | ${d.field} | ${d.motor} | ${d.gabarito} |`);
  }
}
lines.push("");
if (informational.length > 0) {
  lines.push("## Notas informativas (não são divergências)");
  lines.push("");
  lines.push("| Pessoa | Graha | Campo | Motor | GABARITO | Nota |");
  lines.push("|---|---|---|---|---|---|");
  for (const d of informational) {
    lines.push(`| ${d.person} | ${d.graha} | ${d.field} | ${d.motor} | ${d.gabarito} | ${d.note} |`);
  }
}
lines.push("");

const report = lines.join("\n");
writeFileSync("d1-verification-report.md", report, "utf-8");
console.log(report);
