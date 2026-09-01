// FASE 1, Passo 4 — geração de candidatos a "descoberta" (secção 2 do v3).
// Uma descoberta precisa de: um facto verificável na Camada A, um nível
// de confiança DERIVADO desse facto (nunca inventado por quem escreve o
// texto), e um ângulo narrativo distinto das outras quatro.
//
// ÂMBITO — não é um motor geral de mineração de factos (isso exigiria uma
// enumeração muito mais larga de padrões). Cobre 7 fontes mecânicas,
// escolhidas por serem verificáveis sem ambiguidade a partir do que já
// está em CamadaA: a espinha, Vargottama, os dois extremos de SAV, a
// figura fechada mais forte, um extremo de dignidade fora do Atmakaraka,
// e a dasha actual. Para cartas mais pobres em sinais, pode não haver 5
// candidatos distintos — sinalizado, não escondido (ver
// `gerarDescobertasCandidatas`, campo `avisos`).

import { CLASSICAL_GRAHAS, type ClassicalGraha } from "../lifeReport/types";
import type { CamadaA, NiveauConfianca } from "../types-v3";
import type { DerivacaoEspinha } from "./espinha";
import { formatarSinalParaPrompt, termotecnicoDeDignidadeClassica, type SinalParaPrompt } from "./linguagem-naveya";

export interface DescobertaCandidata {
  /** Rótulo interno, só para depuração/relatório — nunca vai para o LLM. */
  fonteInterna: string;
  nivel: NiveauConfianca;
  sinais: SinalParaPrompt[];
  /** Uma frase Naveya-segura que orienta o ÂNGULO da descoberta (não o texto a copiar). */
  angulo: string;
  /** Casa(s) envolvida(s) — usado só para verificar distinção entre candidatos, nunca exposto ao LLM como "casa N". */
  casasEnvolvidas: number[];
}

const NIVEL_ORDEM: Record<NiveauConfianca, number> = { "convergencia-forte": 3, "sinal-forte": 2, leitura: 1, "em-aberto": 0 };

function sinalGraha(graha: ClassicalGraha, contexto: string): SinalParaPrompt[] {
  const s = formatarSinalParaPrompt(graha, contexto);
  return s ? [s] : [];
}

function sinalCasa(casa: number, contexto: string): SinalParaPrompt[] {
  const s = formatarSinalParaPrompt(`casa-${casa}`, contexto);
  return s ? [s] : [];
}

function sinalDignidade(camada: CamadaA, graha: ClassicalGraha, contexto: string): SinalParaPrompt[] {
  const dign = camada.dignidades[graha];
  const termotecnico = dign.panchadha ?? termotecnicoDeDignidadeClassica(dign.classica);
  if (!termotecnico) return [];
  const s = formatarSinalParaPrompt(termotecnico, contexto);
  return s ? [s] : [];
}

/** 1 · A espinha, ou a sua consequência mais directa — candidata sempre forçada a 1ª posição pelo chamador. */
function candidataEspinha(camada: CamadaA, espinha: DerivacaoEspinha): DescobertaCandidata {
  const ak = camada.karakas.atmakaraka;
  const nivel = espinha.desfecho.tipo === "convergencia" ? espinha.desfecho.nivel : espinha.desfecho.tipo === "padrao-estrutural" ? "leitura" : "em-aberto";
  return {
    fonteInterna: "espinha (consequência directa)",
    nivel,
    sinais: [...sinalGraha(ak, "Atmakaraka"), ...sinalCasa(espinha.casaSeed, "a área de vida onde o Atmakaraka está instalado")],
    angulo: "Esta descoberta é a consequência mais directa e visível do tema central do relatório — não repita a afirmação central, mostre-a a funcionar na prática.",
    casasEnvolvidas: [espinha.casaSeed],
  };
}

/** 2 · Vargottama — mesma posição em D-1 e D-9, um facto raro e verificável. */
function candidatasVargottama(camada: CamadaA): DescobertaCandidata[] {
  return camada.karakas.vargottama
    .filter((g): g is ClassicalGraha => (CLASSICAL_GRAHAS as readonly string[]).includes(g))
    .map((g) => ({
      fonteInterna: `vargottama (${g})`,
      nivel: "sinal-forte" as NiveauConfianca, // 2 camadas independentes de acordo: D-1 e D-9
      sinais: sinalGraha(g, "vargottama — a mesma força confirmada em duas leituras independentes"),
      angulo: "Esta descoberta é sobre algo que se confirma de duas formas independentes na carta — dito não como opinião, como facto duplamente verificado.",
      casasEnvolvidas: [camada.posicoesPlanetarias[g].house],
    }));
}

