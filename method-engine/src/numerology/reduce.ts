import { MASTER_NUMBERS } from "../data/tables";

function digitSum(n: number): number {
  return String(Math.abs(n))
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function isMaster(n: number): boolean {
  return (MASTER_NUMBERS as readonly number[]).includes(n);
}

/**
 * Reduces a positive integer to a single digit (1-9), preserving master
 * numbers (11, 22, 33) at any point they appear during the reduction.
 */
export function reduceToDigitOrMaster(value: number): number {
  let n = value;
  while (n > 9 && !isMaster(n)) {
    n = digitSum(n);
  }
  return n;
}
