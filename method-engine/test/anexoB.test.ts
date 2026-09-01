import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirAnexoB } from "../src/v3/anexoB.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirAnexoB — Anexo B (técnico, determinístico), carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
  const espinha = derivarEspinha(camada);

  it("é uma função pura — mesmo input, mesmo output byte a byte, em duas chamadas separadas", () => {
    const a = construirAnexoB(camada, espinha);
    const b = construirAnexoB(camada, espinha);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  describe("1. Diagramas SVG", () => {
    const anexo = construirAnexoB(camada, espinha);

    it("rodaCasas está sempre presente e é um SVG válido", () => {
      expect(anexo.rodaCasas).toMatch(/^<svg viewBox="0 0 620 640"/);
    });

    it("convergenciaEspinha está presente — a espinha da Melina é 'convergencia'", () => {
      expect(espinha.desfecho.tipo).toBe("convergencia");
      expect(anexo.convergenciaEspinha).toBeDefined();
      expect(anexo.convergenciaEspinha).toMatch(/^<svg viewBox="0 0/);
    });

    it("convergenciaEspinha fica omitida (undefined) quando o desfecho não é 'convergencia'", () => {
      const espinhaSemConvergencia = { ...espinha, desfecho: { tipo: "ausencia-declarada" as const, motivo: "teste" } };
      const anexoSemConvergencia = construirAnexoB(camada, espinhaSemConvergencia);
      expect(anexoSemConvergencia.convergenciaEspinha).toBeUndefined();
    });
  });

  describe("2. SAV por casa", () => {
    it("as 12 casas, com pontuação real e classificação pela banda absoluta, quando sav.fiavel é true", () => {
      const anexo = construirAnexoB(camada, espinha);
      expect(camada.sav.fiavel).toBe(true);
      expect(anexo.sarvashtakavarga).toHaveLength(12);
      expect(anexo.sarvashtakavarga.map((h) => h.casa)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const casa10 = anexo.sarvashtakavarga.find((h) => h.casa === 10)!;
      expect(casa10.pontuacao).toBe(36);
      expect(casa10.interpretacao).toBe("forte — 36/56");
      const casa1 = anexo.sarvashtakavarga.find((h) => h.casa === 1)!;
      expect(casa1.interpretacao).toBe("fraco — 22/56");
    });

    it("lista vazia e nota em naoCalculado quando sav.fiavel é false", () => {
      const camadaSemSav = { ...camada, sav: { ...camada.sav, fiavel: false } };
      const anexo = construirAnexoB(camadaSemSav, espinha);
      expect(anexo.sarvashtakavarga).toEqual([]);
      expect(anexo.naoCalculado).toContain("SAV — tabelas não verificadas contra fonte externa");
    });
  });

  describe("3. Calculado / não calculado", () => {
    const anexo = construirAnexoB(camada, espinha);

    it("ambas as listas estão sempre presentes, derivadas directamente da Camada A", () => {
      expect(anexo.calculado).toEqual(camada.calculado);
      expect(anexo.naoCalculado).toEqual(camada.naoCalculado);
      expect(anexo.calculado.length).toBeGreaterThan(0);
      expect(anexo.naoCalculado.length).toBeGreaterThan(0);
    });
  });

  describe("4. Figuras fechadas", () => {
    const anexo = construirAnexoB(camada, espinha);

    it("as 5 figuras da Melina, cada uma com pontos traduzidos para linguagem Naveya e orbe real", () => {
      expect(anexo.figurasFechadas).toHaveLength(5);
      for (const f of anexo.figurasFechadas) {
        expect(typeof f.orbe).toBe("number");
        expect(f.orbe).toBeGreaterThan(0);
        for (const p of f.pontos) {
          expect(p.termo.length).toBeGreaterThan(0);
          expect(p.definicao.length).toBeGreaterThan(0);
        }
      }
    });

    it("traduz Saturn/Rahu/Mars para português (Saturno/Rahu/Marte) no T-Quadrado correspondente", () => {
      const tq = anexo.figurasFechadas.find((f) => f.tipo === "T-Quadrado" && f.pontos.some((p) => p.termo === "Saturno"))!;
      expect(tq).toBeDefined();
      expect(tq.pontos.map((p) => p.termo).sort()).toEqual(["Marte", "Rahu", "Saturno"].sort());
    });

    it("traduz o Ascendente e o MC com uma definição própria (gap do MC, novo, assinalado no código)", () => {
      const comAscendenteEMc = anexo.figurasFechadas.find((f) => f.pontos.some((p) => p.termo === "Ascendente") && f.pontos.some((p) => p.termo === "MC"));
      expect(comAscendenteEMc).toBeDefined();
      const ascendente = comAscendenteEMc!.pontos.find((p) => p.termo === "Ascendente")!;
      const mc = comAscendenteEMc!.pontos.find((p) => p.termo === "MC")!;
      expect(ascendente.definicao).toMatch(/como a pessoa se apresenta/);
      expect(mc.definicao).toMatch(/o ponto mais alto do céu no mapa tropical/);
    });
  });

  describe("5. Tabela de rastreio", () => {
    const anexo = construirAnexoB(camada, espinha);

    it("tem uma linha para a espinha, uma para o SAV por banda, uma por figura fechada, e uma para cada uma das Secções 4/8/9/12 (11 no total para a Melina)", () => {
      // CORRIGIDO 25/08/2026 ("Correcções críticas ao motor v3", ponto 6)
      // — a tabela passou a cobrir também as Secções 4, 8, 9 e 12 (antes
      // só cobria a espinha, o SAV e as figuras fechadas — 3 de 14).
      expect(anexo.tabelaRastreio).toHaveLength(11);
      expect(anexo.tabelaRastreio[0].seccao).toBe("Secção 3 — O Veredicto (espinha)");
      expect(anexo.tabelaRastreio[0].afirmacao).toBe((espinha.desfecho as { afirmacao: string }).afirmacao);
      expect(anexo.tabelaRastreio.some((l) => l.seccao === "Secção 5 — A Forma de Vida")).toBe(true);
      expect(anexo.tabelaRastreio.filter((l) => l.seccao === "Anexo B — Figuras Fechadas")).toHaveLength(5);
      for (const seccao of ["Secção 4 — Quem És", "Secção 8 — Dinheiro", "Secção 9 — Como és Vista", "Secção 12 — O Plano"]) {
        expect(anexo.tabelaRastreio.some((l) => l.seccao === seccao)).toBe(true);
      }
    });

    it("nenhuma linha de rastreio tem afirmação ou base vazia — nunca inventado, sempre com facto por trás", () => {
      for (const linha of anexo.tabelaRastreio) {
        expect(linha.afirmacao.length).toBeGreaterThan(0);
        expect(linha.base.length).toBeGreaterThan(0);
      }
    });
  });
});
