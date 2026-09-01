// M-002-B — the 27 lunar mansions, each spanning 360/27 = 13°20' of the
// sidereal ecliptic, starting at 0° Aries (sidereal).
export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export type NakshatraName = (typeof NAKSHATRAS)[number];

const NAKSHATRA_SPAN = 360 / 27;

export interface NakshatraPosition {
  name: NakshatraName;
  index: number; // 0-26
}

export function getNakshatra(siderealLongitude: number): NakshatraPosition {
  const index = Math.floor(siderealLongitude / NAKSHATRA_SPAN) % 27;
  return { name: NAKSHATRAS[index], index };
}
