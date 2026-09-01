import type { NakshatraName } from "../astrology/nakshatra";
import { NAKSHATRAS } from "../astrology/nakshatra";
import type { ClassicalGraha } from "../lifeReport/types";
import type { ZodiacSign } from "./tables";

// M-008 Módulo VII Parte 2 — tabelas clássicas de referência para os 3
// Kutas eliminatórios do Ashta Kuta. São tabelas tradicionais fixas
// (BPHS / Jaimini), não calculadas a partir do mapa — por isso vivem em
// data/, ao lado de dignity.ts e signRulers.ts. O M-008 (secção
// "Pendentes") marca a tabela Yoni como "a validar pelo fundador"; os
// valores aqui são a referência clássica standard usada até essa
// validação.

export type Nadi = "Vata" | "Pitta" | "Kapha";

/** Padrão clássico repetido a cada 6 nakshatras: Vata,Pitta,Kapha,Kapha,Pitta,Vata. */
const NADI_CYCLE: Nadi[] = ["Vata", "Pitta", "Kapha", "Kapha", "Pitta", "Vata"];

export const NAKSHATRA_NADI: Record<NakshatraName, Nadi> = Object.fromEntries(NAKSHATRAS.map((n, i) => [n, NADI_CYCLE[i % 6]])) as Record<NakshatraName, Nadi>;

export type YoniAnimal = "Cavalo" | "Elefante" | "Ovelha" | "Serpente" | "Cão" | "Gato" | "Rato" | "Vaca" | "Búfalo" | "Tigre" | "Veado" | "Macaco" | "Mangusto" | "Leão";

/** Arquétipo animal clássico de cada Nakshatra (Yoni Kuta). */
export const NAKSHATRA_YONI: Record<NakshatraName, YoniAnimal> = {
  Ashwini: "Cavalo",
  Bharani: "Elefante",
  Krittika: "Ovelha",
  Rohini: "Serpente",
  Mrigashira: "Serpente",
  Ardra: "Cão",
  Punarvasu: "Gato",
  Pushya: "Ovelha",
  Ashlesha: "Gato",
  Magha: "Rato",
  "Purva Phalguni": "Rato",
  "Uttara Phalguni": "Vaca",
  Hasta: "Búfalo",
  Chitra: "Tigre",
  Swati: "Búfalo",
  Vishakha: "Tigre",
  Anuradha: "Veado",
  Jyeshtha: "Veado",
  Mula: "Cão",
  "Purva Ashadha": "Macaco",
  "Uttara Ashadha": "Mangusto",
  Shravana: "Macaco",
  Dhanishta: "Leão",
  Shatabhisha: "Cavalo",
  "Purva Bhadrapada": "Leão",
  "Uttara Bhadrapada": "Vaca",
  Revati: "Elefante",
};

/** Pares de animais naturalmente inimigos (Yoni Vairya) — M-008 cita explicitamente Gato/Rato e Cão/Gato. */
const YONI_ENEMY_PAIRS: [YoniAnimal, YoniAnimal][] = [
  ["Gato", "Rato"],
  ["Cão", "Gato"],
  ["Serpente", "Mangusto"],
  ["Vaca", "Tigre"],
  ["Elefante", "Leão"],
  ["Cavalo", "Búfalo"],
  ["Ovelha", "Macaco"],
  ["Cão", "Veado"],
];

