import type { ZodiacSign } from "../data/tables";
import { SIGNS_ORDER } from "./types";

const DASAMSHA_SPAN = 30 / 10;

/**
 * Bloco 2 (VocationIQ) — D-10 (Dasamsha) sign, o varga da carreira e acção
 * pública (M-008 Módulo IV). Regra clássica Parashari: signos ÍMPARES
 * (Carneiro, Gémeos, Leão, Balança, Sagitário, Aquário) começam a contagem
 * de 10 a partir de si próprios; signos PARES começam a partir do 9º signo
 * (offset +8). Cada uma das 10 divisões (3°) avança um signo. Usado
 * exclusivamente pelo algoritmo de síntese vocacional (VocationIQ/jovem/
 * criança) — nunca pelo Life Report adulto.
 */
export function dasamshaSign(sign: ZodiacSign, degreeInSign: number): ZodiacSign {
  const signIndex = SIGNS_ORDER.indexOf(sign);
  const dasamshaIndex = Math.min(Math.floor(degreeInSign / DASAMSHA_SPAN), 9);
  const isOddSign = signIndex % 2 === 0; // SIGNS_ORDER[0]=Aries=1º signo=ímpar -> índice par
  const startOffset = isOddSign ? 0 : 8;
  const dasamshaSignIndex = (signIndex + startOffset + dasamshaIndex) % 12;
  return SIGNS_ORDER[dasamshaSignIndex];
}
