import type { ZodiacSign } from "../data/tables";
import { SIGN_RULERS } from "./signRulers";
import { houseOf, signOfHouse, type GrahaPosition } from "./positions";
import { SIGNS_ORDER, type Graha } from "./types";

export interface ArudhaLagnaResult {
  sign: ZodiacSign;
  /** Whole-sign house of the Arudha Lagna counted from the natal Ascendant (1-12). */
  houseFromAscendant: number;
  /** True if the raw calculation landed in house 1 or 7 from the Ascendant and the next-sign exception was applied. */
  exceptionApplied: boolean;
}

/**
 * Arudha Lagna (AL) — VocationIQ Passo 3 (Montra de Mercado). Algoritmo
 * exacto conforme especificado: 1) identificar o regente do Ascendente
 * (R); 2) contar quantas casas R está do Ascendente (N); 3) contar N
 * casas a partir da posição do próprio R; 4) esse signo é o AL. Excepção:
 * se o AL coincide com o Ascendente (casa 1) ou a Casa 7, usa-se o signo
 * seguinte.
 */
export function computeArudhaLagna(ascendantSign: ZodiacSign, positions: Record<Graha, GrahaPosition>): ArudhaLagnaResult {
  const lord = SIGN_RULERS[ascendantSign];
  const lordSign = positions[lord].sign;
  const n = houseOf(lordSign, ascendantSign);

  let alSign = signOfHouse(n, lordSign);
  let houseFromAscendant = houseOf(alSign, ascendantSign);
  let exceptionApplied = false;

  if (houseFromAscendant === 1 || houseFromAscendant === 7) {
    exceptionApplied = true;
    const nextIndex = (SIGNS_ORDER.indexOf(alSign) + 1) % 12;
    alSign = SIGNS_ORDER[nextIndex];
    houseFromAscendant = houseOf(alSign, ascendantSign);
  }

  return { sign: alSign, houseFromAscendant, exceptionApplied };
}
