// FASE 1, Passo 7 — template-v3.ts. Renderiza um `RelatorioV3` completo
// para HTML autónomo (identidade visual Naveya), por pedido explícito
// desta sessão (23/08/2026). Função pura: mesmo `relatorio`/`camada`,
// mesmo HTML, sempre — nenhuma chamada a LLM, nenhuma rede, nenhum
// ficheiro externo (SVGs já vêm embutidos em `relatorio.anexoB`, fontes
// via Google Fonts, sem imagens externas).
//
// `casaSeed` (para marcar a casa do Atmakaraka na tabela de SAV do
// Anexo B) NÃO vem em `RelatorioV3.espinha` (esse tipo só guarda a
// afirmação e o nível, não a casa) nem é parâmetro desta função — a
// assinatura pedida é só `(relatorio, camada)`. Recalculado aqui
// directamente de `camada`, com a MESMA fórmula que `derivarEspinha`
// usa internamente (`camada.posicoesPlanetarias[atmakaraka].house`) —
// não uma segunda definição, o mesmo cálculo, sem depender de
// `espinha.ts` para uma única linha.
//
// PARSING DE `oPlano` — a Secção 12 chega como STRING de prosa livre
// (o LLM nunca produz JSON, por regra do próprio prompt), com uma
// estrutura markdown-like que o prompt já pede explicitamente
// ("introdução → tabela → menu → teste de filtro → o que não fazer").
// O parser abaixo é best-effort: tenta reconhecer os 5 blocos por
// cabeçalhos/marcadores; qualquer bloco que não reconheça cai em prosa
// simples dentro do mesmo layout, nunca é descartado.

import type { RelatorioV3, CamadaA, Descoberta } from "../types-v3";
import { ROTULO_CASA_NAVEYA, bandaAbsolutaSav } from "./linguagem-naveya";

// ═══════════════════════════════════════════════════════════════════════
// UTILITÁRIOS DE TEXTO
// ═══════════════════════════════════════════════════════════════════════

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Escapa HTML e converte **negrito** markdown para <strong> — nunca produz markdown cru na página. */
function mdInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Um bloco de prosa (uma ou mais linhas em branco separam parágrafos) em HTML. */
/**
 * Corrigido durante a verificação visual do relatório da Alice — a
 * Secção 7 (e potencialmente outras) veio com um título markdown solto
 * ("# O Trânsito Actual") na primeira linha, mesmo o prompt nunca o
 * pedindo — o LLM por vezes ecoa o título da secção. Sem esta limpeza,
 * o "#" aparecia literalmente no texto do cliente. Remove QUALQUER linha
 * que seja só um cabeçalho markdown (#, ##, ### seguido de texto e nada
 * mais na linha) antes de dividir em parágrafos — nunca remove texto
 * dentro de uma frase, só linhas inteiras de título.
 */
function paragrafos(texto: string): string {
  const semTitulosSoltos = texto.replace(/^#{1,6}\s+.*$/gm, "");
  return semTitulosSoltos
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${mdInline(p)}</p>`)
    .join("\n");
}

const NIVEL_LABEL: Record<string, string> = {
  "convergencia-forte": "convergência forte",
  "sinal-forte": "sinal forte",
  leitura: "leitura",
  "em-aberto": "em aberto",
};

// ═══════════════════════════════════════════════════════════════════════
// CSS — IDENTIDADE VISUAL NAVEYA
// ═══════════════════════════════════════════════════════════════════════

const CSS = `
:root {
  --papel: #FAF8F4;
  --tinta: #1A1A1A;
  --verde-tinta: #2D4A3E;
  --terracota: #B5533C;
  --cinza-claro: #F0EDE8;
  --tier-forte-bg: #dbe8dd;
  --tier-medio-bg: #ece5d3;
  --tier-fraco-bg: #f2ded7;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: "Inter", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.7;
}

h1, h2, h3, .titulo-secção {
  font-family: "Lora", Georgia, serif;
  color: var(--verde-tinta);
  font-weight: 700;
}

.pagina { max-width: 760px; margin: 0 auto; padding: 2.5rem 1.75rem; }

/* ── 1. Capa ── */
.capa {
  background: var(--verde-tinta);
  color: var(--papel);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}
.capa .logo { font-family: "Lora", Georgia, serif; font-weight: 700; color: var(--terracota); letter-spacing: 0.15em; text-transform: uppercase; font-size: 1.4rem; margin-bottom: 3rem; }
.capa .nome-cliente { font-family: "Lora", Georgia, serif; font-weight: 700; font-size: 2.4rem; margin: 0 0 0.75rem; text-wrap: balance; color: var(--papel); }
.capa .subtitulo { font-size: 1.1rem; opacity: 0.85; margin: 0 0 2.5rem; }
.capa .data-geracao { font-size: 0.85rem; opacity: 0.65; letter-spacing: 0.05em; }

/* ── 2. Quadro de dados ── */
.quadro-dados table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
.quadro-dados td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--cinza-claro); vertical-align: top; }
.quadro-dados td.rotulo { font-weight: 600; color: var(--verde-tinta); width: 40%; }
.pergunta-destaque { background: var(--cinza-claro); border-left: 4px solid var(--terracota); padding: 1rem 1.25rem; margin: 1.25rem 0; font-style: italic; }

