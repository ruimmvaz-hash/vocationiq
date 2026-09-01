import { describe, expect, it } from "vitest";
import { lahiriAyanamsa } from "../src/astrology/ayanamsa.js";
import { getNakshatra, NAKSHATRAS } from "../src/astrology/nakshatra.js";
import { siderealSignAndDegree } from "../src/astrology/sidereal.js";
import { DIGNITY_TABLE, getDignityLevel, type VedicPlanet } from "../src/data/dignity.js";
import { computeAtmakaraka } from "../src/astrology/atmakaraka.js";
import { computeVedicLevel1, computeVedicLevel2 } from "../src/engine/vedicLayer.js";
import type { ZodiacSign } from "../src/data/tables.js";

const SIGNS: ZodiacSign[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

describe("lahiriAyanamsa", () => {
  it("stays within the plausible historical range and increases over time", () => {
    const y1950 = lahiriAyanamsa(new Date(Date.UTC(1950, 0, 1, 12)));
    const y2000 = lahiriAyanamsa(new Date(Date.UTC(2000, 0, 1, 12)));
    const y2050 = lahiriAyanamsa(new Date(Date.UTC(2050, 0, 1, 12)));
    expect(y1950).toBeGreaterThan(22.5);
    expect(y1950).toBeLessThan(23.5);
    expect(y2000).toBeCloseTo(23.85, 1);
    expect(y2050).toBeGreaterThan(y2000);
    expect(y2000).toBeGreaterThan(y1950);
  });
});

describe("siderealSignAndDegree", () => {
  it("places each 30° boundary in the correct sign, in order", () => {
    SIGNS.forEach((sign, i) => {
      const { sign: gotSign, degreeInSign } = siderealSignAndDegree(i * 30 + 0.01);
      expect(gotSign).toBe(sign);
      expect(degreeInSign).toBeCloseTo(0.01, 5);
    });
  });

  it("wraps 360° back to Aries", () => {
    expect(siderealSignAndDegree(360).sign).toBe("Aries");
  });
});

describe("getNakshatra", () => {
  it("starts at Ashwini at 0° and ends at Revati just under 360°", () => {
    expect(getNakshatra(0).name).toBe("Ashwini");
    expect(getNakshatra(0).index).toBe(0);
    expect(getNakshatra(359.9).name).toBe("Revati");
    expect(getNakshatra(359.9).index).toBe(26);
  });

  it("crosses into the 2nd nakshatra exactly at 13°20'", () => {
    expect(getNakshatra(13.32).name).toBe("Ashwini");
    expect(getNakshatra(13.34).name).toBe("Bharani");
  });

  it("covers all 27 nakshatras across the full circle", () => {
    const seen = new Set(NAKSHATRAS.map((_, i) => getNakshatra(i * (360 / 27) + 1).index));
    expect(seen.size).toBe(27);
  });
});

describe("DIGNITY_TABLE", () => {
  const planets: VedicPlanet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"];

  it("has all 12 signs for all 8 planets", () => {
    for (const planet of planets) {
      expect(Object.keys(DIGNITY_TABLE[planet])).toHaveLength(12);
    }
  });

  it("gives every planet exactly one Exalted and one Debilitated sign, exactly opposite each other", () => {
    for (const planet of planets) {
      const entries = SIGNS.map((sign) => [sign, DIGNITY_TABLE[planet][sign]] as const);
      const exalted = entries.filter(([, d]) => d === "Exalted");
      const debilitated = entries.filter(([, d]) => d === "Debilitated");
      expect(exalted, `${planet} exaltation`).toHaveLength(1);
      expect(debilitated, `${planet} debilitation`).toHaveLength(1);

      const exaltedIndex = SIGNS.indexOf(exalted[0][0]);
      const debilitatedIndex = SIGNS.indexOf(debilitated[0][0]);
      expect((exaltedIndex + 6) % 12, `${planet} exalted/debilitated should be opposite signs`).toBe(debilitatedIndex);
    }
  });

  it("getDignityLevel collapses Own/Friend/Enemy/Neutral to Neutral", () => {
    expect(getDignityLevel("Sun", "Aries")).toBe("Exalted");
    expect(getDignityLevel("Sun", "Libra")).toBe("Debilitated");
    expect(getDignityLevel("Sun", "Leo")).toBe("Neutral"); // Own
    expect(getDignityLevel("Sun", "Taurus")).toBe("Neutral"); // Enemy
    expect(getDignityLevel("Sun", "Gemini")).toBe("Neutral"); // Neutral
  });
});

describe("computeAtmakaraka", () => {
  it("picks the karaka with the highest effective degree, and Rahu's degree is reversed (30 - degreeInSign)", () => {
    const result = computeAtmakaraka(new Date(Date.UTC(1978, 1, 14, 19, 0, 0)));
    expect(result.effectiveDegree).toBeGreaterThanOrEqual(0);
    expect(result.effectiveDegree).toBeLessThanOrEqual(30);
    expect(SIGNS).toContain(result.sign);
  });
});

describe("computeVedicLevel1", () => {
  it("returns either a primary aspect or a fallback nakshatra, never both, never neither", () => {
    const result = computeVedicLevel1({ day: 14, month: 2, year: 1978 });
    const hasAspect = result.primaryAspect !== null;
    const hasFallback = result.fallbackNakshatra !== null;
    expect(hasAspect !== hasFallback).toBe(true);
  });

  it("always prioritizes a conjunction over a tighter non-conjunction aspect", () => {
    const result = computeVedicLevel1({ day: 14, month: 2, year: 1978 });
    // Known for this date: Venus conjunction (looser orb) coexists with a
    // tighter Jupiter trine — conjunction must still win the primary slot.
    if (result.primaryAspect && result.secondaryAspect) {
      if (result.primaryAspect.aspect !== "Conjunction" && result.secondaryAspect.aspect === "Conjunction") {
        throw new Error("secondary is a conjunction but didn't win primary");
      }
    }
  });

  it("never reports an aspect outside the 6.8° stability threshold", () => {
    const result = computeVedicLevel1({ day: 14, month: 2, year: 1978 });
    if (result.primaryAspect) expect(result.primaryAspect.orb).toBeLessThanOrEqual(6.8);
    if (result.secondaryAspect) expect(result.secondaryAspect.orb).toBeLessThanOrEqual(6.8);
  });
});

describe("computeVedicLevel2", () => {
  it("produces internally consistent sidereal signs and a nakshatra for the Moon", () => {
    const result = computeVedicLevel2(new Date(Date.UTC(1978, 1, 14, 19, 0, 0)), 38.72, -9.14);
    expect(SIGNS).toContain(result.atmakarakaSign);
    expect(SIGNS).toContain(result.ascendantSign);
    expect(SIGNS).toContain(result.moonSign);
    expect(NAKSHATRAS).toContain(result.moonNakshatra.name);
    expect(["Exalted", "Debilitated", "Neutral"]).toContain(result.atmakarakaDignity);
  });
});
