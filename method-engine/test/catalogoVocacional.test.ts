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
// da carta) — "ganha por ser comum, não por ser dela".
//
// TAREFA #38 (sistema em dois níveis, correcção do especialista) — o
// diagnóstico da Alice (mesmo mecanismo, carta diferente) mostrou que
// bloquear por completo qualquer candidata sem o planeta de maior peso
// também bloqueava candidatas genuínas cujo único indicador pessoal é o
// Atmakaraka/Amatyakaraka (posição técnica, não força — nunca a mesma
// coisa, ver catalogoVocacional.ts). Testados três limiares binários
// diferentes (aceitar sempre; exigir sinal estrutural adicional; exigir
// peso próprio ≥1,3) e nenhum discriminou correctamente os dois casos —
// os números da Alice (Atmakaraka Sol, peso 1,02) e da Melina/Rui
// (Atmakaraka/Amatyakaraka Sol, peso 1,06-1,33) não seguem nenhum padrão
// de limiar único. A solução final não bloqueia — reclassifica: "Direito
// sem o planeta de maior peso" nunca deixou de ser o padrão a vigiar,
// mas agora aparece sempre como Nível 2 (confiança reduzida), nunca como
// Nível 1 (confiança plena) nem ausente. Estes testes confirmam os dois
// lados: a candidata continua a aparecer (não é suprimida), mas nunca
// classificada acima do que os dados sustentam.

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

  it("NUNCA propõe 'Direito' como candidata fora da lista de Nível 1 sem camada do planeta de maior peso — regressão directa ao bug documentado, agora como classificação em vez de exclusão (TAREFA #38)", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    for (const areaActual of ["Estética", "Gestora", "Contabilidade", "Empresária"]) {
      const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual, anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
      const direito = resultado.candidatasForaDaLista.find((c) => c.nome === "Direito");
      if (direito && direito.camadas.some((c: string) => c.startsWith("Planeta de maior peso"))) {
        expect(direito.nivelConfianca).toBe(1);
      } else if (direito) {
        // Sem camada do planeta de maior peso — nunca pode passar como
        // Nível 1 (confiança plena); tem sempre de vir classificada como
        // Nível 2 (confiança reduzida), nunca ausente e nunca disfarçada
        // de sinal tão forte quanto o planeta de maior peso.
        expect(direito.nivelConfianca).toBe(2);
      }
    }
  });

  it("toda candidata fora da lista tem um nível de confiança coerente com as suas próprias camadas (TAREFA #38 — Nível 1 = inclui o planeta de maior peso; Nível 2 = só Atmakaraka/Amatyakaraka, sem o planeta de maior peso) — vale para as 3, nunca só a primeira", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const maisForte = [...pesos].sort((a, b) => b.peso - a.peso)[0];
    expect(maisForte.planeta).toBe("Saturn");
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Estética", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    for (const candidata of resultado.candidatasForaDaLista) {
      expect(candidata.convergencia).toBeGreaterThanOrEqual(4);
      const temPlanetaDeMaiorPeso = candidata.camadas.some((c: string) => c.startsWith("Planeta de maior peso"));
      const temIndicadorFraco = candidata.camadas.some((c: string) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka"));
      if (temPlanetaDeMaiorPeso) {
        expect(candidata.nivelConfianca).toBe(1);
      } else {
        // Nunca chega aqui sem pelo menos um indicador pessoal — é o
        // próprio gate de elegibilidade em catalogarDestinos() que o
        // garante antes de a candidata existir.
        expect(temIndicadorFraco).toBe(true);
        expect(candidata.nivelConfianca).toBe(2);
      }
    }
  });

  it("'Direito' para a Melina, quando aparece, é sempre Nível 2 (só Amatyakaraka=Sol, nunca o planeta de maior peso=Saturno) — confirma o diagnóstico da ronda de regressão, nunca Nível 1", () => {
    const { axes, pesos, savPorCasa, atmakarakaInfo } = carregarMelina();
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "", anosExperiencia: "" }, atmakarakaInfo);
    const direito = resultado.candidatasForaDaLista.find((c) => c.nome === "Direito");
    expect(direito).toBeDefined();
    expect(direito?.nivelConfianca).toBe(2);
    expect(direito?.camadas.some((c: string) => c.startsWith("Planeta de maior peso"))).toBe(false);
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
  // regentesCasas/drishtiEmitidoPorPlaneta/earningModeDominante — campos
  // acrescentados por correcções desta ronda (eixo_do_rendimento, TAREFA
  // 4a/4b), preenchidos aqui com valores plausíveis só para o motor não
  // rebentar a ler `undefined` — este caso sintético nunca testou (nem
  // testa agora) as condições de eixo_do_rendimento em si, só o caminho
  // positivo original das 4 camadas.
  const regentesCasasSintetico = { 1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury", 7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter" };
  const drishtiVazio = { Sun: [], Moon: [], Mars: [], Mercury: [], Jupiter: [], Venus: [], Saturn: [] };
  const axes = {
    amatyakaraka: "Saturn",
    earningMode: { house: 2, lord: "Venus" },
    earningModeDominante: [{ house: 2, lord: "Venus", label: "", score: 3, camadasConvergentes: 2, signals: [], planetsInHouse: [] }],
    regentesCasas: regentesCasasSintetico,
    drishtiEmitidoPorPlaneta: drishtiVazio,
    // missionAxis.karakamshaHouse — campo lido por "casa temática forte"
    // (Correcção 3); casa 1 nunca está na lista de casas temáticas
    // avaliadas, por isso nunca acrescenta um sinal a nenhuma delas —
    // este caso sintético continua a não testar essa camada nova.
    missionAxis: { karakamshaHouse: 1 },
  } as unknown as VocationIQAxes;
  const atmakarakaInfo: AtmakarakaInfo = { planeta: "Jupiter", nakshatra: "Punarvasu" };

  it("encontra 'Formação de Professores' entre as candidatas fora da lista (até 3 — TAREFA 1), com as 4 camadas esperadas", () => {
    const resultado = catalogarDestinos(axes, pesos, savPorCasa, { areaActual: "Gestão", anosExperiencia: "5 a 10 anos" }, atmakarakaInfo);
    const formacaoProfessores = resultado.candidatasForaDaLista.find((c) => c.nome === "Formação de Professores");
    expect(formacaoProfessores).toBeDefined();
    expect(formacaoProfessores!.convergencia).toBeGreaterThanOrEqual(4);
    expect(formacaoProfessores!.camadas.some((c: string) => c.startsWith("Planeta de maior peso"))).toBe(true);
    expect(formacaoProfessores!.camadas.some((c: string) => c.includes("Nakshatra"))).toBe(true);
    expect(formacaoProfessores!.camadas.some((c: string) => c.includes("Combinação"))).toBe(true);
    expect(formacaoProfessores!.camadas.some((c: string) => c.includes("Ensino"))).toBe(true);
  });
});
