export { assignArchetype, type Profile, type AssignmentResult, type EngineWeights } from "./engine/archetypeEngine";
export { calculateSunSign } from "./astrology/sunSign";
export { calculateLifePath, type BirthDate } from "./numerology/lifePath";
export { calculateExpressionNumber, normalizeName } from "./numerology/expression";
export {
  ARCHETYPE_MATRIX,
  MOTOR_TABLE,
  SIGN_TABLE,
  NUMBER_TABLE,
  WEIGHTS,
  type Element,
  type Modality,
  type ZodiacSign,
  type ArchetypeName,
  type MotorName,
} from "./data/tables";

// M-002 v0.5.1 — Vedic "nugget" layer (aspects/Atmakaraka/Ascendant)
export { computeVedicLevel1, computeVedicLevel2, type VedicLevel1Result, type VedicLevel2Result } from "./engine/vedicLayer";
export type { AspectHit, AspectType, AspectPlanet, AspectTone } from "./astrology/aspects";
export type { Karaka } from "./astrology/atmakaraka";
export type { NakshatraName, NakshatraPosition } from "./astrology/nakshatra";
// SPEC-004 — catálogo de temperamento por Nakshatra (matéria concreta do
// carácter, Capítulo 1).
export { nakshatraTemperamentOf, type NakshatraTemperament } from "./lifeReport/nakshatraTemperament";
export {
  getDignityLevel,
  DIGNITY_TABLE,
  DIGNITY_SCORE,
  dignityScore,
  vedicDignityWithDegree,
  nodeDignityFromDispositor,
  DIGNITY_LABEL_PT,
  dignityLabelPt,
  type VedicPlanet,
  type DignityLevel,
  type DignityDetail,
} from "./data/dignity";
export { retrogradeStatusLabelOf, type RetrogradeStatusLabel } from "./astrology/retrograde";
export { combustionTypeOf, combustionActiveOf, type CombustionType } from "./astrology/combustion";
export { computeTensionFlags, type TensionInput, type TensionFlags } from "./lifeReport/tension";

// M-004 — Life Report. Camada separada do Snapshot (que está congelado por
// DEC-031): tabelas técnicas determinísticas, validadas contra os GABARITO.
//
// NOTA: `western/chironLilith` carrega o Swiss Ephemeris (módulo nativo) no
// topo do ficheiro, por isso NÃO é reexportado aqui — importá-lo obrigaria
// qualquer consumidor deste index a arrastar o binário. Quem precisa de
// Quíron/Lilith importa `@naveya/method-engine/lifeReport/chironLilith`
// directamente, a partir de código que corra só no servidor.
export { computeD1Table, type D1TableResult, type GrahaRow, type AscendantRow } from "./lifeReport/d1Table";
export { computeD9Table, type D9TableResult } from "./lifeReport/d9Table";
export { computeD10Table, type D10TableResult, type D10Row } from "./lifeReport/d10Table";
export { dasamshaSign } from "./lifeReport/dasamsha";
export { detectStellium, type StelliumHit } from "./lifeReport/stellium";
export { computeArudhaLagna, type ArudhaLagnaResult } from "./lifeReport/arudhaLagna";
export { houseOf, type GrahaPosition } from "./lifeReport/positions";
export { SIGN_RULERS, functionalRulerships } from "./lifeReport/signRulers";
export {
  vimshottariMahadashas,
  antardashasOf,
  currentDasha,
  DASHA_SEQUENCE,
  DASHA_YEARS,
  type MahadashaPeriod,
  type AntardashaPeriod,
  type CurrentDasha,
  type DashaLord,
} from "./lifeReport/dasha";
export { sadeSatiStatus, type SadeSatiStatus, type SadeSatiPhase } from "./lifeReport/sadeSati";
export { computeWesternTable, tropicalDignity, type WesternResult, type WesternPlanetRow, type TropicalDignity } from "./lifeReport/western/westernTable";
export { computeSolarReturn, findSolarReturnInstant, type SolarReturnResult } from "./lifeReport/western/solarReturn";
export { computeTransits, type TransitResult, type TransitingPlanet, type TransitAspectHit } from "./lifeReport/western/transits";
export { computePlacidusHouses, placidusHouseOf } from "./lifeReport/western/placidus";
export { computeTropicalPosition, tropicalNorthNodeLongitude, tropicalSignAndDegree } from "./lifeReport/western/tropical";
export {
  buildPersonChart,
  crossAspects,
  crossDrishti,
  coupleVedicPoints,
  houseOverlays,
  painHouseCircuit,
  type PersonChart,
  type CrossAspect,
  type CrossDrishti,
  type HouseOverlay,
  type CoupleVedicPoints,
  type PainHouseData,
} from "./lifeReport/synastry";
export { CLASSICAL_GRAHAS, ALL_GRAHAS, SIGNS_ORDER, type BirthInput, type Graha, type ClassicalGraha } from "./lifeReport/types";
// M-008 — motor interpretativo (yogas, configurações globais, sinastria profunda)
export { detectYogas, type YogaHit } from "./lifeReport/yogas";
export { detectGlobalConfigurations, type GlobalConfigHit } from "./lifeReport/western/globalConfigs";
export { detectVocationalFamilies, type VocationalFamilyHit, type VocationalCaution, type VocationalResult } from "./lifeReport/vocational";
export { computeVocationIQAxes, type VocationIQAxes, type MissionAxis, type EarningMode, type MarketShowcase, type AngularLord } from "./lifeReport/vocationIQ";
export { computeEliminatoryKuta, type EliminatoryKutaResult } from "./lifeReport/kuta";
export { detectBlessingPainHouses, type BlessingPainHit } from "./lifeReport/blessingPainHouses";
export { computeAshtaKuta, type AshtaKutaResult, type AshtaKutaScore } from "./lifeReport/ashtaKuta";

// VOCATIONIQ-ADULTO-metodologia.md — motor de geração do relatório VocationIQ Adulto (ramo "trabalho-quero-mudar").
export { computePesosPlanetas, ESTADO_PESO, type PesoPlaneta } from "./vocationiq/pesosPlanetas";
export { construirPromptAdulto, SECCAO_TITULOS, MARCADORES, FORCA_VALORES, type VocationiqIntakeAdulto, type DadosDatas, type ForcaValor } from "./vocationiq/promptAdulto";
