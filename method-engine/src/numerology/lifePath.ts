import { reduceToDigitOrMaster } from "./reduce";

export interface BirthDate {
  day: number; // 1-31
  month: number; // 1-12
  year: number; // e.g. 1990
}

/**
 * Caminho de Vida (Life Path Number) — M-002 §3.3.
 * Sums every digit of DD + MM + AAAA, then reduces to a single digit,
 * preserving master numbers 11, 22, 33.
 */
export function calculateLifePath({ day, month, year }: BirthDate): number {
  const digits = `${day}${month}${year}`.split("").map(Number);
  const total = digits.reduce((sum, digit) => sum + digit, 0);
  return reduceToDigitOrMaster(total);
}
