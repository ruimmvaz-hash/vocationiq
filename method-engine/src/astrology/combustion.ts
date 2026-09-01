// SPEC-003 (Implementação 3) — Combustão. DEPENDE da Implementação 2
// (retrogradação): lê isRetrograde para escolher o orbe de Mercúrio
// (14°/12°) e Vénus (10°/8°) — os únicos dois planetas cujo orbe varia por
// estado. Regra crítica do pedido: se isRetrograde não estiver calculado
// quando a combustão corre, LANÇAR ERRO — nunca assumir "directo" por
// omissão (undefined avalia a false silenciosamente em JS e aplicaria o
// orbe de directo mesmo quando o planeta está retrógrado, sem nunca
// falhar visivelmente). O mesmo cuidado aplica-se a isStationary, que não
// foi pedido explicitamente mas tem o mesmo risco: se ficasse `undefined`,
// `!undefined` avalia a `true` em JS, o que faria um planeta retrógrado
// "esquecido" ser tratado como não-estacionário e aplicar o orbe errado
// silenciosamente — a mesma classe de erro que a regra pede para evitar.

export type CombustibleBody = "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

/** Passo 0 — corpos sempre excluídos da combustão (nunca calculada para estes, campos ficam sempre vazios). */
const COMBUSTION_EXCLUDED = new Set(["Sun", "Rahu", "Ketu", "Quiron", "Lilith"]);

const CAZIMI_ORB_DEG = 0.2833;
const NEW_MOON_ORB_DEG = 12;

/** Tabela de orbes de referência — só Mercúrio e Vénus variam por estado (directo/retrógrado); os restantes usam sempre o mesmo orbe, qualquer que seja o estado. */
function combustionOrbFor(body: CombustibleBody, effectiveRetrograde: boolean): number {
  switch (body) {
    case "Mercury":
      return effectiveRetrograde ? 12 : 14;
    case "Venus":
      return effectiveRetrograde ? 8 : 10;
    case "Mars":
      return 17;
    case "Jupiter":
      return 11;
    case "Saturn":
      return 15;
    case "Moon":
      // Nunca chega aqui em condições normais — a Lua é tratada e devolvida
      // no Passo 1, antes de qualquer verificação de combustão clássica.
      return NEW_MOON_ORB_DEG;
  }
}

export interface CombustionStatus {
  isCombustLuna: boolean;
  isCazimi: boolean;
  isCombust: boolean;
}

const EMPTY: CombustionStatus = { isCombustLuna: false, isCazimi: false, isCombust: false };

// SPEC-003 v2 (Decisão 1) — "estrutura, não frase": o campo entregue ao
// agente é combustion_active (boolean) + combustion_type (enum), nunca o
// antigo `.text` de frase pronta ("Combusto (força suprimida)" etc.) que
// vivia neste interface. As duas funções abaixo derivam esses campos a
// partir dos três booleans que já existiam — nenhum dado novo, só a forma
// de o expor muda.
export type CombustionType = "standard" | "cazimi" | "lua_nova";

export function combustionTypeOf(status: CombustionStatus): CombustionType | null {
  if (status.isCazimi) return "cazimi";
  if (status.isCombustLuna) return "lua_nova";
  if (status.isCombust) return "standard";
  return null;
}

// SPEC-004 (Passo 4, Parte B, campo 6) — CORRIGIDO: combustion_active
// significava antes "algum modificador de combustão está activo",
// incluindo Cazimi — mas Cazimi é o OPOSTO de supressão (fortalece, não
// enfraquece). Uma instrução do tipo "quando active, a função perde
// nitidez" aplicada a um Cazimi (combustion_active=true nessa definição
// antiga) produzia o sentido inverso do que a carta mostra. Redefinido
// para significar especificamente "combustão SUPRESSIVA (standard) está
// activa" — Cazimi e Lua Nova ficam de fora de propósito, cada um só se
// lê correctamente via combustion_type (nunca via combustion_active).
export function combustionActiveOf(status: CombustionStatus): boolean {
  return status.isCombust;
}

