import { SIGN_RULERS, functionalRulerships } from "./signRulers";
import type { ClassicalGraha, Graha } from "./types";
import { CLASSICAL_GRAHAS } from "./types";
import type { D1TableResult, GrahaRow } from "./d1Table";

// M-008 Módulo I (Yogas matemáticos) + Módulo VIII (Yogas adicionais) —
// detecção determinística a partir da tabela D-1 já calculada (nenhum
// dado novo, só combinações sobre o que compute.ts já produz). Os
// achados alimentam o prompt de redacção (ver tablesText.ts) como factos
// adicionais a traduzir — nunca o motor a "escrever", só a apontar.

export interface YogaHit {
  id: string;
  label: string;
  detail: string;
}

const ANGULAR_HOUSES = [1, 4, 7, 10];
const STRONG_DIGNITIES = new Set(["Own", "Exalted", "Friend"]);

function houseFrom(baseHouse: number, targetHouse: number): number {
  return ((targetHouse - baseHouse + 12) % 12) + 1;
}

function ruledBy(rulerships: Record<ClassicalGraha, number[]>, house: number): ClassicalGraha {
  const entry = Object.entries(rulerships).find(([, houses]) => houses.includes(house));
  return (entry ? entry[0] : "Sun") as ClassicalGraha;
}

/** Duas casas partilham regente (conjunção) ou os regentes aspectam-se mutuamente (drishti). */
function lordsAreLinked(rows: Record<Graha, GrahaRow>, lordA: ClassicalGraha, lordB: ClassicalGraha): boolean {
  if (lordA === lordB) return true;
  const a = rows[lordA];
  const b = rows[lordB];
  if (a.house === b.house) return true;
  const aAspectsB = a.drishtiEmitted.some((h) => h.to === lordB);
  const bAspectsA = b.drishtiEmitted.some((h) => h.to === lordA);
  return aAspectsB || bAspectsA;
}

