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
  Sun: "A tua missão de fundo",
  Moon: "O que sentes antes de pensar",
  Mars: "A tua capacidade de agir",
  Mercury: "Como comunicas e decides",
  Jupiter: "Para onde queres crescer",
  Venus: "O que valorizas",
  Saturn: "O que te exige mais",
};

const CASA_LABEL_LINHAS: Record<number, [string, string]> = {
  2: ["Pela voz e", "consultoria"],
  6: ["Resolvendo", "problemas"],
  10: ["Liderando", "publicamente"],
};

/** Anexo — "Apoio por área de vida". Traduções em linguagem simples das 12 áreas de vida clássicas (bhavas), sem jargão. */
const AREA_VIDA_PT: Record<number, string> = {
  1: "Como te apresentas ao mundo, a tua energia",
  2: "O que ganhas e como lidas com dinheiro",
  3: "A tua iniciativa e comunicação do dia a dia",
  4: "As tuas raízes, casa e estabilidade emocional",
  5: "A tua criatividade e aquilo que constróis",
  6: "Como lidas com obstáculos e o trabalho do dia a dia",
  7: "As tuas parcerias e relações directas",
  8: "As transformações profundas, o que fica escondido",
  9: "As tuas crenças e para onde queres expandir",
  10: "A tua carreira e a cara que mostras publicamente",
  11: "Os teus ganhos, redes e comunidade",
  12: "O que soltas e o que fica só para ti",
};

const CLASSIFICACAO_LABEL: Record<ClassificacaoApoio, string> = { forte: "Forte", medio: "Médio", fraco: "Fraco" };
function corClassificacao(c: ClassificacaoApoio): string {
  if (c === "forte") return VERDE;
  if (c === "medio") return AMBAR;
  return VERMELHO;
}

/** Anexo — "Os teus períodos". Descrição genérica (não pessoal) do que cada regente de período clássicamente pede — mesma convenção usada em todo o relatório: dados fixos, nunca inventados pelo LLM. */
const DASHA_O_QUE_PEDE: Record<string, string> = {
  Sun: "Pede-te para assumires responsabilidade e liderança visível.",
  Moon: "Pede-te para cuidares da tua estabilidade emocional e da tua casa.",
  Mars: "Pede-te acção directa e coragem para resolver o que está parado.",
  Mercury: "Pede-te clareza de comunicação e atenção aos detalhes práticos.",
  Jupiter: "Pede-te para investires em crescimento, aprendizagem e visão de longo prazo.",
  Venus: "Pede-te para cuidares das tuas relações e do que valorizas.",
  Saturn: "Pede-te disciplina, paciência, e trabalho de fundo sem resultados imediatos.",
  Rahu: "Pede-te para saíres da tua zona confortável e arriscares algo novo.",
  Ketu: "Pede-te para soltares o que já não serve e olhares para dentro.",
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

// ---------- Blocos HTML ----------

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
    "A tua missão de fundo, e onde ela já aparece na tua vida profissional.",
    "Como e onde ganhas melhor.",
    "Uma leitura honesta de cada opção que estás a considerar: o que a sustenta, o que custa, o que falta.",
    "Se há alguma opção fora da tua lista que a tua carta sustenta com força.",
    "Um primeiro passo concreto para esta semana, ligado às tuas datas reais.",
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
    { icone: "&#8594;", titulo: "Onde entra a tua matéria" },
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
        <p class="card-candidata-header">Uma opção que não consideraste ainda</p>
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
    ${resto ? markdownParaHtml(resto) : ""}
    ${primeiroPasso ? `<div class="destaque-ambar destaque-passo"><p class="rotulo-pequeno">O teu primeiro passo esta semana</p><p>${escapeHtml(primeiroPasso)}</p></div>` : ""}`;
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
    "Este relatório cruza várias camadas do teu mapa de nascimento — a tua energia de fundo, a forma como ganhas melhor, o que o mercado já reconhece em ti, e o momento em que estás agora — para chegar a uma leitura sobre cada opção que trouxeste.",
    "Cada opção só é apresentada como \"sustentada com força\" quando pelo menos duas fontes independentes convergem — nunca por um único sinal isolado.",
    "As datas que vês na tabela de períodos são reais, calculadas a partir da tua hora de nascimento (ou de uma estimativa, quando não a soubemos) — não são genéricas nem iguais para todos.",
    "Nada aqui é uma sentença. É um mapa do que a tua carta sustenta e do que custa — a decisão final é sempre tua.",
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
     em vez de A4. Margem 0: o espaçamento já vem do padding interno de
     .capa/.container, tal como antes. */
  @page { size: A4; margin: 0; }
  :root { --azul: ${AZUL}; --ambar: ${AMBAR}; --cinza-claro: ${CINZA_CLARO}; }
  * { box-sizing: border-box; }
  body { font-family: "Inter", Arial, Helvetica, sans-serif; color: #1A1A1A; background: #FFFFFF; margin: 0; padding: 0; }
  .capa { background: var(--azul); padding: 90px 60px; text-align: center; page-break-after: always; }
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
    .capa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .chip, .badge-forca, .parte-icone, .badge-classificacao { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <div class="capa">
    <div class="capa-logo">Vocation<span class="iq">IQ</span></div>
    <div class="capa-tagline">Descobre a tua área. Antes de escolheres.</div>
    <hr class="capa-divisor" />
    <p class="capa-nome">${escapeHtml(dados.nome)}</p>
    <p class="capa-data">${dataGeracao}</p>
  </div>

  <div class="container">

    <section class="seccao">
      <h2 class="titulo-seccao">Quem és, e o que trouxeste</h2>
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
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">O peso de cada característica</h2>
      <div class="grafico-wrap">${svgGraficoForcas(pesos)}</div>
      <p class="grafico-legenda">Verde = a carta apoia com força · Âmbar = suporte moderado · Vermelho = suporte fraco</p>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">Como ganhas melhor</h2>
      <div class="grafico-wrap grafico-3barras">${svgModoDeGanho(earningModes, axes.earningMode.house)}</div>
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
      <h2 class="titulo-seccao">O teu calendário</h2>
      ${blocoOPlano(seccoes[SECCAO_TITULOS.oPlano] ?? "", datas)}
    </section>

    <section class="seccao anexo">
      <h2 class="titulo-seccao">Anexo — dados da tua análise</h2>

      <p class="rotulo-pequeno">Como ler este relatório</p>
      ${seccaoComoLer()}

      <p class="rotulo-pequeno anexo-espaco">Apoio por área de vida</p>
      ${tabelaApoioPorAreaDeVida(savPorCasa)}

      <p class="rotulo-pequeno anexo-espaco">Os teus períodos</p>
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
