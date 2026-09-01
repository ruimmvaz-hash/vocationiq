import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { construirAbertura, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirAbertura — Secção 0, determinística", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
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
  const abertura = construirAbertura(camada, dados);

  it("nenhum campo do quadro de dados fica vazio (critério D do v2)", () => {
    expect(abertura.nomeCliente.length).toBeGreaterThan(0);
    for (const v of Object.values(abertura.quadroDados)) expect(v.length).toBeGreaterThan(0);
  });

  it("a pergunta declarada aparece citada e enquadrada, nunca a solo (regra 20a)", () => {
    expect(abertura.perguntaEnquadrada).toContain(dados.mainQuestion);
    expect(abertura.perguntaEnquadrada.toLowerCase()).toMatch(/pergunta que nos trouxeste/);
  });

  it("o signo é o solar TROPICAL, nunca o ascendente sideral (nota de leitura, parte 1)", () => {
    expect(abertura.notaLeitura.oSigno).toMatch(/signo solar é Sagitário/);
    expect(abertura.notaLeitura.oSigno).not.toMatch(/Capricórnio/); // o ascendente sideral da Melina é Capricórnio — a nota de leitura NUNCA pode confundir isso com o signo solar
  });

  it("a nota de leitura nunca pressupõe interacção anterior (correcção 23/08/2026 — 'continuas a ser' presumia uma conversa já tida)", () => {
    expect(abertura.notaLeitura.oSigno.toLowerCase()).not.toMatch(/continuas a ser/);
  });

  it("a nota de leitura tem as 3 partes obrigatórias do v2", () => {
    expect(abertura.notaLeitura.oSigno.length).toBeGreaterThan(0);
    expect(abertura.notaLeitura.aMedida).toMatch(/apoio/);
    expect(abertura.notaLeitura.ondeParar).toMatch(/[Pp]lano/);
  });
});

describe("construirAbertura — a correcção funciona para qualquer signo solar, não só Sagitário", () => {
  // Dia 15 de cada mês — seguro, dentro do signo tropical correspondente em qualquer ano (nenhum dia 15 cai perto de uma fronteira de signo).
  const umaDataPorSigno: [string, Date][] = [
    ["Janeiro (Capricórnio)", new Date(Date.UTC(2000, 0, 15, 12))],
    ["Fevereiro (Aquário)", new Date(Date.UTC(2000, 1, 15, 12))],
    ["Março (Peixes)", new Date(Date.UTC(2000, 2, 15, 12))],
    ["Abril (Carneiro)", new Date(Date.UTC(2000, 3, 15, 12))],
    ["Maio (Touro)", new Date(Date.UTC(2000, 4, 15, 12))],
    ["Junho (Gémeos)", new Date(Date.UTC(2000, 5, 15, 12))],
    ["Julho (Caranguejo)", new Date(Date.UTC(2000, 6, 15, 12))],
    ["Agosto (Leão)", new Date(Date.UTC(2000, 7, 15, 12))],
    ["Setembro (Virgem)", new Date(Date.UTC(2000, 8, 15, 12))],
    ["Outubro (Balança)", new Date(Date.UTC(2000, 9, 15, 12))],
    ["Novembro (Escorpião)", new Date(Date.UTC(2000, 10, 15, 12))],
    ["Dezembro (Sagitário)", new Date(Date.UTC(2000, 11, 15, 12))],
  ];

  const dadosBase: DadosClienteV3 = {
    nomeCliente: "Teste",
    dataNascimentoFormatada: "15",
    horaNascimentoFormatada: "12:00",
    localNascimento: "Lisboa, Portugal",
    residenciaActual: "Lisboa, Portugal",
    profissao: "Teste",
    mainQuestion: "Pergunta de teste?",
    situacaoDeclarada: "Pergunta de teste?",
  };

  for (const [label, utcDate] of umaDataPorSigno) {
    it(`${label} — frase bem formada, sem pressupor interacção anterior`, () => {
      const camada = gerarCamadaA({ utcDate, latitude: 38.7169, longitude: -9.1399 }, utcDate);
      const abertura = construirAbertura(camada, dadosBase);
      expect(abertura.notaLeitura.oSigno).toMatch(new RegExp(`signo solar é `));
      expect(abertura.notaLeitura.oSigno.toLowerCase()).not.toMatch(/continuas a ser/);
      expect(abertura.notaLeitura.oSigno).toMatch(/não o substitui/);
    });
  }
});
