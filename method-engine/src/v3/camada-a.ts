// FASE 1, Passo 2 — o agregador. Recolhe todos os sinais verificados (ver
// docs/AUDITORIA-CALCULOS-23Ago.md) e produz o objecto CamadaA completo,
// tipado em types-v3.ts. Reutiliza sem alteração: karakas.ts, stellium.ts,
// avasthaBaladi.ts, dasha.ts, positions.ts, nakshatra.ts, ascendant.ts.
// Módulos novos desta sessão, todos dentro de v3/: sarvashtakavarga.ts,
// dignidadeV3.ts, drishtiNodal.ts, figurasFechadasV3.ts, transitsV3.ts.
//
// Input: `BirthInput` (utcDate/latitude/longitude já resolvidos) — o
// mesmo contrato que todo o resto do method-engine usa (dasha.ts,
// western/*.ts). O `ReportRequest` da camada web (birthDate/birthTime/
// birthCity em string) resolve-se para isto no mesmo sítio onde já
// resolve hoje para o motor antigo (`web/src/lib/report/compute.ts`,
// geocoding incluído) — não se inventa aqui uma segunda resolução.

import { computeAscendant } from "../astrology/ascendant";
import { getNakshatra } from "../astrology/nakshatra";
import { computeAllGrahaPositions } from "../lifeReport/positions";
import { computeTropicalPosition } from "../lifeReport/western/tropical";
import { computeKarakas } from "../lifeReport/karakas";
import { currentDasha, vimshottariMahadashas } from "../lifeReport/dasha";
import { avasthaBaladi } from "../lifeReport/avasthaBaladi";
import { detectStellium } from "../lifeReport/stellium";
import { ALL_GRAHAS, CLASSICAL_GRAHAS, type BirthInput } from "../lifeReport/types";
import { dignidadesTodas } from "./dignidadeV3";
import { computeAllDrishtiV3 } from "./drishtiNodal";
import { computeSarvashtakavarga, type SavContributor } from "./sarvashtakavarga";
import { detectarFigurasFechadas } from "./figurasFechadasV3";
import { computeSlowTransits, computeAnnualTransits } from "./transitsV3";
import { SIGN_RULERS } from "../lifeReport/signRulers";
import type { CamadaA, NakshatraComPada } from "../types-v3";

/** Avança `passos` casas a partir de `casaBase` (1-12, whole-sign), sempre a devolver 1-12. */
function casaAvancar(casaBase: number, passos: number): number {
  return ((((casaBase - 1 + passos) % 12) + 12) % 12) + 1;
}

/**
 * Arudha Lagna (AL) — método clássico de contagem dupla: conta N casas do
 * Ascendente até ao regente do Ascendente (N = a própria casa do
 * regente, contagem inclusiva); depois conta as mesmas N casas outra vez,
 * a partir da casa do regente. Excepção clássica: a Arudha nunca pode
 * cair na 1ª ou na 7ª casa a partir do Ascendente — nesse caso, usa-se a
 * 10ª casa a partir daí. Acrescentado 25/08/2026 ("Correcções críticas
 * ao motor v3", ponto 5) — nunca calculada antes neste motor.
 */
export function calcularArudhaLagna(casaRegenteAscendente: number): number {
  const n = casaRegenteAscendente; // casas do Ascendente(1) até ao regente, contagem inclusiva
  let al = casaAvancar(casaRegenteAscendente, n - 1);
  if (al === 1 || al === 7) al = casaAvancar(al, 9); // excepção clássica — nunca 1ª nem 7ª
  return al;
}

const NAKSHATRA_SPAN = 360 / 27;

function nakshatraComPada(siderealLongitude: number): NakshatraComPada {
  const { name } = getNakshatra(siderealLongitude);
  const dentroDaNakshatra = siderealLongitude % NAKSHATRA_SPAN;
  const pada = Math.floor(dentroDaNakshatra / (NAKSHATRA_SPAN / 4)) + 1;
  return { nome: name, pada };
}

/**
 * Gera a Camada A completa para uma carta. `atDate` é a data de
 * referência para trânsitos (por omissão, agora) — passar a data de
 * geração do relatório para reprodutibilidade em testes.
 */
