import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao6OQueTeTemTravado, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao6OQueTeTemTravado — Secção 6 (condicional), carta da Melina", () => {
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

  it("está activa para a Melina — 3 condições verificam-se ao mesmo tempo", () => {
    const prompt = construirPromptSeccao6OQueTeTemTravado(camada, espinha, dados);
    expect(prompt).not.toBeNull();
  });

  it("devolve null quando nenhuma das 3 condições de activação se verifica (SAV uniforme, sem figuras fechadas)", () => {
    const camadaSemBloqueio = {
      ...camada,
      sav: { ...camada.sav, byHouse: camada.sav.byHouse.map((h) => ({ ...h, pontuacao: 28 })) },
      figurasFechadas: [],
    };
    const prompt = construirPromptSeccao6OQueTeTemTravado(camadaSemBloqueio, espinha, dados);
    expect(prompt).toBeNull();
  });

  describe("com a condição activa (Melina)", () => {
    const prompt = construirPromptSeccao6OQueTeTemTravado(camada, espinha, dados)!;

    it("estrutura os 4 elementos da sanduíche, nesta ordem", () => {
      const i1 = prompt.indexOf("## Elemento 1 — sinais do dom que existe");
      const i2 = prompt.indexOf("## Elemento 2 — sinais do bloqueio");
      const i3 = prompt.indexOf("## Elemento 3 — o que muda quando cede");
      const i4 = prompt.indexOf("## Elemento 4 — o primeiro passo");
      expect(i1).toBeGreaterThan(-1);
      expect(i2).toBeGreaterThan(i1);
      expect(i3).toBeGreaterThan(i2);
      expect(i4).toBeGreaterThan(i3);
    });

    it("Elemento 1 usa o Atmakaraka (Saturn) e as 4 casas fortes (5, 9, 10, 11)", () => {
      expect(prompt).toMatch(/o dom que existe — o motor central desta pessoa, um facto da carta, nunca condescendência: Saturn/);
      for (const casa of [5, 9, 10, 11]) {
        expect(prompt).toMatch(new RegExp(`uma área onde esse dom já encontra terreno: casa-${casa}`));
      }
    });

    it("Elemento 2 identifica a casa 7 (fraca, relevante para uma pergunta de dinheiro) e os 4 planetas fortes em casa fraca (Moon, Mars, Venus, Jupiter)", () => {
      const iE2 = prompt.indexOf("## Elemento 2");
      const iE3 = prompt.indexOf("## Elemento 3");
      const bloco = prompt.slice(iE2, iE3);
      expect(bloco).toMatch(/o bloqueio — apoio baixo aqui, capacidade intacta, falta alavanca: casa-7/);
      for (const g of ["Moon", "Mars", "Venus", "Jupiter"]) {
        expect(bloco).toMatch(new RegExp(`o bloqueio — força que não encontra terreno na casa onde está instalada: ${g}`));
      }
    });

    it("Elemento 2 inclui a figura fechada que atravessa o Atmakaraka (Saturno-Rahu-Marte)", () => {
      expect(prompt).toMatch(/CONTEXTO ADICIONAL.*Saturn–Rahu/);
    });

    it("Elemento 3 liga-se à espinha, sem a repetir fora do próprio bloco", () => {
      expect(prompt).toMatch(/A espinha deste relatório:.*lugar público, a carreira e o nome pelo qual é conhecida/);
      expect(prompt).toMatch(/mostre-a a florescer sem o peso do bloqueio/);
    });

    it("Elemento 4 ancora o primeiro passo no período pessoal em curso (Jupiter, antardasha actual)", () => {
      expect(prompt).toMatch(/o primeiro passo apoia-se no período pessoal em curso — o que ele pede agora: Jupiter/);
    });

    it("nunca fatalista — cita Regra 7 (falta de alavanca, nunca falta de capacidade)", () => {
      expect(prompt).toMatch(/Regra 7: nunca "falta de capacidade" — sempre "falta de alavanca" ou "tensão estrutural"/);
    });

    it("proíbe clichés de motivação genérica", () => {
      expect(prompt).toContain("trabalha a tua confiança");
      expect(prompt).toMatch(/Clichés proibidos/);
    });

    it("máximo 4 parágrafos, declarado explicitamente", () => {
      expect(prompt).toMatch(/[Mm]áximo 4 parágrafos/);
    });

    it("instrui a regra geral de linguagem corrigida — termos sempre com definição", () => {
      expect(prompt).toMatch(/todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya/);
    });
  });
});
