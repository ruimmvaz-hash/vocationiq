// docs/M-002-D-Tabela-Dignidades.md — approved by the founder 2026-07-15.
// Classical Parashari dignity (Brihat Parashara Hora Shastra) for the 7
// grahas; Rahu by modern convention (mirrors Saturn's relationships,
// exalted Taurus, debilitated Scorpio, domicile Aquarius) — flagged in the
// source doc as the one assumption to revisit if a different tradition is
// preferred.
import type { ZodiacSign } from "./tables";

// SPEC-003 v2 (Decisão 2) — "Ketu" removido deste union. A tabela de
// dignidade de Ketu por mirror do Rahu (introduzida na v1 desta sessão)
// foi substituída pela convenção do dispositor (ver
// `nodeDignityFromDispositor` mais abaixo) — Ketu deixou de precisar de
// uma linha própria em DIGNITY_TABLE. Rahu mantém a sua linha aqui
// inalterada: continua a ser usada pelo Snapshot (getDignityLevel(),
// atmakaraka.ts) — sistema separado, fora do âmbito desta correcção — mas
// deixou de ser usada para a dignidade de Rahu no D-1 do Life Report, que
// agora também usa o dispositor (Decisão 2 aplica-se a Rahu E Ketu).
export type VedicPlanet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu";

/**
 * Full 7-category detail (SPEC-003 Implementação 0/1 — Moolatrikona
 * adicionado). O lookup por signo inteiro (DIGNITY_TABLE) nunca produz
 * "Moolatrikona" sozinho — só `vedicDignityWithDegree()` o faz, por zona de
 * grau, para o D-1 natal. D9/D10 continuam a usar só o lookup por signo
 * inteiro (Moolatrikona é um conceito de Rasi/D-1, não avaliado em cartas
 * divisionais — decisão documentada em docs/SPEC-003-*.md, "DECISÕES").
 */
export type DignityDetail = "Exalted" | "Debilitated" | "Own" | "Friend" | "Enemy" | "Neutral" | "Moolatrikona";

/** The 3 categories the Snapshot's generation actually branches on (M-002-C §Part 3 only defines directives for Exalted/Debilitated; everything else is "Neutral"). */
export type DignityLevel = "Exalted" | "Debilitated" | "Neutral";

export const DIGNITY_TABLE: Record<VedicPlanet, Record<ZodiacSign, DignityDetail>> = {
  Sun: {
    Aries: "Exalted",
    Taurus: "Enemy",
    Gemini: "Neutral",
    Cancer: "Friend",
    Leo: "Own",
    Virgo: "Neutral",
    Libra: "Debilitated",
    Scorpio: "Friend",
    Sagittarius: "Friend",
    Capricorn: "Enemy",
    Aquarius: "Enemy",
    Pisces: "Friend",
  },
  Moon: {
    Aries: "Neutral",
    Taurus: "Exalted",
    Gemini: "Friend",
    Cancer: "Own",
    Leo: "Friend",
    Virgo: "Friend",
    Libra: "Neutral",
    Scorpio: "Debilitated",
    Sagittarius: "Neutral",
    Capricorn: "Neutral",
    Aquarius: "Neutral",
    Pisces: "Neutral",
  },
  Mars: {
    Aries: "Own",
    Taurus: "Neutral",
    Gemini: "Enemy",
    Cancer: "Debilitated",
    Leo: "Friend",
    Virgo: "Enemy",
    Libra: "Neutral",
    Scorpio: "Own",
    Sagittarius: "Friend",
    Capricorn: "Exalted",
    Aquarius: "Neutral",
    Pisces: "Friend",
  },
  Mercury: {
    Aries: "Neutral",
    Taurus: "Friend",
    Gemini: "Own",
    Cancer: "Enemy",
    Leo: "Friend",
    Virgo: "Exalted",
    Libra: "Friend",
    Scorpio: "Neutral",
    Sagittarius: "Neutral",
    Capricorn: "Neutral",
    Aquarius: "Neutral",
    Pisces: "Debilitated",
  },
  Jupiter: {
    Aries: "Friend",
    Taurus: "Enemy",
    Gemini: "Enemy",
    Cancer: "Exalted",
    Leo: "Friend",
    Virgo: "Enemy",
    Libra: "Enemy",
    Scorpio: "Friend",
    Sagittarius: "Own",
    Capricorn: "Debilitated",
    Aquarius: "Neutral",
    Pisces: "Own",
  },
  Venus: {
    Aries: "Neutral",
    Taurus: "Own",
    Gemini: "Friend",
    Cancer: "Enemy",
    Leo: "Enemy",
    Virgo: "Debilitated",
    Libra: "Own",
    Scorpio: "Neutral",
    Sagittarius: "Neutral",
    Capricorn: "Friend",
    Aquarius: "Friend",
    Pisces: "Exalted",
  },
  Saturn: {
    Aries: "Debilitated",
    Taurus: "Friend",
    Gemini: "Friend",
    Cancer: "Enemy",
    Leo: "Enemy",
    Virgo: "Friend",
    Libra: "Exalted",
    Scorpio: "Enemy",
    Sagittarius: "Neutral",
    Capricorn: "Own",
    Aquarius: "Own",
    Pisces: "Neutral",
  },
  Rahu: {
    Aries: "Enemy",
    Taurus: "Exalted",
    Gemini: "Friend",
    Cancer: "Enemy",
    Leo: "Enemy",
    Virgo: "Friend",
    Libra: "Friend",
    Scorpio: "Debilitated",
    Sagittarius: "Neutral",
    Capricorn: "Friend",
    Aquarius: "Own",
    Pisces: "Neutral",
  },
};