/** 3 · A casa com o SAV mais alto — onde a vida flui melhor. */
function candidataSavAlto(camada: CamadaA): DescobertaCandidata | null {
  if (!camada.sav.fiavel || camada.sav.byHouse.length === 0) return null;
  const ordenado = [...camada.sav.byHouse].sort((a, b) => b.pontuacao - a.pontuacao);
  const [maisAlto, segundo] = ordenado;
  const margem = maisAlto.pontuacao - (segundo?.pontuacao ?? 0);
  return {
    fonteInterna: `SAV mais alto (casa ${maisAlto.casa}, ${maisAlto.pontuacao})`,
    nivel: margem >= 4 ? "sinal-forte" : "leitura",
    sinais: sinalCasa(maisAlto.casa, "a área com mais apoio de todas as doze"),
    angulo: "Esta descoberta é sobre onde o esforço rende mais — nunca sobre talento, sobre apoio do terreno.",
    casasEnvolvidas: [maisAlto.casa],
  };
}

/** 4 · A casa com o SAV mais baixo (critério 9: só se <25) — onde o mesmo esforço rende menos. Regra 7 do v2: nunca sem dizer que a capacidade está intacta. */
function candidataSavBaixo(camada: CamadaA): DescobertaCandidata | null {
  if (!camada.sav.fiavel) return null;
  const baixo = camada.sav.byHouse.find((h) => h.pontuacao < 25);
  if (!baixo) return null;
  return {
    fonteInterna: `SAV baixo (casa ${baixo.casa}, ${baixo.pontuacao})`,
    nivel: "leitura",
    sinais: sinalCasa(baixo.casa, "uma área onde o apoio é baixo — a capacidade não está em causa, só o retorno"),
    angulo:
      "Esta descoberta tem de separar capacidade de retorno (regra 7 do v2): diga sempre que a competência aqui está intacta, e que o que falta é alavanca — nunca sugira que a pessoa não serve para isto.",
    casasEnvolvidas: [baixo.casa],
  };
}

/** 5 · A figura fechada mais forte (mais pontos envolvidos) — nunca nomear o tipo de figura no texto final. */
function candidataFiguraFechada(camada: CamadaA): DescobertaCandidata | null {
  if (camada.figurasFechadas.length === 0) return null;
  const maisForte = [...camada.figurasFechadas].sort((a, b) => b.pontos.length - a.pontos.length)[0];
  const grahasEnvolvidos = maisForte.pontos.filter((p): p is ClassicalGraha => (CLASSICAL_GRAHAS as readonly string[]).includes(p));
  const casas = grahasEnvolvidos.map((g) => camada.posicoesPlanetarias[g].house);
  return {
    fonteInterna: `figura fechada mais forte (${maisForte.tipo}, ${maisForte.pontos.join("-")})`,
    nivel: maisForte.pontos.length >= 4 ? "sinal-forte" : "leitura",
    sinais: grahasEnvolvidos.slice(0, 2).flatMap((g) => sinalGraha(g, "um ponto de tensão estrutural que atravessa vários lados da carta")),
    angulo:
      "Esta descoberta é sobre uma tensão que aparece em vários pontos da carta ao mesmo tempo — nunca nomeie o padrão geométrico (nada de T-quadrado, Yod, cruz), descreva só o que essa tensão FAZ na vida da pessoa.",
    casasEnvolvidas: casas,
  };
}

/** 6 · Um extremo de dignidade (Exaltado/Debilitado) fora do Atmakaraka — para não repetir a descoberta 1. */
function candidataDignidadeExtrema(camada: CamadaA, akExcluir: ClassicalGraha): DescobertaCandidata | null {
  const candidatos = CLASSICAL_GRAHAS.filter((g) => g !== akExcluir && (camada.dignidades[g].classica === "Exalted" || camada.dignidades[g].classica === "Debilitated"));
  if (candidatos.length === 0) return null;
  const escolhido = candidatos[0];
  return {
    fonteInterna: `dignidade extrema (${escolhido}, ${camada.dignidades[escolhido].classica})`,
    nivel: "leitura",
    sinais: [...sinalGraha(escolhido, "um traço em estado extremo, para além do tema central"), ...sinalDignidade(camada, escolhido, "força desse traço")],
    angulo: "Esta descoberta mostra um traço diferente do tema central — outra faceta da pessoa, não uma repetição.",
    casasEnvolvidas: [camada.posicoesPlanetarias[escolhido].house],
  };
}

