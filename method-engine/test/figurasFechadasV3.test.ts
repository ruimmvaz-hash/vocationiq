import { describe, expect, it } from "vitest";
import { detectarFigurasFechadas } from "../src/v3/figurasFechadasV3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// FASE 1 — verificado 23/08/2026 contra o inventário publicado no Anexo
// Técnico de CODE-4-melina-PASSA.md ("Figuras fechadas — inventário
// completo"): "T-quadrados: Lua opos Vénus, ambos em quadratura ao MC —
// apex MC · Saturno opos nodo norte, ambos em quadratura a Marte — apex
// Marte. Yods: Lua sextil nodo norte, ambos em quincunx a Mercúrio — apex
// Mercúrio · MC sextil Mercúrio, ambos em quincunx ao nodo norte — apex
// nodo. Grandes trígonos: nenhum. Grandes cruzes: nenhuma." Os órbes de
// CODE-4 (8°/7°/5°/3°) são os usados aqui — com o órbe simplificado da
// primeira versão deste ficheiro (6°/3°), os dois T-Quadrados
// desapareciam (Lua-Vénus a 6°29' e Marte-nodo a 6°46' excedem 6°) —
// prova concreta de que os órbes exactos de CODE-4 é que estão certos
// para este caso, não uma simplificação arbitrária.
describe("figurasFechadasV3 — carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };

  const figuras = detectarFigurasFechadas(melina);

  it("encontra o T-Quadrado Lua-Vénus com apex MC", () => {
    const hit = figuras.find((f) => f.tipo === "T-Quadrado" && f.pontos.includes("Moon") && f.pontos.includes("Venus") && f.pontos.includes("MC"));
    expect(hit).toBeTruthy();
  });

  it("encontra o T-Quadrado Saturno-nodo norte com apex Marte", () => {
    const hit = figuras.find((f) => f.tipo === "T-Quadrado" && f.pontos.includes("Saturn") && f.pontos.includes("Rahu") && f.pontos.includes("Mars"));
    expect(hit).toBeTruthy();
  });

  it("encontra o Yod Lua-nodo norte com apex Mercúrio", () => {
    const hit = figuras.find((f) => f.tipo === "Yod" && f.pontos.includes("Moon") && f.pontos.includes("Rahu") && f.pontos.includes("Mercury"));
    expect(hit).toBeTruthy();
  });

  it("encontra o Yod MC-Mercúrio com apex nodo norte", () => {
    const hit = figuras.find((f) => f.tipo === "Yod" && f.pontos.includes("MC") && f.pontos.includes("Mercury") && f.pontos.includes("Rahu"));
    expect(hit).toBeTruthy();
  });

  it("não encontra nenhum Grande Trígono nem Grande Cruz (CODE-4: nenhuma)", () => {
    expect(figuras.filter((f) => f.tipo === "Grande Trigono")).toHaveLength(0);
    expect(figuras.filter((f) => f.tipo === "Grande Cruz")).toHaveLength(0);
  });

  it("não encontra Kite (depende de Grande Trígono, que não existe nesta carta)", () => {
    expect(figuras.filter((f) => f.tipo === "Kite")).toHaveLength(0);
  });

  it("2 Yods, exactamente como CODE-4", () => {
    expect(figuras.filter((f) => f.tipo === "Yod")).toHaveLength(2);
  });

  it("3 T-Quadrados — 1 a mais do que CODE-4 lista, e a razão é conhecida: Vénus e o Ascendente estão conjuntos a 0°06' (CODE-4, tabela de aspectos), por isso o T-Quadrado Lua-Ascendente-MC é a MESMA tensão que Lua-Vénus-MC vista pelo eixo quase gémeo — CODE-4 mencionou só um dos dois pontos conjuntos, este módulo lista os dois independentemente por trabalhar a partir das longitudes, não da leitura humana. Não é uma figura falsa.", () => {
    const tsquares = figuras.filter((f) => f.tipo === "T-Quadrado");
    expect(tsquares).toHaveLength(3);
    expect(tsquares.some((f) => f.pontos.includes("Ascendente") && f.pontos.includes("Moon") && f.pontos.includes("MC"))).toBe(true);
  });

  // ADICIONADO 23/08/2026 — "orbe real" por figura (pedido explícito do
  // Anexo B, decisão 3A): o maior orbe entre os aspectos que compõem cada
  // figura (ver `orbeMaximo` em figurasFechadasV3.ts). Verificado contra
  // os graus exactos que este próprio ficheiro já documentava no
  // cabeçalho — "Lua-Vénus a 6°29'" e "Marte-nodo a 6°46'" — que são
  // precisamente as oposições mais largas dos dois T-Quadrados
  // correspondentes, confirmando que o cálculo bate com o dado já
  // conhecido, não um número novo inventado.
  describe("orbe real por figura (Anexo B, decisão 3A)", () => {
    it("todas as figuras têm um orbe numérico, maior que zero", () => {
      for (const f of figuras) {
        expect(typeof f.orbe).toBe("number");
        expect(f.orbe).toBeGreaterThan(0);
      }
    });

    it("o T-Quadrado Lua-Vénus-MC tem orbe ≈ 6°29' (6.483°) — a oposição Lua-Vénus, já documentada no cabeçalho deste ficheiro", () => {
      const hit = figuras.find((f) => f.tipo === "T-Quadrado" && f.pontos.includes("Moon") && f.pontos.includes("Venus"))!;
      expect(hit.orbe).toBeCloseTo(6.483, 1);
    });

    it("o T-Quadrado Saturno-Rahu-Marte tem orbe ≈ 6°46' (6.767°) — a quadratura de Marte, já documentada no cabeçalho deste ficheiro", () => {
      const hit = figuras.find((f) => f.tipo === "T-Quadrado" && f.pontos.includes("Saturn") && f.pontos.includes("Mars"))!;
      expect(hit.orbe).toBeCloseTo(6.767, 1);
    });

    it("os 2 Yods têm orbe muito mais apertado do que os T-Quadrados (ápices exactos, <2.5°)", () => {
      const yods = figuras.filter((f) => f.tipo === "Yod");
      for (const y of yods) expect(y.orbe).toBeLessThan(2.5);
    });
  });
});
