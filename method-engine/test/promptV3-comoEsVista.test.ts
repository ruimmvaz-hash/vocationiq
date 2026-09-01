import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao9ComoEsVista, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao9ComoEsVista — Secção 9, carta da Melina", () => {
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
  const prompt = construirPromptSeccao9ComoEsVista(camada, espinha, dados);

  it("estrutura os 3 blocos, nesta ordem", () => {
    const i1 = prompt.indexOf("**O que os outros percebem**");
    const i2 = prompt.indexOf("**O que decide o preço**");
    const i3 = prompt.indexOf("**O que ainda pode trabalhar**");
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
  });

  it("o Bloco 1 usa a casa 1 — e, para a Melina, o regente do Ascendente é o próprio Atmakaraka (Saturno rege Capricórnio), por isso omite o sinal duplicado", () => {
    expect(prompt).toMatch(/a primeira impressão — o que chega antes da conversa: casa-1/);
    const iBloco1 = prompt.indexOf("## Sinais para o Bloco 1");
    const iBloco2 = prompt.indexOf("## Sinais para o Bloco 2");
    const bloco1 = prompt.slice(iBloco1, iBloco2);
    expect(bloco1).not.toMatch(/quem comanda essa primeira impressão/);
  });

  it("o Bloco 2 nomeia o Atmakaraka e a casa 10 como o que decide o preço, e liga-se à espinha", () => {
    expect(prompt).toMatch(/o que decide o preço — o motor central desta pessoa \(o mesmo da espinha\): Saturn/);
    expect(prompt).toMatch(/o que decide o preço — o lugar público e a carreira: casa-10/);
    expect(prompt).toMatch(/A espinha — o Bloco 2 tem de se ligar a isto/);
    expect(prompt).toMatch(/o lugar público, a carreira e o nome pelo qual é conhecida/);
  });

  it("o Bloco 2 inclui a única figura fechada que toca o Atmakaraka ou os ocupantes da casa 10 (Saturno-Rahu-Marte), nunca as outras 4", () => {
    expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Saturn–Rahu/);
    expect(prompt).not.toMatch(/Moon–Venus/);
    expect(prompt).not.toMatch(/Sextil Moon–Rahu/);
  });

  it("o Bloco 3 usa as casas fracas entre 1/7/10 — para a Melina, casas 1 e 7 (SAV 22 cada); a casa 10 é forte e não entra", () => {
    const iBloco3 = prompt.indexOf("## Sinais para o Bloco 3");
    const iRegras = prompt.indexOf("## Regras de escrita");
    const bloco3 = prompt.slice(iBloco3, iRegras);
    expect(bloco3).toMatch(/o que ainda pode trabalhar — apoio baixo aqui, capacidade intacta, falta alavanca: casa-1/);
    expect(bloco3).toMatch(/o que ainda pode trabalhar — apoio baixo aqui, capacidade intacta, falta alavanca: casa-7/);
    expect(bloco3).not.toMatch(/casa-10/);
  });

  it("proíbe explicitamente os clichés de elogio genérico", () => {
    for (const cliche of ["és especial", "és única"]) {
      expect(prompt).toContain(cliche);
    }
    expect(prompt).toMatch(/Clichés proibidos/);
  });

  it("máximo 4 parágrafos, declarado explicitamente", () => {
    expect(prompt).toMatch(/[Mm]áximo 4 parágrafos/);
  });

  it("declara o critério que manda desta secção — 'como és vista' sozinho reprova", () => {
    expect(prompt).toMatch(/"como és vista" sozinho reprova/);
  });

  it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
    expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
  });

  // ACRESCENTADO 25/08/2026 ("Correcções críticas ao motor v3", ponto 5)
  it("inclui o sinal da Arudha Lagna (imagem pública)", () => {
    expect(prompt).toMatch(/SINAL: Arudha Lagna \(AL\) — imagem pública/);
    expect(prompt).toContain("TERMO A ESCREVER NO TEXTO: Arudha Lagna");
  });
});
