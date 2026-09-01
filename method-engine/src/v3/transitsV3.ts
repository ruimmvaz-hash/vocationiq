// FASE 1 — trânsitos lentos (era) e trânsitos anuais, versão v3.
// CODE-6-ordens.md (Ordem 1, ponto 4) corrige uma instrução anterior:
// "Júpiter dá uma volta em doze anos e não é trânsito de era" — por isso
// Júpiter vive em `annualTransits`, nunca em `slowTransits`. Os nós
// lunares (Rahu/Ketu, ciclo de ~18,6 anos) ficam em `slowTransits` por
// julgamento desta sessão — mais perto da escala "era" (Saturno/Urano/
// Neptuno/Plutão) do que da escala "ano" (Júpiter) — sinalizado por não
// haver instrução explícita de CODE-6 sobre onde os nós entram.
//
// DIVERGÊNCIA COM O PEDIDO ORIGINAL DA FASE 1 — a primeira mensagem desta
// fase listava "slowTransits: Saturno, Júpiter, Rahu/Ketu, Urano, Neptuno,
// Plutão" (Júpiter incluído). Implementado aqui o critério de CODE-6
// (mais recente e com justificação explícita), não a lista original —
// reportado, não decidido em silêncio.

import { tropicalLongitudeOf, type EphemerisBody } from "../astrology/geocentric";
import { toSidereal, normalizeDegrees } from "../astrology/ayanamsa";
import { meanLunarNodeLongitude } from "../astrology/lunarNode";
import { siderealSignAndDegree } from "../astrology/sidereal";
import { houseOf } from "../lifeReport/positions";
import { SIGNS_ORDER, type Graha, type ClassicalGraha } from "../lifeReport/types";
import type { ZodiacSign } from "../data/tables";

export type CorpoLento = "Saturn" | "Uranus" | "Neptune" | "Pluto" | "Rahu" | "Ketu";
export type CorpoAnual = "Jupiter";

const DIA_MS = 86400000;

function siderealLongitudeAt(corpo: CorpoLento | CorpoAnual, date: Date): number {
  if (corpo === "Rahu") return toSidereal(meanLunarNodeLongitude(date), date);
  if (corpo === "Ketu") return normalizeDegrees(toSidereal(meanLunarNodeLongitude(date), date) + 180);
  return toSidereal(tropicalLongitudeOf(corpo as EphemerisBody, date), date);
}

function signIndexAt(corpo: CorpoLento | CorpoAnual, date: Date): number {
  return Math.floor(siderealLongitudeAt(corpo, date) / 30);
}

/**
 * Data em que o corpo mudou de signo pela última vez antes de `from`, e a
 * próxima data em que muda depois de `from` — por varredura mensal
 * (bracket) seguida de bissecção ao dia. SIMPLIFICAÇÃO DELIBERADA: não
 * lida com o caso em que um planeta (nunca os nós, que são sempre
 * retrógrados e nunca fazem laço) entra num signo, retrograda de volta ao
 * anterior, e reentra — devolve a fronteira mais próxima de `from` em
 * cada direcção, que na maioria dos casos é a correcta, mas pode
 * confundir-se perto de uma estação. Documentado aqui, não escondido.
 */
function encontrarFronteiraSigno(corpo: CorpoLento | CorpoAnual, from: Date, direcao: 1 | -1): Date {
  const signoInicial = signIndexAt(corpo, from);
  let passoDias = direcao * 30;
  let anterior = from;
  let actual = new Date(from.getTime() + passoDias * DIA_MS);
  let iteracoes = 0;
  while (signIndexAt(corpo, actual) === signoInicial && iteracoes < 600) {
    anterior = actual;
    actual = new Date(actual.getTime() + passoDias * DIA_MS);
    iteracoes++;
  }
  // bissecção entre `anterior` (ainda no signo inicial) e `actual` (já mudou) ao dia
  let lo = anterior.getTime();
  let hi = actual.getTime();
  if (direcao < 0) [lo, hi] = [hi, lo];
  while (Math.abs(hi - lo) > DIA_MS) {
    const mid = (lo + hi) / 2;
    if (signIndexAt(corpo, new Date(mid)) === signoInicial) {
      if (direcao > 0) lo = mid;
      else hi = mid;
    } else {
      if (direcao > 0) hi = mid;
      else lo = mid;
    }
  }
  return new Date(direcao > 0 ? hi : lo);
}

