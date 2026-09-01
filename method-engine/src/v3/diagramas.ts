// FASE 1 — DIAGRAMAS. Achado da análise comparativa contra os relatórios
// do Rui (docs/ANALISE-COMPARATIVA-RUI-vs-v2v3-23Ago.md, secção 1.1): as
// regras v2/v3 só especificam PROSA — mas o dispositivo mais distintivo
// dos relatórios anteriores é visual. Duas peças, replicadas aqui como
// SVG determinístico (sem LLM — tal como a Abertura, isto é código puro,
// gerado directamente da Camada A):
//
//  1. `construirRodaCasas` — a roda das 12 casas (v7-MELHORADO-com-roda):
//     apoio (Sarvashtakavarga) por casa, em cor, com um anel interior a
//     marcar presença de planetas. Traduz uma tabela de 12 números numa
//     imagem que se lê em segundos.
//  2. `construirConvergenciaEspinha` — o diagrama de "cadeia"/"convergência"
//     do v7: cada camada que confirma a espinha (espinha.ts,
//     `camadasConfirmantes`) converge visualmente para um único ponto —
//     a área da vida que é a espinha deste relatório. Mostra a espinha,
//     em vez de só a descrever em prosa.
//
// Nenhum dos dois nomeia termos técnicos no SVG — os rótulos vêm de
// `DEFINICOES_CASA`/`PAPEL_CAMADA`, já em linguagem Naveya, tal como o
// resto do motor. Cores e geometria são calculadas (nunca copiadas dos
// SVGs do Rui, que são estáticos e específicos daquela carta) — para
// funcionar com os números de QUALQUER carta.

import type { CamadaA } from "../types-v3";
import type { DerivacaoEspinha } from "./espinha";
import { DEFINICOES_CASA, ROTULO_CASA_NAVEYA, bandaAbsolutaSav } from "./linguagem-naveya";
import { PAPEL_CAMADA } from "./prompt-v3";
import type { Graha } from "../lifeReport/types";

// ── Paleta — auto-contida, sem dependência de CSS externo ───────────────
const COR_TINTA = "#191d1b";
const COR_SUAVE = "#4a534e";
const COR_PAPEL = "#faf8f4";
const COR_REGRA = "#d9d5c9";
const COR_ACENTO = "#1f4a3d";
const COR_FORTE = "#4f7a5c";
const COR_MEDIO = "#a89b7f";
const COR_FRACO = "#b4634a";
const COR_PRESENCA = "#2c3a33";
const COR_VAZIO = "#ded9cc";

const COR_BRASS = "#B88A52";

/**
 * CORRIGIDO 25/08/2026 ("Correcções críticas ao motor v3", ponto 4) — o
 * fundador identificou sobreposição visual dos rótulos perto do topo da
 * roda (casas 11, 12 e 1, que ficam angularmente próximas nessa zona).
 * Versões curtas de uma só palavra, dadas literalmente nesta sessão,
 * usadas SÓ para essas 3 casas — as outras 9 mantêm o rótulo completo de
 * `ROTULO_CASA_NAVEYA`. Só as 3 que precisam entram aqui; não se inventa
 * uma versão curta para as restantes, que já cabem sem se sobrepor.
 */
const ROTULO_CASA_CURTO: Record<number, string> = {
  1: "presença",
  11: "rede",
  12: "silêncio",
};

/** Quebra um rótulo em 1 ou 2 linhas — divide no espaço mais próximo do meio quando o rótulo é longo, para caber junto à roda sem se sobrepor. */
function partirRotuloEmLinhas(rotulo: string): string[] {
  if (rotulo.length <= 14) return [rotulo];
  const meio = Math.floor(rotulo.length / 2);
  let melhorEspaco = -1;
  let melhorDist = Infinity;
  for (let i = 0; i < rotulo.length; i++) {
    if (rotulo[i] === " ") {
      const dist = Math.abs(i - meio);
      if (dist < melhorDist) {
        melhorDist = dist;
        melhorEspaco = i;
      }
    }
  }
  if (melhorEspaco === -1) return [rotulo];
  return [rotulo.slice(0, melhorEspaco), rotulo.slice(melhorEspaco + 1)];
}

