import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao3Veredicto, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao3Veredicto — Secção 3, carta da Melina", () => {
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
  const prompt = construirPromptSeccao3Veredicto(camada, espinha, dados);

  it("cita a pergunta declarada, enquadrada", () => {
    expect(prompt).toContain(dados.mainQuestion);
    expect(prompt.toLowerCase()).toMatch(/pergunta que nos trouxeste/);
  });

  it("inclui a espinha e a instrução de nunca a repetir/contradizer", () => {
    expect(prompt).toContain(espinha.desfecho.tipo === "convergencia" ? espinha.desfecho.afirmacao : "");
    expect(prompt).toMatch(/NUNCA repetir literalmente/);
    expect(prompt).toMatch(/NUNCA contradizer/);
  });

  it("inclui o nível de confiança vindo da CamadaA (convergência forte para a Melina), nunca deixado ao LLM inventar", () => {
    expect(prompt).toMatch(/convergencia-forte/);
    expect(prompt).toMatch(/nunca invente/);
  });

  it("os sinais têm sempre as 3 partes (SINAL / DEFINIÇÃO NAVEYA / INSTRUÇÃO)", () => {
    expect(prompt).toContain("SINAL:");
    expect(prompt).toContain("DEFINIÇÃO NAVEYA:");
    expect(prompt).toContain("INSTRUÇÃO:");
  });

  it("a dignidade do Atmakaraka (Saturno exaltado) resolve para um sinal real, não fica em falta", () => {
    // Regressão do bug encontrado ao escrever este prompt: dign.classica.toLowerCase() nunca batia com as chaves de DEFINICOES_DIGNIDADE_CLASSICA.
    expect(prompt).toMatch(/melhor estado possível/);
  });

  it("instrui explicitamente que termos técnicos são permitidos, sempre acompanhados da definição Naveya (correcção 23/08/2026)", () => {
    expect(prompt).toMatch(/Pode nomear planetas, signos, "casa" seguido de número/);
    expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
  });

  it("pede máximo 3 parágrafos e resposta directa, nunca 'depende'", () => {
    expect(prompt).toMatch(/[Mm]áximo 3 parágrafos/);
    expect(prompt.toLowerCase()).toMatch(/não esquive/);
  });

  it("cita pelo menos as regras de escrita 2, 9, 10, 13, 14, 18, 19a, 20a", () => {
    for (const regra of ["Regra 2", "Regra 9", "Regra 10", "Regra 13", "Regra 14", "Regra 18", "Regra 19a", "Regra 20a"]) {
      expect(prompt).toContain(regra);
    }
  });
});