export function areYoniEnemies(a: YoniAnimal, b: YoniAnimal): boolean {
  return YONI_ENEMY_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Amizade natural entre grahas (Naisargika Maitri, BPHS) — usada no Graha Maitri Kuta. Diferente da dignidade por signo (dignity.ts). */
export const GRAHA_MAITRI: Record<ClassicalGraha, { friends: ClassicalGraha[]; enemies: ClassicalGraha[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};

export function isEnemy(a: ClassicalGraha, b: ClassicalGraha): boolean {
  return GRAHA_MAITRI[a].enemies.includes(b);
}

// M-008 Módulo VII Parte 2 (extensão) — as restantes tabelas clássicas do
// Ashta Kuta completo (36 pontos), usadas só no painel interno /admin
// (nunca na prosa entregue ao cliente). Varna e Gana usam a hierarquia/
// agrupamento clássico (BPHS) sem ambiguidade de graus; Vashya está
// simplificado a signo inteiro (sem a divisão clássica em metades de
// signo) — marcado "a validar pelo fundador", mesmo padrão já usado para
// Yoni acima.

export type Varna = "Brahmin" | "Kshatriya" | "Vaishya" | "Shudra";
const VARNA_RANK: Record<Varna, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

/** Hierarquia clássica de Varna por signo lunar. */
export const SIGN_VARNA: Record<ZodiacSign, Varna> = {
  Cancer: "Brahmin",
  Scorpio: "Brahmin",
  Pisces: "Brahmin",
  Aries: "Kshatriya",
  Leo: "Kshatriya",
  Sagittarius: "Kshatriya",
  Taurus: "Vaishya",
  Virgo: "Vaishya",
  Capricorn: "Vaishya",
  Gemini: "Shudra",
  Libra: "Shudra",
  Aquarius: "Shudra",
};

/** Varna Kuta (1 pt): 1 se a Varna de A >= a de B na hierarquia (ou iguais), senão 0. */
export function varnaScore(signA: ZodiacSign, signB: ZodiacSign): number {
  return VARNA_RANK[SIGN_VARNA[signA]] >= VARNA_RANK[SIGN_VARNA[signB]] ? 1 : 0;
}

export type VashyaGroup = "Chatushpada" | "Manava" | "Jalachara" | "Vanachara" | "Keeta";

/** Vashya Kuta — grupo por signo, simplificado a signo inteiro (ver nota acima). */
export const SIGN_VASHYA: Record<ZodiacSign, VashyaGroup> = {
  Aries: "Chatushpada",
  Taurus: "Chatushpada",
  Gemini: "Manava",
  Cancer: "Jalachara",
  Leo: "Vanachara",
  Virgo: "Manava",
  Libra: "Manava",
  Scorpio: "Keeta",
  Sagittarius: "Manava",
  Capricorn: "Chatushpada",
  Aquarius: "Manava",
  Pisces: "Jalachara",
};

const VASHYA_SCORE: Record<VashyaGroup, Partial<Record<VashyaGroup, number>>> = {
  Manava: { Manava: 2, Chatushpada: 1, Vanachara: 1, Jalachara: 1, Keeta: 0.5 },
  Chatushpada: { Chatushpada: 2, Manava: 1, Jalachara: 0.5, Vanachara: 0, Keeta: 0.5 },
  Jalachara: { Jalachara: 2, Manava: 1, Chatushpada: 0.5, Vanachara: 0.5, Keeta: 1 },
  Vanachara: { Vanachara: 2, Manava: 1, Jalachara: 0.5, Chatushpada: 0, Keeta: 0.5 },
  Keeta: { Keeta: 2, Jalachara: 1, Manava: 0.5, Chatushpada: 0.5, Vanachara: 0.5 },
};

/** Vashya Kuta (2 pts): pontuação por par de grupos (simétrica). */
export function vashyaScore(signA: ZodiacSign, signB: ZodiacSign): number {
  const gA = SIGN_VASHYA[signA];
  const gB = SIGN_VASHYA[signB];
  return VASHYA_SCORE[gA][gB] ?? VASHYA_SCORE[gB][gA] ?? 0;
}

export type Gana = "Deva" | "Manushya" | "Rakshasa";

/** Agrupamento clássico Deva/Manushya/Rakshasa por Nakshatra (Gana Kuta). */
export const NAKSHATRA_GANA: Record<NakshatraName, Gana> = {
  Ashwini: "Deva",
  Mrigashira: "Deva",
  Punarvasu: "Deva",
  Pushya: "Deva",
  Hasta: "Deva",
  Swati: "Deva",
  Anuradha: "Deva",
  Shravana: "Deva",
  Revati: "Deva",
  Bharani: "Manushya",
  Rohini: "Manushya",
  Ardra: "Manushya",
  "Purva Phalguni": "Manushya",
  "Uttara Phalguni": "Manushya",
  "Purva Ashadha": "Manushya",
  "Uttara Ashadha": "Manushya",
  "Purva Bhadrapada": "Manushya",
  "Uttara Bhadrapada": "Manushya",
  Krittika: "Rakshasa",
  Ashlesha: "Rakshasa",
  Magha: "Rakshasa",
  Chitra: "Rakshasa",
  Vishakha: "Rakshasa",
  Jyeshtha: "Rakshasa",
  Mula: "Rakshasa",
  Dhanishta: "Rakshasa",
  Shatabhisha: "Rakshasa",
};

const GANA_SCORE: Record<Gana, Partial<Record<Gana, number>>> = {
  Deva: { Deva: 6, Manushya: 5, Rakshasa: 0 },
  Manushya: { Manushya: 6, Deva: 5, Rakshasa: 0 },
  Rakshasa: { Rakshasa: 6, Deva: 0, Manushya: 0 },
};

/** Gana Kuta (6 pts): pontuação por par de Ganas (versão simétrica simplificada — a validar pelo fundador). */
export function ganaScore(nakA: NakshatraName, nakB: NakshatraName): number {
  const gA = NAKSHATRA_GANA[nakA];
  const gB = NAKSHATRA_GANA[nakB];
  return GANA_SCORE[gA][gB] ?? GANA_SCORE[gB][gA] ?? 0;
}

/** Tara Kuta (3 pts) — contagem de nakshatras (inclusive) de A até B, mod 9; taras 3/5/7 (Vipat/Pratyak/Naidhana) são desfavoráveis. Calculado nas duas direções e feita a média. */
export function taraScore(indexA: number, indexB: number): number {
  const BAD_TARAS = new Set([3, 5, 7]);
  function taraOf(fromIndex: number, toIndex: number): number {
    const count = ((toIndex - fromIndex + 27) % 27) + 1;
    const tara = ((count - 1) % 9) + 1;
    return BAD_TARAS.has(tara) ? 0 : 3;
  }
  return (taraOf(indexA, indexB) + taraOf(indexB, indexA)) / 2;
}
