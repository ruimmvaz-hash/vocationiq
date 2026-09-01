import { describe, expect, it } from "vitest";
import { computeWesternTable } from "../src/lifeReport/western/westernTable.js";

// Reference values transcribed from docs/GABARITO-Rui-Tabelas.md and
// docs/GABARITO-Alice-Tabelas.md, section B (Ocidental / astro.com,
// Placidus). Regression tests: if these break, the Western engine has
// drifted from the validated ground truth.

const rui = computeWesternTable({
  utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)),
  latitude: 38.7169,
  longitude: -9.1399,
});

const alice = computeWesternTable({
  utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)),
  latitude: -8.839,
  longitude: 13.2894,
});

describe("Rui Vaz Western/Placidus (GABARITO cross-check)", () => {
  it("Ascendant Virgo, MC Gemini", () => {
    expect(rui.ascendant.sign).toBe("Virgo");
    expect(rui.ascendant.degreeInSign).toBeCloseTo(6.07, 0);
    expect(rui.mc.sign).toBe("Gemini");
    expect(rui.mc.degreeInSign).toBeCloseTo(2 + 23 / 60, 1);
  });

  it("all 7 classical planets land in the GABARITO's Placidus houses", () => {
    expect(rui.planets.Sun.house).toBe(6);
    expect(rui.planets.Moon.house).toBe(9);
    expect(rui.planets.Mercury.house).toBe(6);
    expect(rui.planets.Venus.house).toBe(6);
    expect(rui.planets.Mars.house).toBe(11);
    expect(rui.planets.Jupiter.house).toBe(10);
    expect(rui.planets.Saturn.house).toBe(12);
  });

  it("tropical dignity matches GABARITO's explicit values", () => {
    expect(rui.planets.Sun.dignity).toBe("detrimento");
    expect(rui.planets.Venus.dignity).toBe("exaltacao");
    expect(rui.planets.Mars.dignity).toBe("queda");
    expect(rui.planets.Jupiter.dignity).toBe("detrimento");
    expect(rui.planets.Saturn.dignity).toBe("detrimento");
  });

  it("Sun-Moon square: orb ~1.47deg, applying (regression test for the finite-difference overshoot bug)", () => {
    const hit = rui.planets.Sun.aspects.find((a) => a.to === "Moon");
    expect(hit?.hit.aspect).toBe("Quadratura");
    expect(hit?.hit.orb).toBeCloseTo(1 + 28 / 60, 1);
    expect(hit?.hit.applying).toBe(true);
  });

  it("Jupiter-Saturn sextile: orb ~1.12deg, applying", () => {
    const hit = rui.planets.Jupiter.aspects.find((a) => a.to === "Saturn");
    expect(hit?.hit.aspect).toBe("Sextil");
    expect(hit?.hit.orb).toBeCloseTo(1 + 7 / 60, 1);
    expect(hit?.hit.applying).toBe(true);
  });

  it("Moon-Mars sextile: orb ~0.43deg, separating", () => {
    const hit = rui.planets.Moon.aspects.find((a) => a.to === "Mars");
    expect(hit?.hit.aspect).toBe("Sextil");
    expect(hit?.hit.applying).toBe(false);
  });
});

describe("Alice Amorim Western/Placidus (GABARITO cross-check)", () => {
  it("Ascendant Gemini, MC Pisces", () => {
    expect(alice.ascendant.sign).toBe("Gemini");
    expect(alice.mc.sign).toBe("Pisces");
  });

  it("all 7 classical planets land in the GABARITO's Placidus houses", () => {
    expect(alice.planets.Sun.house).toBe(8);
    expect(alice.planets.Moon.house).toBe(7);
    expect(alice.planets.Mercury.house).toBe(9);
    expect(alice.planets.Venus.house).toBe(9);
    expect(alice.planets.Mars.house).toBe(9);
    expect(alice.planets.Jupiter.house).toBe(7);
    expect(alice.planets.Saturn.house).toBe(5);
  });

  it("Jupiter in Sagittarius is domicilio (GABARITO: DOMICÍLIO)", () => {
    expect(alice.planets.Jupiter.sign).toBe("Sagittarius");
    expect(alice.planets.Jupiter.dignity).toBe("domicilio");
  });

  it("Mercury square Saturn: orb ~2.1deg, separating (GABARITO: 2°06' S)", () => {
    const hit = alice.planets.Mercury.aspects.find((a) => a.to === "Saturn");
    expect(hit?.hit.aspect).toBe("Quadratura");
    expect(hit?.hit.orb).toBeCloseTo(2.1, 1);
    expect(hit?.hit.applying).toBe(false);
  });

  it("Jupiter opposition Ascendant: orb ~0.96deg, applying (GABARITO: 0°59' A, exact conjunction to Descendant)", () => {
    const hit = alice.planets.Jupiter.aspects.find((a) => a.to === "Ascendente");
    expect(hit?.hit.aspect).toBe("Oposicao");
    expect(hit?.hit.applying).toBe(true);
  });
});
