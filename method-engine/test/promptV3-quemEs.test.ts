import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao4QuemEs, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import { NOME_SIGNO_PT } from "../src/v3/linguagem-naveya.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao4QuemEs — Secção 4, carta da Melina", () => {
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
  const prompt = construirPromptSeccao4QuemEs(camada, espinha, dados);

  it("começa pelo Atmakaraka (o ponto de entrada natural)", () => {
    expect(prompt).toMatch(/Comece pelo Atmakaraka/);
    expect(prompt).toContain("SINAL: Atmakaraka");
  });

  it("define os 3 blocos claramente, com limites de parágrafo", () => {
    expect(prompt).toMatch(/Bloco 1 — O núcleo \(2 a 3 parágrafos\)/);
    expect(prompt).toMatch(/Bloco 2 — Como isso se manifesta \(2 parágrafos\)/);
    expect(prompt).toMatch(/Bloco 3 — O que isto significa \(1 parágrafo\)/);
    expect(prompt).toMatch(/[Mm]áximo 6 parágrafos/);
  });

  it("proíbe a abertura genérica 'és uma pessoa que'", () => {
    expect(prompt).toMatch(/Nunca abra com "és uma pessoa que/);
  });

  it("distingue explicitamente de secção 9 — fala de dentro para fora, nunca do que os outros vêem primeiro", () => {
    expect(prompt).toMatch(/os outros vêem primeiro/);
    expect(prompt).toMatch(/DENTRO PARA FORA/);
  });

  it("inclui sinais da Lua e da nakshatra (por proximidade do regente, gap documentado)", () => {
    expect(prompt).toMatch(/SINAL:.*: Moon/);
    expect(prompt).toMatch(/aproximação pelo regente clássico da nakshatra/);
  });

  it("instrui a nunca repetir a espinha, só aprofundar", () => {
    expect(prompt).toMatch(/[Nn]ão repita esta frase/);
  });

  it("aceita um resumo do Retrato 60s para não repetir", () => {
    const comResumo = construirPromptSeccao4QuemEs(camada, espinha, dados, "Resumo do retrato: disciplina paga carreira; auto-apresentação fraca; rede paga mais que prospecção.");
    expect(comResumo).toMatch(/O que o Retrato em 60 Segundos já disse — aprofundar, nunca repetir/);
  });

  it("cita as regras de escrita 1, 2, 3, 8, 13, 16, 18", () => {
    for (const regra of ["Regra 1", "Regra 2", "Regra 3", "Regra 8", "Regra 13", "Regra 16", "Regra 18"]) {
      expect(prompt).toContain(regra);
    }
  });

  // ACRESCENTADO 25/08/2026 ("Correcções críticas ao motor v3", ponto 5)
  // — o Karakamsha estava calculado desde o início da sessão mas nunca
  // citado em nenhum prompt.
  it("inclui o sinal do Karakamsha (signo do Atmakaraka no D-9), com o nome do signo em português", () => {
    expect(prompt).toMatch(/SINAL: Karakamsha \(signo do Atmakaraka no D-9\)/);
    expect(prompt).toContain(`TERMO A ESCREVER NO TEXTO: ${NOME_SIGNO_PT[camada.karakas.atmakarakaD9Sign]}`);
  });
});
