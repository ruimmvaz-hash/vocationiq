import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptAnexoA, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptAnexoA — Retrato de Personalidade, carta da Melina", () => {
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
  const prompt = construirPromptAnexoA(camada, espinha, dados);

  it("estrutura os 3 blocos + fecho, nesta ordem", () => {
    const i1 = prompt.indexOf("**Como pensa e processa**");
    const i2 = prompt.indexOf("**Como sente e reage**");
    const i3 = prompt.indexOf("**Como age no mundo**");
    const i4 = prompt.indexOf("**Fecho**");
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
  });

  it("o Bloco 1 usa Mercúrio, a nakshatra Mula ('a raiz que não aceita a superfície') e a casa 12", () => {
    expect(prompt).toMatch(/o estilo cognitivo — como esta pessoa processa e organiza o pensamento: Mercury/);
    expect(prompt).toMatch(/TERMO A ESCREVER NO TEXTO: a raiz que não aceita a superfície/);
    expect(prompt).toMatch(/a área de vida onde este estilo cognitivo se aplica primeiro: casa-12/);
  });

  it("o Bloco 2 usa a Lua, a nakshatra Punarvasu ('o regresso da luz') e a casa 7", () => {
    expect(prompt).toMatch(/o padrão emocional — como reage ao stress, ao conflito, ao que não controla: Moon/);
    expect(prompt).toMatch(/TERMO A ESCREVER NO TEXTO: o regresso da luz/);
    expect(prompt).toMatch(/a área de vida onde este padrão emocional se instala: casa-7/);
  });

  it("o Bloco 3 usa Marte, o Ascendente (casa 1) e a avastha de Marte (Bala)", () => {
    expect(prompt).toMatch(/o padrão de acção — como inicia, como persiste, como desiste: Mars/);
    expect(prompt).toMatch(/o Ascendente — a porta de entrada no mundo, onde este padrão de acção se mostra primeiro: casa-1/);
    expect(prompt).toMatch(/a maturidade deste padrão de acção neste momento da vida: Bala/);
  });

  it("inclui figuras fechadas que envolvem Mercúrio, Lua, Marte ou o Ascendente (as 5 da Melina tocam pelo menos um destes)", () => {
    const ocorrencias = (prompt.match(/CONTEXTO ADICIONAL/g) ?? []).length;
    expect(ocorrencias).toBe(5);
  });

  it("proíbe o clichê de abertura 'és uma pessoa que'", () => {
    expect(prompt).toMatch(/Nunca abra com "és uma pessoa que/);
  });

  it("instrui explicitamente a nunca repetir a Secção 4, e a nunca diagnosticar", () => {
    expect(prompt).toMatch(/NUNCA repetir a mesma frase ou observação/);
    expect(prompt).toMatch(/nunca diagnóstico/);
    expect(prompt).toMatch(/nunca use linguagem clínica/);
  });

  it("aceita um resumo opcional da Secção 4 para não repetir", () => {
    const comResumo = construirPromptAnexoA(camada, espinha, dados, "Resumo: disciplina de Saturno no centro, Ascendente Capricórnio.");
    expect(comResumo).toMatch(/O que a Secção 4 \(Quem és\) já disse — aprofundar, nunca repetir/);
    expect(comResumo).toContain("Resumo: disciplina de Saturno no centro");
  });

  it("máximo 6 parágrafos, declarado explicitamente", () => {
    expect(prompt).toMatch(/[Mm]áximo 6 parágrafos/);
  });

  it("instrui que as nakshatras usam o nome evocativo, nunca a transliteração em sânscrito", () => {
    expect(prompt).toMatch(/As nakshatras usam o NOME EVOCATIVO dado no sinal \(nunca a transliteração em sânscrito\)/);
  });

  it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
    expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
  });
});