/** 7 · A dasha actual, quando o seu senhor está numa posição notável (exaltado/domicílio/vargottama) — "porquê agora". */
function candidataDashaNotavel(camada: CamadaA): DescobertaCandidata | null {
  const lord = camada.dashaAtual.mahadasha.lord;
  if (!(CLASSICAL_GRAHAS as readonly string[]).includes(lord)) return null; // Rahu/Ketu não têm dignidadeV3 modelada aqui
  const classico = lord as ClassicalGraha;
  const dign = camada.dignidades[classico];
  const notavel = dign.classica === "Exalted" || dign.classica === "Own" || camada.karakas.vargottama.includes(classico);
  if (!notavel) return null;
  return {
    fonteInterna: `dasha actual notável (${lord}, ${dign.classica})`,
    nivel: "sinal-forte",
    sinais: [...sinalGraha(classico, "o período de vida que está a decorrer agora"), ...sinalDignidade(camada, classico, "força desse período")],
    angulo: "Esta descoberta explica por que é AGORA que isto importa — o período actual está a favor deste traço, não é um traço solto no tempo.",
    casasEnvolvidas: [camada.posicoesPlanetarias[classico].house],
  };
}

export interface ResultadoDescobertas {
  candidatas: DescobertaCandidata[];
  avisos: string[];
}

/**
 * Gera até 7 candidatas, ordena por força (a espinha fica sempre em 1º,
 * as restantes por nível de confiança), e devolve as 5 mais fortes.
 *
 * DISTINÇÃO (regra 4 do v2 — "nenhum elemento aparece duas vezes") — só se
 * rejeita uma candidata cujas casas envolvidas coincidem com as da
 * PRIMEIRA candidata (a espinha): repetir a casa-seed seria repetir o
 * tema central, não uma descoberta nova. Entre as restantes, a
 * sobreposição de casa é permitida — cada função-fonte (Vargottama, SAV,
 * figura fechada, dignidade, dasha) já é um ÂNGULO distinto por
 * construção, mesmo quando toca no mesmo planeta ou casa que outra (ex.:
 * "a Lua é Vargottama" e "a Lua está numa tensão estrutural" são duas
 * histórias diferentes sobre a Lua, não a mesma repetida). Uma primeira
 * versão desta função rejeitava por qualquer sobreposição de casa entre
 * TODAS as candidatas e ficava com só 3 de 5 para a Melina — corrigido
 * porque isso confundia "mesmo dado" com "mesmo tema".
 */
export function gerarDescobertasCandidatas(camada: CamadaA, espinha: DerivacaoEspinha): ResultadoDescobertas {
  const avisos: string[] = [];
  const primeira = candidataEspinha(camada, espinha);

  const restantesBrutas = [
    ...candidatasVargottama(camada),
    candidataSavAlto(camada),
    candidataSavBaixo(camada),
    candidataFiguraFechada(camada),
    candidataDignidadeExtrema(camada, camada.karakas.atmakaraka),
    candidataDashaNotavel(camada),
  ].filter((c): c is DescobertaCandidata => c !== null);

  const casasDaEspinha = new Set(primeira.casasEnvolvidas);
  const restantesOrdenadas = restantesBrutas.sort((a, b) => NIVEL_ORDEM[b.nivel] - NIVEL_ORDEM[a.nivel]);
  const restantesDistintas: DescobertaCandidata[] = [];
  for (const c of restantesOrdenadas) {
    if (c.casasEnvolvidas.every((casa) => casasDaEspinha.has(casa))) continue; // repete inteiramente o tema da espinha — rejeitado
    restantesDistintas.push(c);
    if (restantesDistintas.length === 4) break;
  }

  const candidatas = [primeira, ...restantesDistintas];
  if (candidatas.length < 5) {
    avisos.push(`Só ${candidatas.length} descobertas distintas encontradas nesta carta — abaixo das 5 exigidas pelo v3. Não inventadas para completar; secção 2 fica com o que a carta sustenta, e o facto fica registado aqui para revisão humana.`);
  }

  return { candidatas, avisos };
}
