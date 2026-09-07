// CAMADA 3 (correcção do especialista, ronda seguinte) — 3 yogas
// vocacionais construídos de raiz para o VocationIQ, com condições
// específicas pedidas (mais estreitas do que `lifeReport/yogas.ts`, que
// cobre 8 yogas com condições clássicas mais largas e nunca foi desenhado
// para este produto). Nunca inclui Neecha Bhanga — o VocationIQ já tem o
// seu próprio detector, mais rigoroso, usado no peso de cada planeta
// (`pesosPlanetas.ts`).
//
// Determinístico a partir da tabela D-1 já calculada — nenhum dado novo,
// só combinações sobre `computeD1Table()`.

import { functionalRulerships } from "../lifeReport/signRulers";
import type { ClassicalGraha } from "../lifeReport/types";
import type { D1TableResult, GrahaRow } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];

function regenteDe(rulerships: Record<ClassicalGraha, number[]>, casa: number): ClassicalGraha {
  const entrada = Object.entries(rulerships).find(([, casas]) => casas.includes(casa));
  return (entrada ? entrada[0] : "Sun") as ClassicalGraha;
}

/** Aspecto mútuo (drishti emitido por A para B, ou de B para A) — mesma noção já usada em `lifeReport/yogas.ts`. */
function emAspectoMutuo(a: GrahaRow, b: GrahaRow): boolean {
  return a.drishtiEmitted.some((h) => h.to === b.graha) || b.drishtiEmitted.some((h) => h.to === a.graha);
}

/**
 * RAJA YOGA — regente de kendra (1,4,7,10) colocado numa casa trikona
 * (1,5,9), OU regente de trikona colocado numa casa kendra, OU os dois
 * regentes em aspecto mútuo.
 *
 * DESVIO (correcção do especialista, encontrado pela verificação com
 * dados reais da Melina) — a primeira versão desta função iterava sobre
 * CASAS (4 kendras × 3 trikonas = até 12 combinações) e só desduplicava
 * pelo par de regentes; como a condição "regente de kendra colocado em
 * trikona" depende só da colocação DO REGENTE (fixa), não de qual casa
 * trikona se está a comparar, o mesmo facto — "Marte, regente de kendra,
 * está em trikona" — disparava uma vez por cada casa trikona (3 vezes),
 * sempre com o mesmo texto (que nunca mencionava a casa trikona em si).
 * O resultado era a mesma frase repetida 2-3 vezes no prompt — exactamente
 * o tipo de repetição que a REGRA ANTI-REPETIÇÃO do prompt proíbe.
 * Corrigido: cada tipo de configuração (colocação de regente de kendra,
 * colocação de regente de trikona, aspecto mútuo) é agora testado por
 * PLANETA (deduplicado à partida, `Set` de regentes), nunca por
 * combinação de casas.
 */
function detectarRajaYoga(d1: D1TableResult, rulerships: Record<ClassicalGraha, number[]>): YogaHit[] {
  const kendraLords = [...new Set(KENDRA.map((h) => regenteDe(rulerships, h)))];
  const trikonaLords = [...new Set(TRIKONA.map((h) => regenteDe(rulerships, h)))];
  const hits: YogaHit[] = [];

  for (const kLord of kendraLords) {
    const row = d1.rows[kLord];
    if ((TRIKONA as number[]).includes(row.house)) {
      hits.push({
        id: `raja_vocacional_kendra_em_trikona_${kLord}`,
        label: "Raja Yoga",
        detail: `Regente de kendra (${kLord}) colocado em casa trikona (${row.house}) — capacidade estrutural real para posições de destaque, não é apenas potencial abstracto.`,
      });
    }
  }
  for (const tLord of trikonaLords) {
    const row = d1.rows[tLord];
    if ((KENDRA as number[]).includes(row.house)) {
      hits.push({
        id: `raja_vocacional_trikona_em_kendra_${tLord}`,
        label: "Raja Yoga",
        detail: `Regente de trikona (${tLord}) colocado em casa kendra (${row.house}) — capacidade estrutural real para posições de destaque, não é apenas potencial abstracto.`,
      });
    }
  }

  const vistos = new Set<string>();
  for (const kLord of kendraLords) {
    for (const tLord of trikonaLords) {
      if (kLord === tLord) continue;
      const chave = [kLord, tLord].sort().join("-");
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const kRow = d1.rows[kLord];
      const tRow = d1.rows[tLord];
      // Já reportado acima por colocação — o aspecto mútuo só acrescenta
      // informação nova quando nenhum dos dois regentes já está, ele
      // próprio, fisicamente colocado no outro tipo de casa.
      if ((TRIKONA as number[]).includes(kRow.house) || (KENDRA as number[]).includes(tRow.house)) continue;
      if (emAspectoMutuo(kRow, tRow)) {
        hits.push({
          id: `raja_vocacional_aspecto_${kLord}_${tLord}`,
          label: "Raja Yoga",
          detail: `Regentes de kendra (${kLord}) e trikona (${tLord}) em aspecto mútuo — capacidade estrutural real para posições de destaque, não é apenas potencial abstracto.`,
        });
      }
    }
  }
  return hits;
}

