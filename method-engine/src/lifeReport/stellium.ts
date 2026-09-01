import type { ZodiacSign } from "../data/tables";
import { CLASSICAL_GRAHAS, type Graha } from "./types";

export interface StelliumHit {
  kind: "sign" | "house";
  key: ZodiacSign | number;
  planets: Graha[];
}

/**
 * Bloco 2 (VocationIQ) — REGRA 2 do algoritmo de síntese vocacional: 3+
 * planetas clássicos no mesmo signo OU na mesma casa. Genérico — funciona
 * tanto com as posições D-1 como D-10 (ambas têm `.sign`/`.house`). Usa só
 * os 7 grahas clássicos (mesma convenção do Atmakaraka/Amatyakaraka do
 * Life Report). Nunca usado pelo Life Report adulto.
 */
export function detectStellium(rows: Record<Graha, { sign: ZodiacSign; house: number }>): StelliumHit[] {
  const bySign = new Map<ZodiacSign, Graha[]>();
  const byHouse = new Map<number, Graha[]>();
  for (const graha of CLASSICAL_GRAHAS) {
    const row = rows[graha];
    bySign.set(row.sign, [...(bySign.get(row.sign) ?? []), graha]);
    byHouse.set(row.house, [...(byHouse.get(row.house) ?? []), graha]);
  }
  const hits: StelliumHit[] = [];
  for (const [sign, planets] of bySign) {
    if (planets.length >= 3) hits.push({ kind: "sign", key: sign, planets });
  }
  for (const [house, planets] of byHouse) {
    if (planets.length >= 3) hits.push({ kind: "house", key: house, planets });
  }
  return hits;
}
