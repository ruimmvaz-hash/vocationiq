import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao5FormaDeVida, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao5FormaDeVida — Secção 5, carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
  const espinha = derivarEspinha(camada);
  const dados: DadosClienteV3 = {
    nomeCliente: "Melina",
    dataNascimentoFormatada: "11 de Dezembro de 1984",
    horaNascimentoFormatada: "08:30",
    localNascimento: "São Paulo, Brasil",
    residenciaActual: "São Paulo, Brasil",
    profissao: "Esteticista",
    mainQuestion: "Como é que eu faço para ganhar dinheiro?",
    situacaoDeclarada: "Como é que eu faço para ganhar dinheiro?",
  };

  it("gera a secção quando sav.fiavel é true", () => {
    expect(camada.sav.fiavel).toBe(true);
    const prompt = construirPromptSeccao5FormaDeVida(camada, espinha, dados);
    expect(prompt).not.toBeNull();
    expect(typeof prompt).toBe("string");
  });

  it("devolve null (não gera) quando sav.fiavel é false, sem lançar erro", () => {
    const camadaSemSav = { ...camada, sav: { ...camada.sav, fiavel: false } };
    const prompt = construirPromptSeccao5FormaDeVida(camadaSemSav, espinha, dados);
    expect(prompt).toBeNull();
  });

  describe("com sav.fiavel = true", () => {
    const prompt = construirPromptSeccao5FormaDeVida(camada, espinha, dados)!;

    it("estrutura os 5 blocos obrigatórios, nesta ordem", () => {
      const i1 = prompt.indexOf("**Introdução**");
      const i2 = prompt.indexOf("**Grupo 1 — onde fluir**");
      const i3 = prompt.indexOf("**Grupo 2 — onde equilibrar**");
      const i4 = prompt.indexOf("**Grupo 3 — onde o esforço custa mais**");
      const i5 = prompt.indexOf("**Fecho**");
      expect(i1).toBeGreaterThan(-1);
      expect(i2).toBeGreaterThan(i1);
      expect(i3).toBeGreaterThan(i2);
      expect(i4).toBeGreaterThan(i3);
      expect(i5).toBeGreaterThan(i4);
    });

    it("para a Melina, o Grupo 1 (forte) tem as casas 5, 9, 10, 11 traduzidas em Naveya", () => {
      expect(prompt).toMatch(/o que crias por prazer/); // casa 5
      expect(prompt).toMatch(/o que te expande/); // casa 9
      expect(prompt).toMatch(/a carreira e o nome/); // casa 10
      expect(prompt).toMatch(/a rede e os ganhos/); // casa 11
    });

    it("para a Melina, o Grupo 3 (fraco) tem as casas 1, 3, 7, 12 traduzidas em Naveya", () => {
      expect(prompt).toMatch(/como te apresentas/); // casa 1
      expect(prompt).toMatch(/como comunicas/); // casa 3
      expect(prompt).toMatch(/os acordos e parcerias/); // casa 7
      expect(prompt).toMatch(/o que trabalhas por dentro/); // casa 12
    });

    it("liga explicitamente a espinha ao grupo que contém a casa-seed (casa 10, forte, para a Melina)", () => {
      const iGrupo1 = prompt.indexOf("## Grupo 1");
      const iGrupo2 = prompt.indexOf("## Grupo 2");
      const blocoGrupo1 = prompt.slice(iGrupo1, iGrupo2);
      expect(blocoGrupo1).toMatch(/é também a espinha deste relatório/);
      expect(blocoGrupo1).toMatch(/a carreira e o nome/);
    });

    it("nunca escreve 'casa' seguido de número em lado nenhum do prompt de conteúdo — só a tradução Naveya", () => {
      // A única excepção aceitável é a própria instrução meta ("Nunca escreva 'casa' seguido de número...") e os títulos "SAV ≥ 32" etc., que não usam a palavra "casa".
      const semInstrucoesMeta = prompt.replace(/Nunca escreva "casa" seguido de número.*?Regra 2\)\./s, "");
      expect(semInstrucoesMeta).not.toMatch(/\bcasa\s*\d+/i);
    });

    it("níveis de confiança: sinal-forte para os grupos forte e fraco, leitura para o médio", () => {
      const iGrupo1 = prompt.indexOf("## Grupo 1");
      const iGrupo2 = prompt.indexOf("## Grupo 2");
      const iGrupo3 = prompt.indexOf("## Grupo 3");
      const iRegras = prompt.indexOf("## Regras de escrita");
      const g1 = prompt.slice(iGrupo1, iGrupo2);
      const g2 = prompt.slice(iGrupo2, iGrupo3);
      const g3 = prompt.slice(iGrupo3, iRegras);
      expect(g1).toMatch(/nunca nomeie o termo técnico no texto/); // instrução do nível de confiança está presente
      expect(g1).toContain("sinal-forte");
      expect(g2).toContain("leitura");
      expect(g3).toContain("sinal-forte");
    });

    it("Regra 7 citada para o grupo fraco — capacidade intacta antes de falta de alavanca", () => {
      expect(prompt).toMatch(/Regra 7: separe sempre capacidade de retorno/);
      expect(prompt).toMatch(/nunca fatalista/i);
    });

    it("instrui a regra específica — 'casa N' nunca aparece, nem com definição", () => {
      expect(prompt).toMatch(/Nunca escreva "casa" seguido de número, em nenhuma frase — nem mesmo acompanhado de definição/);
    });
  });
});
