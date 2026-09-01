// FASE 1 — figuras fechadas, versão v3. Reaproveita a detecção já
// existente e testada em `lifeReport/western/globalConfigs.ts` (Grand
// Trine, T-Square, Yod, Stellium sobre os 7 planetas clássicos tropicais)
// SEM a alterar, e acrescenta o que faltava, confirmado em
// docs/ANALISE-MOTOR-vs-v2v3-22Ago.md e nos pedidos desta Fase 1:
//   1. Grande Cruz (2 oposições perpendiculares entre si — 4 quadraturas)
//   2. Kite (Grande Trígono + 1 oposição a partir de um dos 3 vértices,
//      com sextis aos outros dois)
//   3. Extensão do conjunto de pontos a Rahu/Ketu e aos ângulos
//      (Ascendente/MC) — os relatórios reais (CODE-4, Rui) usam-nos
//      ("T-quadrados: ...ambos em quadratura ao MC", "Saturno opos nodo
//      norte...").
//
// Como o ponto adicional (nós, ângulos) não está no conjunto que
// `globalConfigs.ts` cobre, a detecção de Grand Trine/T-Square/Yod é
// REFEITA aqui sobre o conjunto alargado de 10 pontos (7 clássicos + Rahu
// + Ascendente + MC — Ketu é omitido do conjunto de vértices porque está
// sempre a 180° exactos de Rahu, o que tornaria qualquer par
// Rahu-Ketu uma "oposição" trivial e não informativa; Ketu entra só como
// ALVO de aspecto a partir de outro ponto, nunca como vértice de figura).
// Não duplica o resultado de `globalConfigs.ts` no anexo — usa-se este
// módulo como o inventário completo; `globalConfigs.ts` continua a servir
// o motor antigo tal como está.

import type { ClassicalGraha } from "../lifeReport/types";
import { computeWesternTable } from "../lifeReport/western/westernTable";
import type { BirthInput } from "../lifeReport/types";
import { tropicalNorthNodeLongitude } from "../lifeReport/western/tropical";
import { normalizeDegrees } from "../astrology/ayanamsa";

