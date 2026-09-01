// Data tables transcribed from docs/M-002-Matriz-Arquetipos-Naveya.md (§3.3, §3.4, §3.5, §5)

export type Element = "Fire" | "Earth" | "Air" | "Water";
export type Modality = "Cardinal" | "Fixed" | "Mutable";

export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export interface ElementModality {
  element: Element;
  modality: Modality;
}

// §3.3 — Signo solar -> Elemento / Modalidade (astrologia clássica)
export const SIGN_TABLE: Record<ZodiacSign, ElementModality> = {
  Aries: { element: "Fire", modality: "Cardinal" },
  Taurus: { element: "Earth", modality: "Fixed" },
  Gemini: { element: "Air", modality: "Mutable" },
  Cancer: { element: "Water", modality: "Cardinal" },
  Leo: { element: "Fire", modality: "Fixed" },
  Virgo: { element: "Earth", modality: "Mutable" },
  Libra: { element: "Air", modality: "Cardinal" },
  Scorpio: { element: "Water", modality: "Fixed" },
  Sagittarius: { element: "Fire", modality: "Mutable" },
  Capricorn: { element: "Earth", modality: "Cardinal" },
  Aquarius: { element: "Air", modality: "Fixed" },
  Pisces: { element: "Water", modality: "Mutable" },
};

// §3.3 — Caminho de Vida / Número de Expressão -> afinidades
export const NUMBER_TABLE: Record<number, ElementModality> = {
  1: { element: "Fire", modality: "Cardinal" },
  2: { element: "Water", modality: "Fixed" },
  3: { element: "Air", modality: "Mutable" },
  4: { element: "Earth", modality: "Fixed" },
  5: { element: "Fire", modality: "Mutable" },
  6: { element: "Earth", modality: "Fixed" },
  7: { element: "Air", modality: "Mutable" },
  8: { element: "Earth", modality: "Cardinal" },
  9: { element: "Water", modality: "Mutable" },
  11: { element: "Water", modality: "Mutable" },
  22: { element: "Earth", modality: "Cardinal" },
  33: { element: "Water", modality: "Fixed" },
};

export const MASTER_NUMBERS = [11, 22, 33] as const;

export type ArchetypeName =
  | "The Trailblazer"
  | "The Flamekeeper"
  | "The Explorer"
  | "The Architect"
  | "The Guardian"
  | "The Artisan"
  | "The Strategist"
  | "The Analyst"
  | "The Connector"
  | "The Navigator"
  | "The Alchemist"
  | "The Visionary";

// §3.4 + §3.5 — Matriz Elemento x Modalidade -> Arquétipo (nomes oficiais EN)
export const ARCHETYPE_MATRIX: Record<Element, Record<Modality, ArchetypeName>> = {
  Fire: {
    Cardinal: "The Trailblazer",
    Fixed: "The Flamekeeper",
    Mutable: "The Explorer",
  },
  Earth: {
    Cardinal: "The Architect",
    Fixed: "The Guardian",
    Mutable: "The Artisan",
  },
  Air: {
    Cardinal: "The Strategist",
    Fixed: "The Analyst",
    Mutable: "The Connector",
  },
  Water: {
    Cardinal: "The Navigator",
    Fixed: "The Alchemist",
    Mutable: "The Visionary",
  },
};

export type MotorName =
  | "Autonomy"
  | "Harmony"
  | "Expression"
  | "Structure"
  | "Freedom"
  | "Care"
  | "Truth"
  | "Achievement"
  | "Purpose"
  | "Inspiration"
  | "Legacy"
  | "Service";

// §5 — Caminho de Vida -> Motor
export const MOTOR_TABLE: Record<number, MotorName> = {
  1: "Autonomy",
  2: "Harmony",
  3: "Expression",
  4: "Structure",
  5: "Freedom",
  6: "Care",
  7: "Truth",
  8: "Achievement",
  9: "Purpose",
  11: "Inspiration",
  22: "Legacy",
  33: "Service",
};

// §3.2 — pesos da votação ponderada
export const WEIGHTS = {
  sunSign: 4,
  lifePath: 3,
  expression: 2,
} as const;
