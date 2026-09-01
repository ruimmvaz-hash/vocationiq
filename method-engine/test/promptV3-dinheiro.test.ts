import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao8Dinheiro, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao8Dinheiro — Secção 8, carta da Melina", () => {
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
  const prompt = construirPromptSeccao8Dinheiro(camada, espinha, dados);

  it("estrutura os 3 blocos + fecho, nesta ordem", () => {
    const i1 = prompt.indexOf("**O dom natural**");
    const i2 = prompt.indexOf("**O contexto de mercado**");
    const i3 = prompt.indexOf("**O que pode travar a conversão**");
    const i4 = prompt.indexOf("**Fecho**");
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
  });

  it("liga o Bloco 1 à espinha obrigatoriamente", () => {
    expect(prompt).toMatch(/A espinha — o Bloco 1 tem de se ligar a isto/);
    expect(prompt).toMatch(/o lugar público, a carreira e o nome pelo qual é conhecida/);
  });

  it("o Bloco 1 usa o Atmakaraka (Saturn, motor central) e as casas 2, 10, 11", () => {
    expect(prompt).toMatch(/o motor central desta pessoa \(o mesmo da espinha\): Saturn/);
    expect(prompt).toMatch(/o que possui e como fala do seu valor: casa-2/);
    expect(prompt).toMatch(/o lugar público e a carreira: casa-10/);
    expect(prompt).toMatch(/os ganhos e a rede: casa-11/);
  });

  it("inclui a dignidade do Atmakaraka (exaltação, para a Melina) no Bloco 1", () => {
    expect(prompt).toMatch(/a força do dom natural no signo que ocupa: exaltacao/);
  });

  it("o Bloco 2 usa o contexto profissional real do cliente e as casas 7/10", () => {
    expect(prompt).toMatch(/Profissão: Esteticista/);
    expect(prompt).toMatch(/Situação actual: Como é que eu faço para ganhar dinheiro\?/);
    expect(prompt).toMatch(/onde este dom se vende — os acordos e quem está do outro lado: casa-7/);
  });

  it("o Bloco 2 inclui figuras fechadas que tocam o Atmakaraka, o Amatyakaraka ou os ocupantes das casas 7/10 (4 das 5 figuras da Melina, todas ligadas a Saturno ou à Lua)", () => {
    expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Saturn–Rahu/);
    expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Moon–Venus/);
    // a figura Mercury-MC-Rahu não toca nem o Atmakaraka nem o Amatyakaraka nem os ocupantes de 7/10 — não deve aparecer
    expect(prompt).not.toMatch(/Sextil Mercury–MC/);
  });

  it("o Bloco 3 usa a única casa financeira em banda fraca para a Melina (casa 7, SAV 22)", () => {
    expect(prompt).toMatch(/o que trava a conversão — apoio baixo aqui, capacidade intacta, falta alavanca: casa-7/);
    // as outras casas financeiras (2, 6, 10, 11) não são fracas — não devem aparecer nesta secção do prompt
    const iBloco3 = prompt.indexOf("## Sinais para o Bloco 3");
    const iRegras = prompt.indexOf("## Regras de escrita");
    const bloco3 = prompt.slice(iBloco3, iRegras);
    expect(bloco3).not.toMatch(/casa-2\b/);
    expect(bloco3).not.toMatch(/casa-10\b/);
    expect(bloco3).not.toMatch(/casa-11\b/);
  });

  it("nunca promete resultado — lista de frases proibidas presente", () => {
    for (const frase of ["tens dinheiro", "vais ganhar bem", "vais ganhar muito"]) {
      expect(prompt).toContain(frase);
    }
    expect(prompt).toMatch(/Frases proibidas — promessa de resultado/);
  });

  it("máximo 5 parágrafos, declarado explicitamente", () => {
    expect(prompt).toMatch(/[Mm]áximo 5 parágrafos/);
  });

  it("cita a Regra 7 (capacidade vs alavanca) para o Bloco 3, e a Regra 13 (nunca prometer resultado)", () => {
    expect(prompt).toMatch(/Regra 7: no bloco 3, separe sempre capacidade de retorno/);
    expect(prompt).toMatch(/Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa nem prometer um resultado/);
  });

  it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
    expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
  });
});
