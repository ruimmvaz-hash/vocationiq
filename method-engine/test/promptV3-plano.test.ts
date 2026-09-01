import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao12Plano, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao12Plano — Secção 12 (reconstruída 23/08/2026), carta da Melina", () => {
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
  const relogioFake = "[texto de exemplo da secção 11, para o teste]";
  const prompt = construirPromptSeccao12Plano(camada, espinha, dados, veredictoFake, relogioFake);

  it("inclui o veredicto e o relógio recebidos, sem os recalcular", () => {
    expect(prompt).toContain(veredictoFake);
    expect(prompt).toContain(relogioFake);
    expect(prompt).toMatch(/não recalcular o timing, só aplicá-lo/);
  });

  it("estrutura os 5 elementos obrigatórios, nesta ordem: introdução, tabela, menu, teste de filtro, o que não fazer", () => {
    const i1 = prompt.indexOf("**Introdução**");
    const i2 = prompt.indexOf("**A tabela de 90 dias**");
    const i3 = prompt.indexOf("**O menu de propostas**");
    const i4 = prompt.indexOf("**O teste de filtro**");
    const i5 = prompt.indexOf("**O QUE NÃO FAZER**");
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
    expect(i5).toBeGreaterThan(i4);
  });

  it("pede uma tabela real (Regra 20), não prosa a fingir de tabela", () => {
    expect(prompt).toMatch(/QUANDO \| O QUE FAZER \| COM QUE DEPENDE/);
    expect(prompt).toMatch(/Nunca prosa a fingir de tabela/);
  });

  it("pede um menu de 8 a 10 propostas nomeadas, com nota de ordenação e instrução de não fazer todas", () => {
    expect(prompt).toMatch(/8 a 10 propostas concretas e NOMEADAS/);
    expect(prompt).toMatch(/não são para fazer todas — é o menu de onde a escolha sai/);
  });

  it("o menu cruza os dois talentos (Atmakaraka e Amatyakaraka) com as áreas de dinheiro/carreira/parcerias", () => {
    expect(prompt).toMatch(/o motor central desta pessoa \(o mesmo da espinha\): Saturn/);
    expect(prompt).toMatch(/o que mais mobiliza para a carreira, depois do primeiro: /);
    for (const casa of [2, 7, 10, 11]) {
      expect(prompt).toMatch(new RegExp(`uma área possível para o menu.*: casa-${casa}`));
    }
  });

  it("o teste de filtro tem exactamente 3 perguntas fixas, sempre na ordem motor/território/operação", () => {
    expect(prompt).toMatch(/exactamente 3 perguntas fixas, sempre pela mesma ordem — motor, território, operação/);
    expect(prompt).toMatch(/PERGUNTA 1 do teste de filtro — o motor/);
    expect(prompt).toMatch(/PERGUNTA 2 do teste de filtro — o território/);
    expect(prompt).toMatch(/PERGUNTA 3 do teste de filtro — a operação/);
  });

  it("para a Melina, a pergunta do território usa a casa de maior apoio (10, SAV 36)", () => {
    expect(prompt).toMatch(/PERGUNTA 2 do teste de filtro — o território.*: casa-10/);
  });

  it("o bloco 'o que não fazer' continua sempre presente e nunca opcional", () => {
    expect(prompt).toMatch(/SEMPRE presente, nunca omitido/);
  });

  it("para a Melina, as casas de apoio mínimo (1, 3, 7 — todas SAV 22) continuam a ancorar 'o que não fazer'", () => {
    for (const casa of [1, 3, 7]) {
      expect(prompt).toMatch(new RegExp(`a área de vida com menos apoio agora — onde o mesmo esforço rende menos, nunca onde falta capacidade: casa-${casa}`));
    }
  });

  it("ancora a tabela no período pessoal actual (Jupiter) e no trânsito de era (Plutão)", () => {
    expect(prompt).toMatch(/o período pessoal em curso.*: Jupiter/);
    expect(prompt).toMatch(/o trânsito de era em curso \(Plutão em posição crítica\).*: Pluto/);
  });

  it("proíbe explicitamente os clichés de coaching genérico", () => {
    for (const cliche of ["trabalha o teu potencial", "investe em ti", "sai da zona de conforto"]) {
      expect(prompt).toContain(cliche);
    }
    expect(prompt).toMatch(/Clichés proibidos/);
  });

  it("cita Regra 7 (capacidade vs retorno) para o bloco 'o que não fazer'", () => {
    expect(prompt).toMatch(/Regra 7: quando uma área tem pouco apoio, diga primeiro que a capacidade está intacta/);
  });

  it("cita a Regra 20 (plano é uma tabela) sem contradizer o formato de saída pedido (correcção da contradição encontrada em 5.2)", () => {
    expect(prompt).toContain("Regra 20");
    expect(prompt).toMatch(/a tabela de 90 dias, em formato de tabela real/);
  });

  it("cita a Regra 19a (datas só ao mês)", () => {
    expect(prompt).toContain("Regra 19a");
  });

  // Adição de 23/08/2026, depois da aprovação inicial: o menu recebe o
  // contexto profissional real do cliente, para não ficar genérico.
  it("inclui o contexto profissional real do cliente (profissão, situação, contexto adicional) para calibrar o menu", () => {
    expect(prompt).toMatch(/CONTEXTO PROFISSIONAL DO CLIENTE:/);
    expect(prompt).toMatch(/Profissão: Esteticista/);
    expect(prompt).toMatch(/Situação actual: Como é que eu faço para ganhar dinheiro\?/);
    expect(prompt).toMatch(/as propostas do menu devem ser calibradas pela profissão e situação reais do cliente — não genéricas/);
  });

  it("quando additionalContext não é fornecido, declara isso honestamente em vez de inventar", () => {
    expect(prompt).toMatch(/Contexto adicional: \(não fornecido\)/);
  });

  it("quando additionalContext é fornecido, aparece literalmente no prompt", () => {
    const dadosComContexto: DadosClienteV3 = { ...dados, additionalContext: "Trabalha num salão partilhado, quer sair sozinha em 2027." };
    const promptComContexto = construirPromptSeccao12Plano(camada, espinha, dadosComContexto, veredictoFake, relogioFake);
    expect(promptComContexto).toContain("Contexto adicional: Trabalha num salão partilhado, quer sair sozinha em 2027.");
  });
});
