import { describe, expect, it } from "vitest";
import { NAISARGIKA_MAITRI, tatkalikaMaitri, combinarMaitri, panchadhaMaitri } from "../src/v3/panchadhaMaitri.js";

// FASE 1, Tarefa Extra 3 — verificado 23/08/2026 contra o Prokerala
// (Planet Relationship → Panchada Maitri Table) para a carta da Melina
// (CODE-4-melina-PASSA.md): Ascendente Capricórnio, Sol Escorpião, Lua
// Caranguejo, Mercúrio Sagitário, Vénus Capricórnio, Marte Capricórnio,
// Júpiter Sagitário, Saturno Libra. 4 pares verificados abaixo, célula a
// célula contra a tabela publicada pelo Prokerala para esta carta exacta
// — todos batem, incluindo a convenção "mesmo signo (offset 1) = inimigo
// temporal" tal como especificada no pedido original (nenhuma correcção
// necessária a essa regra).
//
// NOTA IMPORTANTE sobre a expectativa original — o pedido dizia "Vénus em
// Capricórnio deve resultar em Mitra (amigo)". O resultado classicamente
// correcto, e o que o próprio Prokerala publica para esta carta exacta, é
// "Adhi Mitra" (grande amigo), não "Mitra": Vénus e Saturno são amigos
// naturais, e Saturno está na 10ª casa a partir de Vénus (offset 10, amigo
// temporal também) — amigo+amigo = Adhi Mitra pelo mapeamento clássico
// padrão. Fixado aqui o resultado correcto (Adhi Mitra), não a expectativa
// original — ver relatório desta sessão para a explicação completa.
describe("Panchadha Maitri — carta da Melina, 4 pares confirmados contra o Prokerala", () => {
  it("Vénus (Capricórnio) → Saturno (Libra, regente de Capricórnio): Adhi Mitra", () => {
    expect(NAISARGIKA_MAITRI.Venus.Saturn).toBe("amigo");
    expect(tatkalikaMaitri("Capricorn", "Libra")).toBe("amigo"); // Libra é a 10ª casa a partir de Capricórnio
    expect(panchadhaMaitri("Venus", "Capricorn", "Saturn", "Libra")).toBe("adhi-mitra");
  });

  it("Sol (Escorpião) → Marte (Capricórnio): Adhi Mitra (Prokerala: Extreme Friend)", () => {
    expect(NAISARGIKA_MAITRI.Sun.Mars).toBe("amigo");
    expect(tatkalikaMaitri("Scorpio", "Capricorn")).toBe("amigo"); // offset 3
    expect(panchadhaMaitri("Sun", "Scorpio", "Mars", "Capricorn")).toBe("adhi-mitra");
  });

  it("Lua (Caranguejo) → Vénus (Capricórnio): Shatru (Prokerala: Enemy)", () => {
    expect(NAISARGIKA_MAITRI.Moon.Venus).toBe("neutro");
    expect(tatkalikaMaitri("Cancer", "Capricorn")).toBe("inimigo"); // offset 7
    expect(panchadhaMaitri("Moon", "Cancer", "Venus", "Capricorn")).toBe("shatru");
  });

  it("Júpiter (Sagitário) → Mercúrio (Sagitário, mesmo signo): Adhi Shatru (Prokerala: Extreme Enemy)", () => {
    expect(NAISARGIKA_MAITRI.Jupiter.Mercury).toBe("inimigo");
    expect(tatkalikaMaitri("Sagittarius", "Sagittarius")).toBe("inimigo"); // offset 1, mesmo signo
    expect(combinarMaitri("inimigo", "inimigo")).toBe("adhi-shatru");
    expect(panchadhaMaitri("Jupiter", "Sagittarius", "Mercury", "Sagittarius")).toBe("adhi-shatru");
  });
});
