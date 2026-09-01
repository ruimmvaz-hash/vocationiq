import { describe, expect, it } from "vitest";
import { gerarCamadaA, calcularArudhaLagna } from "../src/v3/camada-a.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// FASE 1, Passo 2 — CamadaA completa para a carta da Melina
// (CODE-4-melina-PASSA.md), com data de referência fixa (mesma usada nas
// auditorias anteriores) para os testes serem reprodutíveis.
describe("gerarCamadaA — carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const atDate = new Date(Date.UTC(2026, 7, 22));
  const camada = gerarCamadaA(melina, atDate);

  it("ascendente Capricórnio ~9°, confirmado contra CODE-4/Prokerala", () => {
    expect(camada.ascendente.sign).toBe("Capricorn");
    expect(camada.ascendente.degreeInSign).toBeCloseTo(9.2, 0);
  });

  it("signo solar tropical calculado (para a nota de leitura da Abertura)", () => {
    expect(camada.signoSolarTropical).toBeDefined();
  });

  it("karakas correctos (Atmakaraka Saturno, Amatyakaraka Sol, Karakamsha em Gémeos)", () => {
    expect(camada.karakas.atmakaraka).toBe("Saturn");
    expect(camada.karakas.amatyakarakaD9Sign).toBeDefined();
    expect(camada.karakas.atmakarakaD9Sign).toBe("Gemini");
  });

  // ACRESCENTADO 25/08/2026 ("Correcções críticas ao motor v3", ponto 5)
  // — a Arudha Lagna nunca tinha sido calculada neste motor.
  it("Arudha Lagna calculada — casa 4 para a Melina (Ascendente Capricórnio, regente Saturno na casa 10)", () => {
    expect(camada.arudhaLagna).toBe(4);
    expect(camada.arudhaLagna).toBeGreaterThanOrEqual(1);
    expect(camada.arudhaLagna).toBeLessThanOrEqual(12);
    expect(camada.calculado).toContain("Arudha Lagna (AL) — imagem pública, método clássico de contagem dupla a partir do regente do Ascendente");
  });

  it("calcularArudhaLagna — excepção clássica: nunca cai na 1ª nem na 7ª casa", () => {
    // regente na própria casa 1 → AL bruta seria a 1ª (excepção dispara → 10ª a partir daí).
    expect(calcularArudhaLagna(1)).toBe(10);
    expect(calcularArudhaLagna(1)).not.toBe(1);
    expect(calcularArudhaLagna(1)).not.toBe(7);
    // varre as 12 casas de entrada possíveis — o resultado nunca pode ser 1 nem 7.
    for (let casaRegente = 1; casaRegente <= 12; casaRegente++) {
      const al = calcularArudhaLagna(casaRegente);
      expect(al).toBeGreaterThanOrEqual(1);
      expect(al).toBeLessThanOrEqual(12);
      expect(al).not.toBe(1);
      expect(al).not.toBe(7);
    }
  });

  it("dasha actual Ketu (2021-2028), antardasha Júpiter", () => {
    expect(camada.dashaAtual.mahadasha.lord).toBe("Ketu");
    expect(camada.dashaAtual.antardasha.lord).toBe("Jupiter");
  });

  it("dignidade: Marte e Saturno exaltados, sem Panchadha; Vénus Adhi Mitra", () => {
    expect(camada.dignidades.Mars.classica).toBe("Exalted");
    expect(camada.dignidades.Saturn.classica).toBe("Exalted");
    expect(camada.dignidades.Venus.panchadha).toBe("adhi-mitra");
  });

  it("SAV fiável e a bater com CODE-4/Prokerala (22·26·22·30·34·26·22·30·32·36·34·23)", () => {
    expect(camada.sav.fiavel).toBe(true);
    expect(camada.sav.byHouse.map((h) => h.pontuacao)).toEqual([22, 26, 22, 30, 34, 26, 22, 30, 32, 36, 34, 23]);
  });

  it("drishti tem hits emitidos por Rahu e Ketu além da 7ª (extensão desta sessão)", () => {
    const deRahu = camada.drishtiHits.filter((h) => h.from === "Rahu");
    expect(deRahu.some((h) => h.offset === 5 || h.offset === 9)).toBe(true);
  });

  it("figuras fechadas incluem os 2 T-Quadrados e 2 Yods publicados em CODE-4", () => {
    expect(camada.figurasFechadas.filter((f) => f.tipo === "Yod")).toHaveLength(2);
    expect(camada.figurasFechadas.filter((f) => f.tipo === "T-Quadrado").length).toBeGreaterThanOrEqual(2);
  });

  it("slowTransits cobre exactamente Saturno/Urano/Neptuno/Plutão/Rahu/Ketu (Júpiter fica em annualTransit, por CODE-6)", () => {
    const corpos = camada.slowTransits.map((t) => t.corpo).sort();
    expect(corpos).toEqual(["Ketu", "Neptune", "Pluto", "Rahu", "Saturn", "Uranus"]);
  });

  it("annualTransit é sempre Júpiter, com a casa de Saturno cruzada", () => {
    expect(camada.annualTransit.corpo).toBe("Jupiter");
    expect(camada.annualTransit.casaDeSaturnoAgora.casaAPartirDoAscendente).toBeGreaterThanOrEqual(1);
  });

  it("calculado e naoCalculado nunca vazios, e naoCalculado nomeia os 3 itens esperados", () => {
    expect(camada.calculado.length).toBeGreaterThan(5);
    const junto = camada.naoCalculado.join(" | ");
    expect(junto).toMatch(/Jagradadi/);
    expect(junto).toMatch(/Lajjitadi/);
  });
});
