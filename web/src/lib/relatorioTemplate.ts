import { SECCAO_TITULOS, MARCADORES, type VocationIQAxes, type PesoPlaneta, type EarningMode, type DadosDatas, type ForcaValor, type SavPorCasa, type ClassificacaoApoio } from "@naveya/method-engine";

// Template HTML do relatório VocationIQ Adulto — identidade VocationIQ
// (azul #1B3A6B + âmbar #F5A623), pronto para imprimir/converter em PDF.
// Os gráficos (peso por característica, modo de ganho, linha do tempo)
// são SVG gerados deterministicamente a partir de `axes`/`pesos`/
// `earningModes`/`datas` — nunca a partir do texto do LLM. O texto do
// LLM só entra nas 5 secções de prosa (abertura, o que a carta sustenta,
// leitura por opção, candidata fora da lista, o plano), parseado pelos
// marcadores que o prompt já obriga (SECCAO_TITULOS, MARCADORES).

/**
 * DESVIO — a assinatura pedida (`gerarHTMLRelatorio(intake, texto, axes,
 * pesos, earningModes)`) não tem onde encaixar as datas reais (Vimshottari)
 * que a timeline da Secção "O plano" precisa — sem elas a timeline só
 * podia ser inventada. Acrescentado um 6º parâmetro `datas: DadosDatas`
 * (o mesmo tipo já usado por construirPromptAdulto), pelo mesmo motivo
 * documentado lá. `intake` também não corresponde a nenhum tipo existente
 * (nem IntakeRow do Supabase, nem VocationiqIntakeAdulto do prompt, que
 * não tem data/hora/local de nascimento em bruto) — definido aqui
 * `DadosParaTemplate`, o subconjunto exacto que os três blocos da capa
 * precisam; o chamador (a rota) mapeia a partir do que já tem.
 *
 * DESVIO 3 — 7º parâmetro `savPorCasa: SavPorCasa[]`, para a tabela
 * "Apoio por área de vida" do Anexo (pedido numa ronda seguinte). Mesmo
 * raciocínio: sem os dados calculados, a tabela só podia ser inventada.
 */
export interface DadosParaTemplate {
  nome: string;
  dataNascimento: string; // "YYYY-MM-DD"
  horaNascimento: string | null;
  localNascimento: string;
  situacaoDeclarada: string;
  areaActual: string;
  anosExperiencia: string;
  oQueNaoFunciona?: string;
  opcoesConsideradas: string[];
  ideiaConcreta?: string;
  perguntaEspecifica?: string;
}

const AZUL = "#1B3A6B";
const AMBAR = "#F5A623";
const CINZA_CLARO = "#F5F5F5";
const VERDE = "#4f7a5c";
const VERMELHO = "#b4634a";
const AZUL_CLARO = "#c9d6e8";

const PLANETA_PT: Record<string, string> = {
  Sun: "Sol",
  Moon: "Lua",
  Mars: "Marte",
  Mercury: "Mercúrio",
  Jupiter: "Júpiter",
  Venus: "Vénus",
  Saturn: "Saturno",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

/** Bloco "O peso de cada característica" — o rótulo humano pedido, não o nome técnico do planeta. */
const CARACTERISTICA_PT: Record<string, string> = {
  Sun: "A sua missão de fundo",
  Moon: "O que sente antes de pensar",
  Mars: "A sua capacidade de agir",
  Mercury: "Como comunica e decide",
  Jupiter: "Para onde quer crescer",
  Venus: "O que valoriza",
  Saturn: "O que mais lhe exige",
};

const CASA_LABEL_LINHAS: Record<number, [string, string]> = {
  2: ["Pela voz e", "consultoria"],
  6: ["Resolvendo", "problemas"],
  10: ["Liderando", "publicamente"],
};

/** Anexo — "Apoio por área de vida". Traduções em linguagem simples das 12 áreas de vida clássicas (bhavas), sem jargão. */
const AREA_VIDA_PT: Record<number, string> = {
  1: "Como se apresenta ao mundo, a sua energia",
  2: "O que ganha e como lida com dinheiro",
  3: "A sua iniciativa e comunicação do dia a dia",
  4: "As suas raízes, casa e estabilidade emocional",
  5: "A sua criatividade e aquilo que constrói",
  6: "Como lida com obstáculos e o trabalho do dia a dia",
  7: "As suas parcerias e relações directas",
  8: "As transformações profundas, o que fica escondido",
  9: "As suas crenças e para onde quer expandir",
  10: "A sua carreira e a cara que mostra publicamente",
  11: "Os seus ganhos, redes e comunidade",
  12: "O que solta e o que fica só para si",
};

const CLASSIFICACAO_LABEL: Record<ClassificacaoApoio, string> = { forte: "Forte", medio: "Médio", fraco: "Fraco" };
function corClassificacao(c: ClassificacaoApoio): string {
  if (c === "forte") return VERDE;
  if (c === "medio") return AMBAR;
  return VERMELHO;
}

/** Anexo — "Os teus períodos". Descrição genérica (não pessoal) do que cada regente de período clássicamente pede — mesma convenção usada em todo o relatório: dados fixos, nunca inventados pelo LLM. */
const DASHA_O_QUE_PEDE: Record<string, string> = {
  Sun: "Pede-lhe que assuma responsabilidade e liderança visível.",
  Moon: "Pede-lhe que cuide da sua estabilidade emocional e da sua casa.",
  Mars: "Pede-lhe acção directa e coragem para resolver o que está parado.",
  Mercury: "Pede-lhe clareza de comunicação e atenção aos detalhes práticos.",
  Jupiter: "Pede-lhe que invista em crescimento, aprendizagem e visão de longo prazo.",
  Venus: "Pede-lhe que cuide das suas relações e do que valoriza.",
  Saturn: "Pede-lhe disciplina, paciência, e trabalho de fundo sem resultados imediatos.",
  Rahu: "Pede-lhe que saia da sua zona confortável e arrisque algo novo.",
  Ketu: "Pede-lhe que solte o que já não serve e olhe para dentro.",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function corPeso(peso: number): string {
  if (peso >= 1.3) return VERDE;
  if (peso >= 0.9) return AMBAR;
  return VERMELHO;
}

function corForca(forca: ForcaValor): string {
  if (forca === "forte") return VERDE;
  if (forca === "moderada") return AMBAR;
  return VERMELHO;
}

const FORCA_LABEL: Record<ForcaValor, string> = {
  forte: "Carta apoia com força",
  moderada: "Suporte moderado",
  fraca: "Suporte fraco",
};

/** Conversor minimalista de markdown -> HTML: parágrafos, listas numeradas, **negrito**. Suficiente para prosa de relatório — não um parser de markdown completo. */
function markdownParaHtml(bloco: string): string {
  const linhas = bloco.trim().split("\n");
  const partes: string[] = [];
  let paragrafoActual: string[] = [];
  let listaActual: string[] = [];

  function fecharParagrafo() {
    if (paragrafoActual.length) {
      partes.push(`<p>${paragrafoActual.join(" ")}</p>`);
      paragrafoActual = [];
    }
  }
  function fecharLista() {
    if (listaActual.length) {
      partes.push(`<ol>${listaActual.map((li) => `<li>${li}</li>`).join("")}</ol>`);
      listaActual = [];
    }
  }
  function inline(texto: string): string {
    return escapeHtml(texto).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (!linha) {
      fecharParagrafo();
      fecharLista();
      continue;
    }
    const itemNumerado = linha.match(/^\d+[.)]\s+(.*)/);
    if (itemNumerado) {
      fecharParagrafo();
      listaActual.push(inline(itemNumerado[1]));
      continue;
    }
    fecharLista();
    paragrafoActual.push(inline(linha));
  }
  fecharParagrafo();
  fecharLista();
  return partes.join("\n");
}

/** Divide o texto gerado pelo LLM nas 5 secções, pelos cabeçalhos "## <título>" pedidos no prompt (ver SECCAO_TITULOS, partilhado com promptAdulto.ts para as duas pontas nunca divergirem). */
function dividirEmSeccoes(texto: string): Record<string, string> {
  const titulos = Object.values(SECCAO_TITULOS);
  const escapados = titulos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regexCabecalho = new RegExp(`^##\\s+(${escapados.join("|")})\\s*$`, "gm");

  const marcadores: { titulo: string; inicioCabecalho: number; inicioCorpo: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regexCabecalho.exec(texto))) {
    marcadores.push({ titulo: match[1], inicioCabecalho: match.index, inicioCorpo: match.index + match[0].length });
  }

  const resultado: Record<string, string> = {};
  if (marcadores.length === 0) {
    resultado[SECCAO_TITULOS.abertura] = texto;
    return resultado;
  }
  marcadores.forEach((m, i) => {
    const fimCorpo = i + 1 < marcadores.length ? marcadores[i + 1].inicioCabecalho : texto.length;
    resultado[m.titulo] = texto.slice(m.inicioCorpo, fimCorpo).trim();
  });
  return resultado;
}

