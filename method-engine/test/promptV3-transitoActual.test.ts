import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao7TransitoActual, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao7TransitoActual — Secção 7 (condicional), carta da Melina", () => {
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

  it("está activa para a Melina — Plutão tem contacto exacto (0.4°) com Vénus natal", () => {
    const prompt = construirPromptSeccao7TransitoActual(camada, espinha, dados);
    expect(prompt).not.toBeNull();
  });

  it("devolve null quando nenhum slowTransit tem contacto natal exacto", () => {
    const camadaSemContacto = {
      ...camada,
      slowTransits: camada.slowTransits.map((t) => ({ ...t, contactosNatal: [] })),
    };
    const prompt = construirPromptSeccao7TransitoActual(camadaSemContacto, espinha, dados);
    expect(prompt).toBeNull();
  });

  describe("com a condição activa (Melina — só Plutão)", () => {
    const prompt = construirPromptSeccao7TransitoActual(camada, espinha, dados)!;

    it("inclui só o trânsito com contacto exacto (Plutão), nunca os outros 5 sem contacto", () => {
      expect(prompt).toMatch(/contacto natal a 0\.4° de órbe/);
      // os outros 5 corpos (sem contacto) não entram em lado nenhum do prompt
      for (const termo of ["Saturn", "Uranus", "Neptune", "Rahu", "Ketu"]) {
        expect(prompt).not.toContain(termo);
      }
      // Plutão (o único activo) aparece só na linha SINAL interna (para o motor entender o que traduz) — nunca com "TERMO A ESCREVER NO TEXTO", que é o que instrui o LLM a nomeá-lo no texto final
      expect(prompt).toMatch(/SINAL: trânsito activo agora — o que este período pede: Pluto/);
      expect(prompt).not.toMatch(/TERMO A ESCREVER NO TEXTO: Plut/);
    });

    it("nível de confiança sinal-forte para o trânsito com contacto exacto", () => {
      expect(prompt).toMatch(/Nível de confiança deste trânsito: \*\*sinal-forte\*\*/);
    });

    it("a casa afectada pode ser nomeada com definição (casa 1, para a Melina) — só o planeta fica de fora", () => {
      expect(prompt).toMatch(/a área de vida atravessada por este trânsito: casa-1/);
      expect(prompt).toMatch(/TERMO A ESCREVER NO TEXTO: casa 1/);
    });

    it("instrui explicitamente a nunca nomear o planeta em trânsito, nem com definição", () => {
      expect(prompt).toMatch(/NUNCA nomeies o planeta em trânsito no texto final, nem mesmo acompanhado de definição/);
    });

    it("distingue-se explicitamente da Secção 11 — foco de 3-6 meses, não repete o Relógio", () => {
      expect(prompt).toMatch(/NÃO é o Relógio/);
      expect(prompt).toMatch(/3 a 6 meses/);
      expect(prompt).toMatch(/nunca o horizonte completo/);
    });

    it("nunca promete acontecimentos", () => {
      expect(prompt).toMatch(/"Vai acontecer", "vais viver\.\.\.", ou qualquer formulação que garanta um evento específico está proibida/);
    });

    it("liga o fecho à espinha", () => {
      expect(prompt).toMatch(/A espinha — o fecho liga-se a isto/);
      expect(prompt).toMatch(/o lugar público, a carreira e o nome pelo qual é conhecida/);
    });

    it("máximo 3 parágrafos, declarado explicitamente", () => {
      expect(prompt).toMatch(/[Mm]áximo 3 parágrafos/);
    });

    it("datas só ao mês e ano (Regra 19a)", () => {
      expect(prompt).toContain("Regra 19a");
      const datasComDia = prompt.match(/\b\d{1,2}\s+de\s+(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\b/gi);
      expect(datasComDia).toBeNull();
    });
  });
});
