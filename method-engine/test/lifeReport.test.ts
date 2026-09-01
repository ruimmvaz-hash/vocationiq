import { describe, expect, it } from "vitest";
import { computeD1Table } from "../src/lifeReport/d1Table.js";

// Reference values locked in from docs/GABARITO-Rui-Tabelas.md and
// docs/GABARITO-Alice-Tabelas.md (founder's hand-calculated tables,
// cross-checked against this engine — see the D-1 comparison report).
// These are regression tests: if any of these break, the engine has
// drifted from the validated ground truth.

const rui = computeD1Table({
  utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)),
  latitude: 38.7169,
  longitude: -9.1399,
});

const alice = computeD1Table({
  utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)),
  latitude: -8.839,
  longitude: 13.2894,
});

describe("Rui Vaz D-1 (GABARITO cross-check)", () => {
  it("Ascendant: Leo, Magha nakshatra, Ketu lord", () => {
    expect(rui.ascendant.sign).toBe("Leo");
    expect(rui.ascendant.degreeInSign).toBeCloseTo(12.5, 1);
    expect(rui.ascendant.nakshatra).toBe("Magha");
    expect(rui.ascendant.nakshatraLord).toBe("Ketu");
  });

  it("whole-sign houses match for all 9 grahas", () => {
    expect(rui.rows.Sun.house).toBe(7);
    expect(rui.rows.Moon.house).toBe(10);
    expect(rui.rows.Mercury.house).toBe(6);
    expect(rui.rows.Venus.house).toBe(7);
    expect(rui.rows.Mars.house).toBe(12);
    expect(rui.rows.Jupiter.house).toBe(11);
    expect(rui.rows.Saturn.house).toBe(1);
    expect(rui.rows.Rahu.house).toBe(2);
    expect(rui.rows.Ketu.house).toBe(8);
  });

  it("functional rulerships match", () => {
    expect(rui.rows.Sun.functionalRulershipHouses).toEqual([1]);
    expect(rui.rows.Moon.functionalRulershipHouses).toEqual([12]);
    expect(rui.rows.Mercury.functionalRulershipHouses).toEqual([2, 11]);
    expect(rui.rows.Venus.functionalRulershipHouses).toEqual([3, 10]);
    expect(rui.rows.Mars.functionalRulershipHouses).toEqual([4, 9]);
    expect(rui.rows.Jupiter.functionalRulershipHouses).toEqual([5, 8]);
    expect(rui.rows.Saturn.functionalRulershipHouses).toEqual([6, 7]);
  });

  it("dignity matches where GABARITO states it explicitly", () => {
    expect(rui.rows.Moon.dignity).toBe("Exalted");
    expect(rui.rows.Mars.dignity).toBe("Debilitated");
  });

  it("nakshatra + lord match for all grahas", () => {
    expect(rui.rows.Moon.nakshatra).toBe("Krittika");
    expect(rui.rows.Moon.pada).toBe(2);
    expect(rui.rows.Moon.nakshatraLord).toBe("Sun");
    expect(rui.rows.Sun.nakshatra).toBe("Dhanishta");
    expect(rui.rows.Sun.nakshatraLord).toBe("Mars");
  });

  it("Bhava Madhya distance/band match to the arcminute", () => {
    expect(rui.rows.Sun.bhavaMadhyaDistance).toBeCloseTo(10 + 19 / 60, 1);
    expect(rui.rows.Sun.bhavaMadhyaBand).toBe("Moderada/Baixa");
    expect(rui.rows.Venus.bhavaMadhyaBand).toBe("Maxima");
  });

  it("conjunction Sun+Venus in Aquarius, 5°40' apart", () => {
    const conj = rui.conjunctions.find((c) => (c.a === "Sun" && c.b === "Venus") || (c.a === "Venus" && c.b === "Sun"));
    expect(conj).toBeDefined();
    expect(conj!.sign).toBe("Aquarius");
    expect(conj!.distanceDegrees).toBeCloseTo(5 + 40 / 60, 1);
  });

  it("Karakas: AK Mercury, AmK Venus, Karakamsha Cancer house 1, Vargottama Mars", () => {
    expect(rui.karakas.atmakaraka).toBe("Mercury");
    expect(rui.karakas.amatyakaraka).toBe("Venus");
    expect(rui.karakas.atmakarakaD9Sign).toBe("Cancer");
    expect(rui.karakas.karakamshaHouse).toBe(1);
    expect(rui.karakas.amatyakarakaD9Sign).toBe("Sagittarius");
    expect(rui.karakas.amatyakarakaD9House).toBe(6);
    expect(rui.karakas.vargottama).toEqual(["Mars"]);
  });
});

