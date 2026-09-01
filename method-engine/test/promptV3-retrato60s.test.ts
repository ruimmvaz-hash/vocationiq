import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao1Retrato60s, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao1Retrato60s — Secção 1, carta da Melina", () => {
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
  const prompt = construirPromptSeccao1Retrato60s(camada, espinha, dados);

  it("pede exactamente 9 linhas", () => {
    expect(prompt).toMatch(/EXACTAMENTE 9 linhas/);
    for (let i = 1; i <= 9; i++) expect(prompt).toContain(`Linha ${i} de 9`);
  });

  it("a linha 1 aponta para reformular a espinha, nunca copiar", () => {
    expect(prompt).toMatch(/A LINHA 1 é uma reformulação desta afirmação/);
    expect(prompt).toMatch(/nunca as mesmas palavras/);
  });

  it("cada uma das 9 linhas tem uma secção de destino nomeada", () => {
    for (const secao of ["Secção 4", "Secção 6", "Secção 8", "Secção 9", "Secção 12", "Secção 13", "Secção 14"]) {
      expect(prompt).toContain(secao);
    }
  });

  it("secções condicionais (6, 7, 14) reflectem se estão activas nesta carta, nunca fingem", () => {
    // Melina TEM SAV<25 (casa 1) e trânsitos activos — as secções condicionais 6 e 7 devem aparecer como activas.
    expect(prompt).toMatch(/Secção 6 — O que te tem travado/);
    expect(prompt).toMatch(/Secção 7 — O trânsito actual/);
  });

  it("instrui a nunca começar linha com 'és' ou 'tens'", () => {
    expect(prompt).toMatch(/[Nn]enhuma das 9 linhas começa por "és" ou "tens"/);
  });

  it("instrui zero generalidades — específico a esta carta", () => {
    expect(prompt).toMatch(/[Zz]ero generalidades/);
  });

  it("cita as regras de escrita 2, 3, 7, 12, 13, 16, 18", () => {
    for (const regra of ["Regra 2", "Regra 3", "Regra 7", "Regra 12", "Regra 13", "Regra 16", "Regra 18"]) {
      expect(prompt).toContain(regra);
    }
  });

  it("aceita um resumo das descobertas já escritas, para não repetir", () => {
    const promptComResumo = construirPromptSeccao1Retrato60s(camada, espinha, dados, "Resumo: disciplina paga a carreira; fiabilidade emocional; auto-apresentação fraca; tensão a 3 pontas; acção decisiva.");
    expect(promptComResumo).toMatch(/O que a secção 2 \(Cinco Descobertas\) já disse/);
    expect(promptComResumo).toContain("Resumo: disciplina paga a carreira");
  });
});
