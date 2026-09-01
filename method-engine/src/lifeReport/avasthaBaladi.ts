import type { ZodiacSign } from "../data/tables";

export type Avastha = "Bala" | "Kumara" | "Yuva" | "Vriddha" | "Mrita";

// Standard element-based sign parity (fire+air = odd/masculine, earth+water
// = even/feminine) — matches M-004's literal wording ("signos ÍMPARES
// contam do 0°..."). Aquário = signo 11, ímpar, conta do 0° — sem
// exceções. Confirmed correct against every other odd sign in both
// GABARITO charts (Gemini, Leo, Libra, Sagittarius); the 3 Aquarius
// entries that looked reversed (Rui's Sun/Venus, Alice's Mars) were a
// lapso in the hand-made GABARITO tables, corrected July 2026 — not a
// rule exception. This module needs no change.
const ODD_SIGNS: ZodiacSign[] = ["Aries", "Gemini", "Leo", "Libra", "Sagittarius", "Aquarius"];

const NORMAL_ORDER: Avastha[] = ["Bala", "Kumara", "Yuva", "Vriddha", "Mrita"];
const REVERSED_ORDER: Avastha[] = ["Mrita", "Vriddha", "Yuva", "Kumara", "Bala"];

/** M-004 C-2/C-PRO-1 point 7. Classical grahas only — Rahu/Ketu have no Avastha in either GABARITO table. */
export function avasthaBaladi(sign: ZodiacSign, degreeInSign: number): Avastha {
  const bands = ODD_SIGNS.includes(sign) ? NORMAL_ORDER : REVERSED_ORDER;
  const index = Math.min(Math.floor(degreeInSign / 6), 4);
  return bands[index];
}
