import { describe, expect, it } from "vitest";
import { detectarNeechaBhanga, computePesosPlanetas, ESTADO_PESO } from "../src/vocationiq/pesosPlanetas.js";
import type { D1TableResult, GrahaRow } from "../src/lifeReport/d1Table.js";
import type { Graha } from "../src/lifeReport/types.js";
import type { DignityDetail } from "../src/data/dignity.js";
import type { ZodiacSign } from "../src/data/tables.js";

// Redesenho do motor VocationIQ (Parte 1A) — bug real reportado: a Nádia
// tinha o Amatyakaraka (Lua) debilitado com Neecha Bhanga Raja Yoga, e o
// motor lia peso 0,60 (vermelho) em vez de força. Não há dados de
// nascimento reais da Nádia neste repositório (só o texto do prompt foi
// guardado, sem data/hora/local) — em vez de inventar uma carta e
// apresentá-la como sendo dela, estes testes constroem fixtures mínimas
// que isolam cada uma das 3 condições clássicas de cancelação, uma de
// cada vez, contra a Lua debilitada em Escorpião (o mesmo planeta e o
// mesmo padrão do bug reportado) — é o mesmo que testar a Alexandra ou a
// Alice: verificar o MECANISMO, não reencenar uma pessoa real sem dados.

/** GrahaRow mínima e válida — só os campos que `detectarNeechaBhanga` lê (dignity/sign/house) importam; o resto é placeholder seguro. */
function linha(sign: ZodiacSign, house: number, dignity: DignityDetail): GrahaRow {
  return {
    graha: "Sun",
    sign,
    degreeInSign: 15,
    house,
    dignity,
    functionalRulershipHouses: [],
    nakshatra: "Ashwini",
    pada: 1,
    nakshatraLord: "Ketu",
    avastha: null,
    bhavaMadhyaDistance: 0,
    bhavaMadhyaBand: "exact",
    drishtiReceived: [],
    drishtiEmitted: [],
    drishtiEmittedTargets: [],
    retrograde: { isRetrograde: false, isStationary: false },
    combustion: { isCombustLuna: false, isCazimi: false, isCombust: false },
  } as unknown as GrahaRow;
}

/** D1TableResult mínimo — só `rows` importa para `detectarNeechaBhanga` (a função nunca lê `d1.ascendant`/karakas/d9/arudhaLagna). */
function d1Minimo(rows: Partial<Record<Graha, GrahaRow>>): D1TableResult {
  const base = linha("Aries", 1, "Neutral");
  const completo: Record<Graha, GrahaRow> = {
    Sun: base,
    Moon: base,
    Mars: base,
    Mercury: base,
    Jupiter: base,
    Venus: base,
    Saturn: base,
    Rahu: base,
    Ketu: base,
    ...rows,
  };
  return { ascendant: { sign: "Aries", degreeInSign: 0, nakshatra: "Ashwini", pada: 1, nakshatraLord: "Ketu", drishtiReceivedBy: [] }, rows: completo } as unknown as D1TableResult;
}

describe("detectarNeechaBhanga — Lua debilitada em Escorpião (padrão do bug reportado na Nádia)", () => {
  it("não debilitado — devolve detectado:false sem avaliar nada", () => {
    const d1 = d1Minimo({ Moon: linha("Cancer", 4, "Own") });
    expect(detectarNeechaBhanga("Moon", d1).detectado).toBe(false);
  });

  it("debilitado, sem nenhuma condição de cancelação — mantém-se debilitado", () => {
    // Marte (regente de Escorpião) neutro, não em Kendra; nenhum planeta
    // exaltado em Escorpião (nenhum dos 8 clássicos+Rahu tem exaltação
    // ali); regente da exaltação da Lua (Vénus, Touro) também não em Kendra.
    const d1 = d1Minimo({
      Moon: linha("Scorpio", 8, "Debilitated"),
      Mars: linha("Gemini", 3, "Enemy"),
      Venus: linha("Gemini", 3, "Friend"),
    });
    const r = detectarNeechaBhanga("Moon", d1);
    expect(r.detectado).toBe(false);
  });

  it("condição (a) — regente do signo de debilidade (Marte, Escorpião) exaltado — cancela", () => {
    const d1 = d1Minimo({
      Moon: linha("Scorpio", 8, "Debilitated"),
      Mars: linha("Capricorn", 6, "Exalted"), // Marte exaltado em Capricórnio
      Venus: linha("Gemini", 3, "Friend"),
    });
    const r = detectarNeechaBhanga("Moon", d1);
    expect(r.detectado).toBe(true);
    expect(r.motivo).toContain("regente do signo de debilidade");
  });

  it("condição (a) — regente do signo de debilidade em signo próprio — cancela", () => {
    const d1 = d1Minimo({
      Moon: linha("Scorpio", 8, "Debilitated"),
      Mars: linha("Aries", 1, "Own"), // Marte em signo próprio
      Venus: linha("Gemini", 3, "Friend"),
    });
    expect(detectarNeechaBhanga("Moon", d1).detectado).toBe(true);
  });

  it("condição (c) — regente da exaltação da Lua (Vénus, Touro) em Kendra do Ascendente — cancela", () => {
    // Ascendente é sempre casa 1 nesta convenção (casas já contadas a
    // partir dele) — Kendra = {1,4,7,10}. Vénus na casa 7 = Kendra.
    const d1 = d1Minimo({
      Moon: linha("Scorpio", 8, "Debilitated"),
      Mars: linha("Gemini", 3, "Enemy"),
      Venus: linha("Aquarius", 7, "Friend"),
    });
    const r = detectarNeechaBhanga("Moon", d1);
    expect(r.detectado).toBe(true);
    expect(r.motivo).toContain("signo de exaltação");
  });

  it("computePesosPlanetas aplica o estado NeechaBhanga (peso 1,2 de base) em vez de Debilitated (0,6) quando cancelado", () => {
    const d1 = d1Minimo({
      Moon: linha("Scorpio", 8, "Debilitated"),
      Mars: linha("Capricorn", 6, "Exalted"),
      Venus: linha("Gemini", 3, "Friend"),
    });
    const pesos = computePesosPlanetas(d1);
    const luaPeso = pesos.find((p) => p.planeta === "Moon")!;
    expect(luaPeso.estado).toBe("NeechaBhanga");
    expect(luaPeso.notaCancelamento).toBeTruthy();
    // O peso final ainda depende do SAV da casa (que nesta fixture
    // mínima não é realista), mas o FACTOR de base tem de ser o de
    // NeechaBhanga (1,2), nunca o de Debilitated (0,6) — verificável
    // isolando o factor: peso = ESTADO_PESO[estado] * (savCasa/savMedia).
    expect(ESTADO_PESO[luaPeso.estado]).toBe(1.2);
    expect(ESTADO_PESO.Debilitated).toBe(0.6);
  });
});
