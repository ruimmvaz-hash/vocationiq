import { toSidereal } from "../astrology/ayanamsa";
import { tropicalLongitudeOf } from "../astrology/geocentric";

// M-004 C-PRO-7.1 — Vimshottari Dasha. The 9-lord cycle and year-weights
// are the classical Parashari values (120-year total); the opening
// mahadasha's balance comes from how far the natal Moon has advanced
// through its nakshatra.
export const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
export type DashaLord = (typeof DASHA_SEQUENCE)[number];

export const DASHA_YEARS: Record<DashaLord, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

const YEAR_MS = 365.25 * 86400000;
const NAKSHATRA_SPAN = 360 / 27;

export interface MahadashaPeriod {
  lord: DashaLord;
  start: Date;
  end: Date;
}

export interface AntardashaPeriod extends MahadashaPeriod {
  mahaLord: DashaLord;
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * YEAR_MS);
}

/**
 * Full mahadasha timeline. The cycle's notional start precedes birth by
 * the elapsed fraction of the first lord's period (standard practice:
 * antardashas of the opening mahadasha are laid over the FULL notional
 * period, with birth landing mid-way), so sub-periods are correct even
 * inside the partial first mahadasha.
 */
export function vimshottariMahadashas(birthUtc: Date, mahaCount = 10): MahadashaPeriod[] {
  const moonSidereal = toSidereal(tropicalLongitudeOf("Moon", birthUtc), birthUtc);
  const nakshatraIndex = Math.floor(moonSidereal / NAKSHATRA_SPAN) % 27;
  const fractionElapsed = (moonSidereal - nakshatraIndex * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const firstLordIndex = nakshatraIndex % 9;
  const firstLord = DASHA_SEQUENCE[firstLordIndex];

  const notionalStart = addYears(birthUtc, -fractionElapsed * DASHA_YEARS[firstLord]);

  const periods: MahadashaPeriod[] = [];
  let start = notionalStart;
  for (let i = 0; i < mahaCount; i++) {
    const lord = DASHA_SEQUENCE[(firstLordIndex + i) % 9];
    const end = addYears(start, DASHA_YEARS[lord]);
    periods.push({ lord, start, end });
    start = end;
  }
  return periods;
}

/** All 9 antardashas of a mahadasha — sub-sequence starts at the maha lord; each lasts mahaYears * subYears / 120. */
export function antardashasOf(maha: MahadashaPeriod): AntardashaPeriod[] {
  const mahaYears = DASHA_YEARS[maha.lord];
  const startIndex = DASHA_SEQUENCE.indexOf(maha.lord);
  const out: AntardashaPeriod[] = [];
  let start = maha.start;
  for (let i = 0; i < 9; i++) {
    const sub = DASHA_SEQUENCE[(startIndex + i) % 9];
    const end = addYears(start, (mahaYears * DASHA_YEARS[sub]) / 120);
    out.push({ mahaLord: maha.lord, lord: sub, start, end });
    start = end;
  }
  return out;
}

export interface CurrentDasha {
  mahadasha: MahadashaPeriod;
  antardasha: AntardashaPeriod;
  /** All 9 antardashas of the current mahadasha, for the report's timeline table. */
  allAntardashas: AntardashaPeriod[];
}

export function currentDasha(birthUtc: Date, atDate: Date): CurrentDasha {
  const mahas = vimshottariMahadashas(birthUtc, 12);
  const mahadasha = mahas.find((m) => atDate >= m.start && atDate < m.end);
  if (!mahadasha) throw new Error("date outside computed mahadasha range");
  const allAntardashas = antardashasOf(mahadasha);
  const antardasha = allAntardashas.find((a) => atDate >= a.start && atDate < a.end);
  if (!antardasha) throw new Error("antardasha lookup failed");
  return { mahadasha, antardasha, allAntardashas };
}