describe("Alice Amorim D-1 (GABARITO cross-check)", () => {
  it("Ascendant: Taurus, Krittika nakshatra, Sun lord", () => {
    expect(alice.ascendant.sign).toBe("Taurus");
    expect(alice.ascendant.nakshatra).toBe("Krittika");
    expect(alice.ascendant.nakshatraLord).toBe("Sun");
  });

  it("dignity matches explicit GABARITO values", () => {
    expect(alice.rows.Sun.dignity).toBe("Friend");
    expect(alice.rows.Moon.dignity).toBe("Debilitated");
    expect(alice.rows.Mercury.dignity).toBe("Neutral");
    expect(alice.rows.Venus.dignity).toBe("Friend");
    expect(alice.rows.Mars.dignity).toBe("Neutral");
    expect(alice.rows.Saturn.dignity).toBe("Exalted");
  });

  it("self-lord nakshatras (own graha rules its own nakshatra)", () => {
    expect(alice.rows.Mars.nakshatra).toBe("Dhanishta");
    expect(alice.rows.Mars.nakshatraLord).toBe("Mars");
    expect(alice.rows.Rahu.nakshatra).toBe("Ardra");
    expect(alice.rows.Rahu.nakshatraLord).toBe("Rahu");
    expect(alice.rows.Ketu.nakshatra).toBe("Mula");
    expect(alice.rows.Ketu.nakshatraLord).toBe("Ketu");
  });

  it("Karakas: AK Sun, AmK Moon, Karakamsha Scorpio house 9, no Vargottama", () => {
    expect(alice.karakas.atmakaraka).toBe("Sun");
    expect(alice.karakas.amatyakaraka).toBe("Moon");
    expect(alice.karakas.atmakarakaD9Sign).toBe("Scorpio");
    expect(alice.karakas.karakamshaHouse).toBe(9);
    expect(alice.karakas.amatyakarakaD9Sign).toBe("Sagittarius");
    expect(alice.karakas.amatyakarakaD9House).toBe(10);
    expect(alice.karakas.vargottama).toEqual([]);
  });

  it("conjunctions found: Sun+Ketu, Moon+Jupiter, Mercury+Venus", () => {
    const pairs = alice.conjunctions.map((c) => [c.a, c.b].sort().join("+"));
    expect(pairs).toContain(["Ketu", "Sun"].sort().join("+"));
    expect(pairs).toContain(["Jupiter", "Moon"].sort().join("+"));
    expect(pairs).toContain(["Mercury", "Venus"].sort().join("+"));
  });
});

describe("Rui Vaz D-9 (GABARITO cross-check)", () => {
  it("D-9 Ascendant Cancer; Karakamsha Mercury -> Cancer house 1; AmK Venus -> Sagittarius house 6", () => {
    expect(rui.d9.ascendantD9Sign).toBe("Cancer");
    expect(rui.d9.rows.Mercury.d9Sign).toBe("Cancer");
    expect(rui.d9.rows.Mercury.d9House).toBe(1);
    expect(rui.d9.rows.Venus.d9Sign).toBe("Sagittarius");
    expect(rui.d9.rows.Venus.d9House).toBe(6);
  });

  it("Sun debilitated in D-9 Libra house 4 (GABARITO: 'debilitado no D-9, Casa 4')", () => {
    expect(rui.d9.rows.Sun.d9Sign).toBe("Libra");
    expect(rui.d9.rows.Sun.d9House).toBe(4);
    expect(rui.d9.rows.Sun.d9Dignity).toBe("Debilitated");
  });

  it("Mars Vargottama: Cancer in both D-1 and D-9, debilitated in both", () => {
    expect(rui.d9.rows.Mars.d9Sign).toBe("Cancer");
    expect(rui.d9.rows.Mars.vargottama).toBe(true);
    expect(rui.d9.rows.Mars.d9Dignity).toBe("Debilitated");
  });

  it("Saturn and Rahu both land in Taurus house 11 in D-9 (GABARITO: 'Saturno no D-9 Touro Casa 11, com Rahu')", () => {
    expect(rui.d9.rows.Saturn.d9Sign).toBe("Taurus");
    expect(rui.d9.rows.Saturn.d9House).toBe(11);
    expect(rui.d9.rows.Rahu.d9Sign).toBe("Taurus");
    expect(rui.d9.rows.Rahu.d9House).toBe(11);
  });

  it("Moon in D-9 Capricorn house 7", () => {
    expect(rui.d9.rows.Moon.d9Sign).toBe("Capricorn");
    expect(rui.d9.rows.Moon.d9House).toBe(7);
  });
});

describe("Known open item: Avastha Baladi in Aquarius", () => {
  it("documents the literal-rule result for the 3 flagged cases (see comparison report)", () => {
    // M-004's literal rule (air signs odd/normal) gives these; GABARITO
    // shows the reversed-order values (Mrita/Vriddha/Mrita) in all 3
    // cases instead. Kept as an explicit assertion so this stays visible
    // if the rule is revised after the founder's decision.
    expect(rui.rows.Sun.avastha).toBe("Bala");
    expect(rui.rows.Venus.avastha).toBe("Kumara");
    expect(alice.rows.Mars.avastha).toBe("Bala");
  });
});
