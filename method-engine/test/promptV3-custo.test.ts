import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao13Custo, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao13Custo — Secção 13, carta da Melina", () => {
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
  const veredictoFake = "[texto de exemplo da secção 3, para o teste]";
  const planoFake = "[texto de exemplo da secção 12, para o teste]";
  const prompt = construirPromptSeccao13Custo(camada, espinha, dados, veredictoFake, planoFake);

  it("inclui o veredicto e o plano recebidos, sem os recalcular", () => {
    expect(prompt).toContain(veredictoFake);
    expect(prompt).toContain(planoFake);
  });

  it("exige exactamente 2 parágrafos, nunca mais nem menos", () => {
    expect(prompt).toMatch(/Exactamente 2 parágrafos\. Nem mais, nem menos\./);
    expect(prompt).toMatch(/Exactamente 2 parágrafos de prosa corrida/);
  });

  it("estrutura os 2 parágrafos — o padrão que continua, e a janela que passa", () => {
    expect(prompt).toMatch(/Parágrafo 1 — o padrão que continua/);
    expect(prompt).toMatch(/Parágrafo 2 — o momento que passa/);
  });

  it("para a Melina, o bloqueio principal usa a primeira casa com SAV < 25 (casa 1, SAV 22 — o mesmo gatilho já usado na Secção 1)", () => {
    expect(prompt).toMatch(/o bloqueio principal — capacidade intacta, falta alavanca: casa-1/);
  });

  it("a janela usa a antardasha actual (Jupiter) e o que vem a seguir (Saturn), com data só ao mês", () => {
    expect(prompt).toMatch(/a janela deste período pessoal.*: Jupiter/);
    expect(prompt).toMatch(/o que substitui esta janela quando ela fechar: Saturn/);
    expect(prompt).toMatch(/Esta janela vai até Setembro de 2026/);
  });

  it("proíbe explicitamente frases fatalistas ou manipuladoras", () => {
    for (const frase of ["vai correr mal", "vai falhar", "não há outra hipótese", "última oportunidade"]) {
      expect(prompt).toContain(frase);
    }
    expect(prompt).toMatch(/Frases fatalistas ou manipuladoras proibidas/);
  });

  it("instrui explicitamente que a última frase aponta para a acção, nunca deixa ansiedade", () => {
    expect(prompt).toMatch(/TERMINA com uma frase que aponta para a acção/);
    expect(prompt).toMatch(/nunca deixe a pessoa num estado de ansiedade/);
  });

  it("nunca trata a janela como 'agora ou nunca'", () => {
    expect(prompt).toMatch(/Não escreva isto como "agora ou nunca"/);
  });

  it("cita as regras de escrita 6, 7, 13, 18, 19a", () => {
    for (const regra of ["Regra 6", "Regra 7", "Regra 13", "Regra 18", "Regra 19a"]) {
      expect(prompt).toContain(regra);
    }
  });
});
