import { describe, expect, it } from "vitest";
import { computeTransits } from "../src/lifeReport/western/transits.js";

// Cross-checked against docs/GABARITO-Rui-Tabelas.md's own transit note:
// "Saturno tropical: Carneiro (fev 2026 ->) = Casa 8 Placidus dele
// (cuspide Carneiro 0d16'); oposicao ao Nodo Norte natal (~mai 2026,
// ~nov 2026, ~fev 2027)" — mid-2026 sits between the May and November
// exact passes (Saturn's retrograde loop), so no exact opposition is
// expected right now, only the sign/house placement.
const rui = {
  utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)),
  latitude: 38.7169,
  longitude: -9.1399,
};

describe("Saturn/Jupiter transits (GABARITO cross-check)", () => {
  it("transiting Saturn on 2026-07-25 is in Aries, Rui's natal house 8", () => {
    const t = computeTransits(rui, new Date("2026-07-25T12:00:00Z"));
    expect(t.saturn.sign).toBe("Aries");
    expect(t.saturn.natalHouse).toBe(8);
  });

  it("transiting Saturn and Jupiter longitudes don't depend on the natal chart", () => {
    const alice = { utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)), latitude: -8.839, longitude: 13.2894 };
    const date = new Date("2026-07-25T12:00:00Z");
    const tRui = computeTransits(rui, date);
    const tAlice = computeTransits(alice, date);
    expect(tRui.saturn.longitude).toBeCloseTo(tAlice.saturn.longitude, 6);
    expect(tRui.jupiter.longitude).toBeCloseTo(tAlice.jupiter.longitude, 6);
  });
});
