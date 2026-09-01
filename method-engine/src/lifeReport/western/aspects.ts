import { normalizeDegrees } from "../../astrology/ayanamsa";

export type AspectName = "Conjuncao" | "Oposicao" | "Quadratura" | "Trigono" | "Sextil";

const ASPECT_ANGLES: { name: AspectName; angle: number }[] = [
  { name: "Conjuncao", angle: 0 },
  { name: "Sextil", angle: 60 },
  { name: "Quadratura", angle: 90 },
  { name: "Trigono", angle: 120 },
  { name: "Oposicao", angle: 180 },
];

/** M-004 C-OCI-1 point 2: 8 degrees if Sun or Moon is involved, 6 otherwise, for conjunction/opposition/square/trine; sextile is always 4 regardless. */
function orbLimit(aspect: AspectName, involvesLuminary: boolean): number {
  if (aspect === "Sextil") return 4;
  return involvesLuminary ? 8 : 6;
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

export interface AspectHit {
  aspect: AspectName;
  orb: number;
  applying: boolean;
}

/**
 * Finds the (single) major aspect between two current longitudes, if any
 * is within orb. Applying/separating is determined by comparing the orb
 * now against the orb a short time later — shrinking orb = applying,
 * growing = separating. Works for retrograde motion too, since it only
 * looks at real longitude change, not assumed direction.
 */
export function findAspect(curA: number, curB: number, futA: number, futB: number, involvesLuminary: boolean, orbOverride?: number): AspectHit | null {
  const sepNow = angularSeparation(curA, curB);
  for (const { name, angle } of ASPECT_ANGLES) {
    const orb = Math.abs(sepNow - angle);
    const limit = orbOverride ?? orbLimit(name, involvesLuminary);
    if (orb <= limit) {
      const sepFut = angularSeparation(futA, futB);
      const orbFut = Math.abs(sepFut - angle);
      return { aspect: name, orb, applying: orbFut < orb };
    }
  }
  return null;
}