function isRetrogrado(corpo: CorpoLento | CorpoAnual, date: Date): boolean {
  if (corpo === "Rahu" || corpo === "Ketu") return true; // nó médio — sempre retrógrado por convenção (ver lunarNode.ts)
  const agora = siderealLongitudeAt(corpo, date);
  const depois = siderealLongitudeAt(corpo, new Date(date.getTime() + DIA_MS));
  const diff = normalizeDegrees(depois - agora);
  return diff > 180; // avançou "para trás" (diff perto de 360, não perto de 0)
}

export interface ContactoNatal {
  ponto: Graha;
  orbe: number;
}

function contactosNatal(longitudeTransito: number, posicoesNatal: Record<Graha, { siderealLongitude: number }>, orbeMax: number): ContactoNatal[] {
  const out: ContactoNatal[] = [];
  for (const [ponto, pos] of Object.entries(posicoesNatal) as [Graha, { siderealLongitude: number }][]) {
    const diff = Math.abs(normalizeDegrees(longitudeTransito - pos.siderealLongitude));
    const orbe = diff > 180 ? 360 - diff : diff;
    if (orbe <= orbeMax) out.push({ ponto, orbe });
  }
  return out.sort((a, b) => a.orbe - b.orbe);
}

export interface TransitoLento {
  corpo: CorpoLento;
  sign: ZodiacSign;
  degreeInSign: number;
  casaAPartirDoAscendente: number;
  casaAPartirDaLua: number;
  retrogrado: boolean;
  entradaNesteSigno: Date;
  saidaDesteSigno: Date;
  contactosNatal: ContactoNatal[];
}

const CORPOS_LENTOS: CorpoLento[] = ["Saturn", "Uranus", "Neptune", "Pluto", "Rahu", "Ketu"];
const ORBE_CONTACTO = 3; // graus — CODE-6: "contactos ao natal dentro de 3°"

export function computeSlowTransits(
  atDate: Date,
  ascendantSign: ZodiacSign,
  moonSign: ZodiacSign,
  posicoesNatal: Record<Graha, { siderealLongitude: number }>,
): TransitoLento[] {
  return CORPOS_LENTOS.map((corpo) => {
    const lon = siderealLongitudeAt(corpo, atDate);
    const { sign, degreeInSign } = siderealSignAndDegree(lon);
    return {
      corpo,
      sign,
      degreeInSign,
      casaAPartirDoAscendente: houseOf(sign, ascendantSign),
      casaAPartirDaLua: houseOf(sign, moonSign),
      retrogrado: isRetrogrado(corpo, atDate),
      entradaNesteSigno: encontrarFronteiraSigno(corpo, atDate, -1),
      saidaDesteSigno: encontrarFronteiraSigno(corpo, atDate, 1),
      contactosNatal: contactosNatal(lon, posicoesNatal, ORBE_CONTACTO),
    };
  });
}

export interface TransitoAnual {
  corpo: CorpoAnual;
  sign: ZodiacSign;
  degreeInSign: number;
  casaAPartirDoAscendente: number;
  casaAPartirDaLua: number;
  entradaNesteSigno: Date;
  saidaDesteSigno: Date;
  contactosNatal: ContactoNatal[];
  /** A casa que Saturno atravessa este ano, a partir do Ascendente e da Lua — CODE-6: "a casa que Saturno atravessa", junto de Júpiter, no resumo do ANO (o detalhe de era de Saturno vive em slowTransits). */
  casaDeSaturnoAgora: { casaAPartirDoAscendente: number; casaAPartirDaLua: number };
}

export function computeAnnualTransits(
  atDate: Date,
  ascendantSign: ZodiacSign,
  moonSign: ZodiacSign,
  posicoesNatal: Record<Graha, { siderealLongitude: number }>,
): TransitoAnual {
  const lonJupiter = siderealLongitudeAt("Jupiter", atDate);
  const { sign, degreeInSign } = siderealSignAndDegree(lonJupiter);
  const lonSaturno = siderealLongitudeAt("Saturn", atDate);
  const saturnoSign = siderealSignAndDegree(lonSaturno).sign;
  return {
    corpo: "Jupiter",
    sign,
    degreeInSign,
    casaAPartirDoAscendente: houseOf(sign, ascendantSign),
    casaAPartirDaLua: houseOf(sign, moonSign),
    entradaNesteSigno: encontrarFronteiraSigno("Jupiter", atDate, -1),
    saidaDesteSigno: encontrarFronteiraSigno("Jupiter", atDate, 1),
    contactosNatal: contactosNatal(lonJupiter, posicoesNatal, ORBE_CONTACTO),
    casaDeSaturnoAgora: {
      casaAPartirDoAscendente: houseOf(saturnoSign, ascendantSign),
      casaAPartirDaLua: houseOf(saturnoSign, moonSign),
    },
  };
}
