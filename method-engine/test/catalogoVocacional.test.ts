import { describe, expect, it } from "vitest";
import { computeD1Table } from "../src/lifeReport/d1Table.js";
import { computeVocationIQAxes } from "../src/lifeReport/vocationIQ.js";
import { computePesosPlanetas, computeSavPorCasa } from "../src/vocationiq/pesosPlanetas.js";
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

  it("nenhuma alternativa pela carta tem menos de 2 camadas (limiar mínimo contra ruído de sinal único)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Contabilidade", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    for (const d of resultado.destinosAlternativos) expect(d.convergencia).toBeGreaterThanOrEqual(2);
  });

  it("nunca repete nas alternativas um destino já coberto pela área actual declarada", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Contabilidade", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    const idsAreaActual = new Set(resultado.destinosDeAreaActual.map((d) => d.id));
    for (const d of resultado.destinosAlternativos) expect(idsAreaActual.has(d.id)).toBe(false);
  });
});