/* ── 3. Nota de leitura ── */
.nota-leitura { display: flex; flex-direction: column; gap: 0.9rem; margin: 1.5rem 0; }
.nota-leitura .bloco { background: var(--cinza-claro); padding: 1rem 1.25rem; border-radius: 4px; }
.nota-leitura .bloco h4 { font-family: "Lora", Georgia, serif; color: var(--verde-tinta); margin: 0 0 0.4rem; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.06em; }
.nota-leitura .bloco p { margin: 0; }

/* ── 4. Retrato 60s ── */
.retrato-linha { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--cinza-claro); }
.retrato-linha:last-child { border-bottom: none; }
.retrato-linha .numero { font-family: "Lora", Georgia, serif; font-weight: 700; color: var(--terracota); font-size: 1.3rem; min-width: 2rem; }
.retrato-linha .texto { flex: 1; }
.retrato-linha .ref { display: block; font-size: 0.75rem; color: #8a8a8a; margin-top: 0.3rem; }

/* ── 5. Cinco descobertas ── */
.descoberta-card { border-left: 3px solid var(--terracota); background: var(--cinza-claro); padding: 1rem 1.25rem; margin-bottom: 1rem; border-radius: 0 4px 4px 0; }
.descoberta-card .confianca { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8a8a; display: block; margin-bottom: 0.4rem; }
.descoberta-card p { margin: 0; }

/* ── 6. Veredicto ── */
.veredicto-bloco { background: #eaf0ec; border: 1px solid var(--verde-tinta); border-radius: 6px; padding: 1.5rem; margin: 1.5rem 0; }
.veredicto-bloco h3 { margin-top: 0; }
.veredicto-razoes { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--cinza-claro); }
.veredicto-razoes .razao { margin-bottom: 0.75rem; }
.veredicto-razoes .confianca { font-size: 0.75rem; text-transform: uppercase; color: #8a8a8a; margin-right: 0.4rem; }

/* ── 7-14. Secções ── */
.seccao { margin: 3rem 0; }
.seccao .separador { border: none; border-top: 2px solid var(--terracota); margin: 0 0 1rem; width: 3rem; }
.seccao h2 { font-size: 1.5rem; margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.6rem; }
.badge-condicional { font-family: "Inter", sans-serif; font-weight: 400; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--terracota); border: 1px solid var(--terracota); border-radius: 999px; padding: 0.15rem 0.6rem; }

/* Roda das casas */
.roda-wrap { text-align: center; margin: 1.5rem 0; }
.roda-wrap svg { max-width: 500px; width: 100%; height: auto; }
.roda-legenda { font-size: 0.82rem; color: #555; margin-top: 0.75rem; display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap; }
.roda-legenda span { display: inline-flex; align-items: center; gap: 0.35rem; }
.roda-legenda .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* Secção 12 — Plano */
.plano-tabela { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.92rem; }
.plano-tabela th { background: var(--verde-tinta); color: var(--papel); text-align: left; padding: 0.6rem 0.75rem; font-family: "Lora", Georgia, serif; }
.plano-tabela td { padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--cinza-claro); }
.plano-tabela tr:nth-child(odd) td { background: var(--papel); }
.plano-tabela tr:nth-child(even) td { background: var(--cinza-claro); }
.plano-menu { list-style: none; counter-reset: proposta; padding: 0; margin: 1.25rem 0; }
.plano-menu li { counter-increment: proposta; background: var(--cinza-claro); border-radius: 4px; padding: 0.9rem 1.1rem 0.9rem 2.6rem; position: relative; margin-bottom: 0.7rem; }
.plano-menu li::before { content: counter(proposta); position: absolute; left: 0.85rem; top: 0.9rem; font-family: "Lora", Georgia, serif; font-weight: 700; color: var(--terracota); }
.plano-horizonte { font-style: italic; color: #555; margin-top: 0.5rem; }
.plano-filtro { background: var(--cinza-claro); border-radius: 6px; padding: 1.25rem 1.5rem; margin: 1.25rem 0; }
.plano-filtro .pergunta { margin-bottom: 0.9rem; }
.plano-filtro .pergunta .alvo { color: var(--verde-tinta); font-weight: 600; }
.plano-nao-fazer { list-style: none; padding: 0; margin: 1.25rem 0; background: #f7f1ee; border-radius: 6px; padding: 1rem 1.25rem; }
.plano-nao-fazer li { display: flex; gap: 0.6rem; margin-bottom: 0.6rem; }
.plano-nao-fazer li:last-child { margin-bottom: 0; }
.plano-nao-fazer .x { color: var(--terracota); font-weight: 700; }

/* Anexo A / B */
.anexo-titulo { border-top: 4px solid var(--verde-tinta); padding-top: 1.25rem; margin-top: 4rem; }
.sav-tabela { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.92rem; }
.sav-tabela th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--verde-tinta); font-family: "Lora", Georgia, serif; }
.sav-tabela td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
.tier-forte { background: var(--tier-forte-bg); }
.tier-medio { background: var(--tier-medio-bg); }
.tier-fraco { background: var(--tier-fraco-bg); }
.figura-item { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--cinza-claro); }
.figura-item:last-child { border-bottom: none; }
.figura-item .tipo { font-weight: 700; color: var(--verde-tinta); }
.duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 1.25rem 0; }
.duas-colunas ul { list-style: none; padding: 0; margin: 0; }
.duas-colunas li { margin-bottom: 0.5rem; padding-left: 1.4rem; position: relative; }
.col-calculado li::before { content: "✓"; color: var(--verde-tinta); position: absolute; left: 0; font-weight: 700; }
.col-nao-calculado li::before { content: "—"; color: var(--terracota); position: absolute; left: 0; }
.rastreio-tabela { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.88rem; }
.rastreio-tabela th { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 2px solid var(--verde-tinta); font-family: "Lora", Georgia, serif; }
.rastreio-tabela td { padding: 0.5rem 0.6rem; border-bottom: 1px solid rgba(0,0,0,0.06); vertical-align: top; }
.rastreio-tabela tr:nth-child(even) td { background: var(--cinza-claro); }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .capa { min-height: 100vh; page-break-after: always; }
  .pagina { max-width: 100%; padding: 1.25cm; margin: 0; }
  .seccao, .anexo-titulo { page-break-before: always; }
  @page { margin: 1.5cm; }
}
`;

// ═══════════════════════════════════════════════════════════════════════
// BLOCOS
// ═══════════════════════════════════════════════════════════════════════

function renderCapa(relatorio: RelatorioV3): string {
  const data = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  return `<section class="capa">
  <div class="logo">Naveya</div>
  <h1 class="nome-cliente">${escapeHtml(relatorio.abertura.nomeCliente)}</h1>
  <p class="subtitulo">Relatório Personalizado</p>
  <p class="data-geracao">Gerado em ${data}</p>