export function gerarCamadaA(natal: BirthInput, atDate: Date = new Date()): CamadaA {
  const calculado: string[] = [];
  const naoCalculado: string[] = [];

  const asc = computeAscendant(natal.utcDate, natal.latitude, natal.longitude);
  calculado.push("Ascendente (sideral, Lahiri)");

  const posicoesPlanetarias = computeAllGrahaPositions(natal.utcDate, asc.sign);
  calculado.push("Posições D-1 dos 9 grahas (sideral, Lahiri, casas de signo inteiro)");

  const nakshatras = Object.fromEntries(ALL_GRAHAS.map((g) => [g, nakshatraComPada(posicoesPlanetarias[g].siderealLongitude)])) as CamadaA["nakshatras"];
  const ascendenteNakshatra = nakshatraComPada(asc.siderealLongitude);
  calculado.push("Nakshatra + pada dos 9 grahas e do Ascendente");

  const karakas = computeKarakas(posicoesPlanetarias, asc.sign, asc.degreeInSign);
  calculado.push("Karakas (Atmakaraka/Amatyakaraka), Karakamsha, Vargottama");

  const regenteAscendente = SIGN_RULERS[asc.sign];
  const arudhaLagna = calcularArudhaLagna(posicoesPlanetarias[regenteAscendente].house);
  calculado.push("Arudha Lagna (AL) — imagem pública, método clássico de contagem dupla a partir do regente do Ascendente");

  const dashaAtual = currentDasha(natal.utcDate, atDate);
  const mahadashas = vimshottariMahadashas(natal.utcDate, 10);
  calculado.push("Dashas Vimshottari (mahadasha/antardasha actuais + sequência completa)");

  const dignidades = dignidadesTodas(
    Object.fromEntries(CLASSICAL_GRAHAS.map((g) => [g, { sign: posicoesPlanetarias[g].sign, degreeInSign: posicoesPlanetarias[g].degreeInSign }])) as Parameters<typeof dignidadesTodas>[0],
  );
  calculado.push("Dignidade clássica (exaltação/queda/domicílio/Moolatrikona) + Panchadha Maitri dos 7 grahas clássicos");
  naoCalculado.push("Dignidade de Rahu/Ketu por Panchadha Maitri — os nós não entram em NAISARGIKA_MAITRI (definida só para os 7 clássicos); usam convenção de dispositor (ver dignidadeV3.dignidadeNodo), não incluída neste agregador por não ter tipo próprio em CamadaA ainda.");

  const avasthas = Object.fromEntries(
    CLASSICAL_GRAHAS.map((g) => [g, avasthaBaladi(posicoesPlanetarias[g].sign, posicoesPlanetarias[g].degreeInSign)]),
  ) as CamadaA["avasthas"];
  calculado.push("Baladi Avastha dos 7 grahas clássicos");
  naoCalculado.push("Jagradadi Avastha — não implementada no method-engine (âmbito futuro).");
  naoCalculado.push("Lajjitadi Avastha — não implementada no method-engine (âmbito futuro).");

  const drishtiHits = computeAllDrishtiV3(posicoesPlanetarias);
  calculado.push("Drishti védico (7ª universal + especiais de Marte/Júpiter/Saturno + 5ª/9ª de Rahu/Ketu)");

  const contributorSigns = {
    Sun: posicoesPlanetarias.Sun.sign,
    Moon: posicoesPlanetarias.Moon.sign,
    Mars: posicoesPlanetarias.Mars.sign,
    Mercury: posicoesPlanetarias.Mercury.sign,
    Jupiter: posicoesPlanetarias.Jupiter.sign,
    Venus: posicoesPlanetarias.Venus.sign,
    Saturn: posicoesPlanetarias.Saturn.sign,
    Lagna: asc.sign,
  } as Record<SavContributor, typeof asc.sign>;
  let sav: CamadaA["sav"];
  try {
    const resultado = computeSarvashtakavarga(contributorSigns, asc.sign);
    sav = { ...resultado, fiavel: true };
    calculado.push("Sarvashtakavarga (SAV) por casa, verificado contra o Prokerala — ver AUDITORIA-CALCULOS-23Ago.md");
  } catch (err) {
    sav = { bySign: new Array(12).fill(0), byHouse: [], perPlanet: [], total: 0, media: 0, fiavel: false };
    naoCalculado.push(`Sarvashtakavarga — auto-verificação da tabela falhou em tempo de execução (${err instanceof Error ? err.message : String(err)}); NUNCA usar sav.fiavel=false num relatório entregue a cliente.`);
  }

  const stelliumsVedicos = detectStellium(posicoesPlanetarias);
  calculado.push("Stelliums védicos (D-1, 7 grahas clássicos, signo ou casa)");
  naoCalculado.push("Stelliums incluindo Rahu/Ketu e ângulos (Ascendente/MC) na leitura védica — só a versão ocidental (figurasFechadas) cobre nós/ângulos; stellium.ts fica limitado aos 7 clássicos.");

  const figurasFechadas = detectarFigurasFechadas(natal);
  calculado.push("Figuras fechadas (Grande Trígono, T-Quadrado, Yod, Grande Cruz, Kite) sobre 7 clássicos + Rahu + Ascendente/MC, carta ocidental tropical");

  const slowTransits = computeSlowTransits(atDate, asc.sign, posicoesPlanetarias.Moon.sign, posicoesPlanetarias);
  const annualTransit = computeAnnualTransits(atDate, asc.sign, posicoesPlanetarias.Moon.sign, posicoesPlanetarias);
  calculado.push("Trânsitos lentos (Saturno, Urano, Neptuno, Plutão, Rahu, Ketu) — sinal, casa a partir do Ascendente e da Lua, retrogradação, entrada/saída de signo, contactos ao natal (3°)");
  calculado.push("Trânsito anual de Júpiter + casa que Saturno atravessa este ano");
  naoCalculado.push("D-2, D-3, D-4, D-24 (vargas usadas em CODE-4/CODE-2 além de D-9/D-10) — não implementadas no method-engine.");
  naoCalculado.push("Datas de estação exactas (direct/retrógrado) dos trânsitos lentos — calculado aqui é entrada/saída de SIGNO, não a data de estação; ver limitação documentada em transitsV3.encontrarFronteiraSigno.");

  return {
    ascendente: { sign: asc.sign, degreeInSign: asc.degreeInSign, siderealLongitude: asc.siderealLongitude },
    posicoesPlanetarias,
    nakshatras,
    ascendenteNakshatra,
    karakas,
    arudhaLagna,
    dashaAtual,
    mahadashas,
    dignidades,
    avasthas,
    drishtiHits,
    sav,
    stelliumsVedicos,
    figurasFechadas,
    slowTransits,
    annualTransit,
    signoSolarTropical: computeTropicalPosition("Sun", natal.utcDate).sign,
    calculado,
    naoCalculado,
  };
}
