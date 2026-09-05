import { describe, expect, it } from "vitest";
import { computeD1Table } from "../src/lifeReport/d1Table.js";
import { computeVocationIQAxes, resolverEarningModeDominante, type EarningMode } from "../src/lifeReport/vocationIQ.js";
import { computePesosPlanetas } from "../src/vocationiq/pesosPlanetas.js";
import { normalizarTextoLivre } from "../src/vocationiq/promptAdulto.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// Correcções do especialista, 2026-09-05 — TAREFAS 1, 2 e 7.
//
// TAREFA 1: antes desta correcção, `computeEarningModes` tinha dois blocos
// com fontes diferentes de dignidade — um lia `d1.rows[lord].dignity` em
// bruto (nunca sabia do cancelamento por Neecha Bhanga), outro lia o
// `peso` já corrigido. Um planeta debilitado-mas-cancelado recebia -1 do
// bloco antigo E +0,5/+0,25 do bloco novo ao mesmo tempo — incoerente.
// Correcção: o bloco de dignidade do regente agora lê `estado` (quando
// fornecido via `pesos`), a MESMA fonte já corrigida por Neecha Bhanga.
//
// TAREFA 2: o desempate do Modo de Ganho dominante era um acidente da
// ordem do array `[2, 6, 10]` (via estabilidade do sort), nunca uma
// decisão metodológica. Correcção: `resolverEarningModeDominante` decide
// por nº de camadas convergentes e, em empate total, devolve os dois
// como co-dominantes.

const melina: BirthInput = {
  utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
  latitude: -(23 + 33 / 60 + 9 / 3600),
  longitude: -(46 + 37 / 60 + 29 / 3600),
};

describe("TAREFA 1 — fonte única de dignidade no Modo de Ganho (carta real da Melina)", () => {
  // Mercúrio é o regente da casa 6 na carta da Melina (Ascendente Capricórnio
  // → casa 6 em Gémeos) e a sua dignidade clássica real é "Neutral" (nem
  // debilitado nem NeechaBhanga) — usado aqui como base neutra para isolar
  // o efeito de CADA `estado` testado, independentemente do que a carta
  // real diz sobre Mercúrio.
  function earningModeCasa6ComEstado(estado: "NeechaBhanga" | "Debilitated" | undefined): EarningMode {
    const d1 = computeD1Table(melina);
    const pesosBase = computePesosPlanetas(d1);
    const pesos = pesosBase.map((p) => (p.planeta === "Mercury" && estado !== undefined ? { planeta: p.planeta, peso: p.peso, estado } : { planeta: p.planeta, peso: p.peso, estado: p.estado }));
    const axes = computeVocationIQAxes(d1, pesos);
    return axes.earningModeAll.find((e) => e.house === 6)!;
  }

  it("estado 'NeechaBhanga' (debilidade cancelada) conta como dignidade FORTE — nunca a penalização de debilitado", () => {
    const casa6 = earningModeCasa6ComEstado("NeechaBhanga");
    expect(casa6.signals.some((s) => s.includes("dignidade forte") && s.includes("debilitado com cancelação"))).toBe(true);
  });

  it("estado 'Debilitated' (sem cancelação) aplica a penalização, nunca o sinal de dignidade forte", () => {
    const casa6 = earningModeCasa6ComEstado("Debilitated");
    expect(casa6.signals.some((s) => s.includes("dignidade forte"))).toBe(false);
  });

  it("a diferença de pontuação entre os dois estados é exactamente 3 (regra: +2 forte vs. -1 fraco — nunca os dois ao mesmo tempo)", () => {
    const comForte = earningModeCasa6ComEstado("NeechaBhanga");
    const comFraco = earningModeCasa6ComEstado("Debilitated");
    expect(Math.round((comForte.score - comFraco.score) * 10) / 10).toBe(3);
  });

  it("sem `estado` no array de pesos, cai de volta à dignidade clássica em bruto (compatibilidade) — Mercúrio 'Neutral' não aplica nenhum dos dois ajustes", () => {
    const casa6 = earningModeCasa6ComEstado(undefined);
    expect(casa6.signals.some((s) => s.includes("dignidade forte"))).toBe(false);
    const comForte = earningModeCasa6ComEstado("NeechaBhanga");
    // "Neutral" (sem ajuste) fica 2 pontos abaixo de "NeechaBhanga" (+2).
    expect(Math.round((comForte.score - casa6.score) * 10) / 10).toBe(2);
  });
});