</section>`;
}

function renderQuadroDados(relatorio: RelatorioV3): string {
  const q = relatorio.abertura.quadroDados;
  const linhas: [string, string][] = [
    ["Data de nascimento", q.dataNascimento],
    ["Hora de nascimento", q.horaNascimento],
    ["Local de nascimento", q.localNascimento],
    ["Residência actual", q.residenciaActual],
    ["Profissão", q.profissao],
    ["Sistemas usados", q.sistemasUsados],
  ];
  return `<section class="pagina quadro-dados">
  <h2>Quadro de Dados</h2>
  <table>
    ${linhas.map(([rotulo, valor]) => `<tr><td class="rotulo">${escapeHtml(rotulo)}</td><td>${escapeHtml(valor)}</td></tr>`).join("\n    ")}
  </table>
  <div class="pergunta-destaque">«${escapeHtml(q.perguntaDeclarada)}»</div>
  <table><tr><td class="rotulo">Situação declarada</td><td>${escapeHtml(q.situacaoDeclarada)}</td></tr></table>
</section>`;
}

function renderNotaLeitura(relatorio: RelatorioV3): string {
  const n = relatorio.abertura.notaLeitura;
  return `<section class="pagina">
  <h2>Nota de Leitura</h2>
  <div class="nota-leitura">
    <div class="bloco"><h4>O signo</h4><p>${mdInline(n.oSigno)}</p></div>
    <div class="bloco"><h4>A medida</h4><p>${mdInline(n.aMedida)}</p></div>
    <div class="bloco"><h4>Onde parar</h4><p>${mdInline(n.ondeParar)}</p></div>
  </div>
</section>`;
}

function renderRetrato60s(relatorio: RelatorioV3): string {
  const linhas = relatorio.retrato60s.linhas
    .map(
      (l, i) => `<div class="retrato-linha">
      <span class="numero">${i + 1}</span>
      <div class="texto">${mdInline(l.texto)}<span class="ref">${escapeHtml(l.seccaoReferencia)}</span></div>
    </div>`
    )
    .join("\n");
  return `<section class="pagina">
  <h2>Retrato em 60 Segundos</h2>
  ${linhas}
</section>`;
}

function renderDescoberta(d: Descoberta): string {
  return `<div class="descoberta-card">
    <span class="confianca">${escapeHtml(NIVEL_LABEL[d.confianca] ?? d.confianca)}</span>
    <p>${mdInline(d.texto)}</p>
  </div>`;
}

function renderCincoDescobertas(relatorio: RelatorioV3): string {
  return `<section class="pagina">
  <h2>As Cinco Descobertas</h2>
  ${relatorio.cincoDescobertas.map(renderDescoberta).join("\n  ")}