export function detectYogas(d1: D1TableResult): YogaHit[] {
  const hits: YogaHit[] = [];
  const rows = d1.rows;
  const rulerships = functionalRulerships(d1.ascendant.sign);
  const moonHouse = rows.Moon.house;

  // ── Gaja Kesari Yoga (Módulo VIII) ──────────────────────────────────
  const jupiter = rows.Jupiter;
  const jupHouseFromMoon = houseFrom(moonHouse, jupiter.house);
  if ((ANGULAR_HOUSES.includes(jupiter.house) || ANGULAR_HOUSES.includes(jupHouseFromMoon)) && jupiter.dignity && STRONG_DIGNITIES.has(jupiter.dignity)) {
    hits.push({
      id: "gaja_kesari",
      label: "Gaja Kesari Yoga",
      detail: `Júpiter em casa angular (${jupiter.house === 1 || jupiter.house === 4 || jupiter.house === 7 || jupiter.house === 10 ? "do Ascendente" : "da Lua"}), dignidade ${jupiter.dignity} — dom de elevação por presença.`,
    });
  }

  // ── Kala Sarpa Yoga (Módulo VIII) — todos os clássicos de um lado do eixo Rahu-Ketu ──
  const rahuHouse = rows.Rahu.house;
  const ketuHouse = rows.Ketu.house;
  const onRahuSide = CLASSICAL_GRAHAS.filter((g) => {
    const h = houseFrom(rahuHouse, rows[g].house);
    return h < houseFrom(rahuHouse, ketuHouse);
  });
  if (onRahuSide.length === 7) {
    hits.push({ id: "kala_sarpa_full", label: "Kala Sarpa Yoga (completo)", detail: "Todos os 7 grahas clássicos de um só lado do eixo Rahu-Ketu — amplitude de ciclos acima da média." });
  } else if (onRahuSide.length >= 5) {
    hits.push({ id: "kala_sarpa_partial", label: "Kala Sarpa Yoga (parcial)", detail: `${onRahuSide.length} de 7 grahas clássicos do mesmo lado do eixo Rahu-Ketu — efeito atenuado mas presente.` });
  }

  // ── Parivartana Yoga (troca mútua de signos) ────────────────────────
  const seen = new Set<string>();
  for (const a of CLASSICAL_GRAHAS) {
    const rulerOfASign = SIGN_RULERS[rows[a].sign];
    if (rulerOfASign === a) continue;
    const b = rulerOfASign;
    const rulerOfBSign = SIGN_RULERS[rows[b].sign];
    if (rulerOfBSign === a) {
      const key = [a, b].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        hits.push({ id: `parivartana_${key}`, label: `Parivartana Yoga (${a} ↔ ${b})`, detail: `${a} está no signo de ${b} e ${b} está no signo de ${a} — fusão de temas entre as duas casas envolvidas.` });
      }
    }
  }

  // ── Budhaditya Yoga ──────────────────────────────────────────────────
  if (rows.Sun.sign === rows.Mercury.sign) {
    hits.push({ id: "budhaditya", label: "Budhaditya Yoga", detail: "Sol e Mercúrio no mesmo signo — mente e identidade fundidas, intelecto afiado." });
  }

  // ── Pancha Mahapurusha (4 dos 5 clássicos usados no Naveya) ─────────
  const mahapurusha: [ClassicalGraha, string][] = [
    ["Mars", "Ruchaka Yoga"],
    ["Jupiter", "Hamsa Yoga"],
    ["Venus", "Malavya Yoga"],
    ["Saturn", "Shasha Yoga"],
  ];
  for (const [graha, label] of mahapurusha) {
    const row = rows[graha];
    // Moolatrikona incluído (SPEC-003) — na escala 0-6 fica acima de "Own"
    // (5 vs 4); decisão a validar pelo fundador (não há consenso único
    // sobre se Moolatrikona qualifica para Pancha Mahapurusha em BPHS).
    if (ANGULAR_HOUSES.includes(row.house) && (row.dignity === "Own" || row.dignity === "Exalted" || row.dignity === "Moolatrikona")) {
      const dignityLabel = row.dignity === "Own" ? "signo próprio" : row.dignity === "Moolatrikona" ? "Moolatrikona" : "exaltação";
      hits.push({ id: `mahapurusha_${graha.toLowerCase()}`, label, detail: `${graha} em ${dignityLabel}, em casa angular (${row.house}) — voltagem extraordinária nesta função.` });
    }
  }

  // ── Dhana Yoga (regentes de 2/5/9/11 ligados entre si) ──────────────
  const dhanaHouses = [2, 5, 9, 11];
  const dhanaLords = [...new Set(dhanaHouses.map((h) => ruledBy(rulerships, h)))];
  for (let i = 0; i < dhanaLords.length; i++) {
    for (let j = i + 1; j < dhanaLords.length; j++) {
      if (lordsAreLinked(rows, dhanaLords[i], dhanaLords[j])) {
        hits.push({ id: `dhana_${dhanaLords[i]}_${dhanaLords[j]}`, label: "Dhana Yoga", detail: `Regentes de casas de riqueza ligados (${dhanaLords[i]} ↔ ${dhanaLords[j]}) — potencial financeiro activável.` });
      }
    }
  }

  // ── Raja Yoga (regentes de 1/5/9 ligados a regentes de 4/7/10) ──────
  const trikonaLords = [...new Set([1, 5, 9].map((h) => ruledBy(rulerships, h)))];
  const kendraLords = [...new Set([4, 7, 10].map((h) => ruledBy(rulerships, h)))];
  for (const t of trikonaLords) {
    for (const k of kendraLords) {
      if (t !== k && lordsAreLinked(rows, t, k)) {
        hits.push({ id: `raja_${t}_${k}`, label: "Raja Yoga", detail: `Regente de casa de dharma ligado a regente de casa de acção (${t} ↔ ${k}) — sucesso reconhecido publicamente.` });
      }
    }
  }

  // ── Viparita Raja Yoga (3 subtipos) ──────────────────────────────────
  const viparita: [number, string, string][] = [
    [6, "Harsha Yoga", "supera dificuldades e conflitos pelo próprio esforço"],
    [8, "Sarala Yoga", "protecção nas crises — a transformação trabalha a seu favor"],
    [12, "Vimala Yoga", "gastos/perdas aparentes transformam-se em libertação"],
  ];
  for (const [house, label, meaning] of viparita) {
    const lord = ruledBy(rulerships, house);
    if ([6, 8, 12].includes(rows[lord].house)) {
      hits.push({ id: `vry_${house}`, label: `Viparita Raja Yoga — ${label}`, detail: `Regente da Casa ${house} está em casa difícil (${rows[lord].house}) — ${meaning}.` });
    }
  }

  // ── Neechabhanga (reversão de debilitação) — Módulo I ────────────────
  for (const g of CLASSICAL_GRAHAS) {
    const row = rows[g];
    if (row.dignity !== "Debilitated") continue;
    const signRuler = SIGN_RULERS[row.sign];
    const rulerRow = rows[signRuler];
    if (ANGULAR_HOUSES.includes(rulerRow.house) || rulerRow.dignity === "Exalted") {
      hits.push({
        id: `neechabhanga_${g.toLowerCase()}`,
        label: `Neechabhanga (${g})`,
        detail: `${g} está debilitado, mas o regente do signo (${signRuler}) está ${rulerRow.dignity === "Exalted" ? "exaltado" : "em casa angular"} — o bloqueio converte-se em força que nasce da adversidade.`,
      });
    }
  }

  return hits;
}