// ── Moolatrikona (SPEC-003 Implementação 1) ─────────────────────────────
// Zonas de grau dentro do signo de Moolatrikona de cada graha clássico.
// LÓGICA: por zonas de grau, em intervalos semiabertos [min, max) —
// SEM condição de signo próprio (a Lua tem Moolatrikona em Touro, que não
// é o seu signo próprio/Caranguejo — por isso a zona vive num objecto
// {sign, zones}, não dentro da tabela de signo próprio). Ordenar os
// `zones` por `maxDegree` ascendente é obrigatório — o primeiro que bater
// (`degreeInSign < maxDegree`) vence.
interface MoolatrikonaZone {
  /** Fim (exclusivo) desta zona, em grau dentro do signo — [zonaAnterior.maxDegree, maxDegree). */
  maxDegree: number;
  label: DignityDetail;
}

interface MoolatrikonaEntry {
  sign: ZodiacSign;
  zones: MoolatrikonaZone[];
}

/**
 * Só os 7 grahas clássicos têm Moolatrikona (Rahu/Ketu excluídos, sem
 * consenso clássico — ver `vedicDignityWithDegree`). Convenção de
 * exaltação védica = signo inteiro, excepto Lua (Touro) e Mercúrio
 * (Virgem), onde exaltação e Moolatrikona colidem no mesmo signo e as
 * zonas de grau resolvem a fronteira — graus védicos de exaltação
 * (Sol Áries 10°, Júpiter Caranguejo 5°, Saturno Libra 20°) não entram
 * aqui porque não colidem com nenhuma zona de Moolatrikona.
 */
