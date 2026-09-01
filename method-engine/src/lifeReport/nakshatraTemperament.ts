// SPEC-004 — catálogo de temperamento por Nakshatra: dá a MATÉRIA CONCRETA
// do carácter (cenas verificáveis), complementando o catalogo-indice-
// nakshatras.json (matéria vocacional). Usado no Capítulo 1 (Nakshatra da
// Lua + do Ascendente); ver prompt.ts para as regras de uso (nunca as
// quatro linhas de uma vez, nunca nomear o Nakshatra, escolher a que cruza
// com casa/dignidade).
import catalogJson from "../data/catalogo-temperamento-nakshatras.json";
import type { NakshatraName } from "../astrology/nakshatra";

export interface NakshatraTemperament {
  nucleo: string;
  comoSeVe: string[];
  oQueCobra: string;
  oQueNaoSabeDeSi: string;
}

interface CatalogEntry {
  ordem: number;
  regente: string;
  faixa: string;
  nucleo: string;
  como_se_ve: string[];
  o_que_cobra: string;
  o_que_nao_sabe_de_si: string;
}

const catalog = (catalogJson as { nakshatras: Record<string, CatalogEntry> }).nakshatras;

function catalogKeyOf(name: NakshatraName): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export function nakshatraTemperamentOf(name: NakshatraName): NakshatraTemperament | undefined {
  const entry = catalog[catalogKeyOf(name)];
  if (!entry) return undefined;
  return {
    nucleo: entry.nucleo,
    comoSeVe: entry.como_se_ve,
    oQueCobra: entry.o_que_cobra,
    oQueNaoSabeDeSi: entry.o_que_nao_sabe_de_si,
  };
}
