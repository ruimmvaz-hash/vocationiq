import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao10SobreOQue, seccao10Activa, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import { NOME_SIGNO_PT } from "../src/v3/linguagem-naveya.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao10SobreOQue — Secção 10 (condicional), carta da Melina", () => {
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

  describe("seccao10Activa — detector de condição", () => {
    it("está activa para a Melina — a pergunta contém 'faço' (conjugação de 'fazer', dimensão vocacional)", () => {
      expect(seccao10Activa(dados)).toBe(true);
    });

    it("fica inactiva para uma pergunta de dinheiro puro, sem dimensão vocacional/timing/relação", () => {
      const dadosDinheiroPuro: DadosClienteV3 = { ...dados, mainQuestion: "Vou ficar rica?", situacaoDeclarada: "Vou ficar rica?" };
      expect(seccao10Activa(dadosDinheiroPuro)).toBe(false);
    });

    it("fica activa para perguntas explicitamente vocacionais (carreira, área, caminho, propósito)", () => {
      for (const pergunta of ["Devo mudar de carreira?", "Qual é a minha área?", "Qual é o meu caminho?", "Qual é o meu propósito?"]) {
        expect(seccao10Activa({ ...dados, mainQuestion: pergunta, situacaoDeclarada: pergunta })).toBe(true);
      }
    });
  });

  it("devolve null quando a pergunta não sustenta a análise", () => {
    const dadosSemVocacao: DadosClienteV3 = { ...dados, mainQuestion: "Vou ficar rica?", situacaoDeclarada: "Vou ficar rica?" };
    expect(construirPromptSeccao10SobreOQue(camada, espinha, dadosSemVocacao)).toBeNull();
  });

  describe("com a condição activa (Melina)", () => {
    const prompt = construirPromptSeccao10SobreOQue(camada, espinha, dados)!;

    it("não é null", () => {
      expect(prompt).not.toBeNull();
    });

    it("estrutura Bloco A, Bloco B e fecho, nesta ordem", () => {
      const iA = prompt.indexOf("**Sobre o quê**");
      const iB = prompt.indexOf("**Em que forma**");
      const iF = prompt.indexOf("**Fecho**");
      expect(iA).toBeGreaterThan(-1);
      expect(iB).toBeGreaterThan(iA);
      expect(iF).toBeGreaterThan(iB);
    });

    it("o Bloco A usa o Atmakaraka, as casas 5/9/10, e o regente da casa 10 (Vénus — distinto do Atmakaraka, Saturno)", () => {
      expect(prompt).toMatch(/o território de actuação — o motor central desta pessoa \(o mesmo da espinha\): Saturn/);
      expect(prompt).toMatch(/um território possível — o que cria por gosto próprio: casa-5/);
      expect(prompt).toMatch(/um território possível — o sentido e aquilo em que acredita: casa-9/);
      expect(prompt).toMatch(/um território possível — o lugar público e a carreira: casa-10/);
      expect(prompt).toMatch(/quem comanda o território da carreira: Venus/);
    });

    it("o Bloco B usa a casa 6 e Mercúrio, e inclui as 2 figuras fechadas que tocam Mercúrio", () => {
      expect(prompt).toMatch(/o formato de trabalho diário que a carta sustenta: casa-6/);
      expect(prompt).toMatch(/como esta pessoa processa e negoceia o mundo — sozinha ou por acordo, estruturado ou livre: Mercury/);
      expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Sextil Moon–Rahu/);
      expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Sextil Mercury–MC/);
    });

    it("proíbe explicitamente frases de destino e profissões concretas", () => {
      expect(prompt).toContain("o teu destino é");
      expect(prompt).toContain("nasceste para");
      expect(prompt).toMatch(/nunca um nome de profissão concreto|profissão concreto/);
    });

    it("cita a Regra 13 (nunca 'o teu destino é')", () => {
      expect(prompt).toMatch(/Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa — nunca "o teu destino é"/);
    });

    it("máximo 4 parágrafos, declarado explicitamente", () => {
      expect(prompt).toMatch(/[Mm]áximo 4 parágrafos/);
    });

    it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
      expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
    });

    // ACRESCENTADO 25/08/2026 ("Correcções críticas ao motor v3", ponto 5)
    it("inclui o sinal do Karakamsha no Bloco A (território de actuação)", () => {
      expect(prompt).toMatch(/SINAL: Karakamsha \(signo do Atmakaraka no D-9\)/);
      expect(prompt).toContain(`TERMO A ESCREVER NO TEXTO: ${NOME_SIGNO_PT[camada.karakas.atmakarakaD9Sign]}`);
    });
  });
});
