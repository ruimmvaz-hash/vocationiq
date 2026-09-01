import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import type { ZodiacSign } from "../../data/tables";
import { normalizeDegrees, toSidereal } from "../../astrology/ayanamsa";
import { siderealSignAndDegree } from "../../astrology/sidereal";
import type { BirthInput } from "../types";
import { houseOf } from "../positions";
import { tropicalSignAndDegree } from "./tropical";
import { placidusHouseOf } from "./placidus";

// Chiron (SE_CHIRON=15) and Mean Lilith / Black Moon (SE_MEAN_APOG=12)
// via Swiss Ephemeris (sweph N-API prebuild, no compile step — it ships
// prebuilt native binaries). Chiron needs the asteroid ephemeris file
// seas_18.se1; Mean Apogee is a pure mean-elements formula and needs none.
//
// seas_18.se1 is VENDORED at method-engine/ephe/ (this package, ~223KB),
// not installed via the `swisseph` npm package. That package's own
// "install" script is a hard `node-gyp rebuild` with no prebuilt binary —
// it was only ever used data-only for this one file, but a plain `npm
// install` on Vercel (Python 3.12, no distutils) always ran that script
// and failed the whole build. Vendoring the single file we actually need
// removes the broken dependency entirely.
//
// Validated against the founder's GABARITO (astro.com values, Rui
// 14/02/1978 19:00 UTC): Chiron Taurus 1°41', Lilith Cancer 3°08' —
// both reproduced to the arcminute.

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sweph: any = require("sweph");

/**
 * Finds the vendored ephe/ directory by walking up from cwd, instead of
 * `require.resolve`/`import.meta.url` maths. Under plain Node/tsx those
 * resolve fine, but bundled inside a Next.js server build (webpack) they
 * have returned bare relative ids instead of absolute paths before — a
 * filesystem walk from process.cwd() sidesteps whatever the bundler does
 * to module resolution. Two candidates, in order: this package checked
 * out directly (monorepo dev), or hoisted/symlinked under node_modules as
 * an npm-workspace dependency (Vercel build of `web`).
 */
function findEphePath(): string {
  if (process.env.SWISSEPH_EPHE_PATH) return process.env.SWISSEPH_EPHE_PATH;
  const relCandidates = [path.join("method-engine", "ephe"), path.join("node_modules", "@naveya", "method-engine", "ephe")];
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    for (const rel of relCandidates) {
      const candidate = path.join(dir, rel);
      if (existsSync(path.join(candidate, "seas_18.se1"))) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`não encontrei ephe/seas_18.se1 a partir de ${process.cwd()} — defina SWISSEPH_EPHE_PATH.`);
}

sweph.set_ephe_path(findEphePath());

export type MinorPoint = "Quiron" | "Lilith";

// Named constants, not hardcoded numbers: SE_CHIRON = 15, SE_MEAN_APOG = 12.
// (Body 14 is SE_EARTH — geocentric Earth, always 0° — which is why an
// earlier instruction citing "body 14" for Mean Lilith produced Aries
// 0°00' for everyone; flagged and corrected here.)
const BODY_IDS: Record<MinorPoint, number> = {
  Quiron: sweph.constants.SE_CHIRON,
  Lilith: sweph.constants.SE_MEAN_APOG,
};

function julianDayUT(date: Date): number {
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return sweph.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hours, sweph.constants.SE_GREG_CAL);
}

export function tropicalLongitudeOfMinor(point: MinorPoint, date: Date): number {
  const result = sweph.calc_ut(julianDayUT(date), BODY_IDS[point], sweph.constants.SEFLG_SWIEPH);
  if (result.error) throw new Error(`sweph ${point}: ${result.error}`);
  return normalizeDegrees(result.data[0]);
}

