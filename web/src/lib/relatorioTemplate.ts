import {
  SECCAO_TITULOS,
  MARCADORES,
  computeRodaDaVida,
  MAHADASHA_CLASSIFICACAO,
  normalizarTextoLivre,
  computeApoioPorAreaDeVida,
  valorCasaUnificado,
  type ClassicalGraha,
  type VocationIQAxes,
  type PesoPlaneta,
  type EarningMode,
  type DadosDatas,
  type ForcaValor,
  type SavPorCasa,
  type ClassificacaoApoio,
  type DimensaoVida,
  type ResultadoCatalogoVocacional,
} from "@naveya/method-engine";

export { computeRodaDaVida, type DimensaoVida };

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
  /**
   * TAREFA 1 (correcção do especialista) — antes desta correcção, o
   * ramo adolescente (que não tem área actual/anos de experiência)
   * reaproveitava estes 2 campos com valores placeholder ("Ainda a
   * estudar" / o rótulo da situação escolar), o que produzia linhas sem
   * sentido no quadro de dados ("Anos de experiência: Estou no 10º,
   * 11º ou 12º ano") e a secção inteira "A sua ponte de transição"
   * (que assume uma área de trabalho actual a abandonar — não aplicável
   * a quem nunca trabalhou). `ehAdolescente` faz o template tratar os 2
   * ramos de forma diferente em vez de forçar dados adultos a caber.
   */
  ehAdolescente?: boolean;
  /** TAREFA 2 (correcção do especialista) — rótulo humano do novo campo `ano_escolaridade` (migração 0020). Só usado quando `ehAdolescente` é true. */
  anoEscolaridade?: string;
  /**
   * FRENTE 1 (correcção do especialista, prova de geração real) — ISO
   * timestamp de `rascunho_criado_em`/`rascunho_criado_em` do texto
   * entregue (nunca inventado, nunca um placeholder) — vem sempre de
   * `TextoRelatorioActual.criadoEm` (storage.ts). `undefined`/`null`
   * (rascunho antigo, anterior a esta correcção) omite a linha do rodapé
   * por completo — nunca mostra uma data aproximada.
   */
  rascunhoCriadoEm?: string | null;
}

const AZUL = "#1B3A6B";
const AMBAR = "#F5A623";
const CINZA_CLARO = "#F5F5F5";
const VERDE = "#4f7a5c";
const VERMELHO = "#b4634a";
const AZUL_CLARO = "#c9d6e8";

export const PLANETA_PT: Record<string, string> = {
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

/** TAREFA 1 (correcção do especialista) — versão "tu" de CARACTERISTICA_PT, para o ramo adolescente (ver `caracteristicaPt`). */
const CARACTERISTICA_PT_TU: Record<string, string> = {
  Sun: "A tua missão de fundo",
  Moon: "O que sentes antes de pensar",
  Mars: "A tua capacidade de agir",
  Mercury: "Como comunicas e decides",
  Jupiter: "Para onde queres crescer",
  Venus: "O que valorizas",
  Saturn: "O que mais te exige",
};

/** TAREFA 1 — escolhe o registo "tu" (ramo adolescente) ou "você" (ramo adulto) para o rótulo humano de um planeta. */
function caracteristicaPt(planeta: string, usarTu: boolean): string {
  return usarTu ? (CARACTERISTICA_PT_TU[planeta] ?? planeta) : (CARACTERISTICA_PT[planeta] ?? planeta);
}

/**
 * TAREFA 3B (correcção do especialista) — legenda do gráfico "O peso de
 * cada característica": uma frase em português simples do que cada
 * característica representa, sem pronome pessoal (evita duplicar em
 * tu/você — funciona igual nos dois ramos).
 */
const CARACTERISTICA_EXPLICACAO: Record<string, string> = {
  Sun: "Representa a direcção mais profunda do perfil — o que move a pessoa quando tudo o resto está resolvido.",
  Moon: "Mostra a reacção emocional instintiva, antes de qualquer análise racional.",
  Mars: "Indica a facilidade natural para tomar iniciativa e executar.",
  Mercury: "Revela o estilo natural de comunicar, processar informação e tomar decisões.",
  Jupiter: "Aponta a direcção onde o crescimento e a expansão acontecem com mais naturalidade.",
  Venus: "Mostra o que traz prazer, harmonia e sentido de valor próprio.",
  Saturn: "Marca onde a disciplina e o esforço sustentado são mais necessários.",
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

/** TAREFA 1 — versão "tu" de AREA_VIDA_PT, para o Anexo do ramo adolescente. */
const AREA_VIDA_PT_TU: Record<number, string> = {
  1: "Como se apresenta ao mundo, a tua energia",
  2: "O que ganha e como lida com dinheiro",
  3: "A tua iniciativa e comunicação do dia a dia",
  4: "As tuas raízes, casa e estabilidade emocional",
  5: "A tua criatividade e aquilo que constrói",
  6: "Como lida com obstáculos e o trabalho do dia a dia",
  7: "As tuas parcerias e relações directas",
  8: "As transformações profundas, o que fica escondido",
  9: "As tuas crenças e para onde quer expandir",
  10: "A tua carreira e a cara que mostra publicamente",
  11: "Os teus ganhos, redes e comunidade",
  12: "O que solta e o que fica só para ti",
};

function areaVidaPt(casa: number, usarTu: boolean): string {
  return (usarTu ? AREA_VIDA_PT_TU[casa] : AREA_VIDA_PT[casa]) ?? `Área ${casa}`;
}

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

/** TAREFA 1 — versão "tu" de DASHA_O_QUE_PEDE, para o Anexo "Os teus períodos" do ramo adolescente. */
const DASHA_O_QUE_PEDE_TU: Record<string, string> = {
  Sun: "Pede que assumas responsabilidade e liderança visível.",
  Moon: "Pede que cuides da tua estabilidade emocional e da tua casa.",
  Mars: "Pede acção directa e coragem para resolver o que está parado.",
  Mercury: "Pede clareza de comunicação e atenção aos detalhes práticos.",
  Jupiter: "Pede que invistas em crescimento, aprendizagem e visão de longo prazo.",
  Venus: "Pede que cuides das tuas relações e do que valorizas.",
  Saturn: "Pede disciplina, paciência, e trabalho de fundo sem resultados imediatos.",
  Rahu: "Pede que saias da tua zona confortável e arrisques algo novo.",
  Ketu: "Pede que soltes o que já não serve e olhes para dentro.",
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
  forte: "Perfil apoia com força",
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
  insight: string | null;
  partes: string[];
}

/** Divide o corpo da secção "Leitura por opção" pelos cabeçalhos "### <nome>" que o prompt exige, extrai a linha FORÇA:, a linha INSIGHT: (melhorias visuais, Parte 1B) e as 4 partes numeradas de cada opção. */
function parseLeituraPorOpcao(corpo: string): LeituraOpcao[] {
  const blocos = corpo.split(/^###\s+/m).filter((b) => b.trim());
  return blocos.map((bloco) => {
    const linhas = bloco.split("\n");
    const nome = linhas[0].trim();
    const resto = linhas.slice(1).join("\n");

    const forcaRegex = new RegExp(`${MARCADORES.forca}\\s*(forte|moderada|fraca)`, "i");
    const forcaMatch = resto.match(forcaRegex);
    const forca = (forcaMatch?.[1]?.toLowerCase() as ForcaValor) ?? "moderada";
    let semForca = resto.replace(forcaRegex, "").trim();

    const insightRegex = new RegExp(`^${MARCADORES.insight}\\s*(.*)$`, "m");
    const insightMatch = semForca.match(insightRegex);
    const insight = insightMatch?.[1]?.trim() || null;
    semForca = semForca.replace(insightRegex, "").trim();

    const indices: number[] = [];
    const numRegex = /^\d[.)]\s+/gm;
    let m: RegExpExecArray | null;
    while ((m = numRegex.exec(semForca))) indices.push(m.index);
    const partes = indices.map((start, i) => {
      const end = i + 1 < indices.length ? indices[i + 1] : semForca.length;
      return semForca.slice(start, end).replace(/^\d[.)]\s+/, "").trim();
    });

    return { nome, forca, insight, partes };
  });
}

/**
 * TAREFA 1 (correcção do especialista) — até 3 blocos "CANDIDATA: <nome>",
 * cada um seguido do seu próprio texto até ao próximo marcador (ou ao fim
 * da secção). Array vazio quando a secção diz "CANDIDATA: nenhuma" ou não
 * tem nenhum marcador — nesse caso `textoSemCandidata` traz o resto do
 * corpo (a explicação honesta de que não há candidata), tal como antes.
 */
function parseCandidataForaDaLista(corpo: string): { candidatas: { nome: string; texto: string }[]; textoSemCandidata: string } {
  const regex = new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "gm");
  const matches = [...corpo.matchAll(regex)];
  const primeiroValor = matches[0]?.[1]?.trim() ?? "";
  if (!matches.length || !primeiroValor || primeiroValor.toLowerCase() === "nenhuma") {
    // Defesa adicional — por instrução, "SELECÇÃO_CANDIDATAS:" nunca
    // deveria existir quando a resposta é "nenhuma", mas nunca deixar
    // passar para o cliente se o LLM a escrever de qualquer forma.
    const textoSemCandidata = corpo
      .replace(new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "m"), "")
      .replace(new RegExp(`^${MARCADORES.seleccaoCandidatas}\\s*(.*)$`, "gm"), "")
      .trim();
    return { candidatas: [], textoSemCandidata };
  }
  // Correcção do especialista (bug real, encontrado por revisão de
  // código, não por um relatório observado) — o fim de cada candidata
  // era sempre "até ao próximo CANDIDATA:", sem olhar para "GRUPO:". Com
  // o formato de agrupamento, isto faz a ÚLTIMA candidata de um grupo
  // engolir o "GRUPO: ...\n<convergência partilhada>" inteiro do grupo
  // SEGUINTE (o marcador aparece como texto em bruto dentro do seu
  // próprio cartão, e a convergência do grupo seguinte fica duplicada —
  // uma vez ali, indevidamente, outra vez a seguir, na caixa correcta).
  // Nunca testado antes contra 2+ grupos na mesma secção — o teste
  // sintético anterior só tinha 1 grupo. Corrigido: o fim de cada
  // candidata é sempre o que vier primeiro entre o próximo "CANDIDATA:"
  // e o próximo "GRUPO:" — nunca ultrapassa um bloco de grupo seguinte.
  const gruposIndices = [...corpo.matchAll(new RegExp(`^${MARCADORES.grupo}\\s*(.*)$`, "gm"))].map((m) => m.index!);
  // Defesa adicional — "SELECÇÃO_CANDIDATAS:" nunca deve aparecer dentro
  // do corpo de uma candidata (só antes da primeira, onde já é
  // descartado por desenho), mas se o LLM alguma vez a repetir fora do
  // sítio esperado, o fim da candidata pára aí também, nunca a inclui.
  const seleccaoIndices = [...corpo.matchAll(new RegExp(`^${MARCADORES.seleccaoCandidatas}\\s*(.*)$`, "gm"))].map((m) => m.index!);
  const candidatas = matches
    .map((m, i) => {
      const nome = m[1]?.trim() ?? "";
      const inicio = m.index! + m[0].length;
      const limites = [
        i + 1 < matches.length ? matches[i + 1].index! : corpo.length,
        ...gruposIndices.filter((idx) => idx > m.index!),
        ...seleccaoIndices.filter((idx) => idx > m.index!),
      ];
      const fim = Math.min(...limites);
      return { nome, texto: corpo.slice(inicio, fim).trim() };
    })
    .filter((c) => c.nome);
  return { candidatas, textoSemCandidata: "" };
}

