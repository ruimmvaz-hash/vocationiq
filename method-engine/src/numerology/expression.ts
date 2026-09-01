import { reduceToDigitOrMaster } from "./reduce";

// Pythagorean numerology letter values, cycling A-I = 1-9, J-R = 1-9, S-Z = 1-8.
const PYTHAGOREAN_VALUES: Record<string, number> = {};
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(65 + i); // 'A'..'Z'
  PYTHAGOREAN_VALUES[letter] = (i % 9) + 1;
}

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Strips diacritics (á -> a, ç -> c, ã -> a, etc.) and uppercases,
 * per M-002 §3.3 note técnica.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/ß/g, "ss")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Número de Expressão (Expression Number) — M-002 §3.3.
 * Pythagorean conversion of the full name (A=1..I=9, J=1.. etc.),
 * summed and reduced, preserving master numbers.
 */
export function calculateExpressionNumber(fullName: string): number {
  const normalized = normalizeName(fullName);
  if (normalized.length === 0) {
    throw new Error("calculateExpressionNumber: name has no convertible letters");
  }
  const total = normalized
    .split("")
    .reduce((sum, letter) => sum + PYTHAGOREAN_VALUES[letter], 0);
  return reduceToDigitOrMaster(total);
}
