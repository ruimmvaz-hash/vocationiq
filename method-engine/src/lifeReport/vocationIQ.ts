import type { ZodiacSign } from "../data/tables";
import { SIGN_RULERS, functionalRulerships } from "./signRulers";
import { houseOf, signOfHouse } from "./positions";
import { CLASSICAL_GRAHAS, type ClassicalGraha, type Graha } from "./types";
import type { D1TableResult } from "./d1Table";
import { computeD10Table, type D10TableResult } from "./d10Table";
import { detectStellium, type StelliumHit } from "./stellium";
import type { DignityDetail } from "../data/dignity";

// VocationIQ — algoritmo obrigatório de 3 eixos (substitui o proxy de
// "planeta mais forte por dignidade" de vocational.ts para o produto
// VocationIQ/jovem, sem alterar detectVocationalFamilies, que continua a
// servir de camada 1 genérica onde já era usada). Passos 1-3 conforme
// especificado: Eixo da Missão (AK+Karakamsha), Modo de Ganho (Artha
// Trikonas 2/6/10), Montra de Mercado (Casa 11 a partir do Arudha Lagna).

export interface MissionAxis {
  atmakaraka: ClassicalGraha;
  akHouse: number;
  akDignity: string | null;
  akSign: ZodiacSign;
  karakamshaSign: ZodiacSign;
  karakamshaHouse: number;
}

export type EarningModeHouse = 2 | 6 | 10;

const EARNING_MODE_LABEL: Record<EarningModeHouse, string> = {
  2: "voz_consultoria_ensino",
  6: "cura_crise_servico_analise",
  10: "lideranca_executiva_impacto_publico_empreendedorismo",
};

export interface EarningMode {
  house: EarningModeHouse;
  label: string;
  score: number;
  signals: string[];
  planetsInHouse: Graha[];
  lord: ClassicalGraha;
}

export interface MarketShowcase {
  arudhaLagnaSign: ZodiacSign;
  arudhaLagnaHouseFromAscendant: number;
  house11FromAL: {
    sign: ZodiacSign;
    houseFromAscendant: number;
    planets: Graha[];
    lord: ClassicalGraha;
    drishtiReceivedBy: Graha[];
  };
}

/** Bloco 2 — REGRA 3: regente de uma casa angular do D10 + a sua dignidade (avaliada no próprio D10). */
export interface AngularLord {
  house: 1 | 4 | 7 | 10;
  sign: ZodiacSign;
  lord: ClassicalGraha;
  lordDignity: DignityDetail | null;
}

export interface VocationIQAxes {
  missionAxis: MissionAxis;
  /** Bloco 2 — REGRA 1 (Filtro do Amatyakaraka): o 2º maior grau no D1, comanda a ferramenta diária de trabalho. */
  amatyakaraka: ClassicalGraha;
  earningMode: EarningMode;
  earningModeAll: EarningMode[];
  marketShowcase: MarketShowcase;
  /** Bloco 2 — REGRA 3: tabela D-10 completa (carreira/acção pública). */
  d10: D10TableResult;
  /** Bloco 2 — REGRA 3: regentes das 4 casas angulares do D10 (1,4,7,10) + dignidade no próprio D10 — usados para ditar o nível de cargo. */
  d10AngularLords: AngularLord[];
  /** Bloco 2 — REGRA 3 (D1 também entra na regra: "regente da Casa 10 do D1 ou D10"). */
  d1House10Lord: { sign: ZodiacSign; lord: ClassicalGraha; lordDignity: DignityDetail | null };
  /** Bloco 2 — REGRA 2 (Hierarquia do Stellium): 3+ planetas clássicos no mesmo signo/casa, no D1. */
  stelliumD1: StelliumHit[];
  /** Bloco 2 — REGRA 2: idem, no D10. */
  stelliumD10: StelliumHit[];
}