// SPEC-002 ACÇÃO 4 / SPEC-003 Implementação 2 — flags do swe_calc
// verificadas: `tropicalLongitudeOfMinor` acima usa só SEFLG_SWIEPH (sem
// SEFLG_J2000 — por isso vem em eclíptica de data, não J2000; sem
// SEFLG_SPEED — por isso `result.data[3]` seria sempre 0, nunca a
// velocidade real; confirmado no próprio `index.d.ts` do pacote `sweph`:
// "If SEFLG_SPEED or SEFLG_SPEED3 are used, the daily speeds ... are also
// returned, otherwise they are 0"). Esta função pede SEFLG_SPEED
// explicitamente, só para o cálculo de retrogradação — não reaproveita
// `tropicalLongitudeOfMinor` para não mudar o comportamento já testado
// dessa função.
export interface MinorRetrogradeStatus {
  isRetrograde: boolean;
  isStationary: boolean;
  /** °/dia — result.data[3] do swe_calc, com SEFLG_SPEED. */
  velocityPerDay: number;
}

// Limiares em °/dia (não °/2h — os dados de swe_calc já vêm em °/dia).
const MINOR_STATIONARY_THRESHOLD_PER_DAY: Record<MinorPoint, number> = {
  Quiron: 0.002,
  Lilith: 0.011,
};

export function computeMinorRetrogradeStatus(point: MinorPoint, date: Date): MinorRetrogradeStatus {
  const flags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
  const result = sweph.calc_ut(julianDayUT(date), BODY_IDS[point], flags);
  if (result.error) throw new Error(`sweph ${point} (speed): ${result.error}`);
  const velocityPerDay = result.data[3];
  const threshold = MINOR_STATIONARY_THRESHOLD_PER_DAY[point];
  const isStationary = Math.abs(velocityPerDay) <= threshold;
  const isRetrograde = !isStationary && velocityPerDay < 0;
  return { isRetrograde, isStationary, velocityPerDay };
}

export interface MinorPointPosition {
  point: MinorPoint;
  tropicalLongitude: number;
  tropicalSign: ZodiacSign;
  tropicalDegreeInSign: number;
  siderealSign: ZodiacSign;
  siderealDegreeInSign: number;
  vedicHouse: number;
  placidusHouse: number;
  /** SPEC-003 (Implementação 2) — combustão não se aplica a Quíron/Lilith (Passo 0 de combustion.ts) — sem campo de combustão aqui de propósito. */
  retrograde: MinorRetrogradeStatus;
}

export function computeMinorPoint(point: MinorPoint, birth: BirthInput, vedicAscendantSign: ZodiacSign, placidusCusps: number[]): MinorPointPosition {
  const tropicalLongitude = tropicalLongitudeOfMinor(point, birth.utcDate);
  const tropical = tropicalSignAndDegree(tropicalLongitude);
  const sidereal = siderealSignAndDegree(toSidereal(tropicalLongitude, birth.utcDate));
  return {
    point,
    tropicalLongitude,
    tropicalSign: tropical.sign,
    tropicalDegreeInSign: tropical.degreeInSign,
    siderealSign: sidereal.sign,
    siderealDegreeInSign: sidereal.degreeInSign,
    vedicHouse: houseOf(sidereal.sign, vedicAscendantSign),
    placidusHouse: placidusHouseOf(tropicalLongitude, placidusCusps),
    retrograde: computeMinorRetrogradeStatus(point, birth.utcDate),
  };
}

// --- ≤3° aspect scan (M-004 C-OCI-1 point 4: Chiron/Lilith count only when tight to personals/angles) ---

const MINOR_ANGLES: { name: string; angle: number }[] = [
  { name: "Conjuncao", angle: 0 },
  { name: "Sextil", angle: 60 },
  { name: "Quadratura", angle: 90 },
  { name: "Trigono", angle: 120 },
  { name: "Oposicao", angle: 180 },
];

export interface MinorAspectHit {
  aspect: string;
  target: string;
  orb: number;
}

export function minorAspects(minorLongitude: number, targets: [string, number][], orbLimit = 3): MinorAspectHit[] {
  const hits: MinorAspectHit[] = [];
  for (const [name, lon] of targets) {
    const diff = Math.abs(normalizeDegrees(minorLongitude - lon));
    const sep = diff > 180 ? 360 - diff : diff;
    for (const { name: aspectName, angle } of MINOR_ANGLES) {
      const orb = Math.abs(sep - angle);
      if (orb <= orbLimit) hits.push({ aspect: aspectName, target: name, orb });
    }
  }
  return hits.sort((a, b) => a.orb - b.orb);
}
