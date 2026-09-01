import type { ZodiacSign } from "../data/tables";
import { vedicDignityWithDegree, nodeDignityFromDispositor, type DignityDetail } from "../data/dignity";
import { computeAscendant } from "../astrology/ascendant";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, type BirthInput, type ClassicalGraha, type Graha } from "./types";
import { computeAllGrahaPositions } from "./positions";
import { functionalRulerships, SIGN_RULERS } from "./signRulers";
import { getNakshatraDetail } from "./nakshatraLords";
import { avasthaBaladi, type Avastha } from "./avasthaBaladi";
import { bhavaMadhyaBand, bhavaMadhyaDistance, type BhavaMadhyaBand } from "./bhavaMadhya";
import { aspectedHouses, computeAllDrishti, emitted, emittedTargets, received, type DrishtiHit, type EmittedTarget } from "./drishti";
import { computeConjunctions, type Conjunction } from "./conjunctions";
import { computeKarakas, type KarakaResult } from "./karakas";
import { computeD9Table, type D9TableResult } from "./d9Table";
import { computeArudhaLagna, type ArudhaLagnaResult } from "./arudhaLagna";
import type { NakshatraName } from "../astrology/nakshatra";
import { computeRetrogradeStatus, NODE_RETROGRADE_STATUS, type RetrogradeStatus } from "../astrology/retrograde";
import { computeCombustion, type CombustionStatus } from "../astrology/combustion";

export interface GrahaRow {
  graha: Graha;
  sign: ZodiacSign;
  degreeInSign: number;
  house: number;
  /**
   * SPEC-003 v2 (Decisão 2) — nunca `null`. Os 7 clássicos usam o lookup
   * por grau (`vedicDignityWithDegree`); Rahu/Ketu usam a convenção do
   * dispositor (`nodeDignityFromDispositor`, ver dignity.ts) — a dignidade
   * do regente clássico do signo que ocupam nesse mapa, com "Own" no lugar
   * de "Moolatrikona" quando o dispositor está em Moolatrikona (sem
   * consenso clássico para os nodos terem Moolatrikona).
   */
  dignity: DignityDetail | null;
  functionalRulershipHouses: number[];
  nakshatra: NakshatraName;
  pada: number;
  nakshatraLord: Graha;
  avastha: Avastha | null;
  bhavaMadhyaDistance: number;
  bhavaMadhyaBand: BhavaMadhyaBand;
  drishtiReceived: DrishtiHit[];
  drishtiEmitted: DrishtiHit[];
  /** Full emitted picture, including aspects that land on an empty house or the Ascendant (dropped by `drishtiEmitted`, which only lists hits on occupied houses). */
  drishtiEmittedTargets: EmittedTarget[];
  /**
   * SPEC-003 (Implementação 2) — Sol e Lua NUNCA retrogradam:
   * isRetrograde/isStationary ficam sempre `false` para os dois, por
   * definição astronómica (não é um bug — ver retrograde.ts). Rahu/Ketu
   * usam sempre o mesmo valor fixo (NODE_RETROGRADE_STATUS): o nó médio
   * regride suavemente sem estações nem laços.
   */
  retrograde: RetrogradeStatus;
  /**
   * SPEC-003 (Implementação 3) — sempre presente para os 9 grahas; para
   * Sol/Rahu/Ketu (Passo 0 de combustion.ts) fica sempre `{isCombustLuna:
   * false, isCazimi:false, isCombust:false}` — nunca `null`, pela mesma
   * razão que dignity nunca é `null`: um objecto sempre presente com
   * campos `false` é seguro por omissão para qualquer consumidor.
   */
  combustion: CombustionStatus;
}

export interface AscendantRow {
  sign: ZodiacSign;
  degreeInSign: number;
  nakshatra: NakshatraName;
  pada: number;
  nakshatraLord: Graha;
  /** Which grahas cast a Parashari aspect onto House 1. */
  drishtiReceivedBy: Graha[];
}

export interface D1TableResult {
  ascendant: AscendantRow;
  rows: Record<Graha, GrahaRow>;
  conjunctions: Conjunction[];
  karakas: KarakaResult;
  d9: D9TableResult;
  arudhaLagna: ArudhaLagnaResult;
}

function isClassical(graha: Graha): graha is ClassicalGraha {
  return (CLASSICAL_GRAHAS as Graha[]).includes(graha);
}