function polarParaCartesiano(cx: number, cy: number, r: number, anguloGraus: number): { x: number; y: number } {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Path de um "gomo" (wedge anelar) entre dois raios e dois ângulos — a mesma forma geométrica que qualquer roda de 12 casas precisa, calculada, nunca copiada de uma carta específica. */
function pathGomo(cx: number, cy: number, rInterno: number, rExterno: number, anguloInicio: number, anguloFim: number): string {
  const p1 = polarParaCartesiano(cx, cy, rExterno, anguloFim);
  const p2 = polarParaCartesiano(cx, cy, rExterno, anguloInicio);
  const p3 = polarParaCartesiano(cx, cy, rInterno, anguloInicio);
  const p4 = polarParaCartesiano(cx, cy, rInterno, anguloFim);
  const largeArc = anguloFim - anguloInicio <= 180 ? 0 : 1;
  return `M${p1.x.toFixed(2)},${p1.y.toFixed(2)} A${rExterno},${rExterno} 0 ${largeArc} 0 ${p2.x.toFixed(2)},${p2.y.toFixed(2)} L${p3.x.toFixed(2)},${p3.y.toFixed(2)} A${rInterno},${rInterno} 0 ${largeArc} 1 ${p4.x.toFixed(2)},${p4.y.toFixed(2)} Z`;
}

function escaparXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Constrói a roda das 12 casas (Sarvashtakavarga + presença), em SVG
 * auto-contido. RECONSTRUÍDA 23/08/2026 para replicar exactamente a
 * geometria de Relatorio-Rui-v7-MELHORADO-com-roda.html (viewBox
 * 620×620, centro 310,310, dois anéis concêntricos com gap sempre
 * visível), com 4 correcções específicas pedidas nesta sessão:
 *  1. Contraste do número da casa — cor escura sobre fundo claro (casas
 *     vazias), branca sobre fundo escuro (casas ocupadas). O original do
 *     Rui usava sempre branco, ilegível sobre o anel vazio claro.
 *  2. Banda ABSOLUTA de SAV (ver `bandaAbsolutaSav`), não por ranking de
 *     posição — a mesma lógica que a Secção 5 usa para os 3 grupos.
 *  3. Rótulos em `ROTULO_CASA_NAVEYA` (tradução fixa, dada literalmente),
 *     não a paráfrase livre anterior.
 *  4. Marca de casa-seed (Atmakaraka) a brass (#B88A52) no meio do anel
 *     exterior dessa casa — derivada directamente da Camada A
 *     (`posicoesPlanetarias[atmakaraka].house`), sem precisar de receber
 *     a espinha como argumento (é o mesmo valor, por construção —
 *     ver espinha.ts).
 *
 * Geometria (idêntica ao ficheiro do Rui, verificada casa a casa):
 *  · anel exterior (SAV): raio 196→246, sempre, cor por banda absoluta.
 *  · anel interior (presença): raio interior 118 sempre; raio exterior
 *    140 (vazia) / 144 (1 ocupante) / 170 (2+ ocupantes) — nunca por
 *    SAV, por CONTAGEM de planetas nessa casa.
 *  · gap sempre visível entre os dois anéis (170 no máximo, até 196).
 *
 * Quando `!camada.sav.fiavel`, devolve um SVG honesto de ausência em vez
 * de desenhar uma roda com dados não fiáveis.
 */
export function construirRodaCasas(camada: CamadaA): string {
  if (!camada.sav.fiavel) {
    return `<svg viewBox="0 0 620 120" xmlns="http://www.w3.org/2000/svg"><rect width="620" height="120" fill="${COR_PAPEL}"/><text x="310" y="65" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="${COR_SUAVE}">Esta corrida não tem Sarvashtakavarga fiável — a roda das 12 casas não é desenhada para não mostrar apoio inventado.</text></svg>`;
  }

  const porCasa = [...camada.sav.byHouse].sort((a, b) => a.casa - b.casa); // garante ordem 1..12

  const ocupantesPorCasa = new Map<number, Graha[]>();
  for (const [graha, pos] of Object.entries(camada.posicoesPlanetarias) as [Graha, { house: number }][]) {
    const lista = ocupantesPorCasa.get(pos.house) ?? [];
    lista.push(graha);
    ocupantesPorCasa.set(pos.house, lista);
  }

  const casaSeed = camada.posicoesPlanetarias[camada.karakas.atmakaraka].house;

  const cx = 310;
  const cy = 310;
  const rExternoApoio = 246;
  const rInternoApoio = 196;
  const rInternoPresenca = 118;
  const rRotulo = 285;
  const rBrass = (rInternoApoio + rExternoApoio) / 2; // 221 — meio do anel exterior

  const CORES_BANDA: Record<"forte" | "medio" | "fraco", string> = { forte: COR_FORTE, medio: COR_MEDIO, fraco: COR_FRACO };

  const gomos = porCasa
    .map((h) => {
      // Casa 1 ao topo (12h), sentido horário — convenção clássica de roda védica.
      const anguloInicio = (h.casa - 1) * 30 - 15;
      const anguloFim = anguloInicio + 30;
      const anguloMeio = (anguloInicio + anguloFim) / 2;

      const banda = bandaAbsolutaSav(h.pontuacao);
      const corApoio = CORES_BANDA[banda];

      const nOcupantes = (ocupantesPorCasa.get(h.casa) ?? []).length;
      const rExternoPresenca = nOcupantes === 0 ? 140 : nOcupantes === 1 ? 144 : 170;
      const ocupada = nOcupantes > 0;
      const corPresenca = ocupada ? COR_PRESENCA : COR_VAZIO;
      const corNumero = ocupada ? "#fff" : COR_SUAVE; // CORRECÇÃO 1 — contraste: escuro sobre claro, branco sobre escuro

      const posNumero = polarParaCartesiano(cx, cy, (rInternoPresenca + rExternoPresenca) / 2, anguloMeio);

      const posRotulo = polarParaCartesiano(cx, cy, rRotulo, anguloMeio);
      const anchor = anguloMeio > 100 && anguloMeio < 260 ? "end" : anguloMeio > 260 && anguloMeio < 280 ? "middle" : anguloMeio < 80 || anguloMeio > 280 ? "start" : "middle";
      const rotuloTexto = ROTULO_CASA_CURTO[h.casa] ?? ROTULO_CASA_NAVEYA[h.casa] ?? "";
      const linhas = partirRotuloEmLinhas(rotuloTexto);
      const tspans = linhas.map((linha, i) => `<tspan x="${posRotulo.x.toFixed(1)}" dy="${i === 0 ? (linhas.length > 1 ? -7 : 0) : 14}">${escaparXml(linha)}</tspan>`).join("");

      const brass = h.casa === casaSeed ? `<circle cx="${polarParaCartesiano(cx, cy, rBrass, anguloMeio).x.toFixed(1)}" cy="${polarParaCartesiano(cx, cy, rBrass, anguloMeio).y.toFixed(1)}" r="6" fill="${COR_BRASS}"/>` : "";

      return (
        `<path d="${pathGomo(cx, cy, rInternoApoio, rExternoApoio, anguloInicio, anguloFim)}" fill="${corApoio}"/>` +
        `<path d="${pathGomo(cx, cy, rInternoPresenca, rExternoPresenca, anguloInicio, anguloFim)}" fill="${corPresenca}"/>` +
        brass +
        `<text x="${posNumero.x.toFixed(1)}" y="${(posNumero.y + 4).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="11" opacity="0.85" fill="${corNumero}">${h.casa}</text>` +
        `<text y="${posRotulo.y.toFixed(1)}" text-anchor="${anchor}" font-family="Georgia,serif" font-size="10" fill="${COR_SUAVE}">${tspans}</text>`
      );
    })
    .join("\n");

  return `<svg viewBox="0 0 620 640" xmlns="http://www.w3.org/2000/svg">
<rect width="620" height="640" fill="${COR_PAPEL}"/>
${gomos}
<text x="${cx}" y="15" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" letter-spacing="2" fill="${COR_SUAVE}">A FORMA DA VIDA — APOIO POR ÁREA, E O QUE JÁ LÁ ESTÁ</text>
<g font-family="Georgia,serif" font-size="13.5" fill="${COR_SUAVE}">
  <rect x="60" y="605" width="13" height="13" fill="${COR_FORTE}"/><text x="78" y="616">mais apoio</text>
  <rect x="190" y="605" width="13" height="13" fill="${COR_MEDIO}"/><text x="208" y="616">apoio médio</text>
  <rect x="330" y="605" width="13" height="13" fill="${COR_FRACO}"/><text x="348" y="616">menos apoio</text>
  <rect x="460" y="605" width="13" height="13" fill="${COR_PRESENCA}"/><text x="478" y="616">ocupada</text>
  <circle cx="576" cy="611.5" r="6.5" fill="${COR_BRASS}"/><text x="588" y="616">tema central</text>
</g>
</svg>`;
}

/**
 * Constrói o diagrama de convergência da espinha — cada camada que
 * confirma converge, visualmente, para a área de vida que é o tema
 * central deste relatório. Espelha o desfecho de `derivarEspinha`:
 *  · "convergencia"/"padrao-estrutural" — desenha as linhas de
 *    convergência (1 a 9, conforme `camadasConfirmantes.length`).
 *  · "ausencia-declarada" — devolve um SVG honesto de ausência, nunca
 *    inventa uma convergência que os dados não sustentam.
 */
export function construirConvergenciaEspinha(camada: CamadaA, espinha: DerivacaoEspinha): string {
  const desfecho = espinha.desfecho;

  if (desfecho.tipo === "ausencia-declarada") {
    return `<svg viewBox="0 0 660 140" xmlns="http://www.w3.org/2000/svg"><rect width="660" height="140" fill="${COR_PAPEL}"/><text x="330" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="${COR_SUAVE}">Esta carta não tem uma espinha de convergência.</text><text x="330" y="86" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${COR_SUAVE}">Nenhuma camada isolada domina — informação sobre esta carta, não falha do motor.</text></svg>`;
  }

  const rotulos = espinha.camadasConfirmantes.map((nome) => PAPEL_CAMADA[nome] ?? nome);
  const n = rotulos.length;
  const areaLabel = DEFINICOES_CASA[espinha.casaSeed] ?? `casa ${espinha.casaSeed}`;

  const xLabel = 20;
  const xCurva = 320;
  const xPonto = 470;
  const yTopo = 30;
  const yFundo = Math.max(200, 30 + (n - 1) * 46 + 30);
  const yPonto = (yTopo + yFundo) / 2;
  const altura = yFundo + 40;

  const linhas = rotulos
    .map((rotulo, i) => {
      const y = yTopo + i * 46;
      return `<path d="M${xLabel + 8},${y} C${xCurva},${y} ${xCurva + 60},${yPonto} ${xPonto},${yPonto}" stroke="#7f9c8b" stroke-width="1.4" fill="none"/>` +
        `<text x="${xLabel}" y="${y - 6}" font-family="Georgia,serif" font-size="12.5" fill="${COR_SUAVE}">${escaparXml(rotulo.length > 78 ? rotulo.slice(0, 75) + "…" : rotulo)}</text>`;
    })
    .join("\n");

  return `<svg viewBox="0 0 660 ${altura}" xmlns="http://www.w3.org/2000/svg">
<rect width="660" height="${altura}" fill="${COR_PAPEL}"/>
<text x="20" y="16" font-family="system-ui,sans-serif" font-size="10.5" letter-spacing="2" fill="${COR_SUAVE}">${n} MEDIÇÕES INDEPENDENTES, O MESMO TEMA</text>
${linhas}
<circle cx="${xPonto}" cy="${yPonto}" r="7" fill="${COR_ACENTO}"/>
<text x="${xPonto + 18}" y="${yPonto - 4}" font-family="Georgia,serif" font-size="15" fill="${COR_ACENTO}">${escaparXml(areaLabel.length > 60 ? areaLabel.slice(0, 57) + "…" : areaLabel)}</text>
<text x="${xPonto + 18}" y="${yPonto + 16}" font-family="Georgia,serif" font-size="12" font-style="italic" fill="${COR_SUAVE}">— a espinha deste relatório</text>
</svg>`;
}