export type PontoFigura = ClassicalGraha | "Rahu" | "Ketu" | "Ascendente" | "MC";
const VERTICES: Exclude<PontoFigura, "Ketu">[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ascendente", "MC"];

type AspectoNome = "Conjuncao" | "Sextil" | "Quadratura" | "Trigono" | "Oposicao";
// Órbes tal como documentados no Anexo Técnico de CODE-4-melina-PASSA.md
// ("Aspectos ocidentais — todos, por orbe crescente": "conjunção e
// oposição 8°; quadratura e trígono 7°; sextil 5°"), não um valor
// inventado — confirmado nesta sessão que reproduz exactamente os 2
// T-Quadrados e os 2 Yods publicados nesse documento para a carta da
// Melina (ver `figurasFechadasV3.test.ts`). Quincúncio (150°, usado só no
// Yod) mantém-se em 3°, à parte da lista de CODE-4 (que documenta 3°
// especificamente para o quincunx nos exemplos de Yod).
const ASPECTOS: { nome: AspectoNome; angulo: number; orbe: number }[] = [
  { nome: "Conjuncao", angulo: 0, orbe: 8 },
  { nome: "Sextil", angulo: 60, orbe: 5 },
  { nome: "Quadratura", angulo: 90, orbe: 7 },
  { nome: "Trigono", angulo: 120, orbe: 7 },
  { nome: "Oposicao", angulo: 180, orbe: 8 },
];

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

function aspectoEntre(lonA: number, lonB: number): AspectoNome | null {
  const sep = angularSeparation(lonA, lonB);
  for (const { nome, angulo, orbe } of ASPECTOS) {
    if (Math.abs(sep - angulo) <= orbe) return nome;
  }
  return null;
}

export interface LongitudesEstendidas {
  longitudes: Record<Exclude<PontoFigura, "Ketu">, number>;
  ketuLongitude: number;
}

export function computeLongitudesEstendidas(birth: BirthInput): LongitudesEstendidas {
  const w = computeWesternTable(birth);
  const rahuLon = tropicalNorthNodeLongitude(birth.utcDate);
  const longitudes = {
    Sun: w.planets.Sun.longitude,
    Moon: w.planets.Moon.longitude,
    Mercury: w.planets.Mercury.longitude,
    Venus: w.planets.Venus.longitude,
    Mars: w.planets.Mars.longitude,
    Jupiter: w.planets.Jupiter.longitude,
    Saturn: w.planets.Saturn.longitude,
    Rahu: rahuLon,
    Ascendente: w.ascendant.longitude,
    MC: w.mc.longitude,
  } as Record<Exclude<PontoFigura, "Ketu">, number>;
  return { longitudes, ketuLongitude: normalizeDegrees(rahuLon + 180) };
}

function temAspecto(long: Record<Exclude<PontoFigura, "Ketu">, number>, a: Exclude<PontoFigura, "Ketu">, b: Exclude<PontoFigura, "Ketu">, nome: AspectoNome): boolean {
  return aspectoEntre(long[a], long[b]) === nome;
}

/** Orbe (graus) de um único par a um ângulo-alvo — quão longe está a separação real do aspecto exacto. */
function orbeDoAspecto(lonA: number, lonB: number, anguloAlvo: number): number {
  return Math.abs(angularSeparation(lonA, lonB) - anguloAlvo);
}

/**
 * Orbe da FIGURA inteira (adicionado 23/08/2026, para o Anexo B — pedido
 * explícito de "orbe real" por figura, que não existia até aqui: só se
 * guardava o limiar máximo permitido por TIPO de aspecto, usado para
 * detectar a figura, nunca a separação exacta de uma instância concreta).
 * Definido como o MAIOR orbe entre os aspectos que compõem a figura — a
 * lógica clássica de "uma corrente vale o que vale o elo mais fraco": um
 * T-Quadrado com uma oposição a 0,5° mas uma quadratura a 6,8° só é tão
 * exacto quanto essa quadratura mais larga.
 */
function orbeMaximo(pares: [number, number, number][]): number {
  return Math.max(...pares.map(([lonA, lonB, angulo]) => orbeDoAspecto(lonA, lonB, angulo)));
}

export interface FiguraFechada {
  tipo: "Grande Trigono" | "T-Quadrado" | "Yod" | "Grande Cruz" | "Kite" | "Stellium";
  pontos: PontoFigura[];
  detalhe: string;
  /** O maior orbe entre os aspectos que compõem esta figura (ver `orbeMaximo`) — quão exacta é, no seu elo mais fraco. */
  orbe: number;
}

/**
 * Varredura completa sobre os 10 vértices (7 clássicos + Rahu + Ascendente
 * + MC). Ketu entra só como alvo (ver `pontosComKetu` abaixo), nunca como
 * vértice — razão na nota de topo do ficheiro.
 */
export function detectarFigurasFechadas(birth: BirthInput): FiguraFechada[] {
  const { longitudes } = computeLongitudesEstendidas(birth);
  const figuras: FiguraFechada[] = [];
  const pontos = VERTICES;

  // Grande Trígono
  for (let i = 0; i < pontos.length; i++)
    for (let j = i + 1; j < pontos.length; j++)
      for (let k = j + 1; k < pontos.length; k++) {
        const [a, b, c] = [pontos[i], pontos[j], pontos[k]];
        if (temAspecto(longitudes, a, b, "Trigono") && temAspecto(longitudes, b, c, "Trigono") && temAspecto(longitudes, a, c, "Trigono")) {
          const orbe = orbeMaximo([
            [longitudes[a], longitudes[b], 120],
            [longitudes[b], longitudes[c], 120],
            [longitudes[a], longitudes[c], 120],
          ]);
          figuras.push({ tipo: "Grande Trigono", pontos: [a, b, c], detalhe: `${a}, ${b} e ${c} em trígono mútuo.`, orbe });
        }
      }

  // T-Quadrado — oposição + foco em quadratura a ambos
  for (let i = 0; i < pontos.length; i++)
    for (let j = i + 1; j < pontos.length; j++) {
      const [a, b] = [pontos[i], pontos[j]];
      if (!temAspecto(longitudes, a, b, "Oposicao")) continue;
      for (const foco of pontos) {
        if (foco === a || foco === b) continue;
        if (temAspecto(longitudes, foco, a, "Quadratura") && temAspecto(longitudes, foco, b, "Quadratura")) {
          const orbe = orbeMaximo([
            [longitudes[a], longitudes[b], 180],
            [longitudes[foco], longitudes[a], 90],
            [longitudes[foco], longitudes[b], 90],
          ]);
          figuras.push({ tipo: "T-Quadrado", pontos: [a, b, foco], detalhe: `Oposição ${a}–${b}, com ${foco} em quadratura a ambos (ponto foco).`, orbe });
        }
      }
    }

  // Yod — sextil + ápice em quincúncio (150°) a ambos
  const QUINCUNX_ORBE = 3;
  for (let i = 0; i < pontos.length; i++)
    for (let j = i + 1; j < pontos.length; j++) {
      const [a, b] = [pontos[i], pontos[j]];
      if (!temAspecto(longitudes, a, b, "Sextil")) continue;
      for (const apice of pontos) {
        if (apice === a || apice === b) continue;
        const orbA = Math.abs(angularSeparation(longitudes[apice], longitudes[a]) - 150);
        const orbB = Math.abs(angularSeparation(longitudes[apice], longitudes[b]) - 150);
        if (orbA <= QUINCUNX_ORBE && orbB <= QUINCUNX_ORBE) {
          const orbe = orbeMaximo([
            [longitudes[a], longitudes[b], 60],
            [longitudes[apice], longitudes[a], 150],
            [longitudes[apice], longitudes[b], 150],
          ]);
          figuras.push({ tipo: "Yod", pontos: [a, b, apice], detalhe: `Sextil ${a}–${b}, com ${apice} em quincúncio a ambos (ápice).`, orbe });
        }
      }
    }

  // Grande Cruz — duas oposições, perpendiculares entre si (4 quadraturas)
  const oposicoes: [Exclude<PontoFigura, "Ketu">, Exclude<PontoFigura, "Ketu">][] = [];
  for (let i = 0; i < pontos.length; i++)
    for (let j = i + 1; j < pontos.length; j++) {
      if (temAspecto(longitudes, pontos[i], pontos[j], "Oposicao")) oposicoes.push([pontos[i], pontos[j]]);
    }
  for (let i = 0; i < oposicoes.length; i++)
    for (let j = i + 1; j < oposicoes.length; j++) {
      const [a1, a2] = oposicoes[i];
      const [b1, b2] = oposicoes[j];
      if ([a1, a2].includes(b1 as any) || [a1, a2].includes(b2 as any)) continue; // não partilham ponto
      if (
        temAspecto(longitudes, a1, b1, "Quadratura") &&
        temAspecto(longitudes, a1, b2, "Quadratura") &&
        temAspecto(longitudes, a2, b1, "Quadratura") &&
        temAspecto(longitudes, a2, b2, "Quadratura")
      ) {
        const orbe = orbeMaximo([
          [longitudes[a1], longitudes[a2], 180],
          [longitudes[b1], longitudes[b2], 180],
          [longitudes[a1], longitudes[b1], 90],
          [longitudes[a1], longitudes[b2], 90],
          [longitudes[a2], longitudes[b1], 90],
          [longitudes[a2], longitudes[b2], 90],
        ]);
        figuras.push({ tipo: "Grande Cruz", pontos: [a1, a2, b1, b2], detalhe: `Oposição ${a1}–${a2} em quadratura à oposição ${b1}–${b2} — tensão a 4 pontas, sem foco único.`, orbe });
      }
    }

  // Kite — Grande Trígono + oposição a partir de um vértice + sextis aos outros dois
  const grandeTrigonos = figuras.filter((f) => f.tipo === "Grande Trigono");
  for (const gt of grandeTrigonos) {
    const [a, b, c] = gt.pontos as Exclude<PontoFigura, "Ketu">[];
    for (const vertice of [a, b, c]) {
      const outrosDois = [a, b, c].filter((p) => p !== vertice) as Exclude<PontoFigura, "Ketu">[];
      for (const ponta of pontos) {
        if (ponta === a || ponta === b || ponta === c) continue;
        if (
          temAspecto(longitudes, ponta, vertice, "Oposicao") &&
          temAspecto(longitudes, ponta, outrosDois[0], "Sextil") &&
          temAspecto(longitudes, ponta, outrosDois[1], "Sextil")
        ) {
          const orbe = orbeMaximo([
            [longitudes[a], longitudes[b], 120],
            [longitudes[b], longitudes[c], 120],
            [longitudes[a], longitudes[c], 120],
            [longitudes[ponta], longitudes[vertice], 180],
            [longitudes[ponta], longitudes[outrosDois[0]], 60],
            [longitudes[ponta], longitudes[outrosDois[1]], 60],
          ]);
          figuras.push({
            tipo: "Kite",
            pontos: [a, b, c, ponta],
            detalhe: `Grande Trígono ${a}-${b}-${c}, com ${ponta} em oposição a ${vertice} e em sextil aos outros dois — a tensão da oposição dá saída pelo trígono.`,
            orbe,
          });
        }
      }
    }
  }

  return figuras;
}