/**
 * Distância angular em longitude eclíptica apenas (nunca latitude/casa) —
 * regra explícita do pedido: dist = |lon_planeta - lon_Sol|, normalizada
 * ao arco curto (nunca > 180°).
 */
function angularDistance(planetLongitude: number, sunLongitude: number): number {
  const raw = Math.abs(planetLongitude - sunLongitude) % 360;
  return raw > 180 ? 360 - raw : raw;
}

/**
 * @param body Nome do graha/ponto (usa os mesmos nomes do motor: "Sun",
 *   "Moon", ..., "Rahu", "Ketu", "Quiron", "Lilith").
 * @param planetLongitude Longitude eclíptica (tropical ou sideral — a
 *   distância ao Sol é igual nos dois sistemas, a ayanamsa cancela-se na
 *   diferença, mesma nota já usada em synastry.ts).
 * @param sunLongitude Longitude eclíptica do Sol, no MESMO sistema que planetLongitude.
 * @param isRetrograde OBRIGATÓRIO — ver regra crítica no cabeçalho do ficheiro. `undefined` lança erro.
 * @param isStationary OBRIGATÓRIO pela mesma razão — planeta estacionário usa sempre o orbe de directo.
 */
export function computeCombustion(body: string, planetLongitude: number, sunLongitude: number, isRetrograde: boolean | undefined, isStationary: boolean | undefined): CombustionStatus {
  // PASSO 0 — corpos excluídos. Sol teria dist=0 de si próprio e dispararia
  // Cazimi em 100% dos mapas; Rahu/Ketu são pontos matemáticos (sem corpo
  // físico a "queimar"); Quíron/Lilith não têm orbe clássico atribuído —
  // sem esta exclusão, o Passo 2 marcá-los-ia Cazimi sempre que estivessem
  // a menos de 17' do Sol, o que não tem base clássica nenhuma.
  if (COMBUSTION_EXCLUDED.has(body)) return EMPTY;

  const dist = angularDistance(planetLongitude, sunLongitude);

  // PASSO 1 — Lua, ANTES do Cazimi (a Lua nunca é Cazimi — Lua Nova é o
  // conceito clássico correcto para Lua perto do Sol, não Cazimi, que é um
  // conceito específico dos 5 planetas clássicos exteriores/interiores).
  if (body === "Moon") {
    if (dist <= NEW_MOON_ORB_DEG) return { isCombustLuna: true, isCazimi: false, isCombust: false };
    return EMPTY;
  }

  // PASSO 2 — Cazimi. Não depende de isRetrograde/isStationary (a
  // combustão exacta não distingue estado de movimento), por isso é
  // avaliado ANTES da regra crítica abaixo — um planeta em Cazimi nunca
  // precisa de saber se está retrógrado para ser classificado.
  if (dist < CAZIMI_ORB_DEG) return { isCombustLuna: false, isCazimi: true, isCombust: false };

  // Regra crítica (obrigatória) — nunca assumir "directo" por omissão.
  if (isRetrograde === undefined) {
    throw new Error(`computeCombustion: isRetrograde não calculado para ${body} — a Implementação 2 (retrogradação) tem de correr antes da combustão. undefined nunca deve ser tratado como "directo".`);
  }
  if (isStationary === undefined) {
    throw new Error(`computeCombustion: isStationary não calculado para ${body} — mesma regra que isRetrograde (undefined não pode significar "não estacionário").`);
  }

  // PASSO 3 — Combustão. Planeta ESTACIONÁRIO usa sempre o orbe de
  // directo (14°/10°), mesmo que o sinal de isRetrograde diga o contrário
  // — regra explícita do pedido.
  const effectiveRetrograde = isRetrograde && !isStationary;
  const orb = combustionOrbFor(body as CombustibleBody, effectiveRetrograde);
  if (dist <= orb) return { isCombustLuna: false, isCazimi: false, isCombust: true };

  // PASSO 4 — nenhum modificador activo.
  return EMPTY;
}
