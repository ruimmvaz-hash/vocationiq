import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirRodaCasas, construirConvergenciaEspinha } from "../src/v3/diagramas.js";
import { bandaAbsolutaSav, ROTULO_CASA_NAVEYA } from "../src/v3/linguagem-naveya.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("diagramas.ts — roda das 12 casas e convergência da espinha, carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
  const espinha = derivarEspinha(camada);

  describe("bandaAbsolutaSav — correcção 2: banda absoluta, não ranking", () => {
    it("classifica pelos limiares fixos, não por posição relativa dentro da carta", () => {
      expect(bandaAbsolutaSav(36)).toBe("forte");
      expect(bandaAbsolutaSav(32)).toBe("forte"); // fronteira inclusiva
      expect(bandaAbsolutaSav(31)).toBe("medio");
      expect(bandaAbsolutaSav(25)).toBe("medio"); // fronteira inclusiva
      expect(bandaAbsolutaSav(24)).toBe("fraco");
      expect(bandaAbsolutaSav(22)).toBe("fraco");
    });

    it("para a Melina (SAV 22·26·22·30·34·26·22·30·32·36·34·23), classifica exactamente casas 5/9/10/11 como fortes e 1/3/7/12 como fracas", () => {
      const bandas = Object.fromEntries(camada.sav.byHouse.map((h) => [h.casa, bandaAbsolutaSav(h.pontuacao)]));
      for (const casa of [5, 9, 10, 11]) expect(bandas[casa]).toBe("forte");
      for (const casa of [1, 3, 7, 12]) expect(bandas[casa]).toBe("fraco");
      for (const casa of [2, 4, 6, 8]) expect(bandas[casa]).toBe("medio");
    });
  });

  describe("construirRodaCasas", () => {
    const svg = construirRodaCasas(camada);

    it("devolve um SVG válido, bem formado, viewBox 620x640", () => {
      expect(svg).toMatch(/^<svg viewBox="0 0 620 640" xmlns="http:\/\/www\.w3\.org\/2000\/svg">/);
      expect(svg.trim().endsWith("</svg>")).toBe(true);
      const abertos = (svg.match(/<path d="M/g) ?? []).length;
      const fechados = (svg.match(/Z"/g) ?? []).length;
      expect(abertos).toBe(fechados);
    });

    it("desenha DOIS anéis por casa — 12 gomos de apoio + 12 de presença = 24 <path> de gomo no total", () => {
      expect((svg.match(/<path d="M/g) ?? []).length).toBe(24);
    });

    it("cada casa usa sempre o mesmo raio no anel exterior (196→246), independentemente da banda de SAV", () => {
      // todas as 24 chamadas a pathGomo do anel exterior partilham "A246,246" e "A196,196"
      expect((svg.match(/A246,246/g) ?? []).length).toBe(12);
      expect((svg.match(/A196,196/g) ?? []).length).toBe(12);
    });

    it("o raio do anel de presença varia por CONTAGEM de ocupantes, não por SAV — casas 1/11/12 (2 ocupantes) usam 170; casas 5/7/10 (1 ocupante) usam 144; as restantes (vazias) usam 140", () => {
      expect((svg.match(/A170,170/g) ?? []).length).toBe(3); // casas 1, 11, 12 têm 2 ocupantes cada
      expect((svg.match(/A144,144/g) ?? []).length).toBe(3); // casas 5, 7, 10 têm 1 ocupante cada
      expect((svg.match(/A140,140/g) ?? []).length).toBe(6); // casas 2,3,4,6,8,9 vazias
      expect((svg.match(/118,118/g) ?? []).length).toBe(12); // raio interior do anel de presença, sempre fixo
    });

    it("CORRECÇÃO 2 — cores exactas por banda absoluta de SAV, copiadas do v7-MELHORADO", () => {
      expect(svg).toContain("#4f7a5c"); // forte
      expect(svg).toContain("#a89b7f"); // médio
      expect(svg).toContain("#b4634a"); // fraco
    });

    it("CORRECÇÃO 1 — contraste do número da casa: escuro (#4a534e) nas vazias, branco nas ocupadas", () => {
      // casa 3 está vazia (SAV 22, fraca) — o número "3" tem de vir com fill escuro
      const idx3 = svg.indexOf(">3</text>");
      const janela3 = svg.slice(Math.max(0, idx3 - 200), idx3);
      expect(janela3).toMatch(/fill="#4a534e"/);
      // casa 10 está ocupada (Saturno) — o número "10" tem de vir com fill branco
      const idx10 = svg.indexOf(">10</text>");
      const janela10 = svg.slice(Math.max(0, idx10 - 200), idx10);
      expect(janela10).toMatch(/fill="#fff"/);
    });

    it("CORRECÇÃO 3 — rótulos na tradução Naveya fixa (ROTULO_CASA_NAVEYA), nunca 'casa N ·' cru", () => {
      // rótulos longos partem-se em 2 tspans — comparar contra o texto "achatado" (tags removidas)
      const textoAchatado = svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      // casa 10 não está entre as 3 com rótulo curto (correcção 25/08/2026) — mantém o rótulo completo.
      expect(textoAchatado).toMatch(/a carreira\s*e o nome/);
      expect(svg).not.toMatch(/\d+\s*·/); // formato antigo "N · rótulo" não existe mais
      expect(Object.keys(ROTULO_CASA_NAVEYA)).toHaveLength(12);
    });

    // CORRIGIDO 25/08/2026 ("Correcções críticas ao motor v3", ponto 4) —
    // o fundador identificou sobreposição de rótulos perto do topo da
    // roda. Casas 1, 11 e 12 (as que ficam angularmente próximas nessa
    // zona) passaram a usar uma versão curta de uma só palavra; as
    // outras 9 mantêm o rótulo completo.
    it("CORRECÇÃO 25/08/2026 — casas 1, 11 e 12 usam o rótulo curto de uma palavra (evita sobreposição no topo)", () => {
      const textoAchatado = svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      expect(textoAchatado).toMatch(/\bpresença\b/); // casa 1
      expect(textoAchatado).toMatch(/\brede\b/); // casa 11
      expect(textoAchatado).toMatch(/\bsilêncio\b/); // casa 12
      // as versões longas destas 3 casas já não aparecem no SVG.
      expect(textoAchatado).not.toMatch(/como te\s*apresentas/);
      expect(textoAchatado).not.toMatch(/a rede\s*e os ganhos/);
      expect(textoAchatado).not.toMatch(/o que trabalhas\s*por dentro/);
    });

    it("CORRECÇÃO 4 — a casa-seed (Atmakaraka, casa 10 para a Melina) tem uma marca a brass (#B88A52); nenhuma outra casa tem", () => {
      expect((svg.match(/#B88A52/g) ?? []).length).toBe(2); // 1 marca na roda + 1 na legenda
    });

    it("nenhum planeta aparece dentro da roda — nenhum termo técnico solto (nome de graha em inglês, 'SAV', 'Sarvashtakavarga', 'Atmakaraka' cru)", () => {
      for (const termo of ["Saturn", "Moon", "Jupiter", "Venus", "Mars", "Mercury", "Rahu", "Ketu", "SAV", "Sarvashtakavarga", "Atmakaraka"]) {
        expect(svg).not.toContain(termo);
      }
    });

    it("inclui uma legenda com as 5 categorias visuais (4 do apoio/presença + a marca de tema central)", () => {
      expect(svg).toMatch(/mais apoio/);
      expect(svg).toMatch(/apoio médio/);
      expect(svg).toMatch(/menos apoio/);
      expect(svg).toMatch(/ocupada/);
      expect(svg).toMatch(/tema central/);
    });

    it("declara honestamente a ausência de SAV fiável em vez de desenhar a roda, quando sav.fiavel é false", () => {
      const camadaSemSav = { ...camada, sav: { ...camada.sav, fiavel: false } };
      const svgAusente = construirRodaCasas(camadaSemSav);
      expect(svgAusente).toMatch(/não tem Sarvashtakavarga fiável/);
      expect((svgAusente.match(/<path d="M/g) ?? []).length).toBe(0);
    });
  });

  describe("construirConvergenciaEspinha", () => {
    const svg = construirConvergenciaEspinha(camada, espinha);

    it("devolve um SVG válido, bem formado", () => {
      expect(svg).toMatch(/^<svg viewBox="0 0 \d+ [\d.]+" xmlns="http:\/\/www\.w3\.org\/2000\/svg">/);
      expect(svg.trim().endsWith("</svg>")).toBe(true);
    });

    it("desenha uma linha de convergência por cada camada confirmante (5 para a Melina)", () => {
      expect(espinha.camadasConfirmantes.length).toBeGreaterThanOrEqual(4); // convergência forte, já confirmado noutro teste
      const linhas = (svg.match(/<path d="M\d/g) ?? []).length;
      expect(linhas).toBe(espinha.camadasConfirmantes.length);
    });

    it("o ponto de convergência mostra a área de vida da espinha (casa 10 — carreira), em linguagem Naveya, nunca 'casa 10' cru", () => {
      expect(svg).toMatch(/lugar público, a carreira/);
      expect(svg).not.toMatch(/casa 10/i);
      expect(svg).not.toMatch(/casa-10/i);
    });

    it("nenhum nome técnico das 9 camadas (Atmakaraka, Karakamsha, Sarvashtakavarga...) aparece cru — usa PAPEL_CAMADA", () => {
      for (const termo of ["Atmakaraka", "Karakamsha", "Sarvashtakavarga", "Vargottama"]) {
        expect(svg).not.toContain(termo);
      }
    });

    it("declara honestamente a ausência de espinha, sem inventar convergência, quando o desfecho é 'ausencia-declarada'", () => {
      const espinhaVazia = { ...espinha, camadasConfirmantes: [], desfecho: { tipo: "ausencia-declarada" as const, motivo: "teste" } };
      const svgVazio = construirConvergenciaEspinha(camada, espinhaVazia);
      expect(svgVazio).toMatch(/não tem uma espinha de convergência/);
      expect((svgVazio.match(/<path d="M\d/g) ?? []).length).toBe(0);
    });
  });
});