interface GrupoCandidatasTexto {
  /** Nomes exactos dos membros, na ordem declarada pelo LLM na linha "GRUPO: nome1; nome2; ...". */
  membros: string[];
  /** Convergência de base partilhada — o texto entre o marcador GRUPO e o primeiro CANDIDATA a seguir. */
  textoPartilhado: string;
}

/**
 * Correcção do especialista ("remover o tecto fixo de 3, com agrupamento
 * por cluster") — blocos "GRUPO: <nome1>; <nome2>; ..." (nomes separados
 * por ";", nunca vírgula) seguidos da convergência de base partilhada até
 * ao próximo "CANDIDATA:". A associação candidata↔grupo é sempre por NOME
 * declarado aqui, nunca por posição no texto — robusto mesmo que o LLM
 * intercale candidatas individuais entre grupos, porque cada candidata é
 * procurada pelo próprio nome na lista de membros de cada grupo (ver
 * `blocoCandidataForaDaLista`).
 */
function parseGruposCandidatas(corpo: string): GrupoCandidatasTexto[] {
  const regexGrupo = new RegExp(`^${MARCADORES.grupo}\\s*(.*)$`, "gm");
  const matches = [...corpo.matchAll(regexGrupo)];
  const regexCandidata = new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "m");
  // Defesa adicional (mesmo princípio da correcção em
  // `parseCandidataForaDaLista`) — se "SELECÇÃO_CANDIDATAS:" aparecer
  // fora do sítio esperado, entre um "GRUPO:" e o seu primeiro
  // "CANDIDATA:", nunca deixa entrar na convergência partilhada.
  const regexSeleccao = new RegExp(`^${MARCADORES.seleccaoCandidatas}\\s*(.*)$`, "m");
  return matches
    .map((m, i) => {
      const membros = (m[1] ?? "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const inicio = m.index! + m[0].length;
      const fimGrupo = i + 1 < matches.length ? matches[i + 1].index! : corpo.length;
      const restante = corpo.slice(inicio, fimGrupo);
      const candidataMatch = restante.match(regexCandidata);
      const seleccaoMatch = restante.match(regexSeleccao);
      const limites = [fimGrupo, candidataMatch ? inicio + candidataMatch.index! : fimGrupo, seleccaoMatch ? inicio + seleccaoMatch.index! : fimGrupo];
      const fimTexto = Math.min(...limites);
      return { membros, textoPartilhado: corpo.slice(inicio, fimTexto).trim() };
    })
    .filter((g) => g.membros.length >= 2);
}

/** Separa a linha "PRIMEIRO PASSO: ..." do resto da secção "O plano". */
function parsePlano(corpo: string): { corpo: string; primeiroPasso: string | null } {
  const regex = new RegExp(`^.*${MARCADORES.primeiroPasso}\\s*(.*)$`, "m");
  const match = corpo.match(regex);
  const primeiroPasso = match?.[1]?.trim() ?? null;
  const resto = corpo.replace(regex, "").trim();
  return { corpo: resto, primeiroPasso };
}

interface SeccaoQuemE {
  doms: string[];
  limitacoes: string[];
  sintese: string | null;
  oQueValoriza: string;
}

/** Correcção do especialista (TAREFA 3) — separa a secção "Quem é" nos seus marcadores: DOM/LIMITAÇÃO (0 ou mais linhas cada) e SÍNTESE (1 linha final). O que sobra depois de remover os três é o parágrafo livre "o que valoriza". */
function parseSeccaoQuemE(corpo: string): SeccaoQuemE {
  const domRegex = new RegExp(`^${MARCADORES.dom}\\s*(.*)$`, "gm");
  const limitacaoRegex = new RegExp(`^${MARCADORES.limitacao}\\s*(.*)$`, "gm");
  const sinteseRegex = new RegExp(`^${MARCADORES.sinteseQuemE}\\s*(.*)$`, "m");

  const doms: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = domRegex.exec(corpo))) if (m[1].trim()) doms.push(m[1].trim());

  const limitacoes: string[] = [];
  while ((m = limitacaoRegex.exec(corpo))) if (m[1].trim()) limitacoes.push(m[1].trim());

  const sinteseMatch = corpo.match(sinteseRegex);
  const sintese = sinteseMatch?.[1]?.trim() || null;

  const oQueValoriza = corpo.replace(domRegex, "").replace(limitacaoRegex, "").replace(sinteseRegex, "").trim();

  return { doms, limitacoes, sintese, oQueValoriza };
}

/** Extrai "IDENTIDADE: <frase>" do texto em bruto — a linha vem ANTES do primeiro cabeçalho "## ", por isso corre sobre o texto completo, não sobre `seccoes` (dividirEmSeccoes ignora tudo antes do 1º cabeçalho). */
function parseIdentidade(textoCompleto: string): string | null {
  const regex = new RegExp(`^${MARCADORES.identidade}\\s*(.+)$`, "m");
  const match = textoCompleto.match(regex);
  return match?.[1]?.trim() || null;
}

