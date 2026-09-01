import { NAKSHATRA_NADI, NAKSHATRA_YONI, areYoniEnemies, isEnemy } from "../data/kuta";
import { SIGN_RULERS } from "./signRulers";
import type { PersonChart } from "./synastry";

// M-008 Módulo VII Parte 2 — os 3 Kutas eliminatórios do Ashta Kuta.
// Se qualquer um falhar, o diagnóstico é "Dessincronização Estrutural"
// independentemente do resto do casal (regra explícita do M-008).

export interface EliminatoryKutaResult {
  id: "nadi" | "graha_maitri" | "yoni";
  label: string;
  passed: boolean;
  detail: string;
}

export function computeEliminatoryKuta(a: PersonChart, b: PersonChart): EliminatoryKutaResult[] {
  const moonA = a.d1.rows.Moon;
  const moonB = b.d1.rows.Moon;

  // 1. Nadi Kuta — o sistema nervoso.
  const nadiA = NAKSHATRA_NADI[moonA.nakshatra];
  const nadiB = NAKSHATRA_NADI[moonB.nakshatra];
  const nadiPassed = nadiA !== nadiB;
  const nadiResult: EliminatoryKutaResult = {
    id: "nadi",
    label: "Nadi Kuta (sistema nervoso)",
    passed: nadiPassed,
    detail: nadiPassed
      ? `Nadis diferentes (${nadiA} / ${nadiB}) — ritmos nervosos compatíveis.`
      : `Mesmo Nadi (${nadiA}) nos dois — "Ressonância de Stresse Nervoso": os dois sistemas nervosos ressoam na mesma frequência de alerta; a solução passa por ritmos e espaços separados.`,
  };

  // 2. Graha Maitri Kuta — a sintonia mental (regentes dos signos lunares).
  const rulerA = SIGN_RULERS[moonA.sign];
  const rulerB = SIGN_RULERS[moonB.sign];
  const mutualEnemy = isEnemy(rulerA, rulerB) && isEnemy(rulerB, rulerA);
  const grahaMaitriResult: EliminatoryKutaResult = {
    id: "graha_maitri",
    label: "Graha Maitri Kuta (sintonia mental)",
    passed: !mutualEnemy,
    detail: mutualEnemy
      ? `Regentes das Luas em inimizade mútua extrema (${rulerA} / ${rulerB}) — "Filtro de Interpretação Invertido": o que um diz com boa intenção, o outro recebe como ataque.`
      : `Regentes das Luas (${rulerA} / ${rulerB}) amigos ou neutros — comunicação sem filtro defensivo estrutural.`,
  };

  // 3. Yoni Kuta — o magnetismo físico (arquétipo animal dos Nakshatras).
  const yoniA = NAKSHATRA_YONI[moonA.nakshatra];
  const yoniB = NAKSHATRA_YONI[moonB.nakshatra];
  const yoniFails = areYoniEnemies(yoniA, yoniB);
  const yoniResult: EliminatoryKutaResult = {
    id: "yoni",
    label: "Yoni Kuta (magnetismo físico)",
    passed: !yoniFails,
    detail: yoniFails
      ? `Arquétipos animais em inimizade natural (${yoniA} / ${yoniB}) — "Incompatibilidade Biológica de Base": pode haver atracção inicial por fricção, mas a proximidade a longo prazo gera irritabilidade inexplicável.`
      : `Arquétipos animais (${yoniA} / ${yoniB}) compatíveis ou neutros — paz biológica na proximidade.`,
  };

  return [nadiResult, grahaMaitriResult, yoniResult];
}