interface LeituraOpcao {
  nome: string;
  forca: ForcaValor;
  partes: string[];
}

/** Divide o corpo da secção "Leitura por opção" pelos cabeçalhos "### <nome>" que o prompt exige, extrai a linha FORÇA: e as 4 partes numeradas de cada opção. */
function parseLeituraPorOpcao(corpo: string): LeituraOpcao[] {
  const blocos = corpo.split(/^###\s+/m).filter((b) => b.trim());
  return blocos.map((bloco) => {
    const linhas = bloco.split("\n");
    const nome = linhas[0].trim();
    const resto = linhas.slice(1).join("\n");

    const forcaRegex = new RegExp(`${MARCADORES.forca}\\s*(forte|moderada|fraca)`, "i");
    const forcaMatch = resto.match(forcaRegex);
    const forca = (forcaMatch?.[1]?.toLowerCase() as ForcaValor) ?? "moderada";
    const semForca = resto.replace(forcaRegex, "").trim();

    const indices: number[] = [];
    const numRegex = /^\d[.)]\s+/gm;
    let m: RegExpExecArray | null;
    while ((m = numRegex.exec(semForca))) indices.push(m.index);
    const partes = indices.map((start, i) => {
      const end = i + 1 < indices.length ? indices[i + 1] : semForca.length;
      return semForca.slice(start, end).replace(/^\d[.)]\s+/, "").trim();
    });

    return { nome, forca, partes };
  });
}

/** Extrai "CANDIDATA: <nome|nenhuma>" da primeira linha da secção — ver formato exigido em promptAdulto.ts. */
function parseCandidataForaDaLista(corpo: string): { nome: string | null; texto: string } {
  const regex = new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "m");
  const match = corpo.match(regex);
  const valor = match?.[1]?.trim() ?? "";
  const nome = !valor || valor.toLowerCase() === "nenhuma" ? null : valor;
  const texto = corpo.replace(regex, "").trim();
  return { nome, texto };
}

/** Separa a linha "PRIMEIRO PASSO: ..." do resto da secção "O plano". */
function parsePlano(corpo: string): { corpo: string; primeiroPasso: string | null } {
  const regex = new RegExp(`^.*${MARCADORES.primeiroPasso}\\s*(.*)$`, "m");
  const match = corpo.match(regex);
  const primeiroPasso = match?.[1]?.trim() ?? null;
  const resto = corpo.replace(regex, "").trim();
  return { corpo: resto, primeiroPasso };
}

/** Extrai "IDENTIDADE: <frase>" do texto em bruto — a linha vem ANTES do primeiro cabeçalho "## ", por isso corre sobre o texto completo, não sobre `seccoes` (dividirEmSeccoes ignora tudo antes do 1º cabeçalho). */
function parseIdentidade(textoCompleto: string): string | null {
  const regex = new RegExp(`^${MARCADORES.identidade}\\s*(.+)$`, "m");
  const match = textoCompleto.match(regex);
  return match?.[1]?.trim() || null;
}