const MOOLATRIKONA_ZONES: Partial<Record<VedicPlanet, MoolatrikonaEntry>> = {
  Sun: { sign: "Leo", zones: [{ maxDegree: 20, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
  Moon: { sign: "Taurus", zones: [{ maxDegree: 3, label: "Exalted" }, { maxDegree: 30, label: "Moolatrikona" }] },
  Mars: { sign: "Aries", zones: [{ maxDegree: 12, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
  Mercury: { sign: "Virgo", zones: [{ maxDegree: 15, label: "Exalted" }, { maxDegree: 20, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
  Jupiter: { sign: "Sagittarius", zones: [{ maxDegree: 10, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
  Venus: { sign: "Libra", zones: [{ maxDegree: 15, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
  Saturn: { sign: "Aquarius", zones: [{ maxDegree: 20, label: "Moolatrikona" }, { maxDegree: 30, label: "Own" }] },
};

/**
 * Dignidade védica com consciência de grau (D-1 natal apenas — ver
 * comentário de `DignityDetail`). Para Rahu/Ketu, ou para qualquer signo
 * fora da zona de Moolatrikona do graha, cai para o lookup por signo
 * inteiro de sempre (`DIGNITY_TABLE`) — nunca `null`/"N/A" (instrução
 * explícita: produz NaN na fórmula de força).
 */
export function vedicDignityWithDegree(graha: VedicPlanet, sign: ZodiacSign, degreeInSign: number): DignityDetail {
  const entry = MOOLATRIKONA_ZONES[graha];
  if (entry && entry.sign === sign) {
    const zone = entry.zones.find((z) => degreeInSign < z.maxDegree);
    if (zone) return zone.label;
  }
  return DIGNITY_TABLE[graha][sign];
}

// ── Escala numérica védica (SPEC-003 Implementação 1) — 0-6, sem colisões.
// Não existia nenhuma escala numérica de dignidade no motor antes desta
// sessão (confirmado por auditoria SPEC-002 PR3) — introduzida de raiz
// aqui, não é uma migração de uma escala 0-5 pré-existente.
export const DIGNITY_SCORE: Record<DignityDetail, number> = {
  Exalted: 6,
  Moolatrikona: 5,
  Own: 4,
  Friend: 3,
  Neutral: 2,
  Enemy: 1,
  Debilitated: 0,
};

export function dignityScore(detail: DignityDetail | null): number | null {
  return detail === null ? null : DIGNITY_SCORE[detail];
}

export function getDignityLevel(planet: VedicPlanet, sign: ZodiacSign): DignityLevel {
  const detail = DIGNITY_TABLE[planet][sign];
  if (detail === "Exalted" || detail === "Debilitated") return detail;
  return "Neutral";
}

// ── Rahu/Ketu — convenção do dispositor (SPEC-003 v2, Decisão 2) ───────
// Rahu/Ketu não têm corpo físico nem tabela de dignidade própria com
// consenso clássico único (a v1 desta sessão tentou uma tabela "mirror do
// Rahu" para Ketu — rejeitada: fontes contraditórias sobre a exaltação do
// próprio Rahu conforme a escola). Decisão final: o nodo herda a
// dignidade do REGENTE CLÁSSICO (SIGN_RULERS, `lifeReport/signRulers.ts`)
// do signo que ocupa nesse mapa — ex.: Ketu em Leão herda a dignidade do
// Sol nesse mapa; Ketu em Capricórnio herda a de Saturno.
//
// COLISÃO COM MOOLATRIKONA (resolução obrigatória): Rahu/Ketu nunca
// recebem "Moolatrikona" — sem consenso clássico para os nodos (ver
// MOOLATRIKONA_ZONES acima, restrito aos 7 clássicos). Se o dispositor
// estiver em Moolatrikona nesse mapa, o nodo herda "Own" (o nível
// imediatamente abaixo, 4/6) em vez de "Moolatrikona" — downgrade
// definido, nunca um erro nem um "Neutro" silencioso.
//
// ORDEM DE CÁLCULO (obrigatória — ver `lifeReport/d1Table.ts`): a
// dignidade dos 7 grahas clássicos tem de estar calculada ANTES de
// Rahu/Ketu correrem, porque dependem dela. Se `dispositorDignity` vier
// `undefined` (dispositor ainda não calculado), esta função LANÇA ERRO —
// nunca assume "Neutro" por omissão (mesma classe de risco que
// `computeCombustion` já evita para isRetrograde/isStationary).
export function nodeDignityFromDispositor(dispositorDignity: DignityDetail | undefined): DignityDetail {
  if (dispositorDignity === undefined) {
    throw new Error(
      "nodeDignityFromDispositor: dignidade do dispositor não calculada — os 7 grahas clássicos têm de correr antes de Rahu/Ketu. undefined nunca deve ser tratado como 'Neutro'.",
    );
  }
  if (dispositorDignity === "Moolatrikona") return "Own";
  return dispositorDignity;
}

// ── Rótulo técnico em português (SPEC-003 v2, Decisão 1) ───────────────
// "Estrutura, não frase": o campo entregue ao agente (vedic_dignity_label)
// é um rótulo técnico curto (≤3 palavras), NUNCA uma frase composta com
// verbo. Substitui NAVEYA_DIGNITY_LABEL (dicionário de frases feitas que
// vivia em web/tablesText.ts) — a tradução para linguagem Naveya de facto
// fica inteiramente a cargo do agente na escrita final (M-008 regra 5d);
// este dicionário só dá o rótulo técnico em português.
export const DIGNITY_LABEL_PT: Record<DignityDetail, string> = {
  Exalted: "Exaltação",
  Moolatrikona: "Moolatrikona",
  Own: "Próprio",
  Friend: "Amigo",
  Neutral: "Neutro",
  Enemy: "Inimigo",
  Debilitated: "Debilitação",
};

export function dignityLabelPt(detail: DignityDetail | null): string | null {
  return detail === null ? null : DIGNITY_LABEL_PT[detail];
}
