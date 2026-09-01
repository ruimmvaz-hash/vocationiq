import { describe, expect, it } from "vitest";
import { DEFINICOES_NAKSHATRA, traduzirSinal, formatarSinalParaPrompt, serializarSinal } from "../src/v3/linguagem-naveya.js";
import { NAKSHATRAS } from "../src/astrology/nakshatra.js";

describe("DEFINICOES_NAKSHATRA — os 27 nakshatras em linguagem Naveya", () => {
  it("tem exactamente as 27 chaves de NAKSHATRAS (astrology/nakshatra.ts), nem mais nem menos", () => {
    const chaves = Object.keys(DEFINICOES_NAKSHATRA).sort();
    const esperadas = [...NAKSHATRAS].sort();
    expect(chaves).toEqual(esperadas);
    expect(chaves.length).toBe(27);
  });

  it("cada entrada tem os 4 campos obrigatórios, todos não vazios", () => {
    for (const nome of NAKSHATRAS) {
      const def = DEFINICOES_NAKSHATRA[nome];
      expect(def.nome).toBe(nome);
      expect(def.nomeEvocativo.length).toBeGreaterThan(0);
      expect(def.definicao.length).toBeGreaterThan(0);
      expect(def.movimento.length).toBeGreaterThan(0);
    }
  });

  it("o nome evocativo nunca é igual à transliteração — nunca é tradução literal do sânscrito", () => {
    for (const nome of NAKSHATRAS) {
      const def = DEFINICOES_NAKSHATRA[nome];
      expect(def.nomeEvocativo.toLowerCase()).not.toBe(nome.toLowerCase());
      expect(def.nomeEvocativo).not.toContain(nome); // não contém sequer a transliteração como substring
    }
  });

  it("traduzirSinal funciona para cada um dos 27 nakshatras, devolvendo definição + movimento", () => {
    for (const nome of NAKSHATRAS) {
      const texto = traduzirSinal(nome, "nakshatra da Lua");
      expect(texto).not.toBeNull();
      const def = DEFINICOES_NAKSHATRA[nome];
      // A tradução embute a definição e o movimento (eventualmente envolvidos por aplicarPapel, que nunca corta o conteúdo).
      expect(texto).toMatch(new RegExp(def.definicao.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("formatarSinalParaPrompt mostra o nome EVOCATIVO no texto, nunca a transliteração — para os 27", () => {
    for (const nome of NAKSHATRAS) {
      const sinal = formatarSinalParaPrompt(nome, "nakshatra da Lua")!;
      expect(sinal).not.toBeNull();
      expect(sinal.termoParaTexto).toBe(DEFINICOES_NAKSHATRA[nome].nomeEvocativo);
      const texto = serializarSinal(sinal);
      expect(texto).toContain(`TERMO A ESCREVER NO TEXTO: ${DEFINICOES_NAKSHATRA[nome].nomeEvocativo}`);
    }
  });

  it("aplica o papel de Atmakaraka também a um nakshatra, tal como a um graha", () => {
    const texto = traduzirSinal("Rohini", "Atmakaraka");
    expect(texto).toMatch(/a alma desta pessoa escolheu aprender através disto/);
    expect(texto).toMatch(/faz crescer|cuidado/);
  });

  it("os 4 nomes evocativos reaproveitados de um relatório real (Rui v7) batem com a nakshatra certa", () => {
    expect(DEFINICOES_NAKSHATRA.Dhanishta.nomeEvocativo).toMatch(/tambor/);
    expect(DEFINICOES_NAKSHATRA.Krittika.nomeEvocativo).toMatch(/lâmina/);
    expect(DEFINICOES_NAKSHATRA.Shatabhisha.nomeEvocativo).toMatch(/curandeiros/);
    expect(DEFINICOES_NAKSHATRA.Punarvasu.nomeEvocativo).toMatch(/regresso da luz/);
  });

  it("devolve null para uma transliteração inventada, nunca inventa uma nakshatra que não existe", () => {
    expect(traduzirSinal("Invenshatra", "nakshatra da Lua")).toBeNull();
  });
});
