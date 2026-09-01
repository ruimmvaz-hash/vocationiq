const J2000_JD = 2451545.0;

// Lahiri (Chitra Paksha) ayanamsa, standard linear approximation used across
// most astrology software: value at J2000.0 plus the general precession
// rate. Accurate to a few arcminutes over centuries — far tighter than the
// 8° aspect orb or 30° sign boundaries this engine works with, so no higher-
// order (nutation-period) terms are needed.
const LAHIRI_AT_J2000_DEG = 23.85358; // ~23°51'13" at 2000-01-01T12:00 TT
const PRECESSION_RATE_DEG_PER_YEAR = 0.0139553; // ~50.24"/year general precession

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function lahiriAyanamsa(date: Date): number {
  const yearsSinceJ2000 = (julianDay(date) - J2000_JD) / 365.25;
  return LAHIRI_AT_J2000_DEG + PRECESSION_RATE_DEG_PER_YEAR * yearsSinceJ2000;
}

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Tropical ecliptic longitude -> sidereal (Lahiri), normalized to [0, 360). */
export function toSidereal(tropicalLongitude: number, date: Date): number {
  return normalizeDegrees(tropicalLongitude - lahiriAyanamsa(date));
}