/** M-004 Parte C — full D-1 technical table for one person, purely deterministic (no AI, no prose). */
export function computeD1Table(birth: BirthInput): D1TableResult {
  const ascendant = computeAscendant(birth.utcDate, birth.latitude, birth.longitude);
  const positions = computeAllGrahaPositions(birth.utcDate, ascendant.sign);
  const rulerships = functionalRulerships(ascendant.sign);
  const drishtiHits = computeAllDrishti(positions);
  const conjunctions = computeConjunctions(positions);
  const karakas = computeKarakas(positions, ascendant.sign, ascendant.degreeInSign);
  const d9 = computeD9Table(positions, ascendant.sign, ascendant.degreeInSign);
  const arudhaLagna = computeArudhaLagna(ascendant.sign, positions);

  // SPEC-003 v2 — ORDEM DE CÁLCULO obrigatória (Decisão 2): dignidade dos
  // 7 clássicos → dignidade de Rahu/Ketu por dispositor → retrogradação →
  // combustão. Cada fase corre à parte, nunca dentro do loop único de
  // `rows` abaixo, para a ordem ficar explícita e impossível de inverter
  // por engano.

  // FASE 1 — dignidade dos 7 grahas clássicos (lookup por grau, cobre
  // Moolatrikona). Rahu/Ketu dependem destes valores na Fase 2, por isso
  // têm de estar prontos primeiro.
  const dignityByGraha = {} as Record<Graha, DignityDetail>;
  for (const graha of CLASSICAL_GRAHAS) {
    dignityByGraha[graha] = vedicDignityWithDegree(graha, positions[graha].sign, positions[graha].degreeInSign);
  }

  // FASE 2 — Rahu/Ketu pela convenção do dispositor (Decisão 2): a
  // dignidade do nodo = a dignidade do regente clássico (SIGN_RULERS) do
  // signo que ocupa, já calculada na Fase 1. nodeDignityFromDispositor
  // lança erro se o dispositor ainda não tiver dignidade calculada — nunca
  // deve disparar aqui (a Fase 1 cobre sempre os 7 clássicos primeiro),
  // mas a guarda vive no motor, não neste ponto de chamada.
  for (const node of ["Rahu", "Ketu"] as const) {
    const dispositor = SIGN_RULERS[positions[node].sign];
    dignityByGraha[node] = nodeDignityFromDispositor(dignityByGraha[dispositor]);
  }

  // FASE 3 — retrogradação. Só os 7 grahas clássicos usam diferença finita
  // geocêntrica; Rahu/Ketu usam sempre a mesma constante (nó médio, sempre
  // retrógrado — ver retrograde.ts).
  const retrogradeByGraha = {} as Record<Graha, RetrogradeStatus>;
  for (const graha of CLASSICAL_GRAHAS) {
    retrogradeByGraha[graha] = computeRetrogradeStatus(graha, birth.utcDate);
  }
  retrogradeByGraha.Rahu = NODE_RETROGRADE_STATUS;
  retrogradeByGraha.Ketu = NODE_RETROGRADE_STATUS;

  // FASE 4 — combustão (Implementação 3): mede distância em longitude
  // eclíptica; sideral-sideral é tão válido quanto tropical-tropical (a
  // ayanamsa cancela-se na diferença — mesma nota já usada em
  // synastry.ts), e `positions` já tem siderealLongitude calculada para
  // todos os 9 grahas, incluindo o Sol. Depende de isRetrograde/
  // isStationary (Fase 3), por isso corre por último.
  const sunSiderealLongitude = positions.Sun.siderealLongitude;

  const rows = {} as Record<Graha, GrahaRow>;
  for (const graha of ALL_GRAHAS) {
    const pos = positions[graha];
    const classical = isClassical(graha);
    const nakDetail = getNakshatraDetail(pos.siderealLongitude);
    const distance = bhavaMadhyaDistance(pos.degreeInSign, ascendant.degreeInSign);
    const retrograde = retrogradeByGraha[graha];

    rows[graha] = {
      graha,
      sign: pos.sign,
      degreeInSign: pos.degreeInSign,
      house: pos.house,
      dignity: dignityByGraha[graha],
      functionalRulershipHouses: classical ? rulerships[graha] : [],
      nakshatra: nakDetail.name,
      pada: nakDetail.pada,
      nakshatraLord: nakDetail.lord,
      avastha: classical ? avasthaBaladi(pos.sign, pos.degreeInSign) : null,
      bhavaMadhyaDistance: distance,
      bhavaMadhyaBand: bhavaMadhyaBand(distance),
      drishtiReceived: received(drishtiHits, graha),
      drishtiEmitted: emitted(drishtiHits, graha),
      drishtiEmittedTargets: emittedTargets(graha, positions),
      retrograde,
      // Passo 0 de computeCombustion() auto-exclui Sol/Rahu/Ketu — chamar
      // uniformemente para os 9 grahas é seguro e mais simples do que
      // ramificar aqui.
      combustion: computeCombustion(graha, pos.siderealLongitude, sunSiderealLongitude, retrograde.isRetrograde, retrograde.isStationary),
    };
  }

  const ascNak = getNakshatraDetail(ascendant.siderealLongitude);
  const drishtiReceivedBy = ALL_GRAHAS.filter((graha) => aspectedHouses(graha, positions).includes(1));

  return {
    ascendant: {
      sign: ascendant.sign,
      degreeInSign: ascendant.degreeInSign,
      nakshatra: ascNak.name,
      pada: ascNak.pada,
      nakshatraLord: ascNak.lord,
      drishtiReceivedBy,
    },
    rows,
    conjunctions,
    karakas,
    d9,
    arudhaLagna,
  };
}
