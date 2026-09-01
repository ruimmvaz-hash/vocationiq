// FASE 1, Passo 3 — derivação da espinha, conforme SPEC-espinha.md.
//
// REESCRITO 25/08/2026 ("Correcções críticas ao motor v3", ponto 1) — a
// versão anterior contava CAMADAS (9 testes finos), não SISTEMAS
// independentes: três factos sobre o mesmo Atmakaraka (a casa onde está,
// a força/dignidade dele, o Karakamsha) contavam como 3 confirmações
// separadas, quando são o mesmo sistema (Karakas) visto três vezes. A
// própria SPEC-espinha.md já exigia mínimo 4 SISTEMAS — o comentário
// antigo deste ficheiro já dizia isso ("com menos de 4 camadas, só é
// admissível um padrão estrutural"), mas o código a seguir usava
// `nConfirmantes >= 2` para o tipo "convergencia", não `>= 4` — um bug
// real, corrigido aqui.
//
// OS 7 SISTEMAS TESTADOS (um teste por sistema, nunca mais do que um):
// Karakas, SAV, D-9 (Karakamsha), Regência, Drishti, Ocidental (figuras
// fechadas), Dashas. Lua/nakshatra, Stelliums e "força/dignidade do
// Atmakaraka" (os 3 testes finos que a versão anterior tinha a mais)
// deixaram de contar como sistemas próprios — decisão confirmada nesta
// sessão: não correspondem a nenhum dos sistemas listados no pedido, por
// isso saem da contagem (a dignidade do Atmakaraka continua a poder
// aparecer no TEXTO da espinha, só deixa de somar ao número de sistemas).
//
// TRÊS TESTES REINTERPRETADOS FACE À VERSÃO ANTERIOR — porque a versão
// anterior, ligada estritamente à casa-seed, não reproduzia os 5 sistemas
// que o pedido desta sessão deu como exemplo, já verificados, para a
// carta da Alice. Documentado em cada teste porquê:
//
//  · SAV — regra dada explicitamente nesta sessão: confirma se a
//    casa-seed tem SAV ≥ 32 (banda forte) OU se a casa de SAV máximo da
//    carta inteira coincide com a casa-seed ou com o Karakamsha. Para a
//    Alice (casa-seed 8, SAV 26 — médio; máximo da carta é a casa 5, SAV
//    35) NENHUMA das duas condições se verifica — SAV correctamente NÃO
//    confirma, como o pedido também confirmou explicitamente.
//
//  · Regência — a versão anterior só confirmava se o regente do
//    Ascendente estivesse NA casa-seed (para a Alice, Vénus rege o
//    Ascendente e está na casa 9 ≠ 8 — não confirmava). O pedido desta
//    sessão dá "Regência: lord da casa 1 (Vénus) na casa 9" como
//    confirmante para a Alice — o único critério mecânico e clássico que
//    reproduz isto é a FORÇA GERAL do regente do Ascendente (kendra ou
//    trikona a partir do Ascendente — casas 1, 4, 5, 7, 9, 10), não a
//    coincidência com a casa-seed. A casa 9 é trikona. Mantém-se também
//    a coincidência directa com a casa-seed como alternativa (é um sinal
//    ainda mais forte quando acontece).
//
//  · Ocidental (figuras fechadas) — a versão anterior só confirmava se o
//    Atmakaraka fosse vértice de uma figura fechada (para a Alice, o Sol
//    não está em nenhuma — não confirmava). O pedido dá "Ocidental:
//    Grande Trígono Saturno-Rahu-MC" como confirmante, sem ligação directa
//    ao Atmakaraka ou à casa-seed. Mantido o teste original como sinal
//    mais forte, com um sinal adicional mais geral: existe pelo menos uma
//    figura fechada com orbe muito apertado (<3°, o mesmo limiar que
//    "activo agora" já usa nos trânsitos deste motor) — um sinal de que o
//    sistema ocidental tem algo estruturalmente dominante a dizer sobre
//    esta carta, mesmo sem tocar directamente na casa-seed.
//
// Drishti é um sistema novo nesta reescrita (não existia como teste
// próprio antes) — confirma se o Atmakaraka recebe pelo menos um drishti
// clássico de outro graha.

