import { describe, expect, it } from "vitest";
import { computeD1Table } from "../src/lifeReport/d1Table.js";
import { computeVocationIQAxes, type VocationIQAxes } from "../src/lifeReport/vocationIQ.js";
import { computePesosPlanetas, computeSavPorCasa, type PesoPlaneta, type SavPorCasa } from "../src/vocationiq/pesosPlanetas.js";
import { catalogarDestinos, type AtmakarakaInfo } from "../src/vocationiq/catalogoVocacional.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// Redesenho do motor VocationIQ (Parte 2) — regressão directa ao bug que
// motivou toda a SPEC-vocacional.md: no mapa da Melina (mesma fixture de
// test/orquestrador.test.ts), o catálogo antigo devolvia "Direito" como
// topo sem nenhuma camada vir do Atmakaraka (Saturno, a peça mais forte
// da carta) — "ganha por ser comum, não por ser dela". Estes testes
// confirmam que a nova integração nunca reproduz esse padrão.

const melina: BirthInput = {
  utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
  latitude: -(23 + 33 / 60 + 9 / 3600),
  longitude: -(46 + 37 / 60 + 29 / 3600),
};

function carregarMelina() {
  const d1 = computeD1Table(melina);
  const pesos = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesos.map((p) => ({ planeta: p.planeta, peso: p.peso })),
  );
  const savPorCasa = computeSavPorCasa(d1);
  const atmakarakaInfo: AtmakarakaInfo = { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra };
  return { axes, pesos, savPorCasa, atmakarakaInfo };
}

describe("catalogarDestinos — carta real da Melina (São Paulo, 11/12/1984 08:30 local)", () => {
  it("confirma que o Atmakaraka desta carta é Saturno (facto documentado em SPEC-vocacional.md)", () => {
    const { atmakarakaInfo } = carregarMelina();
    expect(atmakarakaInfo.planeta).toBe("Saturn");
  });

  it("NUNCA propõe 'Direito' como candidata fora da lista sem camada do Atmakaraka — regressão directa ao bug documentado", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    for (const areaActual of ["Estética", "Gestora", "Contabilidade", "Empresária"]) {
      const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual, anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
      if (resultado.candidataForaDaLista.nome === "Direito") {
        expect(resultado.candidataForaDaLista.camadas.some((c) => c.startsWith("Atmakaraka"))).toBe(true);
      }
    }
  });

  it("toda candidata fora da lista inclui sempre uma camada do Atmakaraka (gate estrutural)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Estética", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    if (resultado.candidataForaDaLista.nome) {
      expect(resultado.candidataForaDaLista.convergencia).toBeGreaterThanOrEqual(4);
      expect(resultado.candidataForaDaLista.camadas.some((c) => c.startsWith("Atmakaraka"))).toBe(true);
    }
  });

  it("área actual 'Estética' encontra destinos de estética/cosmética no catálogo (bug real da Melina)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Estética", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    expect(resultado.notaAreaGenerica).toBeNull();
    const ids = resultado.destinosDeAreaActual.map((d) => d.id);
    expect(ids.some((id) => id.includes("estetica"))).toBe(true);
  });

  it("área actual sem sector específico ('Gestora') activa notaAreaGenerica e não deriva destinos de área actual", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Gestora", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    expect(resultado.notaAreaGenerica).not.toBeNull();
    expect(resultado.destinosDeAreaActual).toHaveLength(0);
  });

  it("nenhuma alternativa pela carta tem menos de 2 camadas, EXCEPTO quando a camada única vem de um karaka pessoal (Atmakaraka/Amatyakaraka)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Contabilidade", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    for (const d of resultado.destinosAlternativos) {
      if (d.convergencia < 2) expect(d.camadas.some((c) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka"))).toBe(true);
    }
  });

  it("'Negócio próprio com marca pessoal' aparece nas alternativas via Amatyakaraka, mesmo com 1 só camada (achado do teste com dados reais — sem esta excepção, o motor nunca mostrava o sinal que levou o especialista a apontar 'marca própria' para a Melina)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Estética", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    const marcaPessoal = resultado.destinosAlternativos.find((d) => d.id === "f_marca_pessoal");
    expect(marcaPessoal).toBeDefined();
    expect(marcaPessoal?.camadas.some((c) => c.startsWith("Amatyakaraka"))).toBe(true);
  });

  it("nunca repete nas alternativas um destino já coberto pela área actual declarada", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Contabilidade", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    const idsAreaActual = new Set(resultado.destinosDeAreaActual.map((d) => d.id));
    for (const d of resultado.destinosAlternativos) expect(idsAreaActual.has(d.id)).toBe(false);
  });
});

