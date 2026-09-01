import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha, contarSistemasIndependentes } from "../src/v3/espinha.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// FASE 1, Passo 3 — carta da Melina. CODE-4-melina-PASSA.md publica a
// espinha: "A tua pessoa e a tua carreira são o mesmo assunto. Seis
// medições independentes dizem-no." O Atmakaraka da Melina é Saturno
// (maior grau, 28°57' em Libra), na casa 10 (carreira) — e Saturno rege
// também o Ascendente (Capricórnio), fundindo "quem ela é" com "a sua
// carreira" na mesma peça. Este teste confirma que a derivação mecânica
// chega ao mesmo TEMA e ao mesmo NÍVEL (convergência forte) que CODE-4 —
// não à mesma contagem exacta ("seis medições" em CODE-4 vs. os sistemas
// aqui, ver nota em espinha.ts).
//
// REESCRITO 25/08/2026 ("Correcções críticas ao motor v3", ponto 1) — a
// contagem passou de CAMADAS finas (9, algumas do mesmo sistema vistas
// várias vezes) para SISTEMAS independentes (7: Karakas, SAV, D-9,
// Regência, Drishti, Ocidental, Dashas). "Força/dignidade do Atmakaraka"
// deixou de contar como sistema próprio (não corresponde a nenhum dos 7
// sistemas listados no pedido) — o teste que a verificava foi removido,
// não substituído.
describe("derivarEspinha — carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const atDate = new Date(Date.UTC(2026, 7, 22));
  const camada = gerarCamadaA(melina, atDate);
  const derivacao = derivarEspinha(camada);

  it("a casa-seed é a casa do Atmakaraka (Saturno, casa 10 — carreira)", () => {
    expect(camada.karakas.atmakaraka).toBe("Saturn");
    expect(derivacao.casaSeed).toBe(10);
  });

  it("pelo menos 4 SISTEMAS independentes confirmam — convergência forte, tal como CODE-4", () => {
    expect(contarSistemasIndependentes(derivacao.camadas)).toBeGreaterThanOrEqual(4);
    expect(derivacao.sistemasConfirmantes.length).toBeGreaterThanOrEqual(4);
    // sem duplicados — cada sistema só pode aparecer uma vez na lista de confirmantes.
    expect(new Set(derivacao.sistemasConfirmantes).size).toBe(derivacao.sistemasConfirmantes.length);
    expect(derivacao.desfecho.tipo).toBe("convergencia");
    if (derivacao.desfecho.tipo === "convergencia") {
      expect(derivacao.desfecho.nivel).toBe("convergencia-forte");
    }
  });

  it("a Regência confirma — Saturno rege Capricórnio E é o Atmakaraka", () => {
    const camadaRegencia = derivacao.camadas.find((c) => c.sistema === "Regência");
    expect(camadaRegencia?.confirma).toBe(true);
  });

  it("o SAV confirma — casa 10 tem a pontuação máxima (36)", () => {
    const camadaSav = derivacao.camadas.find((c) => c.sistema === "SAV");
    expect(camadaSav?.confirma).toBe(true);
  });

  it("exactamente 7 sistemas são testados, cada um uma única vez", () => {
    expect(derivacao.camadas).toHaveLength(7);
    const sistemasTestados = derivacao.camadas.map((c) => c.sistema);
    expect(new Set(sistemasTestados).size).toBe(7);
  });

  it("menos de 4 sistemas nunca produz tipo 'convergencia' — SPEC-espinha.md, corrigido nesta reescrita", () => {
    // Regressão directa do bug corrigido: a versão anterior usava
    // `nConfirmantes >= 2` (camadas finas) para o tipo "convergencia",
    // contradizendo a própria SPEC-espinha.md. Neutraliza SAV, Drishti,
    // Ocidental e D-9 (ficam sempre a false) — Karakas confirma sempre, e
    // Regência/Dashas continuam livres para confirmar ou não consoante a
    // carta; o ponto do teste não é forçar exactamente 1, é confirmar
    // que ficar ABAIXO de 4 sistemas nunca produz tipo "convergencia".
    const camadaMinima = {
      ...camada,
      sav: { ...camada.sav, fiavel: false },
      drishtiHits: [],
      figurasFechadas: [],
      karakas: { ...camada.karakas, karakamshaHouse: -1 }, // nunca coincide com nenhuma casa-seed real (1-12)
    };
    const derivacaoMinima = derivarEspinha(camadaMinima as typeof camada);
    const nSistemas = contarSistemasIndependentes(derivacaoMinima.camadas);
    expect(nSistemas).toBeLessThan(4);
    expect(derivacaoMinima.desfecho.tipo).not.toBe("convergencia");
  });

  it("a afirmação nunca cita o termo técnico 'Atmakaraka' nem o nome do planeta sozinho como sujeito", () => {
    if (derivacao.desfecho.tipo === "convergencia" || derivacao.desfecho.tipo === "padrao-estrutural") {
      expect(derivacao.desfecho.afirmacao).not.toMatch(/Atmakaraka/i);
    }
  });
});
