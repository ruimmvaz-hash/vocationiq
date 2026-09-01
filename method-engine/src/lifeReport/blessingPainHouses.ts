import { SIGNS_ORDER, type ClassicalGraha } from "./types";
import { houseOf } from "./positions";
import { functionalRulerships, SIGN_RULERS } from "./signRulers";
import { houseOverlays, type PersonChart } from "./synastry";

// M-008 Módulo VII Parte 1 — Casas de Dor (Dusthanas: 6/8/12) e de
// Bênção (Kendras/Trikonas: 1/5/9/11), projectando os planetas do
// Parceiro A nas casas do Parceiro B. Reaproveita houseOverlays()
// (já existente em synastry.ts) em vez de recalcular a projecção.

export interface BlessingPainHit {
  id: string;
  direction: "aToB" | "bToA";
  label: string;
  detail: string;
}

function overlayHouseOf(overlays: ReturnType<typeof houseOverlays>, graha: ClassicalGraha): number {
  return overlays.find((o) => o.graha === graha)!.houseInPartner;
}

function signDistance(from: string, to: string): number {
  return ((SIGNS_ORDER.indexOf(to as (typeof SIGNS_ORDER)[number]) - SIGNS_ORDER.indexOf(from as (typeof SIGNS_ORDER)[number]) + 12) % 12) + 1;
}

function detectOneDirection(a: PersonChart, b: PersonChart, direction: "aToB" | "bToA"): BlessingPainHit[] {
  const hits: BlessingPainHit[] = [];
  const overlays = houseOverlays(a, b);
  const ascLordA = SIGN_RULERS[a.d1.ascendant.sign];
  const rulershipsA = functionalRulerships(a.d1.ascendant.sign);
  const lordOfHouse = (house: number): ClassicalGraha => (Object.entries(rulershipsA).find(([, hs]) => hs.includes(house))?.[0] as ClassicalGraha) ?? "Sun";

  const ascHouseInB = houseOf(a.d1.ascendant.sign, b.d1.ascendant.sign);
  const moonHouseInB = overlayHouseOf(overlays, "Moon");
  const akA = a.d1.karakas.atmakaraka;
  const akHouseInB = overlays.find((o) => o.graha === akA)?.houseInPartner;

  // ── Casa 8 — Padrão de Controlo (Dor) ───────────────────────────────
  if (ascHouseInB === 8 || moonHouseInB === 8 || akHouseInB === 8) {
    hits.push({
      id: "casa8",
      direction,
      label: "Activação de Padrões de Fundo",
      detail: "O Ascendente, a Lua ou o motor de propósito de um cai na zona de traumas/medos ocultos do outro — detona padrões de fundo; tende a gerar necessidade de controlo com o tempo.",
    });
  }

  // ── Casa 6 — Padrão de Cobrança (Dor) ────────────────────────────────
  const ascLordHouseInB = overlays.find((o) => o.graha === ascLordA)?.houseInPartner;
  const saturnHouseInB = overlayHouseOf(overlays, "Saturn");
  if (ascLordHouseInB === 6 || saturnHouseInB === 6) {
    hits.push({
      id: "casa6",
      direction,
      label: "Desequilíbrio de Ritmos",
      detail: "O regente da identidade ou o peso estrutural de um cai na zona de eficiência do outro — gera sensação crónica de insuficiência; nenhum dos dois está errado, os sistemas nervosos têm velocidades diferentes aqui.",
    });
  }

  // ── Casa 9 — Padrão de Expansão (Bênção) ─────────────────────────────
  const jupiterHouseInB = overlayHouseOf(overlays, "Jupiter");
  const sunHouseInB = overlayHouseOf(overlays, "Sun");
  if (jupiterHouseInB === 9 || sunHouseInB === 9 || ascLordHouseInB === 9) {
    hits.push({
      id: "casa9",
      direction,
      label: "Activação de Propósito",
      detail: "A presença de um expande genuinamente a fé, o optimismo e a visão de futuro do outro — abre caminhos que o outro não abriria sozinho.",
    });
  }

  // ── Casa 11 — Multiplicador de Recursos (Bênção) ─────────────────────
  const lord2A = lordOfHouse(2);
  const lord11A = lordOfHouse(11);
  const lord2HouseInB = overlays.find((o) => o.graha === lord2A)?.houseInPartner;
  const lord11HouseInB = overlays.find((o) => o.graha === lord11A)?.houseInPartner;
  if (lord2HouseInB === 11 || lord11HouseInB === 2) {
    hits.push({
      id: "casa11",
      direction,
      label: "Multiplicador de Recursos",
      detail: "A trabalhar junto, o casal gera mais do que os dois separados — a inteligência estratégica de um activa os ganhos do outro.",
    });
  }

  // ── Casa 5 — Ressonância de Alegria (Bênção) ─────────────────────────
  const venusHouseInB = overlayHouseOf(overlays, "Venus");
  if (moonHouseInB === 5 || venusHouseInB === 5) {
    hits.push({
      id: "casa5",
      direction,
      label: "Ressonância de Alegria",
      detail: "Gera afeição espontânea, alegria na intimidade e fertilidade criativa para novos projectos — é o que sustenta a relação nas fases difíceis.",
    });
  }

  return hits;
}

/** Eixo Shashtashtaka (6/8 de signos) — incompatibilidade biológica de base nos ritmos, dinheiro, dor. Não depende de direcção (é simétrico). */
function detectShashtashtaka(a: PersonChart, b: PersonChart): BlessingPainHit[] {
  const hits: BlessingPainHit[] = [];
  const ascDist = signDistance(a.d1.ascendant.sign, b.d1.ascendant.sign);
  const moonDist = signDistance(a.d1.rows.Moon.sign, b.d1.rows.Moon.sign);
  if ([6, 8].includes(ascDist) || [6, 8].includes(moonDist)) {
    hits.push({
      id: "shashtashtaka",
      direction: "aToB",
      label: "Dessincronização de Ritmos",
      detail: "Identidade ou mundo emocional dos dois a 6 ou 8 signos de distância — incompatibilidade biológica de base nos ritmos diários, no dinheiro e na forma de processar a dor; não é falta de amor, é diferença de frequência.",
    });
  }
  return hits;
}

export function detectBlessingPainHouses(a: PersonChart, b: PersonChart): BlessingPainHit[] {
  return [...detectOneDirection(a, b, "aToB"), ...detectOneDirection(b, a, "bToA"), ...detectShashtashtaka(a, b)];
}
