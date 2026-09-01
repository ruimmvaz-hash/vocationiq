import { describe, expect, it } from "vitest";
import { reduceToDigitOrMaster } from "../src/numerology/reduce.js";
import { calculateLifePath } from "../src/numerology/lifePath.js";
import { calculateExpressionNumber, normalizeName } from "../src/numerology/expression.js";

describe("reduceToDigitOrMaster", () => {
  it("reduces regular numbers to a single digit", () => {
    expect(reduceToDigitOrMaster(4)).toBe(4);
    expect(reduceToDigitOrMaster(49)).toBe(4); // 4+9=13 -> 1+3=4
    expect(reduceToDigitOrMaster(20)).toBe(2);
  });

  it("preserves master numbers reached during reduction", () => {
    expect(reduceToDigitOrMaster(29)).toBe(11); // 2+9=11, stop
    expect(reduceToDigitOrMaster(38)).toBe(11); // 3+8=11, stop
    expect(reduceToDigitOrMaster(499)).toBe(22); // 4+9+9=22, stop
  });

  it("preserves master numbers given directly", () => {
    expect(reduceToDigitOrMaster(11)).toBe(11);
    expect(reduceToDigitOrMaster(22)).toBe(22);
    expect(reduceToDigitOrMaster(33)).toBe(33);
  });
});

describe("calculateLifePath", () => {
  it("sums all digits of DD+MM+AAAA and reduces to a single digit", () => {
    // "1" + "1" + "2000" -> 1+1+2+0+0+0 = 4
    expect(calculateLifePath({ day: 1, month: 1, year: 2000 })).toBe(4);
  });

  it("preserves master number 11 (25/12/1990 -> sum 29 -> 2+9=11)", () => {
    expect(calculateLifePath({ day: 25, month: 12, year: 1990 })).toBe(11);
  });

  it("produces a life path of 2 for 05/04/1901 (sum 20 -> 2)", () => {
    expect(calculateLifePath({ day: 5, month: 4, year: 1901 })).toBe(2);
  });
});

describe("normalizeName", () => {
  it("strips Portuguese accents and uppercases", () => {
    expect(normalizeName("José")).toBe("JOSE");
    expect(normalizeName("François")).toBe("FRANCOIS");
    expect(normalizeName("Coração")).toBe("CORACAO");
    expect(normalizeName("Über Ánn-Marïe O'Neill")).toBe("UBERANNMARIEONEILL");
  });
});

describe("calculateExpressionNumber", () => {
  it("converts name letters pythagorically and reduces", () => {
    // I=9, V=4, Y=7 -> 20 -> 2
    expect(calculateExpressionNumber("Ivy")).toBe(2);
  });

  it("normalizes accents before conversion (José === JOSE)", () => {
    expect(calculateExpressionNumber("José")).toBe(calculateExpressionNumber("JOSE"));
    expect(calculateExpressionNumber("José")).toBe(4);
  });

  it("throws on a name with no convertible letters", () => {
    expect(() => calculateExpressionNumber("123 !!!")).toThrow();
  });
});
