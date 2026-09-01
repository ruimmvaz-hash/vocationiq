import { NAKSHATRAS } from "../astrology/nakshatra";
import type { ZodiacSign } from "../data/tables";
import { ganaScore, taraScore, varnaScore, vashyaScore } from "../data/kuta";
import { SIGN_RULERS } from "./signRulers";
import { computeEliminatoryKuta } from "./kuta";
import type { PersonChart } from "./synastry";

// M-008 Módulo VII Parte 2 (extensão) — Ashta Kuta completo (36 pontos).
// Os 3 Kutas eliminatórios (Nadi/Graha Maitri/Yoni) já existiam em
// kuta.ts como pass/fail — aqui juntam-se os outros 5 (Varna, Vashya,
// Tara, Gana, Bhakoot) para o total clássico de 36 pontos, só para uso
// interno em /admin (nunca na prosa entregue ao cliente).

export interface AshtaKutaScore {
  id: "varna" | "vashya" | "tara" | "yoni" | "graha_maitri" | "gana" | "bhakoot" | "nadi";
  label: string;
  maxPoints: number;
  points: number;
  passed: boolean;
  detail: string;
}

export interface AshtaKutaResult {
  total: number;
  maxTotal: 36;
  scores: AshtaKutaScore[];
}

/** Bhakoot Kuta (7 pts) — reaproveita a contagem lunar já calculada em coupleVedicPoints (moonCountAtoB/BtoA): 6/8 ou 2/12 em qualquer direção = dosha (0), salvo cancelamento clássico se os dois signos lunares tiverem o mesmo regente. */
function bhakootScore(moonSignA: ZodiacSign, moonSignB: ZodiacSign, countAtoB: number, countBtoA: number): AshtaKutaScore {
  const dosha = [2, 6, 8, 12].includes(countAtoB) || [2, 6, 8, 12].includes(countBtoA);
  const sameLord = SIGN_RULERS[moonSignA] === SIGN_RULERS[moonSignB];
  const passed = !dosha || sameLord;
  return {
    id: "bhakoot",
    label: "Bhakoot Kuta (harmonia de vida)",
    maxPoints: 7,
    points: passed ? 7 : 0,
    passed,
    detail: dosha
      ? sameLord
        ? `Contagem lunar ${countAtoB}/${countBtoA} (Rashi) cairia em dosha, mas os dois signos partilham regente (${SIGN_RULERS[moonSignA]}) — cancelamento clássico aplicado.`
        : `Contagem lunar ${countAtoB}/${countBtoA} (Rashi) — combinação 2/12 ou 6/8, Bhakoot Dosha presente.`
      : `Contagem lunar ${countAtoB}/${countBtoA} (Rashi) — fora das combinações de dosha.`,
  };
}

export function computeAshtaKuta(a: PersonChart, b: PersonChart, moonCountAtoB: number, moonCountBtoA: number): AshtaKutaResult {
  const moonA = a.d1.rows.Moon;
  const moonB = b.d1.rows.Moon;
  const nakIndexA = NAKSHATRAS.indexOf(moonA.nakshatra);
  const nakIndexB = NAKSHATRAS.indexOf(moonB.nakshatra);

  const varnaPts = varnaScore(moonA.sign, moonB.sign);
  const vashyaPts = vashyaScore(moonA.sign, moonB.sign);
  const taraPts = taraScore(nakIndexA, nakIndexB);
  const ganaPts = ganaScore(moonA.nakshatra, moonB.nakshatra);

  const [nadi, grahaMaitri, yoni] = computeEliminatoryKuta(a, b);

  const scores: AshtaKutaScore[] = [
    { id: "varna", label: "Varna Kuta (ego/hierarquia)", maxPoints: 1, points: varnaPts, passed: varnaPts > 0, detail: `Signo lunar ${moonA.sign} / ${moonB.sign}.` },
    { id: "vashya", label: "Vashya Kuta (domínio mútuo)", maxPoints: 2, points: vashyaPts, passed: vashyaPts > 0, detail: `Signo lunar ${moonA.sign} / ${moonB.sign} (tabela simplificada a signo inteiro — a validar pelo fundador).` },
    { id: "tara", label: "Tara Kuta (sorte/bem-estar)", maxPoints: 3, points: taraPts, passed: taraPts > 0, detail: `Nakshatras ${moonA.nakshatra} / ${moonB.nakshatra} — média das duas contagens.` },
    { id: "yoni", label: yoni.label, maxPoints: 4, points: yoni.passed ? 4 : 0, passed: yoni.passed, detail: yoni.detail },
    { id: "graha_maitri", label: grahaMaitri.label, maxPoints: 5, points: grahaMaitri.passed ? 5 : 0, passed: grahaMaitri.passed, detail: grahaMaitri.detail },
    { id: "gana", label: "Gana Kuta (temperamento)", maxPoints: 6, points: ganaPts, passed: ganaPts > 0, detail: `Nakshatras ${moonA.nakshatra} / ${moonB.nakshatra} (versão simétrica simplificada — a validar pelo fundador).` },
    bhakootScore(moonA.sign, moonB.sign, moonCountAtoB, moonCountBtoA),
    { id: "nadi", label: nadi.label, maxPoints: 8, points: nadi.passed ? 8 : 0, passed: nadi.passed, detail: nadi.detail },
  ];

  return { total: Math.round(scores.reduce((sum, s) => sum + s.points, 0) * 10) / 10, maxTotal: 36, scores };
}