/**
 * DHANA YOGA — regente da casa 2 ligado ao regente da casa 11 (mesma casa,
 * ou aspecto mútuo — "mesma casa" cobre conjunção no sistema de casas
 * inteiras já usado em todo o motor).
 */
function detectarDhanaYoga(d1: D1TableResult, rulerships: Record<ClassicalGraha, number[]>): YogaHit[] {
  const lord2 = regenteDe(rulerships, 2);
  const lord11 = regenteDe(rulerships, 11);
  if (lord2 === lord11) {
    return [
      {
        id: `dhana_vocacional_${lord2}`,
        label: "Dhana Yoga",
        detail: `O mesmo planeta (${lord2}) rege recursos (casa 2) e ganhos (casa 11) — facilidade natural de acumular pelo trabalho.`,
      },
    ];
  }
  const row2 = d1.rows[lord2];
  const row11 = d1.rows[lord11];
  const mesmaCasa = row2.house === row11.house;
  const aspectoMutuo = emAspectoMutuo(row2, row11);
  if (!mesmaCasa && !aspectoMutuo) return [];
  return [
    {
      id: `dhana_vocacional_${lord2}_${lord11}`,
      label: "Dhana Yoga",
      detail: `Regente de recursos (${lord2}) e regente de ganhos (${lord11}) ${mesmaCasa ? "na mesma casa" : "em aspecto mútuo"} — facilidade natural de acumular pelo trabalho.`,
    },
  ];
}

/**
 * VIPARITA RAJA YOGA — regente de uma casa difícil (6,8,12) colocado
 * NOUTRA casa difícil (diferente da que rege — um planeta na sua própria
 * casa não conta, essa é dignidade própria, não reversão).
 */
function detectarViparitaRajaYoga(d1: D1TableResult, rulerships: Record<ClassicalGraha, number[]>): YogaHit[] {
  const SUBTIPO: Record<number, [string, string]> = {
    6: ["Harsha Yoga", "supera dificuldades e conflitos pelo próprio esforço"],
    8: ["Sarala Yoga", "protecção nas crises — a transformação trabalha a seu favor"],
    12: ["Vimala Yoga", "gastos/perdas aparentes transformam-se em libertação"],
  };
  const hits: YogaHit[] = [];
  for (const casa of DUSTHANA) {
    const lord = regenteDe(rulerships, casa);
    const row = d1.rows[lord];
    if ((DUSTHANA as number[]).includes(row.house) && row.house !== casa) {
      const [label, significado] = SUBTIPO[casa];
      hits.push({
        id: `vry_vocacional_${casa}_${row.house}`,
        label: `Viparita Raja Yoga — ${label}`,
        detail: `Regente da Casa ${casa} (${lord}) está noutra casa difícil (${row.house}) — ${significado}.`,
      });
    }
  }
  return hits;
}

/** Os 3 yogas vocacionais (Raja/Dhana/Viparita Raja) — nunca Neecha Bhanga, ver aviso no topo do ficheiro. */
export function detectarYogasVocacionais(d1: D1TableResult): YogaHit[] {
  const rulerships = functionalRulerships(d1.ascendant.sign);
  return [...detectarRajaYoga(d1, rulerships), ...detectarDhanaYoga(d1, rulerships), ...detectarViparitaRajaYoga(d1, rulerships)];
}