/** Melhorias visuais ao template (Parte 1A) — extrai "FRASE_ABERTURA: <frase>", também antes do 1º cabeçalho, mesma lógica de parseIdentidade. */
function parseFraseAbertura(textoCompleto: string): string | null {
  const regex = new RegExp(`^${MARCADORES.fraseAbertura}\\s*(.+)$`, "m");
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

/** FRENTE 1 (correcção do especialista) — "7 de Setembro de 2026 às 04:23", fuso de Lisboa (o mesmo que o resto do template usa para datas). */
function formatarDataHoraLonga(iso: string): string {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(d);
  return `${data} às ${hora}`;
}

// ---------- Gráficos SVG (deterministicamente a partir dos dados, nunca do LLM) ----------

function svgGraficoForcas(pesos: PesoPlaneta[], usarTu: boolean): string {
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
      const label = caracteristicaPt(p.planeta, usarTu);
      return `
      <text x="${margemEsquerda - 14}" y="${y + 21}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1A1A1A">${escapeHtml(label)}</text>
      <rect x="${margemEsquerda}" y="${y + 5}" width="${areaBarra}" height="20" fill="${CINZA_CLARO}" rx="4" />
      <rect x="${margemEsquerda}" y="${y + 5}" width="${larguraBarra}" height="20" fill="${cor}" rx="4" />
      <text x="${margemEsquerda + larguraBarra + 10}" y="${y + 20}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${AZUL}">${p.peso.toFixed(2)}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">${linhas}</svg>`;
}

function svgModoDeGanho(earningModes: EarningMode[], casasDominantes: number[]): string {
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
      // As casas dominantes vêm de axes.earningModeDominante (já
      // computado e autoritativo por computeVocationIQAxes, com a regra de
      // desempate/co-dominância da TAREFA 2), não de recalcular o máximo
      // aqui — evita divergir, e destaca as DUAS barras em caso de empate.
      const dominante = casasDominantes.includes(e.house);
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

export function corRodaDaVida(valor: number): string {
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

// ---------- Melhorias visuais ao template (Parte 2) ----------

interface EixoCompetencia {
  nome: string;
  valor: number;
}

/**
 * Radar de competências — cada eixo usa `valorCasaUnificado`
 * (method-engine), a fórmula final aprovada pelo especialista após 3
 * rondas de diagnóstico com dados reais, partilhada com a Roda da Vida e
 * o Anexo "Apoio por área de vida" para os 3 nunca divergirem entre si
 * (exigência explícita: mesma fórmula, mesmos cortes, nos 3 sítios).
 * Cada eixo continua ligado a UMA casa fixa (2/10/5/6/7/1) — só o
 * planeta que a rege muda de pessoa para pessoa, via `regentesCasas`.
 */
function computeRadarCompetencias(pesos: PesoPlaneta[], savPorCasa: SavPorCasa[], regentesCasas: Record<number, ClassicalGraha>): EixoCompetencia[] {
  const savDe = (casa: number) => savPorCasa.find((h) => h.casa === casa)?.pontuacao ?? 0;
  const valor = (casa: number) => valorCasaUnificado(savDe(casa), casa, pesos, regentesCasas).valor;
  return [
    { nome: "Comunicação", valor: valor(2) },
    { nome: "Liderança", valor: valor(10) },
    { nome: "Criatividade", valor: valor(5) },
    { nome: "Estrutura", valor: valor(6) },
    { nome: "Relação", valor: valor(7) },
    { nome: "Execução", valor: valor(1) },
  ];
}

/**
 * SVG do radar — polígono preenchido (não sectores em pizza, como a Roda
 * da Vida) ligando os 6 vértices, cada um à distância proporcional ao
 * seu valor. Grelha de círculos concêntricos + eixos radiais para leitura
 * fácil, mesma convenção visual da Roda da Vida.
 */
function svgRadarCompetencias(eixos: EixoCompetencia[]): string {
  const tamanho = 400;
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const raioMax = 120;
  const raioLabel = raioMax + 34;
  const n = eixos.length;
  const anguloPasso = 360 / n;

  const grelha = [2, 4, 6, 8, 10]
    .map((v) => `<circle cx="${cx}" cy="${cy}" r="${(v / 10) * raioMax}" fill="none" stroke="#E6E6E6" stroke-width="1" />`)
    .join("");

  const ponto = (valor10: number, i: number): [number, number] => {
    const anguloDeg = i * anguloPasso - 90;
    const rad = (anguloDeg * Math.PI) / 180;
    const r = (valor10 / 10) * raioMax;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const eixosRadiais = eixos
    .map((_, i) => {
      const anguloDeg = i * anguloPasso - 90;
      const rad = (anguloDeg * Math.PI) / 180;
      const x = cx + raioMax * Math.cos(rad);
      const y = cy + raioMax * Math.sin(rad);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E6E6E6" stroke-width="1" />`;
    })
    .join("");

  const poligono = eixos.map((e, i) => ponto(e.valor, i).join(",")).join(" ");

  const labels = eixos
    .map((e, i) => {
      const anguloDeg = i * anguloPasso - 90;
      const rad = (anguloDeg * Math.PI) / 180;
      const lx = cx + raioLabel * Math.cos(rad);
      const ly = cy + raioLabel * Math.sin(rad);
      const cosAng = Math.cos(rad);
      const anchor = cosAng > 0.3 ? "start" : cosAng < -0.3 ? "end" : "middle";
      return `
      <text x="${lx}" y="${ly - 4}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="${AZUL}">${escapeHtml(e.nome)}</text>
      <text x="${lx}" y="${ly + 12}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="${AMBAR}">${e.valor.toFixed(1)}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${tamanho} ${tamanho}" width="100%" style="max-width:${tamanho}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${grelha}
    ${eixosRadiais}
    <polygon points="${poligono}" fill="${AMBAR}" fill-opacity="0.3" stroke="${AMBAR}" stroke-width="2" />
    ${labels}
  </svg>`;
}

function blocoRadarCompetencias(pesos: PesoPlaneta[], savPorCasa: SavPorCasa[], regentesCasas: Record<number, ClassicalGraha>, usarTu: boolean): string {
  const eixos = computeRadarCompetencias(pesos, savPorCasa, regentesCasas);
  return `
    <div class="radar-wrap">
      <p class="bloco-titulo" style="text-align:center">${usarTu ? "O teu perfil de competências" : "O seu perfil de competências"}</p>
      <p class="roda-vida-subtitulo" style="text-align:center">${usarTu ? "Onde o teu perfil tem força natural" : "Onde o seu perfil tem força natural"}</p>
      <div class="grafico-wrap grafico-centrado">${svgRadarCompetencias(eixos)}</div>
      <p class="grafico-legenda" style="text-align:center">${usarTu ? "Valores calculados a partir da força real do teu perfil — não são avaliações de personalidade." : "Valores calculados a partir da força real do seu perfil — não são avaliações de personalidade."}</p>
    </div>`;
}

/**
 * Diagrama de ponte (melhorias visuais, Parte 2B) — "o que já tem" (a
 * área actual e o que a carta já sustenta) versus "o que a nova opção
 * pede" (o que se aprende, o que não muda). Determinístico, por opção.
 *
 * DESVIO — o pedido não deu fórmula para "custo médio" no centro da
 * seta; sem uma fórmula, um número aqui seria inventado. A seta mostra
 * só a palavra "Transição", nunca um valor fabricado. "O que se aprende"
 * também não veio com fórmula — usa o mesmo vocabulário humano do Modo
 * de Ganho dominante (já estabelecido em CASA_APOIO_LABEL/promptAdulto.ts),
 * nunca inventado de novo. "O que não muda" é o único item com fórmula
 * clara: o planeta mais fraco (peso mínimo) de toda a carta.
 */
const MODO_GANHO_APRENDE: Record<number, string> = {
  2: "A disciplina de comunicar com clareza para quem paga por isso.",
  6: "A resistência de resolver o problema de outra pessoa, uma e outra vez.",
  10: "A exposição de assumir a cara pública de uma decisão.",
};

function svgSetaTransicao(): string {
  const largura = 90;
  const altura = 40;
  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="20" x2="70" y2="20" stroke="${AMBAR}" stroke-width="3" />
    <path d="M 62 10 L 78 20 L 62 30 Z" fill="${AMBAR}" />
  </svg>`;
}

function blocoDiagramaPonte(dados: DadosParaTemplate, pesos: PesoPlaneta[], axes: VocationIQAxes): string {
  const ordenados = [...pesos].sort((a, b) => b.peso - a.peso);
  const maisForte = ordenados[0];
  const segundoForte = ordenados[1];
  const maisFraco = ordenados[ordenados.length - 1];

  // Correcção do especialista (preview visual) — "Área actual" e "Anos de
  // experiência" só existem no intake quando a situação declarada é
  // "trabalho, quero mudar" (ver IntakeForm.tsx) — para quem está a
  // estudar, na universidade, ou descreveu "outra" situação, os dois
  // campos chegam aqui vazios. Sem esta guarda, produzia texto partido
  // ("de experiência em", 'Autoridade construída no tema ""') em todos
  // esses relatórios reais, não só no perfil de teste que revelou o bug.
  const jaTem = [
    dados.anosExperiencia && dados.areaActual ? `${escapeHtml(dados.anosExperiencia)} de experiência em ${escapeHtml(dados.areaActual)}` : null,
    dados.areaActual ? `Autoridade construída no tema "${escapeHtml(dados.areaActual)}"` : null,
    maisForte && maisForte.peso >= 1.3 ? `Força natural em ${escapeHtml(CARACTERISTICA_PT[maisForte.planeta] ?? maisForte.planeta)}` : null,
    segundoForte && segundoForte.peso >= 1.3 ? `Força natural em ${escapeHtml(CARACTERISTICA_PT[segundoForte.planeta] ?? segundoForte.planeta)}` : null,
  ].filter((x): x is string => Boolean(x));
  // Sem área declarada e sem nenhum planeta ≥1.3 (raro, mas possível):
  // nunca deixar a coluna "O que já tem" vazia.
  if (!jaTem.length) jaTem.push("Uma base de talento natural, mesmo sem uma área de trabalho ainda declarada.");

  const aprende = MODO_GANHO_APRENDE[axes.earningMode.house] ?? "A disciplina que esta opção pede no dia a dia.";
  const naoMuda = maisFraco ? `${escapeHtml(CARACTERISTICA_PT[maisFraco.planeta] ?? maisFraco.planeta)} continua a ser o elo mais frágil do seu perfil — não desaparece com formação.` : "";

  return `
    <div class="ponte-wrap">
      <p class="bloco-titulo" style="text-align:center">A sua ponte de transição</p>
      <div class="ponte-grelha">
        <div class="ponte-coluna ponte-verde">
          <p class="rotulo-pequeno">O que já tem</p>
          <ul>${jaTem.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>
        <div class="ponte-centro">${svgSetaTransicao()}<span>Transição</span></div>
        <div class="ponte-coluna-dupla">
          <div class="ponte-coluna ponte-verde">
            <p class="rotulo-pequeno">O que se aprende</p>
            <p>${aprende}</p>
          </div>
          <div class="ponte-coluna ponte-vermelha">
            <p class="rotulo-pequeno">O que não muda</p>
            <p>${naoMuda}</p>
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * Diagrama de convergência da candidata fora da lista (melhorias
 * visuais, Parte 2C) — um nó por camada que convergiu (o catálogo já dá
 * a lista completa, com texto humano — nunca inventado aqui). Só chamado
 * quando há candidata (ver blocoCandidataForaDaLista).
 */
function svgDiagramaConvergencia(nomeCandidata: string, camadas: string[]): string {
  const largura = 760;
  const raioCentro = 80;
  const lineHeight = 15;
  const gapEntreNos = 14;
  const topo = 20;
  const maxCarLinhaRotulo = 34;
  // O círculo fica encostado à direita (não ao centro) — a coluna de
  // rótulos, à esquerda, precisa de ficar toda FORA da faixa horizontal
  // do círculo, ou o círculo (pintado por cima) tapa o texto sempre que
  // um nó cai na sua faixa vertical.
  const cx = largura - raioCentro - 30;
  const margemTexto = cx - raioCentro - 40;
  const pontoDeEntrada = cx - raioCentro - 8;

  // Dois bugs corrigidos (relatório impresso, pág. 16 — diagrama de
  // convergência da candidata fora da lista):
  // 1. O rótulo de uma camada sem "(" nem ":" perto do início (ex.:
  //    "Ideia concreta partilhada aponta para este destino") usava a
  //    FRASE INTEIRA como rótulo, numa só linha sem quebra — saía dos
  //    limites do SVG à esquerda. Corrigido com `quebrarLinhas` + altura
  //    de cada nó calculada a partir do nº real de linhas (antes era um
  //    espaçamento fixo de 30px que não sabia quantas linhas ia ocupar).
  // 2. O círculo da candidata ficava no centro do SVG (cx = largura/2) e
  //    a coluna de texto acabava perto o suficiente do centro para o
  //    círculo (pintado por cima, depois do texto) tapar metade dos
  //    rótulos sempre que a sua altura calhava dentro da faixa vertical
  //    do círculo — a causa mais provável do "sobreposto e ilegível".
  //    Corrigido movendo o círculo para a direita e definindo
  //    `margemTexto` com folga (40px) à esquerda da borda do círculo.
  let cursorY = topo;
  const nos = camadas.map((c) => {
    const separador = c.search(/[(:]/);
    const rotulo = (separador > 0 ? c.slice(0, separador) : c).trim();
    const linhasRotulo = quebrarLinhas(rotulo, maxCarLinhaRotulo);
    const blocoAltura = linhasRotulo.length * lineHeight;
    const centroY = cursorY + blocoAltura / 2;
    cursorY += blocoAltura + gapEntreNos;
    const primeiraLinhaY = centroY - ((linhasRotulo.length - 1) * lineHeight) / 2 + 4;
    const textoTspans = linhasRotulo.map((l, i) => `<tspan x="${margemTexto - 8}" y="${primeiraLinhaY + i * lineHeight}">${escapeHtml(l)}</tspan>`).join("");
    return { centroY, textoTspans };
  });

  const alturaNos = cursorY - gapEntreNos - topo;
  const cy = Math.max(topo + alturaNos / 2, raioCentro + 20);
  const altura = Math.max(cy + raioCentro + 20, topo + alturaNos + 20);

  const linhasCandidata = quebrarLinhas(nomeCandidata, 16);
  const inicioY = cy - ((linhasCandidata.length - 1) * 10) / 2;
  const tspans = linhasCandidata.map((l, i) => `<tspan x="${cx}" y="${inicioY + i * 20}">${escapeHtml(l)}</tspan>`).join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${nos
      .map(
        (n) => `
      <text text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${AZUL}">${n.textoTspans}</text>
      <path d="M ${margemTexto} ${n.centroY} L ${pontoDeEntrada} ${cy}" stroke="${AMBAR}" stroke-width="2" fill="none" opacity="0.8" />
      <circle cx="${margemTexto}" cy="${n.centroY}" r="3" fill="${AMBAR}" />`,
      )
      .join("")}
    <circle cx="${cx}" cy="${cy}" r="${raioCentro}" fill="${AZUL}" />
    <text text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">${tspans}</text>
  </svg>`;
}

function blocoDiagramaConvergencia(nome: string, camadas: string[]): string {
  if (!camadas.length) return "";
  return `
    <div class="convergencia-wrap">
      <p class="bloco-titulo" style="text-align:center">Porque esta opção não é acidente</p>
      <div class="grafico-wrap grafico-centrado">${svgDiagramaConvergencia(nome, camadas)}</div>
    </div>`;
}

// ---------- Blocos HTML ----------

/** Os "sinais" do diagrama de identidade — reaproveita os mesmos rótulos humanos já usados no gráfico "O peso de cada característica" (caracteristicaPt), ordenados por peso decrescente. Sempre determinístico, nunca do LLM. */
function sinaisIdentidade(pesos: PesoPlaneta[], usarTu: boolean): string[] {
  return [...pesos].sort((a, b) => b.peso - a.peso).map((p) => caracteristicaPt(p.planeta, usarTu));
}

function blocoDiagramaIdentidade(pesos: PesoPlaneta[], identidade: string | null, usarTu: boolean): string {
  if (!identidade) return "";
  return `
    <section class="seccao">
      <h2 class="titulo-seccao">${usarTu ? "Quem realmente és" : "Quem você realmente é"}</h2>
      <div class="grafico-wrap grafico-centrado">${svgDiagramaIdentidade(sinaisIdentidade(pesos, usarTu), identidade)}</div>
      <p class="grafico-legenda" style="text-align:center">${usarTu ? "Os sinais à esquerda são os traços mais fortes do teu perfil — convergem na síntese ao centro." : "Os sinais à esquerda são os traços mais fortes do seu perfil — convergem na síntese ao centro."}</p>
    </section>`;
}

function blocoRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>, usarTu: boolean): string {
  const dimensoes = computeRodaDaVida(savPorCasa, pesos, regentesCasas, usarTu);
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
      <p class="bloco-titulo roda-vida-titulo">${usarTu ? "O teu perfil de vida" : "O seu perfil de vida"}</p>
      <p class="roda-vida-subtitulo">${usarTu ? "Como o teu perfil estrutura cada área da tua vida" : "Como o seu perfil estrutura cada área da sua vida"}</p>
      <div class="grafico-wrap grafico-centrado">${svgRodaDaVida(dimensoes)}</div>
      <p class="grafico-legenda">Verde = força natural (≥7) · Âmbar = equilíbrio (4-6) · Vermelho = pede mais construção (&lt;4)</p>
      <div class="caixa-neutra roda-vida-explicacao">
        <p>${
          usarTu
            ? "Esta roda mostra onde o teu perfil tem força natural e onde pede mais esforço. Não é um julgamento — é um mapa. Áreas mais preenchidas indicam onde o teu perfil flui naturalmente. Áreas menos preenchidas indicam onde vais precisar de construir com mais intenção."
            : "Esta roda mostra onde o seu perfil tem força natural e onde pede mais esforço. Não é um julgamento — é um mapa. Áreas mais preenchidas indicam onde o seu perfil flui naturalmente. Áreas menos preenchidas indicam onde vai precisar de construir com mais intenção."
        }</p>
      </div>
      <div class="dimensao-vida-lista">${lista}</div>
    </div>`;
}

/**
 * TAREFA 4 (correcção do especialista) — implicação prática ESPECÍFICA de
 * cada planeta fraco, uma frase própria por planeta (nunca a mesma frase
 * genérica repetida). Texto exacto pedido, determinístico — gerado pelo
 * código, nunca pelo LLM (só o diagrama "Onde o perfil tem atrito" a usa;
 * é sempre a mesma independentemente do ramo — não tem pronome pessoal).
 */
const IMPLICACAO_PRATICA_PLANETA: Record<string, string> = {
  Mercury: "A fluidez de explicar e ser entendida precisa de ser construída — não é natural. Apoio externo (editor, coach de comunicação) compensa.",
  Venus: "O sentido de valor próprio e o que se sente à-vontade a cobrar é a área mais fraca. Risco: sub-cobrar ou aceitar menos do que vale.",
  Moon: "A gestão emocional em decisões importantes pede atenção — não tomar grandes decisões em momentos de baixa.",
  Mars: "A capacidade de agir com rapidez e decisão custa mais do que devia — reservar energia para as batalhas que importam.",
  Sun: "A afirmação pública da identidade profissional precisa de ser construída com intenção — não acontece por acidente.",
  Jupiter: "A expansão e o crescimento pedem mais esforço do que para outros — crescer devagar é uma estratégia, não uma falha.",
  Saturn: "A estrutura e a disciplina de longo prazo precisam de sistemas externos — não confiar só na força de vontade.",
};

interface ItemAtrito {
  planeta: string;
  peso: number;
  implicacao: string;
}

/**
 * TAREFA 3C (correcção do especialista) — substitui a tabela "Onde o
 * perfil tem atrito" por um diagrama SVG: centro = a tese central do
 * relatório (marcador IDENTIDADE: já escrito pelo LLM — nunca inventado
 * aqui, ver FALTA 2), um nó por planeta fraco (peso < 0,9 — mesmos dados
 * reais de sempre, nunca texto inventado), rótulo "O que resiste:
 * <planeta>" + a implicação prática (IMPLICACAO_PRATICA_PLANETA, já
 * existente, TAREFA 4 de uma ronda anterior). Mesma técnica de
 * posicionamento dinâmico de svgDiagramaConvergencia (altura de cada nó
 * calculada a partir do nº real de linhas do seu texto).
 */
function svgDiagramaAtrito(identidade: string, itens: ItemAtrito[]): string {
  const largura = 720;
  const raioCentro = 85;
  const lineHeightRotulo = 15;
  const lineHeightImplicacao = 13;
  const gapEntreNos = 20;
  const topo = 20;
  const maxCarLinhaRotulo = 30;
  const maxCarLinhaImplicacao = 38;
  const cx = largura - raioCentro - 40;
  const margemTexto = cx - raioCentro - 46;
  const pontoDeEntrada = cx - raioCentro - 8;
  const raioNoX = 9;
  const raioNoY = 6;

  let cursorY = topo;
  const nos = itens.map((item) => {
    const rotulo = `O que resiste: ${PLANETA_PT[item.planeta] ?? item.planeta}`;
    const linhasRotulo = quebrarLinhas(rotulo, maxCarLinhaRotulo);
    const linhasImplicacao = quebrarLinhas(item.implicacao, maxCarLinhaImplicacao);
    const alturaRotulo = linhasRotulo.length * lineHeightRotulo;
    const alturaImplicacao = linhasImplicacao.length * lineHeightImplicacao;
    const blocoAltura = alturaRotulo + 4 + alturaImplicacao;
    const centroY = cursorY + blocoAltura / 2;
    cursorY += blocoAltura + gapEntreNos;
    const primeiraLinhaRotuloY = centroY - blocoAltura / 2 + lineHeightRotulo - 2;
    const tspansRotulo = linhasRotulo.map((l, i) => `<tspan x="${margemTexto - 8}" y="${primeiraLinhaRotuloY + i * lineHeightRotulo}">${escapeHtml(l)}</tspan>`).join("");
    const inicioImplicacaoY = primeiraLinhaRotuloY + (linhasRotulo.length - 1) * lineHeightRotulo + lineHeightImplicacao + 2;
    const tspansImplicacao = linhasImplicacao.map((l, i) => `<tspan x="${margemTexto - 8}" y="${inicioImplicacaoY + i * lineHeightImplicacao}">${escapeHtml(l)}</tspan>`).join("");
    return { centroY, tspansRotulo, tspansImplicacao };
  });

  const alturaNos = cursorY - gapEntreNos - topo;
  const cy = Math.max(topo + alturaNos / 2, raioCentro + 20);
  const altura = Math.max(cy + raioCentro + 20, topo + alturaNos + 20);

  const linhasIdentidade = quebrarLinhas(identidade, 15);
  const inicioY = cy - (linhasIdentidade.length - 1) * 9;
  const tspansIdentidade = linhasIdentidade.map((l, i) => `<tspan x="${cx}" y="${inicioY + i * 18}">${escapeHtml(l)}</tspan>`).join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" style="max-width:${largura}px;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${nos
      .map(
        (n) => `
      <text text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${VERMELHO}">${n.tspansRotulo}</text>
      <text text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="11" fill="#4A4A4A">${n.tspansImplicacao}</text>
      <path d="M ${margemTexto} ${n.centroY} L ${pontoDeEntrada} ${cy}" stroke="${AMBAR}" stroke-width="2" fill="none" opacity="0.8" />
      <ellipse cx="${margemTexto}" cy="${n.centroY}" rx="${raioNoX}" ry="${raioNoY}" fill="${VERMELHO}" />`,
      )
      .join("")}
    <circle cx="${cx}" cy="${cy}" r="${raioCentro}" fill="${AZUL}" />
    <text text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">${tspansIdentidade}</text>
  </svg>`;
}

function blocoDiagramaAtrito(pesos: PesoPlaneta[], identidade: string | null): string {
  const fracos = [...pesos].filter((p) => p.peso < 0.9).sort((a, b) => a.peso - b.peso);
  if (!fracos.length) return "";
  const itens: ItemAtrito[] = fracos.map((p) => ({
    planeta: p.planeta,
    peso: p.peso,
    implicacao: IMPLICACAO_PRATICA_PLANETA[p.planeta] ?? "Esta parte do perfil está enfraquecida — o que a tese central pede aqui não é natural, tem de ser construído com esforço consciente.",
  }));
  return `
    <div class="anexo-espaco atrito-wrap">
      <p class="rotulo-pequeno" style="text-align:center">Onde o perfil tem atrito</p>
      <div class="grafico-wrap grafico-centrado">${svgDiagramaAtrito(identidade ?? "O que este perfil sustenta", itens)}</div>
    </div>`;
}

/** Melhorias visuais ao template (Parte 1A) — a frase que a pessoa vai lembrar, logo após a capa. Sem FRASE_ABERTURA (LLM não a escreveu), não aparece nada. */
function blocoFraseAbertura(frase: string | null): string {
  if (!frase) return "";
  return `<div class="frase-abertura"><p>${escapeHtml(frase)}</p></div>`;
}

/** Melhorias visuais ao template (Parte 1D) — abre a secção "O plano" com o ciclo (Mahadasha) actual e a sua classificação, já calculada pelo motor (MAHADASHA_CLASSIFICACAO), nunca inventada aqui. */
function blocoCaixaPeriodoActual(datas: DadosDatas): string {
  const classificacao = MAHADASHA_CLASSIFICACAO[datas.mahadashaAtual.senhor];
  const nomePlaneta = PLANETA_PT[datas.mahadashaAtual.senhor] ?? datas.mahadashaAtual.senhor;
  return `
    <div class="caixa-periodo-actual">
      <p class="caixa-periodo-label">&#128197; Período actual</p>
      <p class="caixa-periodo-mahadasha">${escapeHtml(nomePlaneta.toUpperCase())}</p>
      ${classificacao ? `<p class="caixa-periodo-classificacao">&ldquo;${escapeHtml(classificacao.abertura)}&rdquo;</p>` : ""}
      <p class="caixa-periodo-fim">Termina em ${formatarMesAno(datas.mahadashaAtual.fim)}</p>
    </div>`;
}

function blocoQuemE(d: DadosParaTemplate): string {
  const linhas: [string, string][] = [
    ["Nome", d.nome],
    ["Data de nascimento", formatarDataLonga(d.dataNascimento)],
    ...(d.horaNascimento ? ([["Hora", d.horaNascimento]] as [string, string][]) : []),
    ["Local de nascimento", d.localNascimento],
    // TAREFA 2 (correcção do especialista, ronda seguinte) — para o
    // adolescente, "Situação declarada" (o rótulo em bruto do formulário,
    // ex.: "Estou no 10º, 11º ou 12º ano") e "Ano de escolaridade" (o
    // mesmo facto, formatado a partir de `ano_escolaridade`, migração
    // 0020) mostravam a MESMA informação duas vezes — mantém-se só "Ano
    // de escolaridade". "Situação declarada" continua no ramo adulto
    // (onde é o único campo com essa informação) e no ramo "pos-12" (que
    // usa o quadro adulto — ver DESVIO em relatorioAdultoCompute.ts).
    ...(d.ehAdolescente
      ? d.anoEscolaridade
        ? ([["Ano de escolaridade", d.anoEscolaridade]] as [string, string][])
        : ([["Situação declarada", d.situacaoDeclarada]] as [string, string][])
      : ([["Situação declarada", d.situacaoDeclarada], ["Área actual", d.areaActual], ["Anos de experiência", d.anosExperiencia]] as [string, string][])),
  ];
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">Quem é</p>
      <table class="tabela-dados">
        ${linhas.map(([label, valor]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`).join("")}
      </table>
    </div>`;
}

/** TAREFA 7 (correcção do especialista) — normaliza o texto livre da pessoa antes de entrar no template, mesma função usada em promptAdulto.ts (nunca duas versões). Nunca corrige ortografia, só deixa de amplificar visualmente um erro de maiúsculas com mais maiúsculas. */
function blocoOQueTrouxe(d: DadosParaTemplate): string {
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">O que trouxe</p>
      ${
        d.oQueNaoFunciona
          ? `<div class="citacao"><p>&ldquo;${escapeHtml(normalizarTextoLivre(d.oQueNaoFunciona))}&rdquo;</p></div>`
          : ""
      }
      ${
        d.opcoesConsideradas.length
          ? `<p class="rotulo-pequeno">Opções consideradas</p><div class="chips">${d.opcoesConsideradas.map((o) => `<span class="chip">${escapeHtml(o)}</span>`).join("")}</div>`
          : ""
      }
      ${d.ideiaConcreta ? `<div class="destaque-ambar"><p class="rotulo-pequeno">Ideia concreta</p><p>${escapeHtml(normalizarTextoLivre(d.ideiaConcreta))}</p></div>` : ""}
      ${d.perguntaEspecifica ? `<div class="destaque-navy"><p class="rotulo-pequeno">Pergunta a que este relatório responde</p><p>${escapeHtml(normalizarTextoLivre(d.perguntaEspecifica))}</p></div>` : ""}
    </div>`;
}

function blocoOQueEsteRelatorioResponde(usarTu: boolean): string {
  const itens = usarTu
    ? [
        "A tua missão de fundo, e onde ela já aparece nas tuas escolhas.",
        "Como e onde ganhas melhor.",
        "Uma leitura honesta de cada opção que estás a considerar: o que a sustenta, o que custa, o que falta.",
        "Se há alguma opção fora da tua lista que o teu perfil sustenta com força.",
        "Um primeiro passo concreto para esta semana, ligado às tuas datas reais.",
      ]
    : [
        "A sua missão de fundo, e onde ela já aparece na sua vida profissional.",
        "Como e onde ganha melhor.",
        "Uma leitura honesta de cada opção que está a considerar: o que a sustenta, o que custa, o que falta.",
        "Se há alguma opção fora da sua lista que o seu perfil sustenta com força.",
        "Um primeiro passo concreto para esta semana, ligado às suas datas reais.",
      ];
  return `
    <div class="bloco-dados">
      <p class="bloco-titulo">O que este relatório responde</p>
      <ul class="lista-promessa">${itens.map((i) => `<li>${i}</li>`).join("")}</ul>
    </div>`;
}

function cardOpcao(op: LeituraOpcao, dados: DadosParaTemplate, pesos: PesoPlaneta[], axes: VocationIQAxes): string {
  const PARTE_LABEL = [
    { icone: "&#10003;", titulo: "O que o perfil sustenta" },
    { icone: "&#9888;", titulo: "O que vai custar" },
    { icone: "?", titulo: "O que pede que falta" },
    { icone: "&#8594;", titulo: dados.ehAdolescente ? "Onde entra a tua matéria" : "Onde entra a sua matéria" },
  ];
  const partes = op.partes
    .map((texto, i) => {
      const info = PARTE_LABEL[i];
      if (!info) return "";
      // Melhorias visuais, Parte 1C — o ponto 2 ("o que vai custar") ganha
      // a sua própria caixa de destaque, em vez da faixa alternada comum.
      if (i === 1) {
        return `
        <div class="caixa-custo">
          <p class="caixa-custo-label">&#9888; O que isto vai custar</p>
          ${markdownParaHtml(texto)}
        </div>`;
      }
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
      ${dados.ehAdolescente ? "" : blocoDiagramaPonte(dados, pesos, axes)}
      ${op.insight ? `<div class="caixa-insight"><p>${escapeHtml(op.insight)}</p></div>` : ""}
      ${partes}
    </div>`;
}

/** Correcção do especialista (TAREFA 3C) — secção "Quem é": um card por dom (fundo verde suave, ícone de visto), um card por limitação (fundo âmbar suave, ícone de alerta), o parágrafo livre "o que valoriza" e, no fim, a frase de síntese em destaque (caixa navy, texto branco). Nada aqui é inventado pelo template — só organiza o que o LLM já escreveu nos marcadores obrigatórios. Se a secção vier vazia (rascunho antigo, gerado antes desta correcção), não desenha nada. */
function blocoSeccaoQuemE(corpo: string): string {
  if (!corpo.trim()) return "";
  const { doms, limitacoes, sintese, oQueValoriza } = parseSeccaoQuemE(corpo);
  if (!doms.length && !limitacoes.length && !sintese && !oQueValoriza) return "";

  const cardsDoms = doms
    .map(
      (d) => `
      <div class="card-dom">
        <span class="card-dom-icone">&#10003;</span>
        <div><p class="card-dom-titulo">Dom</p><p>${escapeHtml(d)}</p></div>
      </div>`,
    )
    .join("");
  const cardsLimitacoes = limitacoes
    .map(
      (l) => `
      <div class="card-limitacao">
        <span class="card-limitacao-icone">&#9888;</span>
        <div><p class="card-limitacao-titulo">A desenvolver</p><p>${escapeHtml(l)}</p></div>
      </div>`,
    )
    .join("");

  return `
    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.quemE)}</h2>
      ${doms.length ? `<div class="grelha-dons-limitacoes">${cardsDoms}</div>` : ""}
      ${limitacoes.length ? `<div class="grelha-dons-limitacoes grelha-limitacoes">${cardsLimitacoes}</div>` : ""}
      ${oQueValoriza ? markdownParaHtml(oQueValoriza) : ""}
      ${sintese ? `<div class="caixa-sintese-quemE"><p>${escapeHtml(sintese)}</p></div>` : ""}
    </section>`;
}

/**
 * Correcção do especialista ("remover o tecto fixo de 3, com agrupamento
 * por cluster") — sem limite de candidatas, cada uma com o seu próprio
 * diagrama + card, em pé de igualdade (nenhuma numeração ou destaque
 * visual diferente entre elas — a ordem em que chegam do LLM é só a
 * ordem em que ele as escreveu, nunca ranking). Candidatas que o LLM
 * agrupou (bloco "GRUPO:", ver `parseGruposCandidatas`) ganham uma caixa
 * partilhada com a convergência de base, renderizada uma só vez antes do
 * primeiro membro do grupo — os cards individuais a seguir trazem só a
 * diferenciação específica que o LLM escreveu para cada um.
 */
function blocoCandidataForaDaLista(corpo: string, catalogo: ResultadoCatalogoVocacional | null, usarTu: boolean): string {
  const { candidatas, textoSemCandidata } = parseCandidataForaDaLista(corpo);
  if (!candidatas.length) {
    return `<div class="caixa-neutra">${markdownParaHtml(textoSemCandidata || corpo)}</div>`;
  }
  const grupos = parseGruposCandidatas(corpo);
  const grupoPorNome = new Map<string, GrupoCandidatasTexto>();
  for (const g of grupos) for (const nome of g.membros) grupoPorNome.set(nome, g);
  const gruposJaRenderizados = new Set<GrupoCandidatasTexto>();

  return candidatas
    .map((c) => {
      const camadas = catalogo?.candidatasForaDaLista.find((cat) => cat.nome === c.nome)?.camadas ?? [];
      const grupo = grupoPorNome.get(c.nome);
      let introGrupo = "";
      if (grupo && !gruposJaRenderizados.has(grupo)) {
        gruposJaRenderizados.add(grupo);
        // Correcção do especialista (preview visual, cluster de 13 da
        // Alice) — o diagrama repetia as mesmas 4 etiquetas em cada
        // membro do grupo (a assinatura de tipos é, por definição, a
        // mesma dentro de um grupo) — informação 100% redundante com o
        // parágrafo partilhado, e pesada a partir da 3ª repetição. Agora
        // o diagrama do grupo aparece UMA VEZ, junto da caixa partilhada,
        // usando as camadas do 1º membro (a mesma assinatura de tipos de
        // todos — as candidatas individuais dentro do grupo já não levam
        // diagrama próprio, só o cartão de texto compacto).
        introGrupo = `
        ${blocoDiagramaConvergencia(c.nome, camadas)}
        <div class="caixa-grupo-candidatas">
          <p class="card-candidata-header">${usarTu ? "Um conjunto de opções com a mesma convergência de base" : "Um conjunto de opções com a mesma convergência de base"}</p>
          ${markdownParaHtml(grupo.textoPartilhado)}
        </div>`;
      }
      const diagramaIndividual = grupo ? "" : blocoDiagramaConvergencia(c.nome, camadas);
      return `
      ${introGrupo}
      ${diagramaIndividual}
      <div class="card-candidata${grupo ? " card-candidata-agrupada" : ""}">
        <p class="card-candidata-header">${usarTu ? "Uma opção que ainda não consideraste" : "Uma opção que ainda não considerou"}</p>
        <p class="card-candidata-nome">${escapeHtml(c.nome)}</p>
        ${markdownParaHtml(c.texto)}
      </div>`;
    })
    .join("\n");
}

function blocoOPlano(corpo: string, datas: DadosDatas, usarTu: boolean): string {
  const { corpo: resto, primeiroPasso } = parsePlano(corpo);
  return `
    ${blocoCaixaPeriodoActual(datas)}
    <div class="timeline-wrap">${svgTimeline(datas)}</div>
    <p class="grafico-legenda">Âmbar = o período em que ${usarTu ? "estás" : "está"} agora · Azul-claro = os períodos seguintes.</p>
    ${resto ? markdownParaHtml(resto) : ""}
    ${primeiroPasso ? `<div class="caixa-primeiro-passo"><p class="caixa-primeiro-passo-label">${usarTu ? "O teu primeiro passo esta semana" : "O seu primeiro passo esta semana"}</p><p>${escapeHtml(primeiroPasso)}</p></div>` : ""}`;
}

/**
 * Correcção do especialista — a classificação já não vem só do SAV bruto
 * (`h.classificacao`, que ainda existe e é usada por
 * `catalogoVocacional.ts` para o sinal "casa_activa", nunca alterada
 * aqui): agora usa `computeApoioPorAreaDeVida` (SAV + peso do regente
 * real, mesma família de fórmula já aplicada à Roda da Vida e ao Radar —
 * Bug 5 estendido ao 3º e último sítio que ainda usava SAV isolado). O
 * número "Apoio" mostrado continua a ser o SAV bruto (o dado clássico
 * citável) — só a cor/rótulo da classificação muda.
 */
/**
 * As casas que sustentam a tese central do relatório — o Eixo da Missão
 * (Atmakaraka + Karakamsha) e o Modo de Ganho dominante (pode ser 2 casas
 * em caso de co-dominância). Usado só para decidir se uma casa "Forte" no
 * Anexo precisa da nota de contexto abaixo — nunca afecta a pontuação.
 */
function casasCentraisDaTese(axes: VocationIQAxes): Set<number> {
  return new Set<number>([axes.missionAxis.akHouse, axes.missionAxis.karakamshaHouse, ...axes.earningModeDominante.map((e) => e.house)]);
}

function tabelaApoioPorAreaDeVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], axes: VocationIQAxes, usarTu: boolean): string {
  const apoioCombinado = computeApoioPorAreaDeVida(savPorCasa, pesos, axes.regentesCasas);
  const casasCentrais = casasCentraisDaTese(axes);
  const linhas = [...apoioCombinado]
    .sort((a, b) => a.casa - b.casa)
    .map(
      (h) => `
      <tr>
        <td>${escapeHtml(areaVidaPt(h.casa, usarTu))}</td>
        <td class="col-numero">${h.valor.toFixed(1).replace(".", ",")}/10</td>
        <td><span class="badge-classificacao" style="background:${corClassificacao(h.classificacao)}">${CLASSIFICACAO_LABEL[h.classificacao]}</span></td>
      </tr>`,
    )
    .join("");
  // Correcção do especialista (verificação Casa 6) — uma casa "Forte" que
  // não sustenta a tese central (fora do Eixo da Missão e do Modo de
  // Ganho) pode estar assim só porque o planeta mais forte do perfil está
  // fisicamente lá, não porque é o tema mais importante da vida da
  // pessoa. Nota só aparece quando esse caso realmente ocorre.
  const forteForaDaTese = apoioCombinado.filter((h) => h.classificacao === "forte" && !casasCentrais.has(h.casa));
  const nota = forteForaDaTese.length
    ? `<p class="anexo-nota">Nota: ${forteForaDaTese.map((h) => escapeHtml(areaVidaPt(h.casa, usarTu))).join(", ")} aparece com apoio Forte, mas não é uma das casas centrais desta leitura (Eixo da Missão / Modo de Ganho) — reflecte sobretudo onde a força física do perfil está posicionada, não o tema principal da ${usarTu ? "tua" : "sua"} vocação.</p>`
    : "";
  return `
    <table class="tabela-anexo">
      <thead><tr><th>Área de vida</th><th class="col-numero">Apoio</th><th>Classificação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>${nota}`;
}

function tabelaOsTeusPeriodos(datas: DadosDatas, usarTu: boolean): string {
  const periodos = [
    { ...datas.mahadashaAtual, tipo: "Ciclo actual" },
    { ...datas.antardashaAtual, tipo: "Período actual" },
    ...datas.proximasAntardashas.map((p) => ({ ...p, tipo: "Período seguinte" })),
  ];
  const dicionarioOQuePede = usarTu ? DASHA_O_QUE_PEDE_TU : DASHA_O_QUE_PEDE;
  const linhas = periodos
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.tipo)}</td>
        <td>${escapeHtml(PLANETA_PT[p.senhor] ?? p.senhor)}</td>
        <td>${formatarMesAno(p.inicio)} – ${formatarMesAno(p.fim)}</td>
        <td>${escapeHtml(dicionarioOQuePede[p.senhor] ?? "")}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="tabela-anexo">
      <thead><tr><th>Período</th><th>Regido por</th><th>Datas</th><th>O que pede</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function seccaoComoLer(usarTu: boolean): string {
  const paragrafos = usarTu
    ? [
        "Este relatório cruza várias camadas do teu mapa de nascimento — a tua energia de fundo, a forma como ganhas melhor, o que já se nota em ti, e o momento em que estás agora — para chegar a uma leitura sobre cada opção que trouxeste.",
        "Cada opção só é apresentada como \"sustentada com força\" quando pelo menos duas fontes independentes convergem — nunca por um único sinal isolado.",
        "As datas que vês na tabela de períodos são reais, calculadas a partir da tua hora de nascimento (ou de uma estimativa, quando não a soubemos) — não são genéricas nem iguais para todos.",
        "Nada aqui é uma sentença. É um mapa do que o teu perfil sustenta e do que custa — a decisão final é sempre tua.",
      ]
    : [
        "Este relatório cruza várias camadas do seu mapa de nascimento — a sua energia de fundo, a forma como ganha melhor, o que o mercado já reconhece em si, e o momento em que está agora — para chegar a uma leitura sobre cada opção que trouxe.",
        "Cada opção só é apresentada como \"sustentada com força\" quando pelo menos duas fontes independentes convergem — nunca por um único sinal isolado.",
        "As datas que vê na tabela de períodos são reais, calculadas a partir da sua hora de nascimento (ou de uma estimativa, quando não a soubemos) — não são genéricas nem iguais para todos.",
        "Nada aqui é uma sentença. É um mapa do que o seu perfil sustenta e do que custa — a decisão final é sempre sua.",
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
  catalogoResultados: ResultadoCatalogoVocacional,
): string {
  const seccoes = dividirEmSeccoes(texto);
  const dataGeracao = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const opcoes = parseLeituraPorOpcao(seccoes[SECCAO_TITULOS.leituraPorOpcao] ?? "");
  const identidade = parseIdentidade(texto);
  const fraseAbertura = parseFraseAbertura(texto);
  // TAREFA 1 (correcção do especialista) — deriva o registo tu/você
  // directamente de `dados.ehAdolescente` (já correcto em todos os
  // chamadores) em vez de um 2º parâmetro booleano que podia divergir
  // dele — nunca dois flags a dizerem coisas diferentes sobre o mesmo
  // relatório.
  const usarTu = dados.ehAdolescente === true;

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório VocationIQ — ${escapeHtml(dados.nome)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
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
  .grafico-explicacao { font-size: 14px; color: #4A4A4A; margin: 0 0 14px; max-width: 560px; }
  .grafico-wrap { overflow-x: auto; }
  .grafico-3barras { display: flex; justify-content: center; }
  .grafico-centrado { display: flex; justify-content: center; }
  .peso-fraco { color: #6B6B6B; font-size: 12px; }
  /* TAREFA 3B (correcção do especialista) — legenda linha-a-linha de cada característica do gráfico "O peso de cada característica". */
  .lista-caracteristicas { margin: 14px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #4A4A4A; }
  .lista-caracteristicas strong { color: var(--azul); }
  /* TAREFA 3C — diagrama "Onde o perfil tem atrito" (substitui a tabela anterior). */
  .atrito-wrap { text-align: center; }

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

  /* Correcção do especialista — secção "Quem é" (TAREFA 3C) */
  .grelha-dons-limitacoes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .card-dom, .card-limitacao { border-radius: 8px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; }
  .card-dom { background: #e8f5e9; border-left: 3px solid ${VERDE}; }
  .card-limitacao { background: #fff8e1; border-left: 3px solid var(--ambar); }
  .card-dom-icone, .card-limitacao-icone { flex-shrink: 0; font-size: 15px; font-weight: 700; line-height: 1.5; }
  .card-dom-icone { color: ${VERDE}; }
  .card-limitacao-icone { color: var(--ambar); }
  .card-dom p, .card-limitacao p { margin: 0; font-size: 14px; line-height: 1.6; }
  .card-dom-titulo, .card-limitacao-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 4px; }
  .card-dom-titulo { color: ${VERDE}; }
  .card-limitacao-titulo { color: var(--ambar); }
  .caixa-sintese-quemE { background: var(--azul); color: #FFFFFF; border-radius: 10px; padding: 20px 22px; margin-top: 8px; }
  .caixa-sintese-quemE p { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.6; }

  .card-candidata { border: 2px solid var(--ambar); border-radius: 10px; padding: 20px; page-break-inside: avoid; break-inside: avoid; }
  .card-candidata-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ambar); margin: 0 0 6px; }
  .card-candidata-nome { font-size: 18px; font-weight: 700; color: var(--azul); margin: 0 0 12px; }
  .caixa-neutra { background: var(--cinza-claro); border-radius: 10px; padding: 20px; }

  /* Correcção do especialista ("remover o tecto fixo de 3, com agrupamento por cluster") — caixa da convergência de base partilhada, uma vez por grupo; os cards individuais a seguir ficam mais compactos (só a diferenciação). page-break-inside: avoid em ambas — bug visto no preview impresso (PDF): "Formação de Professores", o último item do cluster de 13, perdia a moldura ao atravessar uma quebra de página porque nem o card nem a caixa do grupo tinham esta regra. */
  .caixa-grupo-candidatas { background: var(--cinza-claro); border-left: 4px solid var(--ambar); border-radius: 10px; padding: 18px 20px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
  .caixa-grupo-candidatas p { font-size: 14px; margin: 0 0 10px; }
  .caixa-grupo-candidatas p:last-child { margin-bottom: 0; }
  .card-candidata-agrupada { padding: 16px 20px; margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid; }

  .timeline-wrap { overflow-x: auto; margin-bottom: 8px; }
  .destaque-passo { margin-top: 24px; }
  .destaque-passo p:last-child { font-size: 16px; font-weight: 600; color: var(--azul); }

  .anexo-espaco { margin-top: 32px; }
  .tabela-anexo { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  .tabela-anexo th { text-align: left; font-weight: 700; color: var(--azul); padding: 8px 10px; border-bottom: 2px solid var(--ambar); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tabela-anexo td { padding: 8px 10px; border-bottom: 1px solid #E6E6E6; vertical-align: top; }
  .tabela-anexo .col-numero { text-align: right; font-weight: 600; }
  .anexo-nota { font-size: 12px; color: #666; margin: 8px 0 0; font-style: italic; }
  .badge-classificacao { display: inline-block; font-size: 11px; font-weight: 700; color: #FFFFFF; padding: 3px 10px; border-radius: 999px; }
  .caixa-neutra p { font-size: 14px; margin: 0 0 12px; }
  .caixa-neutra p:last-child { margin-bottom: 0; }
  .anexo { page-break-before: always; }

  /* Melhorias visuais ao template — Parte 1 (caixas de destaque) */
  .subseccao { margin-top: 32px; }
  .frase-abertura { background: var(--ambar); color: var(--azul); text-align: center; padding: 40px; }
  .frase-abertura p { font-family: "Cormorant Garamond", Georgia, serif; font-size: 32px; font-weight: 600; line-height: 1.35; margin: 0; text-wrap: balance; }

  .caixa-insight { background: var(--azul); color: #FFFFFF; font-style: italic; font-size: 16px; padding: 16px 20px; border-radius: 8px; margin-bottom: 18px; }
  .caixa-insight p { margin: 0; line-height: 1.6; }

  .caixa-custo { border-left: 4px solid ${VERMELHO}; background: #fdf2f0; padding: 16px 20px; }
  .caixa-custo-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${VERMELHO}; margin: 0 0 8px; }
  .caixa-custo p { font-size: 14px; margin: 0; }

  .caixa-periodo-actual { background: var(--azul); color: #FFFFFF; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 20px; }
  .caixa-periodo-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF; opacity: 0.8; margin: 0 0 10px; }
  .caixa-periodo-mahadasha { font-size: 20px; font-weight: 800; color: var(--ambar); margin: 0 0 10px; letter-spacing: 0.5px; }
  .caixa-periodo-classificacao { font-size: 14px; font-style: italic; color: #FFFFFF; margin: 0 0 10px; line-height: 1.6; }
  .caixa-periodo-fim { font-size: 14px; font-weight: 700; color: var(--ambar); margin: 0; }

  .caixa-primeiro-passo { background: var(--ambar); color: var(--azul); border-radius: 10px; padding: 24px; margin-top: 24px; }
  .caixa-primeiro-passo-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--azul); margin: 0 0 8px; }
  .caixa-primeiro-passo p:last-child { font-size: 18px; font-weight: 700; margin: 0; line-height: 1.5; }

  /* Melhorias visuais ao template — Parte 2 (diagramas SVG novos) */
  .radar-wrap, .convergencia-wrap { margin-top: 20px; text-align: center; }

  .ponte-wrap { background: var(--cinza-claro); border-radius: 10px; padding: 20px; margin-bottom: 18px; }
  .ponte-grelha { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-top: 14px; }
  @media (max-width: 700px) { .ponte-grelha { grid-template-columns: 1fr; } }
  .ponte-coluna { background: #FFFFFF; border-radius: 8px; padding: 14px 16px; }
  .ponte-coluna ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; }
  .ponte-coluna p { font-size: 13px; margin: 0; line-height: 1.7; }
  .ponte-verde { border-left: 3px solid ${VERDE}; }
  .ponte-vermelha { border-left: 3px solid ${VERMELHO}; margin-top: 10px; }
  .ponte-coluna-dupla { display: flex; flex-direction: column; }
  .ponte-centro { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .ponte-centro span { font-size: 11px; font-weight: 700; color: var(--ambar); text-transform: uppercase; letter-spacing: 0.5px; }

  footer.rodape { text-align: center; padding: 40px 20px 60px; color: #6B6B6B; font-size: 12px; border-top: 1px solid #E6E6E6; margin-top: 50px; }
  footer.rodape .rodape-logo { font-weight: 800; color: var(--azul); font-size: 14px; margin-bottom: 8px; }
  footer.rodape .rodape-logo .iq { color: var(--ambar); }
  footer.rodape p { font-size: 12px; margin: 2px 0; line-height: 1.5; }

  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .capa { height: 297mm; min-height: 297mm; }
    h1, h2, h3, p, li, td, th { page-break-inside: avoid; }
    .parte-opcao { page-break-inside: avoid; }
    .caixa-custo, .caixa-periodo-actual, .caixa-primeiro-passo, .caixa-insight, .ponte-wrap, .frase-abertura { page-break-inside: avoid; }
  }
</style>
</head>
<body>

  <div class="capa">
    <div class="capa-logo">Vocation<span class="iq">IQ</span></div>
    <div class="capa-tagline">${usarTu ? "Descobre a tua área. Antes de escolher." : "Descubra a sua área. Antes de escolher."}</div>
    <hr class="capa-divisor" />
    <p class="capa-nome">${escapeHtml(dados.nome)}</p>
    <p class="capa-data">${dataGeracao}</p>
  </div>

  ${blocoFraseAbertura(fraseAbertura)}

  <div class="container">

    <section class="seccao">
      <h2 class="titulo-seccao">Quem é, e o que trouxe</h2>
      <div class="quadro-dados">
        ${blocoQuemE(dados)}
        ${blocoOQueTrouxe(dados)}
        ${blocoOQueEsteRelatorioResponde(usarTu)}
      </div>
    </section>

    ${blocoDiagramaIdentidade(pesos, identidade, usarTu)}

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.abertura)}</h2>
      ${markdownParaHtml(seccoes[SECCAO_TITULOS.abertura] ?? "")}
    </section>

    ${blocoSeccaoQuemE(seccoes[SECCAO_TITULOS.quemE] ?? "")}

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.oQueACartaSustenta)}</h2>
      ${markdownParaHtml(seccoes[SECCAO_TITULOS.oQueACartaSustenta] ?? "")}

      <div class="subseccao">
        <p class="bloco-titulo">${usarTu ? "O peso de cada característica do teu perfil" : "O peso de cada característica do seu perfil"}</p>
        <p class="grafico-explicacao">${
          usarTu
            ? "Este gráfico mostra a força relativa de cada característica do teu perfil. Valores acima de 1,3 indicam onde tens força natural; abaixo de 0,9 indicam onde o esforço vai ser maior."
            : "Este gráfico mostra a força relativa de cada característica do seu perfil. Valores acima de 1,3 indicam onde tem força natural; abaixo de 0,9 indicam onde o esforço vai ser maior."
        }</p>
        <div class="grafico-wrap">${svgGraficoForcas(pesos, usarTu)}</div>
        <p class="grafico-legenda">Verde = o perfil apoia com força · Âmbar = suporte moderado · Vermelho = suporte fraco</p>
        <ul class="lista-caracteristicas">
          ${[...pesos]
            .sort((a, b) => b.peso - a.peso)
            .map((p) => `<li><strong>${escapeHtml(caracteristicaPt(p.planeta, usarTu))}</strong> — ${escapeHtml(CARACTERISTICA_EXPLICACAO[p.planeta] ?? "")}</li>`)
            .join("")}
        </ul>
      </div>

      <div class="subseccao">${blocoRadarCompetencias(pesos, savPorCasa, axes.regentesCasas, usarTu)}</div>

      ${blocoRodaDaVida(savPorCasa, pesos, axes.regentesCasas, usarTu)}

      <div class="subseccao">${blocoDiagramaAtrito(pesos, identidade)}</div>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${usarTu ? "Como ganhas melhor" : "Como ganha melhor"}</h2>
      <div class="grafico-wrap grafico-3barras">${svgModoDeGanho(earningModes, axes.earningModeDominante.map((e) => e.house))}</div>
      <p class="grafico-legenda" style="text-align:center">${usarTu ? "A barra em azul é o modo dominante — a forma que o teu perfil mais sustenta para gerar valor." : "A barra em azul é o modo dominante — a forma que o seu perfil mais sustenta para gerar valor."}</p>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.leituraPorOpcao)}</h2>
      ${opcoes.map((op) => cardOpcao(op, dados, pesos, axes)).join("")}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.candidataForaDaLista)}</h2>
      ${blocoCandidataForaDaLista(seccoes[SECCAO_TITULOS.candidataForaDaLista] ?? "", catalogoResultados, usarTu)}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${usarTu ? "O teu calendário" : "O seu calendário"}</h2>
      ${blocoOPlano(seccoes[SECCAO_TITULOS.oPlano] ?? "", datas, usarTu)}
    </section>

    <section class="seccao anexo">
      <h2 class="titulo-seccao">${usarTu ? "Anexo — dados da tua análise" : "Anexo — dados da sua análise"}</h2>

      <p class="rotulo-pequeno">Como ler este relatório</p>
      ${seccaoComoLer(usarTu)}

      <p class="rotulo-pequeno anexo-espaco">Apoio por área de vida</p>
      ${tabelaApoioPorAreaDeVida(savPorCasa, pesos, axes, usarTu)}

      <p class="rotulo-pequeno anexo-espaco">${usarTu ? "Os teus períodos" : "Os seus períodos"}</p>
      ${tabelaOsTeusPeriodos(datas, usarTu)}
    </section>

  </div>

  <footer class="rodape">
    <div class="rodape-logo">Vocation<span class="iq">IQ</span></div>
    <p>Este relatório foi preparado especificamente para ${escapeHtml(dados.nome)}</p>
    <p>${dataGeracao} · vocationiq.app</p>
    ${dados.rascunhoCriadoEm ? `<p>Análise gerada em ${formatarDataHoraLonga(dados.rascunhoCriadoEm)}</p>` : ""}
    <p><strong>Confidencial</strong></p>
  </footer>

</body>
</html>`;
}
