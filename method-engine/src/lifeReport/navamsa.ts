import type { ZodiacSign } from "../data/tables";
import { SIGNS_ORDER } from "./types";

const MOVABLE: ZodiacSign[] = ["Aries", "Cancer", "Libra", "Capricorn"];
const FIXED: ZodiacSign[] = ["Taurus", "Leo", "Scorpio", "Aquarius"];
// Dual/mutable: Gemini, Virgo, Sagittarius, Pisces (the implicit "else" case below).

const NAVAMSA_SPAN = 30 / 9;

/**
 * D-9 (Navamsa) sign — classical Parashari rule: movable signs start the
 * 9-fold count from themselves; fixed signs start from the 9th sign
 * (offset +8); dual signs start from the 5th sign (offset +4). Each of
 * the 9 navamsa segments (3°20' each) then advances one sign.
 */
export function navamsaSign(sign: ZodiacSign, degreeInSign: number): ZodiacSign {
  const signIndex = SIGNS_ORDER.indexOf(sign);
  const navamsaIndex = Math.min(Math.floor(degreeInSign / NAVAMSA_SPAN), 8);
  const startOffset = MOVABLE.includes(sign) ? 0 : FIXED.includes(sign) ? 8 : 4;
  const navamsaSignIndex = (signIndex + startOffset + navamsaIndex) % 12;
  return SIGNS_ORDER[navamsaSignIndex];
}
