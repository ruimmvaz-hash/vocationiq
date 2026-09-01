import { describe, expect, it } from "vitest";
import { dignidadesTodas } from "../src/v3/dignidadeV3.js";
import type { ClassicalGraha } from "../src/lifeReport/types.js";
import type { ZodiacSign } from "../src/data/tables.js";

// FASE 1 — carta da Melina, dignidade completa (clássica + Panchadha
// Maitri quando aplicável). Cruza com as verificações já feitas em
// panchadhaMaitri.test.ts (Sol→Marte e Vénus→Saturno = Adhi Mitra).
describe("dignidadeV3 — carta da Melina", () => {
  const posicoes: Record<ClassicalGraha, { sign: ZodiacSign; degreeInSign: number }> = {
    Sun: { sign: "Scorpio", degreeInSign: 25.97 },
    Moon: { sign: "Cancer", degreeInSign: 2.62 },
    Mercury: { sign: "Sagittarius", degreeInSign: 3.24 },
    Venus: { sign: "Capricorn", degreeInSign: 9.1 },
    Mars: { sign: "Capricorn", degreeInSign: 25.82 },
    Jupiter: { sign: "Sagittarius", degreeInSign: 23.16 },
    Saturn: { sign: "Libra", degreeInSign: 28.96 },
  };

  const result = dignidadesTodas(posicoes);

  it("Marte exaltado em Capricórnio, sem Panchadha", () => {
    expect(result.Mars).toEqual({ classica: "Exalted", panchadha: null });
  });

  it("Saturno exaltado em Libra, sem Panchadha", () => {
    expect(result.Saturn).toEqual({ classica: "Exalted", panchadha: null });
  });

  it("Lua em signo próprio (Caranguejo), sem Panchadha", () => {
    expect(result.Moon).toEqual({ classica: "Own", panchadha: null });
  });

  it("Júpiter em signo próprio (Sagitário), sem Panchadha", () => {
    expect(result.Jupiter).toEqual({ classica: "Own", panchadha: null });
  });

  it("Vénus em Capricórnio (regente Saturno): Adhi Mitra", () => {
    expect(result.Venus.panchadha).toBe("adhi-mitra");
  });

  it("Sol em Escorpião (regente Marte): Adhi Mitra", () => {
    expect(result.Sun.panchadha).toBe("adhi-mitra");
  });

  it("Mercúrio em Sagitário (regente Júpiter, mesmo signo): Shatru", () => {
    expect(result.Mercury.panchadha).toBe("shatru");
  });
});
