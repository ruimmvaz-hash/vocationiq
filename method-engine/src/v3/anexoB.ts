// FASE 1 — ANEXO B, TÉCNICO E DETERMINÍSTICO. Ao contrário de todo o resto
// de prompt-v3.ts (que constrói STRINGS de prompt para um LLM escrever),
// este ficheiro constrói directamente o objecto `AnexoB` — função pura,
// mesmo input, mesmo output, sempre, tal como a Abertura (secção 0) e os
// diagramas (diagramas.ts). Nenhuma chamada a LLM aqui.
//
// DECISÕES 1B + 2A + 3A (23/08/2026, depois de reportado o conflito entre
// o pedido do Anexo B e `types-v3.ts` tal como estava):
//  1B — `figurasFechadas` passou de `string[]` a `EntradaFiguraFechada[]`
//       (types-v3.ts), com os pontos já traduzidos para linguagem Naveya.
//  2A — `AnexoB` ganhou `rodaCasas: string` e `convergenciaEspinha?: string`
//       — os 2 diagramas SVG (diagramas.ts), que não tinham campo nenhum.
//  3A — `FiguraFechada.orbe` (figurasFechadasV3.ts) passou a guardar o
//       maior orbe real entre os aspectos que compõem cada figura.
//
// GAP NOVO, ENCONTRADO E FLAGGED AO IMPLEMENTAR — "MC" (Meio-Céu,
// tropical) aparece como vértice em várias figuras fechadas (T-Quadrados,
// Yods — ver figurasFechadasV3.test.ts para a carta da Melina), mas nunca
// teve uma definição Naveya em lado nenhum do motor até agora (só existe
// no sistema sideral/whole-sign, onde "casa 10" já cobre o mesmo tema).
// `DEFINICAO_MC_TROPICAL` abaixo é uma primeira tradução, ESCRITA AGORA,
// NÃO verificada contra CODE-4 ou Prokerala (ao contrário de quase tudo o
// resto deste motor) — calibrada por analogia temática à casa 10, mas é
// uma extensão nova, não uma reafirmação de algo já confirmado. Fica
// assinalada aqui e no relatório desta sessão para decisão futura.
//
// TABELA DE RASTREIO — versão SIMPLIFICADA, por pedido explícito: os
// prompts de prompt-v3.ts não registam `usedFactIds` estruturados (cada
// `s(...)` ali é uma chamada solta, não uma lista rastreável por secção).
// Construir aqui uma tabela completa e fiel às 14 secções exigiria
// duplicar manualmente o que já está em prompt-v3.ts — exactamente o
// tipo de "parsing frágil" que a nota de types-v3.ts (Anexo B) queria
// evitar. Em vez disso, a tabela aqui é derivada MECANICAMENTE dos
// mesmos dados que `construirAnexoB` já calcula (a espinha, o SAV por
// banda, as figuras fechadas) — sempre correcta porque vem da mesma
// fonte, nunca escrita à mão. Rastreio completo por secção fica para
// quando `orquestrador.ts` existir e puder registar `usedFactIds` de
// verdade por chamada.

import type { CamadaA, AnexoB, EntradaFiguraFechada, PontoFiguraNaveya, EntradaRastreio, SavPorCasa } from "../types-v3";
import type { DerivacaoEspinha } from "./espinha";
import type { PontoFigura } from "./figurasFechadasV3";
import type { Graha } from "../lifeReport/types";
import { construirRodaCasas, construirConvergenciaEspinha } from "./diagramas";
import { NOME_GRAHA_PT, DEFINICOES_CASA, traduzirSinal, bandaAbsolutaSav } from "./linguagem-naveya";
import { SIGN_RULERS } from "../lifeReport/signRulers";

/**
 * Tradução Naveya do Meio-Céu tropical — ver nota de topo do ficheiro.
 * NOVA, NÃO VERIFICADA contra fonte externa (ao contrário de quase todas
 * as outras definições deste motor).
 */
const DEFINICAO_MC_TROPICAL =
  "o ponto mais alto do céu no mapa tropical — o topo do reconhecimento e da carreira pública, medido pelo sistema ocidental; o equivalente temático, nesse sistema, ao que a casa 10 mede no sistema sideral.";

function traduzirPontoFigura(p: PontoFigura): PontoFiguraNaveya {
  if (p === "Ascendente") return { termo: "Ascendente", definicao: DEFINICOES_CASA[1] };
  if (p === "MC") return { termo: "MC", definicao: DEFINICAO_MC_TROPICAL };
  const termo = NOME_GRAHA_PT[p as Graha] ?? p;
  const definicao = traduzirSinal(p, "vértice de figura fechada") ?? "(sem definição catalogada)";
  return { termo, definicao };
}

function construirFigurasFechadas(camada: CamadaA): EntradaFiguraFechada[] {
  return camada.figurasFechadas.map((f) => ({
    tipo: f.tipo,
    pontos: f.pontos.map(traduzirPontoFigura),
    detalhe: f.detalhe,
    orbe: f.orbe,
  }));
}

function construirSarvashtakavarga(camada: CamadaA): SavPorCasa[] {
  if (!camada.sav.fiavel) return [];
  return camada.sav.byHouse
    .slice()
    .sort((a, b) => a.casa - b.casa)
    .map((h) => ({
      casa: h.casa,
      pontuacao: h.pontuacao,
      interpretacao: `${bandaAbsolutaSav(h.pontuacao)} — ${h.pontuacao}/56`,
    }));
}

