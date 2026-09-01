import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao14UltimaCoisa, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao14UltimaCoisa — Secção 14 (condicional), carta da Melina", () => {
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

  it("está activa para a Melina — Júpiter (dignidade Own, forte) ocupa a casa 12", () => {
    const prompt = construirPromptSeccao14UltimaCoisa(camada, espinha, dados);
    expect(prompt).not.toBeNull();
  });

  it("devolve null quando nenhuma das 4 condições de activação se verifica", () => {
    const camadaSemApoio = {
      ...camada,
      dignidades: {
        ...camada.dignidades,
        Jupiter: { classica: "Neutral" as const, panchadha: "sama" as const },
        Mercury: { classica: "Neutral" as const, panchadha: "sama" as const },
      },
      avasthas: { ...camada.avasthas, Jupiter: "Bala" as const, Mercury: "Bala" as const },
      figurasFechadas: [],
      slowTransits: camada.slowTransits.map((t) => ({ ...t, contactosNatal: [] })),
    };
    const prompt = construirPromptSeccao14UltimaCoisa(camadaSemApoio, espinha, dados);
    expect(prompt).toBeNull();
  });

  describe("com a condição activa (Melina — casa 12, Júpiter)", () => {
    const prompt = construirPromptSeccao14UltimaCoisa(camada, espinha, dados)!;

    it("escolhe o sabor 'trabalho interior' (casa 12), não 'mentor' (casa 9, vazia para a Melina)", () => {
      expect(prompt).toMatch(/o trabalho interior tem suporte/);
      expect(prompt).not.toMatch(/um mentor ou guia externo é útil/);
    });

    it("usa Júpiter (o planeta forte na casa 12) e a casa 12 como sinais", () => {
      expect(prompt).toMatch(/o apoio externo — força instalada no que fica escondido, o trabalho invisível e o descanso: Jupiter/);
      expect(prompt).toMatch(/a área que sustenta este apoio — o que fica escondido, o trabalho invisível, o descanso: casa-12/);
    });

    it("inclui a figura fechada que liga Mercúrio (também na casa 12) ao resto da carta", () => {
      expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Sextil Moon–Rahu/);
    });

    it("proíbe explicitamente prescrever um profissional específico", () => {
      for (const termo of ["psicólogo", "médico", "coach", "terapeuta"]) {
        expect(prompt).toContain(termo);
      }
      expect(prompt).toMatch(/nunca o título profissional/);
    });

    it("exige exactamente 1 parágrafo", () => {
      expect(prompt).toMatch(/Exactamente 1 parágrafo de prosa corrida — nunca mais/);
    });

    it("liga-se à espinha, sem a repetir fora do contexto", () => {
      expect(prompt).toMatch(/A espinha — ligação subtil quando possível, nunca forçada/);
      expect(prompt).toMatch(/o lugar público, a carreira e o nome pelo qual é conhecida/);
    });

    it("tom íntimo e não prescritivo, declarado explicitamente", () => {
      expect(prompt).toMatch(/Íntimo, não prescritivo/);
      expect(prompt).toMatch(/nunca a "devias fazer isto"/);
    });

    it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
      expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
    });
  });
});