import { SIGN_RULERS } from "../lifeReport/signRulers";
import type { CamadaA, DesfechoEspinha, NiveauConfianca } from "../types-v3";
import { DEFINICOES_CASA, DEFINICOES_GRAHA } from "./linguagem-naveya";

export type SistemaEspinha = "Karakas" | "SAV" | "D-9" | "Regência" | "Drishti" | "Ocidental" | "Dashas";

/**
 * `peso` fica reservado para calibração futura (1-3, ainda não usado na
 * contagem — `contarSistemasIndependentes` só olha para `sistema`) — o
 * pedido desta sessão definiu o campo mas a função de contagem dada não
 * o usa; mantido aqui para não perder a forma pedida, sem inventar uma
 * lógica de peso que não foi especificada.
 */
export interface CamadaConfirmatoria {
  sistema: SistemaEspinha;
  nome: string;
  peso: number;
  confirma: boolean;
  evidencia: string;
}

export interface DerivacaoEspinha {
  casaSeed: number;
  camadas: CamadaConfirmatoria[];
  camadasConfirmantes: string[];
  sistemasConfirmantes: SistemaEspinha[];
  desfecho: DesfechoEspinha;
}

/** Só conta sistemas ÚNICOS entre as camadas que confirmam — duas camadas do mesmo sistema contam como 1. Forma exacta pedida nesta sessão. */
export function contarSistemasIndependentes(camadas: CamadaConfirmatoria[]): number {
  const sistemasUnicos = new Set(camadas.filter((c) => c.confirma).map((c) => c.sistema));
  return sistemasUnicos.size;
}

const KENDRA_TRIKONA = new Set([1, 4, 5, 7, 9, 10]);

