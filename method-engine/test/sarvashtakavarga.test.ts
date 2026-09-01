import { describe, expect, it } from "vitest";
import { computeSarvashtakavarga, BAV_CLASSICAL_TOTAL, SAV_GRAND_TOTAL } from "../src/v3/sarvashtakavarga.js";

// FASE 1 — teste de verificação, não de conveniência. O Sarvashtakavarga
// (SAV) é a peça mais crítica em falta identificada em
// docs/ANALISE-MOTOR-vs-v2v3-22Ago.md.
//
// Este teste corre o módulo contra a carta REAL da Melina
// (CODE-4-melina-PASSA.md, Anexo Técnico: Ascendente Capricórnio 9°11',
// Sol Escorpião, Lua Caranguejo, Mercúrio Sagitário, Vénus Capricórnio,
// Marte Capricórnio, Júpiter Sagitário, Saturno Libra) e compara casa a
// casa contra a sequência publicada nesse documento:
// "22 · 26 · 22 · 30 · 34 · 26 · 22 · 30 · 32 · 36 · 34 · 23" (total 337).
//
// ESTADO (23/08/2026, auditoria de cálculos astrológicos): as 7 tabelas de
// bindus foram inicialmente reconstruídas de memória e tinham 5 células
// erradas em 3 tabelas — o total por peça batia certo (337 no total geral)
// mas a distribuição por casa não, o que mascarava o erro. Corrigidas
// célula a célula contra o Ashtakavarga do Prokerala para esta mesma carta
// (prokerala.com/astrology/birth-chart/), com as 8 colunas × 7 tabelas a
// bater 100% com essa segunda fonte (ver `verify-bav-against-prokerala.ts`,
// script de auditoria em src/v3/). Este teste passa agora com as duas fontes
// (Prokerala e CODE-4) de acordo.
describe("computeSarvashtakavarga", () => {
  const melinaContributorSigns = {
    Sun: "Scorpio",
    Moon: "Cancer",
    Mars: "Capricorn",
    Mercury: "Sagittarius",
    Jupiter: "Sagittarius",
    Venus: "Capricorn",
    Saturn: "Libra",
    Lagna: "Capricorn",
  } as const;

  it("cada Bhinnashtakavarga soma o total clássico invariante (auto-verificação da tabela)", () => {
    const result = computeSarvashtakavarga(melinaContributorSigns, "Capricorn");
    expect(result.total).toBe(SAV_GRAND_TOTAL);
    for (const p of result.perPlanet) {
      expect(p.bySign.reduce((a, b) => a + b, 0)).toBe(BAV_CLASSICAL_TOTAL[p.planet]);
    }
  });

  it("reproduz o SAV por casa publicado em CODE-4-melina-PASSA.md", () => {
    const result = computeSarvashtakavarga(melinaContributorSigns, "Capricorn");
    const got = result.byHouse.map((h) => h.pontuacao);
    const expected = [22, 26, 22, 30, 34, 26, 22, 30, 32, 36, 34, 23];
    expect(got).toEqual(expected);
  });
});
