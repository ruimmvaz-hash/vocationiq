import { describe, expect, it } from "vitest";
import { calculateSunSign } from "../src/astrology/sunSign.js";

describe("calculateSunSign", () => {
  it("computes signs for dates well inside a sign's range", () => {
    expect(calculateSunSign({ day: 1, month: 1, year: 2000 })).toBe("Capricorn");
    expect(calculateSunSign({ day: 21, month: 6, year: 2000 })).toBe("Cancer");
    expect(calculateSunSign({ day: 21, month: 12, year: 2000 })).toBe("Sagittarius");
    expect(calculateSunSign({ day: 5, month: 4, year: 1901 })).toBe("Aries");
    expect(calculateSunSign({ day: 15, month: 8, year: 1975 })).toBe("Leo");
  });

  it("does not use a fixed calendar table — the equinox boundary shifts by year", () => {
    // The March equinox moved from ~Mar 21 (19th century) to ~Mar 20 (21st
    // century). Astronomical computation must reflect that drift instead of
    // applying one static cutoff date across all years.
    expect(calculateSunSign({ day: 20, month: 3, year: 2000 })).toBe("Aries");
    expect(calculateSunSign({ day: 20, month: 3, year: 1900 })).toBe("Pisces");
    expect(calculateSunSign({ day: 21, month: 3, year: 1900 })).toBe("Aries");
  });
});