</section>`;
}

function renderVeredicto(relatorio: RelatorioV3): string {
  const razoes = relatorio.veredicto.razoes
    .map((r) => `<div class="razao"><span class="confianca">${escapeHtml(NIVEL_LABEL[r.confianca] ?? r.confianca)}</span> ${mdInline(r.texto)}</div>`)
    .join("\n      ");
  return `<section class="pagina">
  <div class="veredicto-bloco">
    <h3>A resposta à tua pergunta</h3>
    ${paragrafos(relatorio.veredicto.resposta)}
    <div class="veredicto-razoes">
      ${razoes}
    </div>
  </div>
</section>`;
}

/** Secções genéricas de prosa (4, 6, 7, 8, 9, 10, 11, 13, 14) — título verde-tinta, separador terracota, badge se condicional. */
function renderSeccaoGenerica(titulo: string, texto: string, condicional: boolean): string {
  return `<section class="pagina seccao">
  <hr class="separador" />
  <h2>${escapeHtml(titulo)}${condicional ? '<span class="badge-condicional">análise adicional</span>' : ""}</h2>
  ${paragrafos(texto)}
</section>`;
}

const TIER_LABEL: Record<string, string> = { forte: "Forte", medio: "Médio", fraco: "Fraco" };
const TIER_COR: Record<string, string> = { forte: "#4f7a5c", medio: "#a89b7f", fraco: "#b4634a" };

function renderRodaLegenda(): string {
  return `<div class="roda-legenda">
    <span><span class="dot" style="background:${TIER_COR.forte}"></span> Apoio forte</span>
    <span><span class="dot" style="background:${TIER_COR.medio}"></span> Apoio médio</span>
    <span><span class="dot" style="background:${TIER_COR.fraco}"></span> Apoio fraco</span>
  </div>`;
}

function renderSeccao5FormaDeVida(relatorio: RelatorioV3): string {
  const roda = relatorio.anexoB?.rodaCasas;
  return `<section class="pagina seccao">
  <hr class="separador" />
  <h2>A Forma de Vida</h2>
  ${roda ? `<div class="roda-wrap">${roda}${renderRodaLegenda()}</div>` : ""}
  ${paragrafos(relatorio.formaDeVida)}