describe("TAREFA 2 — resolverEarningModeDominante (regra de desempate explícita)", () => {
  function modo(house: 2 | 6 | 10, score: number, camadasConvergentes: number): EarningMode {
    return { house, label: "x", score, camadasConvergentes, signals: [], planetsInHouse: [], lord: "Sun" };
  }

  it("vencedor claro por pontuação — devolve só essa casa", () => {
    const todas = [modo(2, 5, 3), modo(6, 3, 1), modo(10, 2, 0)].sort((a, b) => b.score - a.score);
    expect(resolverEarningModeDominante(todas).map((e) => e.house)).toEqual([2]);
  });

  it("empate de pontuação, desempatado por mais camadas convergentes", () => {
    const todas = [modo(2, 5, 2), modo(6, 5, 4), modo(10, 1, 0)].sort((a, b) => b.score - a.score);
    expect(resolverEarningModeDominante(todas).map((e) => e.house)).toEqual([6]);
  });

  it("empate total (pontuação e camadas iguais) — devolve as duas casas como co-dominantes", () => {
    const todas = [modo(2, 5, 3), modo(6, 5, 3), modo(10, 1, 0)].sort((a, b) => b.score - a.score);
    const dominante = resolverEarningModeDominante(todas);
    expect(dominante).toHaveLength(2);
    expect(dominante.map((e) => e.house).sort()).toEqual([2, 6]);
  });

  it("nunca devolve mais do que 2 casas, mesmo num empate triplo", () => {
    const todas = [modo(2, 5, 3), modo(6, 5, 3), modo(10, 5, 3)];
    expect(resolverEarningModeDominante(todas).length).toBeLessThanOrEqual(2);
  });
});

describe("computeVocationIQAxes — earningModeDominante e earningMode continuam coerentes (carta real da Melina)", () => {
  it("earningMode é sempre o 1º elemento de earningModeDominante", () => {
    const d1 = computeD1Table(melina);
    const pesos = computePesosPlanetas(d1);
    const axes = computeVocationIQAxes(
      d1,
      pesos.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
    );
    expect(axes.earningMode).toBe(axes.earningModeDominante[0]);
    expect(axes.earningModeDominante.length).toBeGreaterThanOrEqual(1);
    expect(axes.earningModeDominante.length).toBeLessThanOrEqual(2);
  });
});

describe("TAREFA 7 — normalizarTextoLivre (texto livre da pessoa, nunca corrigido, só sentence case)", () => {
  it("converte para sentence case: 1ª letra maiúscula, resto minúsculas", () => {
    expect(normalizarTextoLivre("TENHO VOCAÇÃO PARA SEFR CONSULWTORA SAP?")).toBe("Tenho vocação para sefr consulwtora sap?");
  });

  it("preserva erros de ortografia — nunca corrige a palavra da pessoa", () => {
    expect(normalizarTextoLivre("QUERI MUDAR DE AREA")).toBe("Queri mudar de area");
  });

  it("remove espaço em branco nas pontas", () => {
    expect(normalizarTextoLivre("  já em minúsculas.  ")).toBe("Já em minúsculas.");
  });

  it("texto vazio ou só espaços devolve string vazia, sem erro", () => {
    expect(normalizarTextoLivre("")).toBe("");
    expect(normalizarTextoLivre("   ")).toBe("");
  });
});