/** Os 7 sistemas independentes, um teste por sistema, testados contra a casa-seed (a casa do Atmakaraka) — ver notas de topo do ficheiro para as 3 reinterpretações desta sessão. */
function avaliarCamadas(camada: CamadaA): CamadaConfirmatoria[] {
  const ak = camada.karakas.atmakaraka;
  const hAk = camada.posicoesPlanetarias[ak].house;
  const out: CamadaConfirmatoria[] = [];

  // 1 · Karakas — o próprio facto que ancora a casa-seed; conta sempre.
  out.push({ sistema: "Karakas", nome: "Karakas", peso: 3, confirma: true, evidencia: `${ak} (Atmakaraka) está na casa ${hAk}.` });

  // 2 · SAV — regra desta sessão: casa-seed com SAV forte (≥32), OU a casa de SAV máximo da carta coincide com a casa-seed ou com o Karakamsha.
  const scores = camada.sav.byHouse;
  const scoreHAk = scores.find((h) => h.casa === hAk)?.pontuacao ?? 0;
  const casaMaxSav = scores.length > 0 ? scores.reduce((m, h) => (h.pontuacao > m.pontuacao ? h : m)).casa : null;
  const savConfirma = camada.sav.fiavel && (scoreHAk >= 32 || casaMaxSav === hAk || casaMaxSav === camada.karakas.karakamshaHouse);
  out.push({
    sistema: "SAV",
    nome: "SAV",
    peso: 2,
    confirma: savConfirma,
    evidencia: !camada.sav.fiavel
      ? "SAV não fiável nesta corrida — sistema não avaliado."
      : savConfirma
        ? `Casa-seed (${hAk}) com SAV ${scoreHAk}${scoreHAk >= 32 ? " (banda forte)" : ""}, ou o máximo da carta (casa ${casaMaxSav}) coincide com a casa-seed/Karakamsha.`
        : `Casa-seed (${hAk}) tem SAV ${scoreHAk} (não é forte), e o máximo da carta é a casa ${casaMaxSav}, que não coincide com a casa-seed nem com o Karakamsha (${camada.karakas.karakamshaHouse}).`,
  });

  // 3 · D-9 (Karakamsha) — confirma se a casa do Karakamsha coincide com a casa-seed.
  const d9Confirma = camada.karakas.karakamshaHouse === hAk;
  out.push({
    sistema: "D-9",
    nome: "D-9 (Karakamsha)",
    peso: 3,
    confirma: d9Confirma,
    evidencia: d9Confirma
      ? `A casa do Karakamsha (D-9, casa ${camada.karakas.karakamshaHouse}) coincide com a casa-seed (${hAk}).`
      : `A casa do Karakamsha (D-9, casa ${camada.karakas.karakamshaHouse}) não coincide com a casa-seed (${hAk}).`,
  });

  // 4 · Regência — confirma se o regente do Ascendente está na casa-seed (sinal directo) OU ocupa kendra/trikona a partir do Ascendente (força clássica geral) — ver nota de topo.
  const regenteAsc = SIGN_RULERS[camada.ascendente.sign];
  const posRegenteAsc = camada.posicoesPlanetarias[regenteAsc];
  const naCasaSeed = regenteAsc === ak || posRegenteAsc.house === hAk;
  const emKendraTrikona = KENDRA_TRIKONA.has(posRegenteAsc.house);
  const regenciaConfirma = naCasaSeed || emKendraTrikona;
  out.push({
    sistema: "Regência",
    nome: "Regência",
    peso: 2,
    confirma: regenciaConfirma,
    evidencia:
      regenteAsc === ak
        ? `${regenteAsc} rege o Ascendente E é o Atmakaraka — a mesma peça faz os dois papéis.`
        : naCasaSeed
          ? `${regenteAsc} rege o Ascendente e está na casa ${posRegenteAsc.house}, a mesma da casa-seed.`
          : emKendraTrikona
            ? `${regenteAsc} rege o Ascendente e está na casa ${posRegenteAsc.house} — kendra/trikona a partir do Ascendente, uma posição de força clássica geral.`
            : `${regenteAsc} rege o Ascendente e está na casa ${posRegenteAsc.house} — nem a casa-seed, nem kendra/trikona.`,
  });

  // 5 · Drishti — confirma se o Atmakaraka recebe pelo menos um drishti clássico de outro graha.
  const drishtiRecebidos = camada.drishtiHits.filter((d) => d.to === ak);
  const drishtiConfirma = drishtiRecebidos.length > 0;
  out.push({
    sistema: "Drishti",
    nome: "Drishti",
    peso: 1,
    confirma: drishtiConfirma,
    evidencia: drishtiConfirma
      ? `${ak} (Atmakaraka) recebe drishti de ${drishtiRecebidos.map((d) => d.from).join(", ")}.`
      : `${ak} (Atmakaraka) não recebe nenhum drishti clássico nesta carta.`,
  });

  // 6 · Ocidental (figuras fechadas) — confirma se o Atmakaraka é vértice de uma figura (sinal directo) OU existe pelo menos uma figura muito apertada (<3°, mesmo limiar de "activo agora" já usado nos trânsitos) — ver nota de topo.
  const akEmFigura = camada.figurasFechadas.some((f) => f.pontos.includes(ak));
  const figuraApertada = camada.figurasFechadas.find((f) => f.orbe < 3);
  const ocidentalConfirma = akEmFigura || figuraApertada != null;
  out.push({
    sistema: "Ocidental",
    nome: "Ocidental (figuras fechadas)",
    peso: 2,
    confirma: ocidentalConfirma,
    evidencia: akEmFigura
      ? `${ak} (Atmakaraka) é vértice de pelo menos uma figura fechada.`
      : figuraApertada
        ? `${figuraApertada.tipo} (${figuraApertada.pontos.join("–")}) com orbe muito apertado (${figuraApertada.orbe.toFixed(2)}°) — sinal estrutural dominante nesta carta, mesmo sem tocar directamente o Atmakaraka.`
        : "Nenhuma figura fechada envolve o Atmakaraka nem tem orbe apertado (<3°) nesta carta.",
  });

  // 7 · Dashas — confirma se o senhor da mahadasha ou da antardasha está na casa-seed.
  const mahaLord = camada.dashaAtual.mahadasha.lord;
  const antarLord = camada.dashaAtual.antardasha.lord;
  const dashaConfirma = [mahaLord, antarLord].some((lord) => {
    const pos = camada.posicoesPlanetarias[lord as keyof typeof camada.posicoesPlanetarias];
    return pos && pos.house === hAk;
  });
  out.push({
    sistema: "Dashas",
    nome: "Dashas",
    peso: 2,
    confirma: dashaConfirma,
    evidencia: dashaConfirma
      ? `O senhor da mahadasha (${mahaLord}) ou da antardasha (${antarLord}) está na casa-seed (${hAk}).`
      : `Nem o senhor da mahadasha (${mahaLord}) nem o da antardasha (${antarLord}) estão na casa-seed (${hAk}).`,
  });

  return out;
}