</section>`;
}

// ── Secção 12 — O Plano — parsing best-effort dos 5 blocos ──

interface PlanoParsed {
  introducao: string;
  tabela: { header: string[]; linhas: string[][] } | null;
  menu: { titulo: string; itens: { titulo: string; texto: string }[]; horizonte: string };
  filtro: { intro: string; perguntas: { titulo: string; texto: string }[]; fecho: string };
  naoFazer: { titulo: string; itens: string[] };
  resto: string;
}

/**
 * REESCRITO durante a verificação visual do relatório da Alice — a
 * primeira versão extraía cada um dos 4 blocos com uma varredura
 * INDEPENDENTE do texto inteiro (uma chamada a `extrairBlocoAPartirDeTitulo`
 * por bloco), assumindo que o fim de cada bloco era sempre a próxima
 * linha "#"/"##"/"###". Na terceira corrida real, o LLM escreveu os
 * títulos internos como linhas soltas, SEM cardinal — e cada "corpo"
 * extraído engoliu tudo até ao fim do texto (nenhuma fronteira "#" para
 * parar), com blocos a sobrepor-se e o texto da tabela (formato TAB, não
 * "| … |" desta vez) a vazar para a introdução. Corrigido com um
 * varrimento ÚNICO: encontra a posição de cada um dos 4 títulos
 * conhecidos (havendo "#" ou não), ordena-as, e usa essas posições como
 * fronteiras sequenciais — cada bloco vai exactamente até ao próximo
 * título encontrado, nunca mais longe.
 */
type ChaveBlocoPlano = "tabela" | "menu" | "filtro" | "naoFazer";

const TITULOS_PLANO: [ChaveBlocoPlano, RegExp][] = [
  ["tabela", /tabela de 90 dias/i],
  ["menu", /menu de propostas/i],
  ["filtro", /teste de filtro/i],
  ["naoFazer", /o que não fazer/i],
];

function segmentarPlano(oPlano: string): { introducao: string; segmentos: Partial<Record<ChaveBlocoPlano, string>> } {
  const linhas = oPlano.split("\n");
  const marcadores: { chave: ChaveBlocoPlano; linha: number }[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    // CORRIGIDO na verificação visual da Alice — uma célula da tabela
    // ("...a escolha feita no teste de filtro (secção seguinte)...")
    // continha a frase "teste de filtro" dentro de uma frase longa, e
    // sem este limite de comprimento essa menção incidental era
    // confundida com o próprio título da secção, muito antes do título
    // real. Um título genuíno é sempre uma linha curta (com ou sem
    // "#"), nunca uma frase de 100+ caracteres — por isso só conta como
    // marcador uma linha curta que corresponda ao padrão.
    if (linha.length > 60) continue;
    for (const [chave, re] of TITULOS_PLANO) {
      if (!marcadores.some((m) => m.chave === chave) && re.test(linha)) {
        marcadores.push({ chave, linha: i });
      }
    }
  }
  marcadores.sort((a, b) => a.linha - b.linha);

  const introducao = (marcadores.length > 0 ? linhas.slice(0, marcadores[0].linha) : linhas)
    .join("\n")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .trim();

  const segmentos: Partial<Record<ChaveBlocoPlano, string>> = {};
  for (let k = 0; k < marcadores.length; k++) {
    const inicio = marcadores[k].linha + 1;
    const fim = k + 1 < marcadores.length ? marcadores[k + 1].linha : linhas.length;
    segmentos[marcadores[k].chave] = linhas.slice(inicio, fim).join("\n").trim();
  }
  return { introducao, segmentos };
}

/** Tabela de 90 dias — aceita tanto markdown "| … | … |" como colunas separadas por tabulador (os dois formatos já vistos em corridas reais). */
function parseTabelaPlano(bloco: string): { header: string[]; linhas: string[][] } | null {
  const todasLinhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);

  const linhasPipe = todasLinhas.filter((l) => /^\|.*\|$/.test(l));
  if (linhasPipe.length >= 2) {
    const splitPipe = (l: string) => l.slice(1, -1).split("|").map((c) => c.trim());
    const header = splitPipe(linhasPipe[0]);
    // CORRIGIDO na verificação visual da Alice — "|---|---|---|" (3+
    // colunas) tem "|" A MEIO da linha separadora, entre cada grupo de
    // traços; o regex antigo só permitia [\s:-] e por isso não
    // reconhecia "|" como parte válida da própria linha separadora,
    // deixando "---" passar como se fosse uma linha de dados real.
    const linhas = linhasPipe.slice(1).filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map(splitPipe);
    return { header, linhas };
  }

  const linhasTab = todasLinhas.filter((l) => l.includes("\t"));
  if (linhasTab.length >= 2) {
    const splitTab = (l: string) => l.split("\t").map((c) => c.trim());
    const header = splitTab(linhasTab[0]);
    const linhas = linhasTab.slice(1).filter((l) => !/^[\s:-]+$/.test(l.replace(/\t/g, ""))).map(splitTab);
    return { header, linhas };
  }

  return null;
}

/**
 * Itens de lista (menu de propostas / teste de filtro) — best-effort em
 * cascata, do formato mais estruturado ao menos estruturado, nunca
 * descarta um item só porque a formatação exacta varia de corrida para
 * corrida:
 *  1. "N. **Título** — texto" (numerado, negrito, travessão)
 *  2. "**Título** — texto" ou "Título: — texto" (sem número)
 *  3. cada parágrafo do bloco vira um item; se tiver um travessão, a
 *     parte antes vira título — senão o parágrafo inteiro é o texto, com
 *     um título genérico ("Proposta N"/"Pergunta N", indicado pelo chamador).
 */
function parseItensFlexivel(bloco: string, tituloGenerico: string): { titulo: string; texto: string }[] {
  const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);

  const viaNumeroENegrito = linhas
    .map((l) => /^\d+\.\s*\*\*(.+?)\*\*\s*[:.]?\s*—?\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ titulo: m[1].trim(), texto: m[2].trim() }));
  if (viaNumeroENegrito.length > 0) return viaNumeroENegrito;

  const viaNegrito = linhas
    .map((l) => /^\*\*(.+?)\*\*\s*[:.]?\s*—\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ titulo: m[1].trim(), texto: m[2].trim() }));
  if (viaNegrito.length > 0) return viaNegrito;

  const viaTituloDoisPontos = linhas
    .map((l) => /^(?:\d+\.\s*)?([^—:]{2,40}):\s*—\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ titulo: m[1].trim(), texto: m[2].trim() }));
  if (viaTituloDoisPontos.length > 0) return viaTituloDoisPontos;

  // Fallback final — um item por parágrafo, nunca perde conteúdo.
  const paragrafosBloco = bloco.split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  return paragrafosBloco.map((p, i) => {
    const mTravessao = /^(.{2,90}?)\s+—\s+(.*)$/.exec(p);
    return mTravessao ? { titulo: mTravessao[1].trim(), texto: mTravessao[2].trim() } : { titulo: `${tituloGenerico} ${i + 1}`, texto: p };
  });
}

function parseItensLista(bloco: string): string[] {
  const viaTracos = bloco
    .split("\n")
    .map((l) => /^\s*[-*]\s+(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1].trim());
  if (viaTracos.length > 0) return viaTracos;
  // Fallback — um parágrafo por item, nunca perde conteúdo.
  return bloco.split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
}

/**
 * Rede de segurança — na terceira corrida real, o LLM escreveu a tabela
 * de 90 dias sem NENHUM título antes dela ("tabela de 90 dias" nunca
 * aparece no texto), só o cabeçalho "QUANDO\tO QUE FAZER\t…" a abrir
 * directamente. `segmentarPlano` não tem título para se agarrar, e a
 * tabela cai inteira dentro da introdução. Esta função procura, dentro
 * de QUALQUER texto, um bloco de 2+ linhas consecutivas que pareçam
 * linhas de tabela (pipe ou tabulador) e separa-o do resto — chamada só
 * quando `segmentos.tabela` não foi encontrado por título.
 */
function extrairTabelaSolta(texto: string): { tabela: { header: string[]; linhas: string[][] } | null; resto: string } {
  const linhas = texto.split("\n");
  const ehLinhaTabela = (l: string) => /^\|.*\|$/.test(l.trim()) || (l.includes("\t") && l.trim().length > 0);
  let inicio = -1;
  let fim = -1;
  for (let i = 0; i < linhas.length; i++) {
    if (ehLinhaTabela(linhas[i])) {
      if (inicio === -1) inicio = i;
      fim = i;
    } else if (inicio !== -1 && linhas[i].trim() !== "") {
      break; // uma linha não-vazia e não-tabela fecha o bloco
    }
  }
  if (inicio === -1 || fim - inicio < 1) return { tabela: null, resto: texto }; // precisa de pelo menos 2 linhas (header + 1 dado)
  const tabela = parseTabelaPlano(linhas.slice(inicio, fim + 1).join("\n"));
  if (!tabela) return { tabela: null, resto: texto };
  const resto = [...linhas.slice(0, inicio), ...linhas.slice(fim + 1)].join("\n").trim();
  return { tabela, resto };
}

function parsePlano(oPlano: string): PlanoParsed {
  const segmentado = segmentarPlano(oPlano);
  let introducao = segmentado.introducao;
  const segmentos = segmentado.segmentos;

  let tabela = segmentos.tabela ? parseTabelaPlano(segmentos.tabela) : null;
  if (!tabela) {
    const solta = extrairTabelaSolta(introducao);
    if (solta.tabela) {
      tabela = solta.tabela;
      introducao = solta.resto;
    }
  }
  // CORRIGIDO na verificação visual da Alice — quando o título "tabela de
  // 90 dias" não é reconhecido (o LLM formula-o de forma diferente), a
  // rede de segurança `extrairTabelaSolta` só apanha o primeiro bloco
  // contíguo de linhas de tabela — uma segunda leva de linhas "| … | … |"
  // que acabe posicionada dentro do segmento do menu ou do filtro (por
  // repetição ou reordenação do LLM) passa por cima dessa rede e entra
  // nos parsers de item como se fosse um item de menu/pergunta real.
  // Antes de tentar reconhecer itens, remove qualquer linha que ainda
  // pareça uma linha de tabela (2+ "|" ou 2+ tabs) — nunca deve aparecer
  // ali, e é sempre preferível descartá-la a mostrá-la como item falso.
  const semLinhasDeTabela = (texto: string): string =>
    texto
      .split("\n")
      .filter((l) => (l.match(/\|/g) ?? []).length < 2 && (l.match(/\t/g) ?? []).length < 2)
      .join("\n");

  const menuItensBrutos = segmentos.menu ? parseItensFlexivel(semLinhasDeTabela(segmentos.menu), "Proposta") : [];
  const filtroItensBrutos = segmentos.filtro ? parseItensFlexivel(semLinhasDeTabela(segmentos.filtro), "Pergunta") : [];
  const naoFazerItens = segmentos.naoFazer ? parseItensLista(semLinhasDeTabela(segmentos.naoFazer)) : [];

  // A "nota de horizonte" do menu / o "fecho" do filtro: o texto do
  // segmento que sobra depois de remover as linhas já consumidas pelos
  // itens — aproximado por comprimento (itens costumam ser as linhas
  // mais longas do segmento); nunca crítico, é só uma nota em itálico.
  const menuHorizonte = segmentos.menu
    ? semLinhasDeTabela(segmentos.menu)
        .split("\n")
        .filter((l) => l.trim().length > 0 && !menuItensBrutos.some((it) => l.includes(it.texto.slice(0, 30))) && !/^cruzando/i.test(l.trim()))
        .join(" ")
        .trim()
    : "";
  const filtroFecho = segmentos.filtro
    ? semLinhasDeTabela(segmentos.filtro)
        .split("\n")
        .filter((l) => l.trim().length > 0 && !filtroItensBrutos.some((it) => l.includes(it.texto.slice(0, 30))))
        .join(" ")
        .trim()
    : "";

  return {
    introducao,
    tabela,
    menu: { titulo: "O menu de propostas", itens: menuItensBrutos, horizonte: menuHorizonte },
    filtro: { intro: "Para esta ou qualquer oportunidade futura:", perguntas: filtroItensBrutos, fecho: filtroFecho },
    naoFazer: { titulo: "O que não fazer", itens: naoFazerItens },
    // Nunca há "resto" nesta versão — a introdução + os 4 segmentos
    // (mesmo que caiam no fallback de parágrafo) cobrem sempre o texto
    // inteiro, sem sobreposição nem perda.
    resto: "",
  };
}

function renderSeccao12Plano(relatorio: RelatorioV3): string {
  const p = parsePlano(relatorio.oPlano);
  const tabelaHtml = p.tabela
    ? `<table class="plano-tabela">
      <thead><tr>${p.tabela.header.map((h) => `<th>${mdInline(h)}</th>`).join("")}</tr></thead>
      <tbody>${p.tabela.linhas.map((linha) => `<tr>${linha.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`).join("\n")}</tbody>
    </table>`
    : "";
  const menuHtml =
    p.menu.itens.length > 0
      ? `<h3>${escapeHtml(p.menu.titulo)}</h3>
    <ol class="plano-menu">${p.menu.itens.map((it) => `<li><strong>${mdInline(it.titulo)}</strong> — ${mdInline(it.texto)}</li>`).join("\n")}</ol>
    ${p.menu.horizonte ? `<p class="plano-horizonte">${mdInline(p.menu.horizonte)}</p>` : ""}`
      : "";
  const filtroHtml =
    p.filtro.perguntas.length > 0
      ? `<h3>O teste de filtro</h3>
    <div class="plano-filtro">
      ${p.filtro.perguntas.map((q) => `<div class="pergunta"><span class="alvo">${mdInline(q.titulo)}</span> — ${mdInline(q.texto)}</div>`).join("\n      ")}
      ${p.filtro.fecho ? `<p>${mdInline(p.filtro.fecho)}</p>` : ""}
    </div>`
      : "";
  const naoFazerHtml =
    p.naoFazer.itens.length > 0
      ? `<h3>${escapeHtml(p.naoFazer.titulo)}</h3>
    <ul class="plano-nao-fazer">${p.naoFazer.itens.map((it) => `<li><span class="x">×</span><span>${mdInline(it)}</span></li>`).join("\n")}</ul>`
      : "";

  return `<section class="pagina seccao">
  <hr class="separador" />
  <h2>O Plano</h2>
  ${paragrafos(p.introducao)}
  ${tabelaHtml}
  ${menuHtml}
  ${filtroHtml}
  ${naoFazerHtml}
  ${p.resto ? paragrafos(p.resto) : ""}