// Não há uma segunda carta REAL com "candidata forte" documentada e
// disponível neste repositório (Alexandra/Bruno/Alice, citados em
// ESTADO-catalogo-vocacional.md, só existem como nomes de caso de estudo
// nos documentos — nenhum tem BirthInput real gravado). Em vez de
// inventar uma carta e apresentá-la como sendo de alguém real, este
// bloco construiu um caso SINTÉTICO, assinalado como tal, só para provar
// que o CAMINHO POSITIVO do algoritmo (uma candidata REALMENTE
// converge) também funciona — os testes da Melina acima só provam o
// caminho negativo (rejeitar correctamente quando não converge).
describe("catalogarDestinos — caso sintético de convergência forte (não é uma pessoa real, só prova o caminho positivo)", () => {
  // Atmakaraka = Júpiter, na Nakshatra Punarvasu (regente Júpiter),
  // conjunto com o Sol na casa 9 — 4 camadas independentes convergem
  // todas em "Formação de Professores" (formacao_professores):
  //   1. Atmakaraka (Júpiter aponta directamente, índice de planetas)
  //   2. Nakshatra do Atmakaraka (Punarvasu aponta directamente)
  //   3. Combinação Júpiter+Sol (mesma casa 9)
  //   4. Área tabelada "Ensino" (planeta_forte júpiter indispensável, peso 1.5 ≥ 1.3)
  const pesos: PesoPlaneta[] = [
    { planeta: "Jupiter", casa: 9, signo: "Sagittarius", estado: "Own", savCasa: 30, savMedia: 28, peso: 1.5 },
    { planeta: "Sun", casa: 9, signo: "Sagittarius", estado: "Friend", savCasa: 30, savMedia: 28, peso: 1.1 },
    { planeta: "Moon", casa: 3, signo: "Gemini", estado: "Neutral", savCasa: 26, savMedia: 28, peso: 0.95 },
    { planeta: "Mars", casa: 5, signo: "Leo", estado: "Friend", savCasa: 26, savMedia: 28, peso: 1.0 },
    { planeta: "Mercury", casa: 6, signo: "Virgo", estado: "Own", savCasa: 26, savMedia: 28, peso: 1.15 },
    { planeta: "Venus", casa: 2, signo: "Taurus", estado: "Own", savCasa: 26, savMedia: 28, peso: 1.2 },
    { planeta: "Saturn", casa: 11, signo: "Aquarius", estado: "Own", savCasa: 30, savMedia: 28, peso: 1.25 },
  ];
  const savPorCasa: SavPorCasa[] = Array.from({ length: 12 }, (_, i) => ({ casa: i + 1, pontuacao: 26, media: 28, classificacao: "medio" as const }));
  const axes = { amatyakaraka: "Saturn", earningMode: { house: 2, lord: "Venus" } } as unknown as VocationIQAxes;
  const atmakarakaInfo: AtmakarakaInfo = { planeta: "Jupiter", nakshatra: "Punarvasu" };

  it("encontra 'Formação de Professores' como candidata fora da lista, com as 4 camadas esperadas", () => {
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Gestão", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    expect(resultado.candidataForaDaLista.nome).toBe("Formação de Professores");
    expect(resultado.candidataForaDaLista.convergencia).toBeGreaterThanOrEqual(4);
    expect(resultado.candidataForaDaLista.camadas.some((c) => c.startsWith("Atmakaraka"))).toBe(true);
    expect(resultado.candidataForaDaLista.camadas.some((c) => c.includes("Nakshatra"))).toBe(true);
    expect(resultado.candidataForaDaLista.camadas.some((c) => c.includes("Combinação"))).toBe(true);
    expect(resultado.candidataForaDaLista.camadas.some((c) => c.includes("Ensino"))).toBe(true);
  });
});