/** Passo 2 — avalia a força de cada Artha Trikona (casas 2, 6, 10) e devolve o Modo de Ganho dominante. */
function computeEarningModes(d1: D1TableResult): EarningMode[] {
  const rows = d1.rows;
  const rulerships = functionalRulerships(d1.ascendant.sign);
  const houses: EarningModeHouse[] = [2, 6, 10];

  return houses
    .map((house) => {
      const sign = signOfHouse(house, d1.ascendant.sign);
      const lord = SIGN_RULERS[sign];
      const planetsInHouse = CLASSICAL_GRAHAS.filter((g) => rows[g].house === house);
      const drishtiOnHouse = CLASSICAL_GRAHAS.filter((g) => rows[g].drishtiEmittedTargets.some((t) => t.targetHouse === house));

      let score = 0;
      const signals: string[] = [];

      // Moolatrikona incluído (SPEC-003) — escala 0-6 coloca-o acima de "Own".
      const lordRow = rows[lord];
      if (lordRow.dignity === "Exalted" || lordRow.dignity === "Own" || lordRow.dignity === "Moolatrikona") {
        score += 2;
        signals.push(`regente da casa ${house} (${lord}) em dignidade forte (${lordRow.dignity})`);
      } else if (lordRow.dignity === "Debilitated") {
        score -= 1;
      }
      if (rulerships[lord]?.includes(house)) {
        score += 1;
      }
      for (const p of planetsInHouse) {
        score += 1.5;
        signals.push(`${p} presente na casa ${house}`);
      }
      for (const p of drishtiOnHouse) {
        score += 0.5;
        signals.push(`${p} lança Drishti sobre a casa ${house}`);
      }

      return {
        house,
        label: EARNING_MODE_LABEL[house],
        score: Math.round(score * 10) / 10,
        signals,
        planetsInHouse,
        lord,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Passo 3 — Casa 11 a partir do Arudha Lagna (a Montra de Mercado). */
function computeMarketShowcase(d1: D1TableResult): MarketShowcase {
  const al = d1.arudhaLagna;
  const house11Sign = signOfHouse(11, al.sign);
  const houseFromAscendant = houseOf(house11Sign, d1.ascendant.sign);
  const lord = SIGN_RULERS[house11Sign];
  const planets = CLASSICAL_GRAHAS.filter((g) => d1.rows[g].house === houseFromAscendant);
  const drishtiReceivedBy = CLASSICAL_GRAHAS.filter((g) => d1.rows[g].drishtiEmittedTargets.some((t) => t.targetHouse === houseFromAscendant));

  return {
    arudhaLagnaSign: al.sign,
    arudhaLagnaHouseFromAscendant: al.houseFromAscendant,
    house11FromAL: { sign: house11Sign, houseFromAscendant, planets, lord, drishtiReceivedBy },
  };
}

/** Passo 1 — Eixo da Missão de Vida (o Porquê): Atmakaraka + Karakamsha. */
function computeMissionAxis(d1: D1TableResult): MissionAxis {
  const ak = d1.karakas.atmakaraka;
  const akRow = d1.rows[ak];
  return {
    atmakaraka: ak,
    akHouse: akRow.house,
    akDignity: akRow.dignity,
    akSign: akRow.sign,
    karakamshaSign: d1.karakas.atmakarakaD9Sign,
    karakamshaHouse: d1.karakas.karakamshaHouse,
  };
}

/** Bloco 2 — REGRA 3: regentes das 4 casas angulares do D10, com dignidade avaliada no próprio D10. */
function computeD10AngularLords(d10: D10TableResult): AngularLord[] {
  const angularHouses: (1 | 4 | 7 | 10)[] = [1, 4, 7, 10];
  return angularHouses.map((house) => {
    const sign = signOfHouse(house, d10.ascendantD10Sign);
    const lord = SIGN_RULERS[sign];
    const lordRow = Object.values(d10.rows).find((r) => r.graha === lord)!;
    return { house, sign, lord, lordDignity: lordRow.d10Dignity };
  });
}

/** Bloco 2 — REGRA 3: regente da Casa 10 do D1 (a regra cita "D1 OU D10"). */
function computeD1House10Lord(d1: D1TableResult): { sign: ZodiacSign; lord: ClassicalGraha; lordDignity: DignityDetail | null } {
  const sign = signOfHouse(10, d1.ascendant.sign);
  const lord = SIGN_RULERS[sign];
  return { sign, lord, lordDignity: d1.rows[lord].dignity };
}

/** VocationIQ — os 3 eixos obrigatórios (Passos 1-3) + os dados da REGRA 1/2/3 do algoritmo de síntese (Bloco 2). */
export function computeVocationIQAxes(d1: D1TableResult): VocationIQAxes {
  const earningModeAll = computeEarningModes(d1);
  const d10 = computeD10Table(d1.rows, d1.ascendant.sign, d1.ascendant.degreeInSign);

  return {
    missionAxis: computeMissionAxis(d1),
    amatyakaraka: d1.karakas.amatyakaraka,
    earningMode: earningModeAll[0],
    earningModeAll,
    marketShowcase: computeMarketShowcase(d1),
    d10,
    d10AngularLords: computeD10AngularLords(d10),
    d1House10Lord: computeD1House10Lord(d1),
    stelliumD1: detectStellium(d1.rows),
    stelliumD10: detectStellium(
      Object.fromEntries(Object.entries(d10.rows).map(([g, row]) => [g, { sign: row.d10Sign, house: row.d10House }])) as Record<Graha, { sign: ZodiacSign; house: number }>,
    ),
  };
}
