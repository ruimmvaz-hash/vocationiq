import { describe, expect, it } from "vitest";
import { assignArchetype } from "../src/engine/archetypeEngine.js";

describe("assignArchetype", () => {
  it("keeps the sun's archetype when the Modality vote doesn't flip it", () => {
    // Sun Capricorn (Earth/Cardinal). Expression 1 (Cardinal) reinforces the
    // Sun's modality, so Cardinal wins regardless of Life Path.
    const result = assignArchetype({
      birthDate: { day: 1, month: 1, year: 2000 },
      fullName: "Bob",
    });
    expect(result.details.sunSign).toBe("Capricorn");
    expect(result.details.lifePath).toBe(4);
    expect(result.details.expressionNumber).toBe(1);
    expect(result.archetype).toBe(result.details.solArchetype);
    expect(result.details.displaced).toBe(false);
  });

  it("Element always comes from the Sun sign, never from a vote (M-002 v0.4)", () => {
    // Life Path 2 and Expression 2 both map to Water in the old element
    // table, but v0.4 no longer lets numerology vote the Element — it must
    // stay Fire (Aries) regardless.
    const result = assignArchetype({
      birthDate: { day: 5, month: 4, year: 1901 },
      fullName: "Ivy",
    });
    expect(result.details.sunSign).toBe("Aries");
    expect(result.details.element).toBe("Fire");
  });

  it("displaces the archetype when Life Path + Expression (3+2=5) outweigh the Sun (4) on Modality", () => {
    // Sun Aries (Fire/Cardinal, weight 4); Life Path 2 and Expression 2 both
    // map to Fixed modality (weight 3+2=5 > 4) -> Modality flips to Fixed,
    // Element stays Fire -> The Flamekeeper (Fire x Fixed).
    const result = assignArchetype({
      birthDate: { day: 5, month: 4, year: 1901 },
      fullName: "Ivy",
    });
    expect(result.details.solArchetype).toBe("The Trailblazer");
    expect(result.details.lifePath).toBe(2);
    expect(result.details.expressionNumber).toBe(2);
    expect(result.details.modality).toBe("Fixed");
    expect(result.archetype).toBe("The Flamekeeper");
    expect(result.details.displaced).toBe(true);
  });

  it("breaks Modality ties in favor of the Sun (§3.2)", () => {
    const profile = { birthDate: { day: 5, month: 4, year: 1901 }, fullName: "Ivy" };
    // Custom weights where Sun (2) exactly ties combined Life Path + Expression (1+1=2).
    const result = assignArchetype(profile, { sunSign: 2, lifePath: 1, expression: 1 });
    expect(result.details.sunSign).toBe("Aries");
    expect(result.archetype).toBe("The Trailblazer");
    expect(result.details.displaced).toBe(false);
  });

  it("derives motor from Life Path and voice from Expression Number", () => {
    const result = assignArchetype({
      birthDate: { day: 1, month: 1, year: 2000 },
      fullName: "Ivy",
    });
    expect(result.details.lifePath).toBe(4);
    expect(result.motor).toBe("Structure");
    expect(result.details.expressionNumber).toBe(2);
    expect(result.voice).toBe("Harmony");
  });

  it("preserves master-number motors (e.g. Life Path 11 -> Inspiration)", () => {
    const result = assignArchetype({
      birthDate: { day: 25, month: 12, year: 1990 },
      fullName: "Ivy",
    });
    expect(result.details.lifePath).toBe(11);
    expect(result.motor).toBe("Inspiration");
  });
});