/**
 * Compõe a afirmação Naveya sem cirurgia de regex sobre as definições
 * (a primeira versão tentava cortar artigos iniciais com uma regex frágil
 * e produzia frases sem gramática — ex.: "O que decide que exige tempo...").
 * Em vez disso, cada definição entra inteira, como cláusula própria — a
 * ligação entre as duas é feita pela estrutura da frase, não por costurar
 * fragmentos.
 */
function semPontoFinal(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}

function construirAfirmacaoNaveya(camada: CamadaA, hAk: number): string {
  const ak = camada.karakas.atmakaraka;
  const defGraha = semPontoFinal(DEFINICOES_GRAHA[ak]);
  const defCasa = semPontoFinal(DEFINICOES_CASA[hAk]);
  return `Quem esta pessoa é, por dentro, e ${defCasa} não são dois assuntos — são o mesmo. A força que decide os dois: ${defGraha}.`;
}

/**
 * Deriva a espinha a partir da Camada A. Ver nota de topo sobre o âmbito
 * (um candidato, seedado no Atmakaraka — não o gerador geral de
 * candidatos de SPEC-espinha.md) e sobre a reescrita de 25/08/2026
 * (contagem por SISTEMA independente, não por camada fina).
 */
export function derivarEspinha(camada: CamadaA): DerivacaoEspinha {
  const ak = camada.karakas.atmakaraka;
  const hAk = camada.posicoesPlanetarias[ak].house;
  const camadas = avaliarCamadas(camada);
  const camadasConfirmantes = camadas.filter((c) => c.confirma).map((c) => c.nome);
  const sistemasConfirmantes = [...new Set(camadas.filter((c) => c.confirma).map((c) => c.sistema))];
  const nSistemas = sistemasConfirmantes.length;

  let desfecho: DesfechoEspinha;
  if (nSistemas >= 4) {
    // SPEC-espinha.md: mínimo 4 SISTEMAS independentes para "convergencia"
    // — corrigido nesta reescrita (a versão anterior usava >= 2 camadas
    // finas, contradizendo o seu próprio comentário e a spec).
    const nivel: NiveauConfianca = "convergencia-forte";
    desfecho = { tipo: "convergencia", afirmacao: construirAfirmacaoNaveya(camada, hAk), camadas: sistemasConfirmantes, nivel };
  } else if (nSistemas >= 1) {
    desfecho = {
      tipo: "padrao-estrutural",
      afirmacao: construirAfirmacaoNaveya(camada, hAk),
      justificacao: `${nSistemas} sistema(s) independente(s) confirma(m) (${sistemasConfirmantes.join(", ")}) — abaixo do mínimo de 4 para convergência; contado como padrão estrutural, não como convergência.`,
    };
  } else {
    desfecho = {
      tipo: "ausencia-declarada",
      motivo: "Nenhum dos 7 sistemas independentes verificados confirma a casa do Atmakaraka como tema central — a carta não distingue um padrão dominante por este método.",
    };
  }

  return { casaSeed: hAk, camadas, camadasConfirmantes, sistemasConfirmantes, desfecho };
}