</section>`;
}

function renderAnexoA(relatorio: RelatorioV3): string {
  if (!relatorio.anexoA) return "";
  return `<section class="pagina anexo-titulo">
  <h2>Anexo A — Retrato de Personalidade</h2>
  ${paragrafos(relatorio.anexoA)}
</section>`;
}

function calcularCasaSeed(camada: CamadaA): number {
  return camada.posicoesPlanetarias[camada.karakas.atmakaraka].house;
}

function renderSavTabela(relatorio: RelatorioV3, camada: CamadaA): string {
  const sav = relatorio.anexoB?.sarvashtakavarga ?? [];
  if (sav.length === 0) return "<p><em>Sarvashtakavarga não disponível de forma fiável nesta corrida.</em></p>";
  const casaSeed = calcularCasaSeed(camada);
  const linhas = [...sav]
    .sort((a, b) => a.casa - b.casa)
    .map((h) => {
      const tier = bandaAbsolutaSav(h.pontuacao);
      const marcador = h.casa === casaSeed ? " ●" : "";
      return `<tr class="tier-${tier}"><td>Casa ${h.casa}${marcador}</td><td>${escapeHtml(ROTULO_CASA_NAVEYA[h.casa] ?? "")}</td><td>${h.pontuacao}/56</td><td>${escapeHtml(TIER_LABEL[tier])}</td></tr>`;
    })
    .join("\n");
  return `<table class="sav-tabela">
    <thead><tr><th>Casa</th><th>Tradução Naveya</th><th>SAV</th><th>Tier</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <p style="font-size:0.82rem;color:#555;">● marca a casa-seed (onde está o Atmakaraka).</p>`;
}

function renderFigurasFechadas(relatorio: RelatorioV3): string {
  const figuras = relatorio.anexoB?.figurasFechadas ?? [];
  if (figuras.length === 0) return "<p><em>Nenhuma figura fechada identificada nesta carta.</em></p>";
  return figuras
    .map(
      (f) => `<div class="figura-item">
      <span class="tipo">${escapeHtml(f.tipo)}</span> — ${f.pontos.map((p) => escapeHtml(p.termo)).join(", ")}
      <div style="font-size:0.85rem;color:#555;">${escapeHtml(f.detalhe)} · Orbe real: ${f.orbe.toFixed(2)}°</div>
    </div>`
    )
    .join("\n");
}

function renderCalculadoNaoCalculado(relatorio: RelatorioV3): string {
  const calc = relatorio.anexoB?.calculado ?? [];
  const naoCalc = relatorio.anexoB?.naoCalculado ?? [];
  return `<div class="duas-colunas">
    <div><h4>Calculado</h4><ul class="col-calculado">${calc.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n")}</ul></div>
    <div><h4>Não calculado</h4><ul class="col-nao-calculado">${naoCalc.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n")}</ul></div>
  </div>`;
}

function renderTabelaRastreio(relatorio: RelatorioV3): string {
  const linhas = relatorio.anexoB?.tabelaRastreio ?? [];
  if (linhas.length === 0) return "";
  return `<table class="rastreio-tabela">
    <thead><tr><th>Secção</th><th>Base</th><th>Sinal</th></tr></thead>
    <tbody>${linhas.map((l) => `<tr><td>${escapeHtml(l.seccao)}</td><td>${escapeHtml(l.base)}</td><td>${escapeHtml(l.afirmacao)}</td></tr>`).join("\n")}</tbody>
  </table>`;
}

function renderAnexoB(relatorio: RelatorioV3, camada: CamadaA): string {
  const anexoB = relatorio.anexoB;
  if (!anexoB) return "";
  return `<section class="pagina anexo-titulo">
  <h2>Anexo B — Dados Técnicos</h2>

  <h3>Sarvashtakavarga por casa</h3>
  ${renderSavTabela(relatorio, camada)}

  <h3>A roda das 12 casas</h3>
  <div class="roda-wrap">${anexoB.rodaCasas}${renderRodaLegenda()}</div>

  ${
    anexoB.convergenciaEspinha
      ? `<h3>A espinha desta carta</h3>
  <div class="roda-wrap">${anexoB.convergenciaEspinha}</div>`
      : ""
  }

  <h3>Figuras fechadas</h3>
  ${renderFigurasFechadas(relatorio)}

  <h3>Calculado / Não calculado</h3>
  ${renderCalculadoNaoCalculado(relatorio)}

  <h3>Tabela de rastreio</h3>
  ${renderTabelaRastreio(relatorio)}
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

/** Renderiza um RelatorioV3 completo para HTML autónomo — identidade visual Naveya, pronto para impressão/PDF. Função pura, sem chamadas de rede. */
export function renderizarRelatorioV3(relatorio: RelatorioV3, camada: CamadaA): string {
  const condicionalActiva = (label: string) => relatorio.seccoesCondicionaisActivas.some((s) => s.includes(label));

  const blocos: string[] = [
    renderCapa(relatorio),
    renderQuadroDados(relatorio),
    renderNotaLeitura(relatorio),
    renderRetrato60s(relatorio),
    renderCincoDescobertas(relatorio),
    renderVeredicto(relatorio),
    renderSeccaoGenerica("Quem És", relatorio.quemEs, false),
    renderSeccao5FormaDeVida(relatorio),
  ];
  if (relatorio.oQueTeTemTravado) blocos.push(renderSeccaoGenerica("O Que Te Tem Travado", relatorio.oQueTeTemTravado, condicionalActiva("Secção 6")));
  if (relatorio.transitoActual) blocos.push(renderSeccaoGenerica("O Trânsito Actual", relatorio.transitoActual, condicionalActiva("Secção 7")));
  blocos.push(renderSeccaoGenerica("De Onde Vem o Dinheiro", relatorio.dinheiro, false));
  blocos.push(renderSeccaoGenerica("Como és Vista e Pelo Que Pagam", relatorio.comoEsVista, false));
  if (relatorio.sobreOQueEEmQueForma) blocos.push(renderSeccaoGenerica("Sobre o Quê e Em Que Forma", relatorio.sobreOQueEEmQueForma, condicionalActiva("Secção 10")));
  blocos.push(renderSeccaoGenerica("O Relógio", relatorio.oRelogio, false));
  blocos.push(renderSeccao12Plano(relatorio));
  blocos.push(renderSeccaoGenerica("O Custo de Não Fazer Nada", relatorio.custoDeNaoFazerNada, false));
  if (relatorio.umaUltimaCoisa) blocos.push(renderSeccaoGenerica("Uma Última Coisa", relatorio.umaUltimaCoisa, condicionalActiva("Secção 14")));
  blocos.push(renderAnexoA(relatorio));
  blocos.push(renderAnexoB(relatorio, camada));

  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Relatório Naveya — ${escapeHtml(relatorio.abertura.nomeCliente)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<style>${CSS}</style>
</head>
<body>
${blocos.join("\n")}
</body>
</html>`;
}