/**
 * Tabela de rastreio simplificada (ver nota de topo) — derivada
 * mecanicamente da espinha, do SAV por banda e das figuras fechadas.
 */
function construirTabelaRastreio(camada: CamadaA, espinha: DerivacaoEspinha): EntradaRastreio[] {
  const linhas: EntradaRastreio[] = [];

  const desfecho = espinha.desfecho;
  if ("afirmacao" in desfecho) {
    linhas.push({
      afirmacao: desfecho.afirmacao,
      base: `Atmakaraka (${camada.karakas.atmakaraka}) na casa ${espinha.casaSeed}; camadas confirmantes: ${espinha.camadasConfirmantes.join(", ") || "nenhuma"}`,
      seccao: "Secção 3 — O Veredicto (espinha)",
    });
  } else {
    linhas.push({
      afirmacao: "Ausência declarada de espinha",
      base: desfecho.motivo,
      seccao: "Secção 3 — O Veredicto (espinha)",
    });
  }

  if (camada.sav.fiavel) {
    const forte = camada.sav.byHouse.filter((h) => bandaAbsolutaSav(h.pontuacao) === "forte").map((h) => h.casa);
    const fraco = camada.sav.byHouse.filter((h) => bandaAbsolutaSav(h.pontuacao) === "fraco").map((h) => h.casa);
    linhas.push({
      afirmacao: `Áreas de apoio mais alto: casas ${forte.join(", ")}. Áreas de apoio mais baixo: casas ${fraco.join(", ")}.`,
      base: `Sarvashtakavarga por casa, banda absoluta (forte ≥32, fraco <25): ${camada.sav.byHouse.map((h) => `${h.casa}:${h.pontuacao}`).join(" ")}`,
      seccao: "Secção 5 — A Forma de Vida",
    });
  }

  for (const f of camada.figurasFechadas) {
    linhas.push({
      afirmacao: `Figura fechada: ${f.tipo} (${f.pontos.join("–")})`,
      base: `${f.detalhe} Orbe real (maior elo): ${f.orbe.toFixed(2)}°.`,
      seccao: "Anexo B — Figuras Fechadas",
    });
  }

  // CORRECÇÃO 25/08/2026 ("Correcções críticas ao motor v3", ponto 6) —
  // a tabela só cobria 3 das 14 secções. Acrescentadas 4 linhas
  // mecânicas para as Secções 4, 8, 9 e 12 — os SINAIS que o prompt de
  // cada uma disponibiliza ao LLM (não o que o LLM escolheu escrever,
  // que não é rastreável sem parsing frágil do texto final — a mesma
  // limitação já documentada para as outras linhas desta tabela).
  const ak = camada.karakas.atmakaraka;
  linhas.push({
    afirmacao: "A identidade profunda liga o Atmakaraka, o Ascendente e o propósito de alma do Karakamsha.",
    base: `Atmakaraka: ${ak} (casa ${camada.posicoesPlanetarias[ak].house}). Ascendente: ${camada.ascendente.sign}. Karakamsha (D-9): ${camada.karakas.atmakarakaD9Sign}.`,
    seccao: "Secção 4 — Quem És",
  });
  linhas.push({
    afirmacao: "De onde vem o dinheiro liga-se ao Atmakaraka, ao que a pessoa possui e vale (casa 2) e à carreira/nome público (casa 10).",
    base: `Atmakaraka: ${ak}. Casa 2 (ocupantes): ${(Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]).filter(([, p]) => p.house === 2).map(([g]) => g).join(", ") || "nenhum"}. Casa 10 (ocupantes): ${(Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]).filter(([, p]) => p.house === 10).map(([g]) => g).join(", ") || "nenhum"}.`,
    seccao: "Secção 8 — Dinheiro",
  });
  linhas.push({
    afirmacao: "Como és vista liga-se à casa 1 (primeira impressão), à Arudha Lagna (imagem pública) e à casa 10 (o que decide o preço).",
    base: `Casa 1 (regente): ${SIGN_RULERS[camada.ascendente.sign]}. Arudha Lagna: casa ${camada.arudhaLagna}. Atmakaraka (o que decide o preço): ${ak}.`,
    seccao: "Secção 9 — Como és Vista",
  });
  linhas.push({
    afirmacao: "O Plano parte da espinha e do período pessoal em curso (dasha actual).",
    base: `Espinha: casa-seed ${espinha.casaSeed}. Dasha actual: mahadasha ${camada.dashaAtual.mahadasha.lord}, antardasha ${camada.dashaAtual.antardasha.lord}.`,
    seccao: "Secção 12 — O Plano",
  });

  return linhas;
}

/**
 * Constrói o Anexo B — técnico, determinístico. Função pura: mesmo
 * `camada`/`espinha`, mesmo resultado, sempre. Nunca chama um LLM.
 */
export function construirAnexoB(camada: CamadaA, espinha: DerivacaoEspinha): AnexoB {
  const desfecho = espinha.desfecho;

  const naoCalculado = [...camada.naoCalculado];
  if (!camada.sav.fiavel) naoCalculado.push("SAV — tabelas não verificadas contra fonte externa");

  return {
    rodaCasas: construirRodaCasas(camada),
    convergenciaEspinha: desfecho.tipo === "convergencia" ? construirConvergenciaEspinha(camada, espinha) : undefined,
    sarvashtakavarga: construirSarvashtakavarga(camada),
    calculado: [...camada.calculado],
    naoCalculado,
    figurasFechadas: construirFigurasFechadas(camada),
    tabelaRastreio: construirTabelaRastreio(camada, espinha),
  };
}