function formatarDataLonga(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

function formatarMesAno(d: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(d).replace(".", "");
}

// ---------- Gráficos SVG (deterministicamente a partir dos dados, nunca do LLM) ----------

function svgGraficoForcas(pesos: PesoPlaneta[]): string {
  const ordenados = [...pesos].sort((a, b) => b.peso - a.peso);
  const largura = 620;
  const alturaLinha = 42;
  const margemEsquerda = 250;
  const margemDireita = 55;
  const escalaMax = 2.0;
  const areaBarra = largura - margemEsquerda - margemDireita;
  const altura = ordenados.length * alturaLinha + 12;

  const linhas = ordenados
    .map((p, i) => {
      const y = i * alturaLinha + 8;
      const larguraBarra = Math.max(2, Math.min(p.peso / escalaMax, 1) * areaBarra);
      const cor = corPeso(p.peso);
      const label = CARACTERISTICA_PT[p.planeta] ?? p.planeta;
      return `
      <text x="${margemEsquerda - 14}" y="${y + 21}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1A1A1A">${escapeHtml(label)}</text>
      <rect x="${margemEsquerda}" y="${y + 5}" width="${areaBarra}" height="20" fill="${CINZA_CLARO}" rx="4" />
      <rect x="${margemEsquerda}" y="${y + 5}" width="${larguraBarra}" height="20" fill="${cor}" rx="4" />
      <text x="${margemEsquerda + larguraBarra + 10}" y="${y + 20}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${AZUL}">${p.peso.toFixed(2)}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">${linhas}</svg>`;
}

function svgModoDeGanho(earningModes: EarningMode[], casaDominante: number): string {
  const largura = 460;
  const altura = 250;
  const larguraBarra = 96;
  const gap = 44;
  const alturaMaxBarra = 150;
  const baseY = 172;
  const margem = 48;

  const porCasa = [2, 6, 10].map((casa) => earningModes.find((e) => e.house === casa)).filter((e): e is EarningMode => !!e);
  const maiorScore = Math.max(...porCasa.map((e) => e.score), 1);

  const barras = porCasa
    .map((e, i) => {
      const x = margem + i * (larguraBarra + gap);
      const alturaBarra = Math.max(4, (e.score / maiorScore) * alturaMaxBarra);
      const y = baseY - alturaBarra;
      // A casa dominante vem de axes.earningMode.house (o campo já
      // computado e autoritativo por computeVocationIQAxes), não de
      // recalcular o máximo aqui — evita divergir em caso de empate.
      const dominante = e.house === casaDominante;
      const cor = dominante ? AZUL : CINZA_CLARO;
      const corTexto = dominante ? AZUL : "#6B6B6B";
      const [linha1, linha2] = CASA_LABEL_LINHAS[e.house] ?? ["", ""];
      return `
      <rect x="${x}" y="${y}" width="${larguraBarra}" height="${alturaBarra}" fill="${cor}" rx="6" />
      <text x="${x + larguraBarra / 2}" y="${baseY + 22}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="${dominante ? 700 : 400}" fill="${corTexto}">${escapeHtml(linha1)}</text>
      <text x="${x + larguraBarra / 2}" y="${baseY + 39}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="${dominante ? 700 : 400}" fill="${corTexto}">${escapeHtml(linha2)}</text>
      <text x="${x + larguraBarra / 2}" y="${y - 10}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="${corTexto}">${e.score}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    <line x1="${margem - 10}" y1="${baseY}" x2="${largura - margem + 10}" y2="${baseY}" stroke="#E6E6E6" stroke-width="1" />
    ${barras}
  </svg>`;
}

function svgTimeline(datas: DadosDatas): string {
  const periodos = [{ ...datas.antardashaAtual, actual: true }, ...datas.proximasAntardashas.map((p) => ({ ...p, actual: false }))];
  const largura = 620;
  const altura = 130;
  const margem = 60;
  const y = 46;
  const passo = periodos.length > 1 ? (largura - margem * 2) / (periodos.length - 1) : 0;

  const nos = periodos
    .map((p, i) => {
      const x = margem + i * passo;
      const cor = p.actual ? AMBAR : AZUL_CLARO;
      const label = PLANETA_PT[p.senhor] ?? p.senhor;
      const dataTexto = `${formatarMesAno(p.inicio)} – ${formatarMesAno(p.fim)}`;
      return `
      <circle cx="${x}" cy="${y}" r="10" fill="${cor}" stroke="${AZUL}" stroke-width="2" />
      <text x="${x}" y="${y + 32}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${AZUL}">${escapeHtml(label)}</text>
      <text x="${x}" y="${y + 49}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" fill="#6B6B6B">${escapeHtml(dataTexto)}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    <line x1="${margem}" y1="${y}" x2="${largura - margem}" y2="${y}" stroke="${AZUL}" stroke-width="2" />
    ${nos}
  </svg>`;
}

/** Quebra um texto em linhas de no máximo `maxCarPorLinha` caracteres, por palavra inteira — para caber texto de comprimento variável (vindo do LLM) dentro de formas SVG fixas. */
function quebrarLinhas(texto: string, maxCarPorLinha: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let actual = "";
  for (const p of palavras) {
    const tentativa = actual ? `${actual} ${p}` : p;
    if (tentativa.length > maxCarPorLinha && actual) {
      linhas.push(actual);
      actual = p;
    } else {
      actual = tentativa;
    }
  }
  if (actual) linhas.push(actual);
  return linhas;
}

/** Diagrama de identidade — linhas de convergência dos 7 sinais (características, por peso decrescente) para um círculo central com a frase IDENTIDADE: do LLM. Os sinais e as suas posições são sempre determinísticos; só o texto dentro do círculo vem do LLM. */
function svgDiagramaIdentidade(sinais: string[], identidade: string): string {
  const largura = 680;
  const margemTexto = 230;
  const cxCirculo = 490;
  const raioCirculo = 92;
  const gapLinha = 34;
  const topo = 20;
  const alturaSinais = sinais.length * gapLinha;
  const cyCirculo = Math.max(topo + alturaSinais / 2, raioCirculo + 16);
  const altura = Math.max(cyCirculo + raioCirculo + 20, topo + alturaSinais + 20);

  const linhas = sinais
    .map((s, i) => {
      const y = topo + i * gapLinha + gapLinha / 2;
      return `
      <text x="${margemTexto - 10}" y="${y + 5}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1A1A1A">${escapeHtml(s)}</text>
      <path d="M ${margemTexto} ${y} L ${cxCirculo - raioCirculo - 6} ${cyCirculo}" stroke="${AMBAR}" stroke-width="1.5" fill="none" opacity="0.75" />
      <circle cx="${margemTexto}" cy="${y}" r="3" fill="${AMBAR}" />`;
    })
    .join("");

  const linhasIdentidade = quebrarLinhas(identidade, 15);
  const inicioY = cyCirculo - (linhasIdentidade.length - 1) * 9;
  const tspans = linhasIdentidade.map((l, i) => `<tspan x="${cxCirculo}" y="${inicioY + i * 18}">${escapeHtml(l)}</tspan>`).join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${linhas}
    <circle cx="${cxCirculo}" cy="${cyCirculo}" r="${raioCirculo}" fill="${AZUL}" />
    <text text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">${tspans}</text>
  </svg>`;
}

/** Caminho SVG de um sector em pizza (do centro até `raio`), usado pela Roda da Vida. */
function setorPiePath(cx: number, cy: number, raio: number, anguloInicioDeg: number, anguloFimDeg: number): string {
  if (raio <= 0.5) return "";
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const ponto = (r: number, ang: number): [number, number] => [cx + r * Math.cos(rad(ang)), cy + r * Math.sin(rad(ang))];
  const [x1, y1] = ponto(raio, anguloInicioDeg);
  const [x2, y2] = ponto(raio, anguloFimDeg);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2} Z`;
}

interface DimensaoVida {
  nome: string;
  descricao: string;
  valor: number;
  /** Rótulo alternativo só para a etiqueta da roda (espaço fixo) — usado apenas quando "nome" tem uma palavra longa que corta na roda; a lista por baixo continua a mostrar "nome" por inteiro. */
  rotulo?: string;
}

const SAV_MIN = 18;
const SAV_MAX = 42;

/** Normaliza o SAV (17-45 tipicamente) para escala 0-10, com o limiar exacto pedido; sujeito a arredondamento a 1 casa e capado a [0,10] (só por segurança — a fórmula pedida não capa, mas um valor fora de 0-10 quebraria a leitura "sobre 10" do texto). */
function normalizarSav(mediaSav: number): number {
  const bruto = ((mediaSav - SAV_MIN) / (SAV_MAX - SAV_MIN)) * 10;
  return Math.round(Math.min(10, Math.max(0, bruto)) * 10) / 10;
}

function mediaSavCasas(savPorCasa: SavPorCasa[], casas: number[]): number {
  const pontuacoes = casas.map((c) => savPorCasa.find((h) => h.casa === c)?.pontuacao ?? SAV_MIN);
  return pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length;
}

/**
 * Roda da Vida — 8 dimensões universais (não astrológicas no nome),
 * cada uma calculada a partir do SAV da(s) casa(s) clássica(s) que a
 * sustentam, normalizado para 0-10. Sempre determinística — nunca o LLM.
 * A "fórmula de blend com um planeta" que o pedido menciona por
 * dimensão (ex.: "casa 6 + Marte") não veio acompanhada de uma fórmula
 * de combinação — só a normalização do SAV tem fórmula exacta — por
 * isso cada dimensão usa só o SAV da(s) casa(s) indicada(s); a menção ao
 * planeta descreve a significação clássica da casa, não um termo extra
 * a somar (inventar um peso para essa mistura violaria "não inventar").
 */
function computeRodaDaVida(savPorCasa: SavPorCasa[]): DimensaoVida[] {
  return [
    { nome: "Carreira / Propósito", descricao: "A força da sua vocação e direcção profissional", valor: normalizarSav(mediaSavCasas(savPorCasa, [10])) },
    { nome: "Finanças / Recursos", descricao: "A sua relação natural com a geração e gestão de recursos", valor: normalizarSav(mediaSavCasas(savPorCasa, [2])) },
    { nome: "Desenvolvimento Pessoal", rotulo: "Desenv. Pessoal", descricao: "A sua capacidade de crescer e expandir o seu mundo", valor: normalizarSav(mediaSavCasas(savPorCasa, [1, 9])) },
    { nome: "Saúde / Energia", descricao: "A sua reserva de energia e capacidade de acção", valor: normalizarSav(mediaSavCasas(savPorCasa, [6])) },
    { nome: "Relações / Rede", descricao: "A força das suas ligações e do seu círculo", valor: normalizarSav(mediaSavCasas(savPorCasa, [7, 11])) },
    { nome: "Criatividade / Expressão", descricao: "A sua capacidade de criar e de se expressar", valor: normalizarSav(mediaSavCasas(savPorCasa, [5])) },
    { nome: "Ambiente / Estilo de vida", descricao: "O que a sua carta pede em termos de base e de raízes", valor: normalizarSav(mediaSavCasas(savPorCasa, [4])) },
    { nome: "Contribuição / Impacto", descricao: "O que deixa para além de si — a marca que fica nas pessoas e nos sistemas que toca", valor: normalizarSav(mediaSavCasas(savPorCasa, [9, 11])) },
  ];
}

function corRodaDaVida(valor: number): string {
  if (valor >= 7) return VERDE;
  if (valor >= 4) return AMBAR;
  return VERMELHO;
}

/**
 * Roda da Vida — 8 sectores iguais, cada um preenchido do centro até um
 * raio proporcional ao valor (0-10); a "pista" de fundo (opacity 0.15)
 * mostra o sector inteiro para se perceber a escala. Grelha de círculos
 * concêntricos em 2/4/6/8/10. Nome fora do círculo, valor dentro (com
 * fundo branco próprio, para ler bem tanto sobre a pista clara como
 * sobre o preenchimento colorido).
 */
function svgRodaDaVida(dimensoes: DimensaoVida[]): string {
  const tamanho = 460;
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const raioMax = 130;
  const raioValor = 62;
  const raioLabel = raioMax + 42;
  const n = dimensoes.length;
  const anguloPorSector = 360 / n;

  const grelha = [2, 4, 6, 8, 10]
    .map((v) => `<circle cx="${cx}" cy="${cy}" r="${(v / 10) * raioMax}" fill="none" stroke="#E6E6E6" stroke-width="1" />`)
    .join("");

  const sectores = dimensoes
    .map((d, i) => {
      const anguloInicio = i * anguloPorSector - 90;
      const anguloFim = anguloInicio + anguloPorSector;
      const anguloMeio = anguloInicio + anguloPorSector / 2;
      const rad = (anguloMeio * Math.PI) / 180;
      const cor = corRodaDaVida(d.valor);
      const raioPreenchido = (d.valor / 10) * raioMax;

      const lx = cx + raioLabel * Math.cos(rad);
      const ly = cy + raioLabel * Math.sin(rad);
      const cosMeio = Math.cos(rad);
      const anchor = cosMeio > 0.3 ? "start" : cosMeio < -0.3 ? "end" : "middle";
      const linhasNome = quebrarLinhas(d.rotulo ?? d.nome, 14);
      const inicioYNome = ly - ((linhasNome.length - 1) * 12) / 2;
      const tspansNome = linhasNome.map((l, li) => `<tspan x="${lx}" y="${inicioYNome + li * 13}">${escapeHtml(l)}</tspan>`).join("");

      const vx = cx + raioValor * Math.cos(rad);
      const vy = cy + raioValor * Math.sin(rad);

      return `
      <path d="${setorPiePath(cx, cy, raioMax, anguloInicio, anguloFim)}" fill="${cor}" opacity="0.15" stroke="#FFFFFF" stroke-width="1.5" />
      <path d="${setorPiePath(cx, cy, raioPreenchido, anguloInicio, anguloFim)}" fill="${cor}" />
      <circle cx="${vx}" cy="${vy}" r="15" fill="#FFFFFF" stroke="${cor}" stroke-width="2" />
      <text x="${vx}" y="${vy + 4}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="${AZUL}">${d.valor.toFixed(1)}</text>
      <text text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="600" fill="#1A1A1A">${tspansNome}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${tamanho} ${tamanho}" width="100%" style="max-width:${tamanho}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${grelha}
    ${sectores}
  </svg>`;
}

// ---------- Blocos HTML ----------

/** Os "sinais" do diagrama de identidade — reaproveita os mesmos rótulos humanos já usados no gráfico "O peso de cada característica" (CARACTERISTICA_PT), ordenados por peso decrescente. Sempre determinístico, nunca do LLM. */
function sinaisIdentidade(pesos: PesoPlaneta[]): string[] {
  return [...pesos].sort((a, b) => b.peso - a.peso).map((p) => CARACTERISTICA_PT[p.planeta] ?? p.planeta);
}

function blocoDiagramaIdentidade(pesos: PesoPlaneta[], identidade: string | null): string {
  if (!identidade) return "";
  return `
    <section class="seccao">
      <h2 class="titulo-seccao">Quem você realmente é</h2>
      <div class="grafico-wrap grafico-centrado">${svgDiagramaIdentidade(sinaisIdentidade(pesos), identidade)}</div>
      <p class="grafico-legenda" style="text-align:center">Os sinais à esquerda são os traços mais fortes da sua carta — convergem na síntese ao centro.</p>
    </section>`;
}

function blocoRodaDaVida(savPorCasa: SavPorCasa[]): string {
  const dimensoes = computeRodaDaVida(savPorCasa);
  const lista = dimensoes
    .map(
      (d) => `
      <div class="dimensao-vida-item">
        <span class="dimensao-vida-nome">${escapeHtml(d.nome)}</span>
        <span class="dimensao-vida-valor" style="color:${corRodaDaVida(d.valor)}">${d.valor.toFixed(1)}/10</span>
        <p class="dimensao-vida-descricao">${escapeHtml(d.descricao)}</p>
      </div>`,
    )
    .join("");

  return `
    <div class="roda-vida-wrap">
      <p class="bloco-titulo roda-vida-titulo">O seu perfil de vida</p>
      <p class="roda-vida-subtitulo">Como a sua carta estrutura cada área da sua vida</p>
      <div class="grafico-wrap grafico-centrado">${svgRodaDaVida(dimensoes)}</div>
      <p class="grafico-legenda">Verde = força natural (≥7) · Âmbar = equilíbrio (4-6) · Vermelho = pede mais construção (&lt;4)</p>
      <div class="caixa-neutra roda-vida-explicacao">
        <p>Esta roda mostra onde a sua carta tem força natural e onde pede mais esforço. Não é um julgamento — é um mapa. Áreas mais preenchidas indicam onde o seu perfil flui naturalmente. Áreas menos preenchidas indicam onde vai precisar de construir com mais intenção.</p>
      </div>
      <div class="dimensao-vida-lista">${lista}</div>
    </div>`;
}

/** Rótulo humano da casa dominante do Modo de Ganho — mesma convenção de CASA_LABEL_LINHAS, aqui em frase única para a coluna "O que apoia" da tabela de tensões. */
const CASA_APOIO_LABEL: Record<number, string> = {
  2: "Ganhar pela voz e pela consultoria",
  6: "Ganhar por resolver problemas",
  10: "Ganhar por liderar publicamente",
};

/**
 * Tabela de tensões — determinística: para cada planeta com peso < 0,9
 * (limiar já usado em corPeso/TERMOS_PROIBIDOS), cruza com a tese central
 * (Modo de Ganho dominante). Máximo 3 linhas, as tensões mais fortes
 * primeiro (peso mais baixo). Nunca escrita pelo LLM — só o texto das 5
 * secções de prosa vem de lá.
 */
function tabelaTensoes(pesos: PesoPlaneta[], casaDominante: number): string {
  const fracos = [...pesos]
    .filter((p) => p.peso < 0.9)
    .sort((a, b) => a.peso - b.peso)
    .slice(0, 3);
  if (!fracos.length) return "";

  const apoio = CASA_APOIO_LABEL[casaDominante] ?? "A sua forma dominante de ganhar";
  const linhas = fracos
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(apoio)}</td>
        <td>${escapeHtml(CARACTERISTICA_PT[p.planeta] ?? p.planeta)} <span class="peso-fraco">(peso ${p.peso.toFixed(2)})</span></td>
        <td>Esta parte da carta está enfraquecida — o que a tese central pede aqui não é natural, tem de ser construído com esforço consciente.</td>
      </tr>`,
    )
    .join("");

  return `
    <div class="anexo-espaco">
      <p class="rotulo-pequeno">Onde a carta tem atrito</p>
      <table class="tabela-anexo tabela-tensoes">
        <thead><tr><th>O que apoia</th><th>O que resiste</th><th>O que significa</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function blocoQuemE(d: DadosParaTemplate): string {
  const linhas: [string, string][] = [
    ["Nome", d.nome],
    ["Data de nascimento", formatarDataLonga(d.dataNascimento)],
    ...(d.horaNascimento ? ([["Hora", d.horaNascimento]] as [string, string][]) : []),
    ["Local de nascimento", d.localNascimento],
    ["Situação declarada", d.situacaoDeclarada],
    ["Área actual", d.areaActual],
    ["Anos de experiência", d.anosExperiencia],
  ];
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">Quem é</p>
      <table class="tabela-dados">
        ${linhas.map(([label, valor]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`).join("")}
      </table>
    </div>`;
}

function blocoOQueTrouxe(d: DadosParaTemplate): string {
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">O que trouxe</p>
      ${
        d.oQueNaoFunciona
          ? `<div class="citacao"><p>&ldquo;${escapeHtml(d.oQueNaoFunciona)}&rdquo;</p></div>`
          : ""
      }
      ${
        d.opcoesConsideradas.length
          ? `<p class="rotulo-pequeno">Opções consideradas</p><div class="chips">${d.opcoesConsideradas.map((o) => `<span class="chip">${escapeHtml(o)}</span>`).join("")}</div>`
          : ""
      }
      ${d.ideiaConcreta ? `<div class="destaque-ambar"><p class="rotulo-pequeno">Ideia concreta</p><p>${escapeHtml(d.ideiaConcreta)}</p></div>` : ""}
      ${d.perguntaEspecifica ? `<div class="destaque-navy"><p class="rotulo-pequeno">Pergunta a que este relatório responde</p><p>${escapeHtml(d.perguntaEspecifica)}</p></div>` : ""}
    </div>`;
}

function blocoOQueEsteRelatorioResponde(): string {
  const itens = [
    "A sua missão de fundo, e onde ela já aparece na sua vida profissional.",
    "Como e onde ganha melhor.",
    "Uma leitura honesta de cada opção que está a considerar: o que a sustenta, o que custa, o que falta.",
    "Se há alguma opção fora da sua lista que a sua carta sustenta com força.",
    "Um primeiro passo concreto para esta semana, ligado às suas datas reais.",
  ];
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">O que este relatório responde</p>
      <ul class="lista-promessa">${itens.map((i) => `<li>${i}</li>`).join("")}</ul>
    </div>`;
}

function cardOpcao(op: LeituraOpcao): string {
  const PARTE_LABEL = [
    { icone: "&#10003;", titulo: "O que a carta sustenta" },
    { icone: "&#9888;", titulo: "O que vai custar" },
    { icone: "?", titulo: "O que pede que falta" },
    { icone: "&#8594;", titulo: "Onde entra a sua matéria" },
  ];
  const partes = op.partes
    .map((texto, i) => {
      const info = PARTE_LABEL[i];
      if (!info) return "";
      return `
      <div class="parte-opcao ${i % 2 === 1 ? "parte-alt" : ""}">
        <p class="parte-titulo"><span class="parte-icone">${info.icone}</span>${info.titulo}</p>
        ${markdownParaHtml(texto)}
      </div>`;
    })
    .join("");

  return `
    <div class="card-opcao">
      <div class="card-opcao-header">
        <span>${escapeHtml(op.nome)}</span>
        <span class="badge-forca" style="background:${corForca(op.forca)}">${FORCA_LABEL[op.forca]}</span>
      </div>
      ${partes}
    </div>`;
}

function blocoCandidataForaDaLista(corpo: string): string {
  const { nome, texto } = parseCandidataForaDaLista(corpo);
  if (nome) {
    return `
      <div class="card-candidata">
        <p class="card-candidata-header">Uma opção que ainda não considerou</p>
        <p class="card-candidata-nome">${escapeHtml(nome)}</p>
        ${markdownParaHtml(texto)}
      </div>`;
  }
  return `<div class="caixa-neutra">${markdownParaHtml(texto || corpo)}</div>`;
}

function blocoOPlano(corpo: string, datas: DadosDatas): string {
  const { corpo: resto, primeiroPasso } = parsePlano(corpo);
  return `
    <div class="timeline-wrap">${svgTimeline(datas)}</div>
    <p class="grafico-legenda">Âmbar = o período em que está agora · Azul-claro = os períodos seguintes.</p>
    ${resto ? markdownParaHtml(resto) : ""}
    ${primeiroPasso ? `<div class="destaque-ambar destaque-passo"><p class="rotulo-pequeno">O seu primeiro passo esta semana</p><p>${escapeHtml(primeiroPasso)}</p></div>` : ""}`;
}

function tabelaApoioPorAreaDeVida(savPorCasa: SavPorCasa[]): string {
  const linhas = [...savPorCasa]
    .sort((a, b) => a.casa - b.casa)
    .map(
      (h) => `
      <tr>
        <td>${escapeHtml(AREA_VIDA_PT[h.casa] ?? `Área ${h.casa}`)}</td>
        <td class="col-numero">${h.pontuacao}</td>
        <td><span class="badge-classificacao" style="background:${corClassificacao(h.classificacao)}">${CLASSIFICACAO_LABEL[h.classificacao]}</span></td>
      </tr>`,
    )
    .join("");
  return `
    <table class="tabela-anexo">
      <thead><tr><th>Área de vida</th><th class="col-numero">Apoio</th><th>Classificação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function tabelaOsTeusPeriodos(datas: DadosDatas): string {
  const periodos = [
    { ...datas.mahadashaAtual, tipo: "Ciclo actual" },
    { ...datas.antardashaAtual, tipo: "Período actual" },
    ...datas.proximasAntardashas.map((p) => ({ ...p, tipo: "Período seguinte" })),
  ];
  const linhas = periodos
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.tipo)}</td>
        <td>${escapeHtml(PLANETA_PT[p.senhor] ?? p.senhor)}</td>
        <td>${formatarMesAno(p.inicio)} – ${formatarMesAno(p.fim)}</td>
        <td>${escapeHtml(DASHA_O_QUE_PEDE[p.senhor] ?? "")}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="tabela-anexo">
      <thead><tr><th>Período</th><th>Regido por</th><th>Datas</th><th>O que pede</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function seccaoComoLer(): string {
  const paragrafos = [
    "Este relatório cruza várias camadas do seu mapa de nascimento — a sua energia de fundo, a forma como ganha melhor, o que o mercado já reconhece em si, e o momento em que está agora — para chegar a uma leitura sobre cada opção que trouxe.",
    "Cada opção só é apresentada como \"sustentada com força\" quando pelo menos duas fontes independentes convergem — nunca por um único sinal isolado.",
    "As datas que vê na tabela de períodos são reais, calculadas a partir da sua hora de nascimento (ou de uma estimativa, quando não a soubemos) — não são genéricas nem iguais para todos.",
    "Nada aqui é uma sentença. É um mapa do que a sua carta sustenta e do que custa — a decisão final é sempre sua.",
  ];
  return `<div class="caixa-neutra">${paragrafos.map((p) => `<p>${p}</p>`).join("")}</div>`;
}

export function gerarHTMLRelatorio(
  dados: DadosParaTemplate,
  texto: string,
  axes: VocationIQAxes,
  pesos: PesoPlaneta[],
  earningModes: EarningMode[],
  datas: DadosDatas,
  savPorCasa: SavPorCasa[],
): string {
  const seccoes = dividirEmSeccoes(texto);
  const dataGeracao = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const opcoes = parseLeituraPorOpcao(seccoes[SECCAO_TITULOS.leituraPorOpcao] ?? "");
  const identidade = parseIdentidade(texto);

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório VocationIQ — ${escapeHtml(dados.nome)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* htmlToPdf.ts usa preferCSSPageSize (réplica exacta da Naveya) — sem
     esta regra, o PDF sairia em Letter (tamanho por omissão do Puppeteer)
     em vez de A4. Margem só na 1ª página é 0 (a capa é bleed total,
     preenchida pelo padding do próprio .capa); as restantes têm margem
     real — sem isso o texto saía cortado nas bordas entre páginas. */
  @page { size: A4; margin: 20mm 16mm 20mm 16mm; }
  @page :first { margin: 0; }
  :root { --azul: ${AZUL}; --ambar: ${AMBAR}; --cinza-claro: ${CINZA_CLARO}; }
  * { box-sizing: border-box; }
  body { font-family: "Inter", Arial, Helvetica, sans-serif; color: #1A1A1A; background: #FFFFFF; margin: 0; padding: 0; }
  .capa { min-height: 297mm; background: var(--azul); padding: 40mm 20mm; text-align: center; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .capa-logo { font-size: 36px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF; }
  .capa-logo .iq { color: var(--ambar); }
  .capa-tagline { color: var(--ambar); font-size: 15px; margin-top: 10px; font-weight: 500; }
  .capa-divisor { width: 64px; height: 3px; background: var(--ambar); margin: 40px auto; border: none; }
  .capa-nome { color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0; }
  .capa-data { color: #FFFFFF; opacity: 0.7; font-size: 14px; margin-top: 10px; }

  .container { max-width: 760px; margin: 0 auto; padding: 50px 40px 20px; }
  section.seccao { margin-top: 52px; page-break-inside: avoid; }
  h2.titulo-seccao { color: var(--azul); font-size: 13px; text-transform: uppercase; letter-spacing: 1.6px; font-weight: 700; border-bottom: 2px solid var(--ambar); padding-bottom: 10px; margin: 0 0 22px; }

  .quadro-dados { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 8px; }
  @media (max-width: 700px) { .quadro-dados { grid-template-columns: 1fr; } }
  .bloco-dados { background: var(--cinza-claro); border-radius: 10px; padding: 20px; }
  .bloco-titulo { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--azul); margin: 0 0 14px; }
  .tabela-dados { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tabela-dados th { text-align: left; font-weight: 600; color: #6B6B6B; padding: 6px 8px 6px 0; vertical-align: top; width: 42%; }
  .tabela-dados td { padding: 6px 0; color: #1A1A1A; }
  .rotulo-pequeno { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6B6B6B; margin: 14px 0 6px; }
  .rotulo-pequeno:first-child { margin-top: 0; }
  .citacao { background: rgba(245,166,35,0.14); border-left: 3px solid var(--ambar); border-radius: 6px; padding: 12px 14px; }
  .citacao p { font-style: italic; margin: 0; font-size: 14px; line-height: 1.6; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: var(--azul); color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 999px; }
  .destaque-ambar { background: rgba(245,166,35,0.14); border-radius: 8px; padding: 12px 14px; margin-top: 12px; }
  .destaque-navy { background: rgba(27,58,107,0.08); border-radius: 8px; padding: 12px 14px; margin-top: 12px; }
  .destaque-ambar p:last-child, .destaque-navy p:last-child { margin: 0; font-size: 14px; line-height: 1.6; }
  .lista-promessa { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8; }
  .lista-promessa li { margin-bottom: 6px; }

  p { line-height: 1.8; font-size: 16px; margin: 0 0 16px; }
  ol { padding-left: 20px; margin: 0 0 16px; }
  li { margin-bottom: 8px; line-height: 1.7; }
  strong { color: var(--azul); }

  .grafico-legenda { font-size: 12px; color: #6B6B6B; margin-top: 10px; }
  .grafico-wrap { overflow-x: auto; }
  .grafico-3barras { display: flex; justify-content: center; }
  .grafico-centrado { display: flex; justify-content: center; }
  .peso-fraco { color: #6B6B6B; font-size: 12px; }

  .roda-vida-wrap { margin-top: 20px; text-align: center; }
  .roda-vida-titulo { text-align: center; margin-bottom: 2px; }
  .roda-vida-subtitulo { font-size: 13px; color: #6B6B6B; margin: 0 0 14px; }
  .roda-vida-wrap .grafico-legenda { text-align: center; }
  .roda-vida-explicacao { text-align: left; margin: 16px auto 0; max-width: 560px; }
  .dimensao-vida-lista { text-align: left; margin: 20px auto 0; max-width: 620px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
  @media (max-width: 700px) { .dimensao-vida-lista { grid-template-columns: 1fr; } }
  .dimensao-vida-item { border-top: 1px solid #E6E6E6; padding-top: 8px; }
  .dimensao-vida-nome { font-size: 13px; font-weight: 700; color: var(--azul); }
  .dimensao-vida-valor { font-size: 13px; font-weight: 700; margin-left: 6px; }
  .dimensao-vida-descricao { font-size: 12px; color: #6B6B6B; margin: 3px 0 0; line-height: 1.5; }

  .card-opcao { border: 1px solid #E6E6E6; border-radius: 10px; overflow: hidden; margin-bottom: 24px; page-break-inside: avoid; }
  .card-opcao-header { background: var(--azul); color: #FFFFFF; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-weight: 700; font-size: 16px; }
  .badge-forca { font-size: 11px; font-weight: 700; color: #FFFFFF; padding: 5px 11px; border-radius: 999px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.4px; }
  .parte-opcao { padding: 18px 20px; background: #FFFFFF; }
  .parte-alt { background: var(--cinza-claro); }
  .parte-titulo { font-size: 13px; font-weight: 700; color: var(--azul); margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
  .parte-icone { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--azul); color: #FFFFFF; font-size: 12px; flex-shrink: 0; }
  .parte-opcao p { font-size: 14px; margin: 0; }

  .card-candidata { border: 2px solid var(--ambar); border-radius: 10px; padding: 20px; }
  .card-candidata-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ambar); margin: 0 0 6px; }
  .card-candidata-nome { font-size: 18px; font-weight: 700; color: var(--azul); margin: 0 0 12px; }
  .caixa-neutra { background: var(--cinza-claro); border-radius: 10px; padding: 20px; }

  .timeline-wrap { overflow-x: auto; margin-bottom: 8px; }
  .destaque-passo { margin-top: 24px; }
  .destaque-passo p:last-child { font-size: 16px; font-weight: 600; color: var(--azul); }

  .anexo-espaco { margin-top: 32px; }
  .tabela-anexo { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  .tabela-anexo th { text-align: left; font-weight: 700; color: var(--azul); padding: 8px 10px; border-bottom: 2px solid var(--ambar); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tabela-anexo td { padding: 8px 10px; border-bottom: 1px solid #E6E6E6; vertical-align: top; }
  .tabela-anexo .col-numero { text-align: right; font-weight: 600; }
  .badge-classificacao { display: inline-block; font-size: 11px; font-weight: 700; color: #FFFFFF; padding: 3px 10px; border-radius: 999px; }
  .caixa-neutra p { font-size: 14px; margin: 0 0 12px; }
  .caixa-neutra p:last-child { margin-bottom: 0; }
  .anexo { page-break-before: always; }

  footer.rodape { text-align: center; padding: 40px 20px 60px; color: #6B6B6B; font-size: 12px; border-top: 1px solid #E6E6E6; margin-top: 50px; }
  footer.rodape .rodape-logo { font-weight: 800; color: var(--azul); font-size: 14px; margin-bottom: 8px; }
  footer.rodape .rodape-logo .iq { color: var(--ambar); }
  footer.rodape p { font-size: 12px; margin: 2px 0; line-height: 1.5; }

  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .capa { height: 297mm; min-height: 297mm; }
    h1, h2, h3, p, li, td, th { page-break-inside: avoid; }
    .parte-opcao { page-break-inside: avoid; }
  }
</style>
</head>
<body>

  <div class="capa">
    <div class="capa-logo">Vocation<span class="iq">IQ</span></div>
    <div class="capa-tagline">Descubra a sua área. Antes de escolher.</div>
    <hr class="capa-divisor" />
    <p class="capa-nome">${escapeHtml(dados.nome)}</p>
    <p class="capa-data">${dataGeracao}</p>
  </div>

  <div class="container">

    ${blocoDiagramaIdentidade(pesos, identidade)}

    <section class="seccao">
      <h2 class="titulo-seccao">Quem é, e o que trouxe</h2>
      <div class="quadro-dados">
        ${blocoQuemE(dados)}
        ${blocoOQueTrouxe(dados)}
        ${blocoOQueEsteRelatorioResponde()}
      </div>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.abertura)}</h2>
      ${markdownParaHtml(seccoes[SECCAO_TITULOS.abertura] ?? "")}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.oQueACartaSustenta)}</h2>
      ${markdownParaHtml(seccoes[SECCAO_TITULOS.oQueACartaSustenta] ?? "")}
      ${blocoRodaDaVida(savPorCasa)}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">O peso de cada característica</h2>
      <div class="grafico-wrap">${svgGraficoForcas(pesos)}</div>
      <p class="grafico-legenda">Verde = a carta apoia com força · Âmbar = suporte moderado · Vermelho = suporte fraco</p>
      ${tabelaTensoes(pesos, axes.earningMode.house)}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">Como ganha melhor</h2>
      <div class="grafico-wrap grafico-3barras">${svgModoDeGanho(earningModes, axes.earningMode.house)}</div>
      <p class="grafico-legenda" style="text-align:center">A barra em azul é o modo dominante — a forma que a sua carta mais sustenta para gerar valor.</p>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.leituraPorOpcao)}</h2>
      ${opcoes.map(cardOpcao).join("")}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.candidataForaDaLista)}</h2>
      ${blocoCandidataForaDaLista(seccoes[SECCAO_TITULOS.candidataForaDaLista] ?? "")}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">O seu calendário</h2>
      ${blocoOPlano(seccoes[SECCAO_TITULOS.oPlano] ?? "", datas)}
    </section>

    <section class="seccao anexo">
      <h2 class="titulo-seccao">Anexo — dados da sua análise</h2>

      <p class="rotulo-pequeno">Como ler este relatório</p>
      ${seccaoComoLer()}

      <p class="rotulo-pequeno anexo-espaco">Apoio por área de vida</p>
      ${tabelaApoioPorAreaDeVida(savPorCasa)}

      <p class="rotulo-pequeno anexo-espaco">Os seus períodos</p>
      ${tabelaOsTeusPeriodos(datas)}
    </section>

  </div>

  <footer class="rodape">
    <div class="rodape-logo">Vocation<span class="iq">IQ</span></div>
    <p>Este relatório foi preparado especificamente para ${escapeHtml(dados.nome)}</p>
    <p>${dataGeracao} · vocationiq.app</p>
    <p><strong>Confidencial</strong></p>
  </footer>

</body>
</html>`;
}
