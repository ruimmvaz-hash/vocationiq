import { tropicalLongitudeOf, type EphemerisBody } from "./geocentric";

// SPEC-003 (Implementação 2) — Retrogradação.
//
// Velocidade em longitude eclíptica TROPICAL GEOCÊNTRICA (Regra 1 —
// heliocêntrica nunca produz retrogradação; se se usasse heliocêntrica,
// nenhum planeta sairia retrógrado, o teste passaria sem erro, e o campo
// ficaria inútil sem nunca falhar visivelmente). `tropicalLongitudeOf`
// (geocentric.ts) já é geocêntrica — confirmado por auditoria SPEC-002 A1:
// GeoVector é sempre geocêntrico, nunca heliocêntrico.
//
// Sol e Lua NUNCA retrogradam (não há "retrogradação aparente da Terra
// vista de si própria", e a Lua nunca inverte a sua órbita real) —
// isRetrograde e isStationary ficam sempre `false` para os dois. ESPERADO,
// não um bug — ver TESTE 15.

export type MotionState = "direct" | "retrograde" | "stationary";

export interface RetrogradeStatus {
  isRetrograde: boolean;
  isStationary: boolean;
  motionState: MotionState;
  /** diff = lon(t+1h) - lon(t-1h), normalizado a [-180, 180], em °/2h. Positivo = movimento directo. */
  velocityPer2h: number;
}

type ClassicalBody = Extract<EphemerisBody, "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn">;

// Limiares ~10% da velocidade média diária, expressos em °/2h (Regra 2 —
// janela centrada de ±1h, não "t+24h"). Abaixo do limiar = estacionário;
// Sol/Lua nunca disparam retrogradação (limiares aqui só definem o que
// seria "estacionário" para eles, mas isRetrograde fica sempre false por
// regra explícita, não por o limiar nunca ser cruzado).
const STATIONARY_THRESHOLD_PER_2H: Record<ClassicalBody, number> = {
  Sun: 0.008,
  Moon: 0.11,
  Mercury: 0.012,
  Venus: 0.01,
  Mars: 0.004,
  Jupiter: 0.0007,
  Saturn: 0.0003,
};

const ONE_HOUR_MS = 3600000;

/**
 * Velocidade instantânea aproximada por diferença finita centrada
 * (Regra 2: diff = lon(t+1h) - lon(t-1h), NÃO "t + 24h" — uma janela de
 * 24h "engoliria" estações inteiras de Mercúrio, que duram só alguns
 * dias). Regra 3: normalização 360°/0° obrigatória — sem isto, uma
 * longitude que atravessa 0° (ex.: 359°58' → 0°04') pareceria um salto de
 * quase 360°/dia em vez do avanço real de poucos minutos de arco.
 */
export function computeRetrogradeStatus(body: ClassicalBody, date: Date): RetrogradeStatus {
  const before = tropicalLongitudeOf(body, new Date(date.getTime() - ONE_HOUR_MS));
  const after = tropicalLongitudeOf(body, new Date(date.getTime() + ONE_HOUR_MS));
  let diff = after - before;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const threshold = STATIONARY_THRESHOLD_PER_2H[body];
  const isStationary = Math.abs(diff) <= threshold;
  // Sol e Lua: nunca retrógrados, por definição astronómica — mesmo que o
  // sinal do diff (ruído numérico) sugerisse o contrário.
  const neverRetrograde = body === "Sun" || body === "Moon";
  const isRetrograde = !neverRetrograde && !isStationary && diff < -threshold;

  const motionState: MotionState = isRetrograde ? "retrograde" : isStationary ? "stationary" : "direct";

  return { isRetrograde, isStationary: neverRetrograde ? false : isStationary, motionState, velocityPer2h: diff };
}

// Rahu/Ketu (nó médio, Meeus) — SEMPRE retrógrado por definição do próprio
// nó médio (regride suavemente, sem estações nem laços — ver
// astrology/lunarNode.ts). O limiar nunca dispara "estacionário" porque a
// velocidade do nó médio é praticamente constante (~-0.053°/dia) e nunca
// se aproxima de zero. Documentado aqui para nunca precisar de recalcular
// por diferença finita (seria desperdício — o resultado é sempre o mesmo).
export const NODE_RETROGRADE_STATUS: RetrogradeStatus = {
  isRetrograde: true,
  isStationary: false,
  motionState: "retrograde",
  velocityPer2h: -0.0044, // ~-0.0533°/dia * (2/24)h — aproximado, nunca lido por comparação de limiar
};

// SPEC-003 v2 (Decisão 1) — "estrutura, não frase": rótulo curto de
// vocabulário fechado para o campo retrograde_status, substituindo as
// frases antigas ("Retrógrado"/"Em estação (força concentrada)") que
// viviam em web/tablesText.ts.
export type RetrogradeStatusLabel = "direto" | "retrogrado" | "estacionario";

export function retrogradeStatusLabelOf(status: RetrogradeStatus): RetrogradeStatusLabel {
  if (status.isRetrograde) return "retrogrado";
  if (status.isStationary) return "estacionario";
  return "direto";
}
