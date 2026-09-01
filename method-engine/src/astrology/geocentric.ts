import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from "astronomy-engine";

export type EphemerisBody = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

/**
 * Apparent geocentric ecliptic longitude "of date" (tropical), in degrees.
 * Sun and Moon use astronomy-engine's dedicated high-precision functions;
 * the rest go through GeoVector (J2000 equatorial) + Ecliptic (-> true
 * ecliptic of date), the standard astronomy-engine recipe for geocentric
 * ecliptic longitude of a body other than the Sun.
 */
export function tropicalLongitudeOf(body: EphemerisBody, date: Date): number {
  if (body === "Sun") return SunPosition(date).elon;
  if (body === "Moon") return EclipticGeoMoon(date).lon;
  const engineBody = Body[body];
  return Ecliptic(GeoVector(engineBody, date, true)).elon;
}
