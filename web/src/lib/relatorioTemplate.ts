import {
  SECCAO_TITULOS,
  MARCADORES,
  computeRodaDaVida,
  MAHADASHA_CLASSIFICACAO,
  normalizarTextoLivre,
  computeApoioPorAreaDeVida,
  valorCasaUnificado,
  ESTADO_PT,
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
  type CandidataForaDaLista,
  calcularFacilidadesNaturais,
  type FacilidadeNatural,
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

/**
 * Correcção do especialista ("candidata voltou, pior") — depois de uma
 * instrução explícita e destacada na prompt (INSTRUCAO_NUNCA_CANDIDATA)
 * a palavra "candidata" apareceu MAIS no texto visível, não menos. A
 * explicação mais provável: essa instrução, ao explicar a proibição,
 * repetia a própria palavra "candidata" cerca de 9 vezes num único
 * parágrafo — um padrão conhecido de fazer o LLM piorar (repetir a
 * palavra proibida, mesmo em contexto de proibição, aumenta a
 * probabilidade de a gerar, não diminui). Mesmo padrão de falha já
 * visto com EXPLICAÇÃO_GRÁFICO nesta sessão: depois de instrução
 * repetida e reforçada não resolver, deixa de se depender do LLM —
 * substituição determinística e garantida, aqui, no único sítio por
 * onde passa toda a prosa livre do relatório (`markdownParaHtml` é
 * chamada por todas as secções de texto do LLM). Nomes/rótulos
 * (`op.nome`, `c.nome`, etc.) nunca passam por aqui — só a prosa livre
 * — por isso não há risco de alterar um nome próprio.
 */
function semPalavraCandidata(texto: string): string {
  return texto
    .replace(/\bcandidaturas\b/gi, (m) => (m === m.toUpperCase() ? "OPÇÕES" : m[0] === m[0].toUpperCase() ? "Opções" : "opções"))
    .replace(/\bcandidatas\b/gi, (m) => (m === m.toUpperCase() ? "OPÇÕES" : m[0] === m[0].toUpperCase() ? "Opções" : "opções"))
    .replace(/\bcandidatura\b/gi, (m) => (m === m.toUpperCase() ? "OPÇÃO" : m[0] === m[0].toUpperCase() ? "Opção" : "opção"))
    .replace(/\bcandidata\b/gi, (m) => (m === m.toUpperCase() ? "OPÇÃO" : m[0] === m[0].toUpperCase() ? "Opção" : "opção"));
}

/** Conversor minimalista de markdown -> HTML: parágrafos, listas numeradas, **negrito**. Suficiente para prosa de relatório — não um parser de markdown completo. */
function markdownParaHtml(blocoOriginal: string): string {
  const bloco = semPalavraCandidata(blocoOriginal);
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
  /**
   * Correcção do especialista ("4 correcções + 1 pista", ponto 2) — a
   * força NUNCA é inventada. Quando o cliente não declara nenhuma
   * opção concreta, o LLM não escreve nenhum bloco "### <nome>" com
   * "${MARCADORES.forca}" (ver `parseLeituraPorOpcao` — corpo sem
   * nenhum cabeçalho "### " vira `textoSemOpcao`, nunca um `LeituraOpcao`
   * fabricado). `null` só pode acontecer se um bloco real vier sem a
   * linha FORÇA: (formato malformado) — nesse caso o template não
   * mostra etiqueta nenhuma, em vez de inventar uma pontuação.
   */
  forca: ForcaValor | null;
  insight: string | null;
  partes: string[];
}

/**
 * Divide o corpo da secção "Leitura por opção" pelos cabeçalhos "### <nome>" que o prompt exige, extrai a linha FORÇA:, a linha INSIGHT: (melhorias visuais, Parte 1B) e as 4 partes numeradas de cada opção.
 *
 * Correcção do especialista ("4 correcções + 1 pista", ponto 2) — quando
 * o cliente não declara nenhuma opção concreta ("ainda não sei"), o
 * corpo desta secção não tem NENHUM cabeçalho "### " (o LLM escreve
 * antes uma explicação honesta de que não há nada para testar, ver
 * prompt). O `.split()` antigo não distinguia este caso de um bloco
 * real — devolvia o corpo inteiro como um único "LeituraOpcao" fabricado
 * (nome = 1ª linha da explicação, força = "moderada" por defeito, sem
 * nunca ter vindo nenhuma pontuação real) — daí a etiqueta "Suporte
 * moderado" a aparecer numa caixa que explicitamente diz não haver nada
 * a avaliar. Agora devolve `{ opcoes: [], textoSemOpcao: corpo }` nesse
 * caso, tal como `parseCandidataForaDaLista` já faz para "nenhuma".
 */
function parseLeituraPorOpcao(corpo: string): { opcoes: LeituraOpcao[]; textoSemOpcao: string } {
  if (!/^###\s+/m.test(corpo)) {
    return { opcoes: [], textoSemOpcao: corpo };
  }
  const blocos = corpo.split(/^###\s+/m).filter((b) => b.trim());
  const opcoes = blocos.map((bloco) => {
    const linhas = bloco.split("\n");
    const nome = linhas[0].trim();
    const resto = linhas.slice(1).join("\n");

    const forcaRegex = new RegExp(`${MARCADORES.forca}\\s*(forte|moderada|fraca)`, "i");
    const forcaMatch = resto.match(forcaRegex);
    const forca = (forcaMatch?.[1]?.toLowerCase() as ForcaValor | undefined) ?? null;
    let semForca = resto.replace(forcaRegex, "").trim();

    const insightRegex = new RegExp(`^${MARCADORES.insight}\\s*(.*)$`, "m");
    const insightMatch = semForca.match(insightRegex);
    const insight = insightMatch?.[1]?.trim() ? semPalavraCandidata(insightMatch[1].trim()) : null;
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
  return { opcoes, textoSemOpcao: "" };
}

/**
 * TAREFA 1 (correcção do especialista) — até 3 blocos "CANDIDATA: <nome>",
 * cada um seguido do seu próprio texto até ao próximo marcador (ou ao fim
 * da secção). Array vazio quando a secção diz "CANDIDATA: nenhuma" ou não
 * tem nenhum marcador — nesse caso `textoSemCandidata` traz o resto do
 * corpo (a explicação honesta de que não há candidata), tal como antes.
 */
/**
 * Correcção do especialista (bug real, confirmado por geração real —
 * PDF #9) — "GRUPO:", "CANDIDATA:", "SELECÇÃO_CANDIDATAS:" e
 * "EXPLICAÇÃO_GRÁFICO:" podem, por desenho, aparecer em qualquer
 * posição relativa uns aos outros (a instrução dá ao LLM liberdade de
 * posição para os blocos de explicação de gráficos: "a posição não
 * importa"). Cada função de parsing só sabia parar no PRÓPRIO tipo de
 * marcador — nunca nos outros três. Resultado real observado: um bloco
 * "EXPLICAÇÃO_GRÁFICO:" escrito pelo LLM a meio (ou perto) da secção
 * "Candidata fora da lista" fazia `removerBlocosExplicacaoGrafico`
 * engolir tudo a seguir até ao próximo "## " — apagando candidatas
 * inteiras (sem cartão, sem diagrama) antes de a secção sequer ser
 * dividida. `proximoIndiceDeMarcador` devolve o índice do próximo
 * marcador de QUALQUER um dos tipos passados (ou de um cabeçalho "## "/
 * "### ") a partir de uma posição — usado como limite em todos os
 * parsers desta secção, para nenhum bloco poder voltar a ultrapassar o
 * marcador seguinte, seja ele qual for.
 */
function proximoIndiceDeMarcador(texto: string, apartirDe: number, marcadores: string[]): number {
  let menor = texto.length;
  for (const marcador of marcadores) {
    const regex = new RegExp(`^${marcador}`, "gim");
    regex.lastIndex = apartirDe;
    const m = regex.exec(texto);
    if (m && m.index >= apartirDe && m.index < menor) menor = m.index;
  }
  const regexCabecalho = /^#{2,3} /gm;
  regexCabecalho.lastIndex = apartirDe;
  const cab = regexCabecalho.exec(texto);
  if (cab && cab.index >= apartirDe && cab.index < menor) menor = cab.index;
  return menor;
}

/** Marcadores que nunca podem ficar "dentro" do corpo de uma candidata, do texto partilhado de um grupo, ou de um bloco de explicação de gráfico. */
const FRONTEIRA_CANDIDATA = [MARCADORES.explicacaoGrafico, MARCADORES.candidata, MARCADORES.grupo, MARCADORES.seleccaoCandidatas];

function parseCandidataForaDaLista(corpo: string): { candidatas: { nome: string; texto: string }[]; textoSemCandidata: string } {
  const regex = new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "gm");
  const matches = [...corpo.matchAll(regex)];
  const primeiroValor = matches[0]?.[1]?.trim() ?? "";
  if (!matches.length || !primeiroValor || primeiroValor.toLowerCase() === "nenhuma") {
    // Defesa adicional — nenhum destes marcadores deveria existir
    // quando a resposta é "nenhuma", mas nunca deixar passar para o
    // cliente se o LLM os escrever de qualquer forma.
    const textoSemCandidata = corpo
      .replace(new RegExp(`^${MARCADORES.candidata}\\s*(.*)$`, "m"), "")
      .replace(new RegExp(`^${MARCADORES.seleccaoCandidatas}\\s*(.*)$`, "gm"), "")
      .replace(new RegExp(`^${MARCADORES.explicacaoGrafico}\\s*(.*)$`, "gm"), "")
      .trim();
    return { candidatas: [], textoSemCandidata };
  }
  const candidatas = matches
    .map((m) => {
      const nome = m[1]?.trim() ?? "";
      const inicio = m.index! + m[0].length;
      const fim = proximoIndiceDeMarcador(corpo, inicio, FRONTEIRA_CANDIDATA);
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
  return matches.map((m) => {
    const membros = (m[1] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const inicio = m.index! + m[0].length;
    // O texto PARTILHADO pára no primeiro marcador de qualquer tipo a
    // seguir — normalmente o primeiro "CANDIDATA:" do próprio grupo (é
    // onde a convergência de base acaba e a diferenciação começa).
    // FRONTEIRA_CANDIDATA já inclui GRUPO/SELECÇÃO/EXPLICAÇÃO — nunca
    // precisa de um limite "exterior" à parte, é sempre o mais apertado
    // dos dois.
    const fimTexto = proximoIndiceDeMarcador(corpo, inicio, FRONTEIRA_CANDIDATA);
    return { membros, textoPartilhado: corpo.slice(inicio, fimTexto).trim() };
  }).filter((g) => g.membros.length >= 2);
}

/** Sem acentos, minúsculas — usado por `normalizarBlocosCandidataImplicitos` para reconhecer "grupo" mesmo com variações de grafia/maiúsculas. */
function semAcentos(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Correcção do especialista ("EXPLICAÇÃO_GRÁFICO, mudança de
 * abordagem") — a explicação dos 4 gráficos já não depende do LLM (ver
 * as funções `explicacaoXDeterministica` mais abaixo, chamadas em
 * `gerarHTMLRelatorio`). Esta função fica só como limpeza DEFENSIVA de
 * texto ANTIGO — rascunhos já guardados antes desta correcção podem
 * ainda ter os marcadores "EXPLICAÇÃO_GRÁFICO:"/"LINHA_GRÁFICO:"; sem
 * isto, reapareceriam em bruto se um desses relatórios fosse
 * re-renderizado. Chamada ANTES de dividir o texto em secções, para
 * nenhuma secção alguma vez ver este texto residual.
 */
function removerBlocosExplicacaoGrafico(texto: string): string {
  const regexBloco = new RegExp(`^${MARCADORES.explicacaoGrafico}.*$`, "gm");
  const matches = [...texto.matchAll(regexBloco)];
  if (!matches.length) return texto;
  // Correcção do especialista (bug real, confirmado por geração real —
  // PDF #9) — só parar num "## " seguinte não bastava: um bloco
  // EXPLICAÇÃO_GRÁFICO escrito perto da secção "Candidata fora da
  // lista" engolia candidatas inteiras (nem cartão nem diagrama) porque
  // a remoção ia até ao próximo "## " sem olhar para CANDIDATA:/GRUPO:/
  // SELECÇÃO_CANDIDATAS: pelo caminho. `proximoIndiceDeMarcador` para
  // em qualquer um destes, sempre.
  const remocoes = matches.map((m) => ({ inicio: m.index!, fim: proximoIndiceDeMarcador(texto, m.index! + m[0].length, FRONTEIRA_CANDIDATA) }));
  let resultado = "";
  let cursor = 0;
  for (const { inicio, fim } of remocoes) {
    resultado += texto.slice(cursor, inicio);
    cursor = fim;
  }
  resultado += texto.slice(cursor);
  return resultado.trim();
}

/** Separa a linha "PRIMEIRO PASSO: ..." do resto da secção "O plano". */
function parsePlano(corpo: string): { corpo: string; primeiroPasso: string | null } {
  const regex = new RegExp(`^.*${MARCADORES.primeiroPasso}\\s*(.*)$`, "m");
  const match = corpo.match(regex);
  const primeiroPasso = match?.[1]?.trim() ? semPalavraCandidata(match[1].trim()) : null;
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
  while ((m = domRegex.exec(corpo))) if (m[1].trim()) doms.push(semPalavraCandidata(m[1].trim()));

  const limitacoes: string[] = [];
  while ((m = limitacaoRegex.exec(corpo))) if (m[1].trim()) limitacoes.push(semPalavraCandidata(m[1].trim()));

  const sinteseMatch = corpo.match(sinteseRegex);
  const sintese = sinteseMatch?.[1]?.trim() ? semPalavraCandidata(sinteseMatch[1].trim()) : null;

  const oQueValoriza = corpo.replace(domRegex, "").replace(limitacaoRegex, "").replace(sinteseRegex, "").trim();

  return { doms, limitacoes, sintese, oQueValoriza };
}

/** Extrai "IDENTIDADE: <frase>" do texto em bruto — a linha vem ANTES do primeiro cabeçalho "## ", por isso corre sobre o texto completo, não sobre `seccoes` (dividirEmSeccoes ignora tudo antes do 1º cabeçalho). */
function parseIdentidade(textoCompleto: string): string | null {
  const regex = new RegExp(`^${MARCADORES.identidade}\\s*(.+)$`, "m");
  const match = textoCompleto.match(regex);
  return match?.[1]?.trim() ? semPalavraCandidata(match[1].trim()) : null;
}

/** Melhorias visuais ao template (Parte 1A) — extrai "FRASE_ABERTURA: <frase>", também antes do 1º cabeçalho, mesma lógica de parseIdentidade. */
function parseFraseAbertura(textoCompleto: string): string | null {
  const regex = new RegExp(`^${MARCADORES.fraseAbertura}\\s*(.+)$`, "m");
  const match = textoCompleto.match(regex);
  return match?.[1]?.trim() ? semPalavraCandidata(match[1].trim()) : null;
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
  // Correcção do especialista ("ORDEM — nomenclatura/cor") — margem
  // aumentada de 250 para 270 para caber os novos títulos renomeados
  // (mais longos que os antigos rótulos de `caracteristicaPt`), partidos
  // em 2 linhas por `CARACTERISTICA_TITULO_TABELA_PESO_LINHAS`.
  const margemEsquerda = 270;
  const margemDireita = 55;
  const escalaMax = 2.0;
  const areaBarra = largura - margemEsquerda - margemDireita;
  const altura = ordenados.length * alturaLinha + 12;

  const linhas = ordenados
    .map((p, i) => {
      const y = i * alturaLinha + 8;
      const larguraBarra = Math.max(2, Math.min(p.peso / escalaMax, 1) * areaBarra);
      const cor = corPeso(p.peso);
      const [linha1, linha2] = CARACTERISTICA_TITULO_TABELA_PESO_LINHAS[p.planeta] ?? [caracteristicaPt(p.planeta, usarTu), ""];
      return `
      <text x="${margemEsquerda - 14}" y="${y + 14}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="#1A1A1A">${escapeHtml(linha1)}</text>
      <text x="${margemEsquerda - 14}" y="${y + 27}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="#1A1A1A">${escapeHtml(linha2)}</text>
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

  // Correcção do especialista (A4, "ORDEM MESTRA") — as barras passam a
  // aparecer sempre ordenadas por pontuação decrescente (a mais forte
  // primeiro), nunca pela ordem fixa das casas 2/6/10 — essa parte já
  // estava certa e mantém-se. Correcção do especialista ("ORDEM —
  // nomenclatura/cor") — os tons de azul não ficaram bem; substituídos
  // por um gradiente laranja→amarelo (cor de marca), barra dominante
  // mais escura/saturada, as outras mais claras.
  const porCasa = [2, 6, 10]
    .map((casa) => earningModes.find((e) => e.house === casa))
    .filter((e): e is EarningMode => !!e)
    .sort((a, b) => b.score - a.score);
  const maiorScore = Math.max(...porCasa.map((e) => e.score), 1);
  // Barra(s) dominante(s) sempre no laranja mais escuro/saturado — as
  // não dominantes ficam progressivamente mais claras, na ordem em que
  // aparecem (já ordenadas por pontuação decrescente). Preserva o
  // destaque das DUAS barras em caso de empate total (TAREFA 2).
  const LARANJA_DOMINANTE = "#D9720F";
  const TONS_GANHO_NAO_DOMINANTE = ["#F5A623", "#FBD98A"];
  let rankNaoDominante = 0;

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
      const cor = dominante ? LARANJA_DOMINANTE : (TONS_GANHO_NAO_DOMINANTE[rankNaoDominante++] ?? TONS_GANHO_NAO_DOMINANTE[TONS_GANHO_NAO_DOMINANTE.length - 1]);
      const corTexto = AZUL;
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
function svgDiagramaIdentidade(sinais: [string, string][], identidade: string): string {
  const largura = 680;
  // Correcção do especialista ("ORDEM — nomenclatura/cor") — os novos
  // títulos renomeados (mesmos da tabela de peso, "mesma característica,
  // mesmo nome em todo o relatório") são mais longos que os antigos —
  // margem e espaçamento entre linhas aumentados, e cada sinal passa a
  // ter 2 linhas (`sinaisIdentidade` já devolve o par pronto).
  const margemTexto = 250;
  const cxCirculo = 490;
  const raioCirculo = 92;
  const gapLinha = 46;
  const topo = 20;
  const alturaSinais = sinais.length * gapLinha;
  const cyCirculo = Math.max(topo + alturaSinais / 2, raioCirculo + 16);
  const altura = Math.max(cyCirculo + raioCirculo + 20, topo + alturaSinais + 20);

  const linhas = sinais
    .map(([linha1, linha2], i) => {
      const y = topo + i * gapLinha + gapLinha / 2;
      return `
      <text x="${margemTexto - 10}" y="${y - 5}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="#1A1A1A">${escapeHtml(linha1)}</text>
      <text x="${margemTexto - 10}" y="${y + 8}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="#1A1A1A">${escapeHtml(linha2)}</text>
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

function blocoRadarCompetencias(pesos: PesoPlaneta[], savPorCasa: SavPorCasa[], regentesCasas: Record<number, ClassicalGraha>, usarTu: boolean, explicacao: ExplicacaoGraficoDeterministica): string {
  const eixos = computeRadarCompetencias(pesos, savPorCasa, regentesCasas);
  return `
    <div class="radar-wrap">
      <p class="bloco-titulo" style="text-align:center">${usarTu ? "O teu perfil de competências" : "O seu perfil de competências"}</p>
      <p class="roda-vida-subtitulo" style="text-align:center">${usarTu ? "Onde o teu perfil tem força natural" : "Onde o seu perfil tem força natural"}</p>
      <div class="caixa-neutra grafico-explicacao-llm">${markdownParaHtml(explicacao.abertura)}</div>
      <div class="grafico-wrap grafico-centrado">${svgRadarCompetencias(eixos)}</div>
      <p class="grafico-legenda" style="text-align:center">${usarTu ? "Valores calculados a partir da força real do teu perfil — não são avaliações de personalidade." : "Valores calculados a partir da força real do seu perfil — não são avaliações de personalidade."}</p>
      <ul class="lista-caracteristicas">
        ${eixos
          .map((e) => {
            const personalizado = linhaExplicacaoDeterministica(explicacao, e.nome);
            return personalizado ? `<li><strong>${escapeHtml(e.nome)}</strong> — <span class="linha-explicacao-llm">${escapeHtml(personalizado)}</span></li>` : "";
          })
          .join("")}
      </ul>
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

// ---------- Blocos HTML ----------

/** Os "sinais" do diagrama de identidade — reaproveita os mesmos rótulos humanos já usados no gráfico "O peso de cada característica" (caracteristicaPt), ordenados por peso decrescente. Sempre determinístico, nunca do LLM. */
/** Correcção do especialista ("ORDEM — nomenclatura/cor") — usa os MESMOS nomes renomeados da tabela de peso (`CARACTERISTICA_TITULO_TABELA_PESO_LINHAS`), nunca os rótulos antigos de `caracteristicaPt` — mesma característica, mesmo nome em todo o relatório. */
function sinaisIdentidade(pesos: PesoPlaneta[], usarTu: boolean): [string, string][] {
  return [...pesos].sort((a, b) => b.peso - a.peso).map((p) => CARACTERISTICA_TITULO_TABELA_PESO_LINHAS[p.planeta] ?? [caracteristicaPt(p.planeta, usarTu), ""]);
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

function blocoRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>, usarTu: boolean, explicacao: ExplicacaoGraficoDeterministica): string {
  const dimensoes = computeRodaDaVida(savPorCasa, pesos, regentesCasas, usarTu);
  const lista = dimensoes
    .map((d) => {
      const personalizado = linhaExplicacaoDeterministica(explicacao, d.nome);
      return `
      <div class="dimensao-vida-item">
        <span class="dimensao-vida-nome">${escapeHtml(d.nome)}</span>
        <span class="dimensao-vida-valor" style="color:${corRodaDaVida(d.valor)}">${d.valor.toFixed(1)}/10</span>
        <p class="dimensao-vida-descricao">${escapeHtml(d.descricao)}</p>
        ${personalizado ? `<p class="dimensao-vida-descricao linha-explicacao-llm">${escapeHtml(personalizado)}</p>` : ""}
      </div>`;
    })
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
        ${markdownParaHtml(explicacao.abertura)}
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
 * Correcção do especialista ("ORDEM — nomenclatura/cor") — substitui o
 * diagrama radial SVG que aqui existia (círculo central + linhas para
 * Mercúrio/Vénus/Marte, "desalinhado e pouco profissional") pelo mesmo
 * estilo de cartão já confirmado elegante em `.card-dom`/
 * `.card-limitacao` — borda colorida à esquerda + fundo suave + título
 * + lista simples, sem linhas radiais.
 */
function blocoDiagramaAtrito(pesos: PesoPlaneta[], identidade: string | null): string {
  const fracos = [...pesos].filter((p) => p.peso < 0.9).sort((a, b) => a.peso - b.peso);
  if (!fracos.length) return "";
  const itens: ItemAtrito[] = fracos.map((p) => ({
    planeta: p.planeta,
    peso: p.peso,
    implicacao: IMPLICACAO_PRATICA_PLANETA[p.planeta] ?? "Esta parte do perfil está enfraquecida — o que a tese central pede aqui não é natural, tem de ser construído com esforço consciente.",
  }));
  return `
    <div class="anexo-espaco">
      <p class="rotulo-pequeno" style="text-align:center">Onde o perfil tem atrito</p>
      <div class="card-atrito">
        <p class="card-atrito-titulo">O que resiste a "${escapeHtml(identidade ?? "o que este perfil sustenta")}"</p>
        <ul>
          ${itens.map((item) => `<li><strong>${escapeHtml(PLANETA_PT[item.planeta] ?? item.planeta)}</strong> — ${escapeHtml(item.implicacao)}</li>`).join("")}
        </ul>
      </div>
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
        ${op.forca ? `<span class="badge-forca" style="background:${corForca(op.forca)}">${FORCA_LABEL[op.forca]}</span>` : ""}
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

function corNivelFacilidade(nivel: FacilidadeNatural["nivel"]): string {
  if (nivel === "Alto") return VERDE;
  if (nivel === "Médio") return AMBAR;
  return VERMELHO;
}

/**
 * Correcção do especialista — os emoji a cores (🤝💡⚙️🔍📣🎯) nunca
 * apareciam no PDF: o Chromium mínimo usado em produção
 * (@sparticuz/chromium, ver htmlToPdf.ts) não inclui um tipo de letra de
 * emoji a cores (mantém o binário pequeno para a Vercel), por isso o
 * glifo fica em branco — confirmado por leitura dos codepoints (sem
 * corrupção de dados) e pelo facto de todos os outros ícones do
 * relatório usarem entidades HTML simples (&#10003;/&#9888;/&#8594;),
 * nunca emoji a cores. Substituídos por SVG inline — o mesmo mecanismo
 * já usado nos restantes gráficos do relatório (Roda da Vida, gráfico
 * de forças) — que renderiza sempre, em qualquer Chromium, sem depender
 * de tipo de letra nenhum. Cor = cor do nível do cartão (mesmo padrão de
 * `.card-dom-icone`/`.card-limitacao-icone`, que já usam a cor do cartão
 * em vez de uma cor fixa).
 */
function iconeFacilidade(categoria: string, cor: string): string {
  const s = `stroke="${cor}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (categoria === "Pessoas") {
    return `<circle cx="9" cy="12" r="5.5" ${s}/><circle cx="15" cy="12" r="5.5" ${s}/>`;
  }
  if (categoria === "Ideias") {
    return `<path d="M12 3.5a6 6 0 0 0-3.4 10.9c.5.35.8.95.8 1.6v.4h5.2v-.4c0-.65.3-1.25.8-1.6A6 6 0 0 0 12 3.5z" ${s}/><line x1="9.8" y1="19" x2="14.2" y2="19" ${s}/><line x1="10.4" y1="21.3" x2="13.6" y2="21.3" ${s}/>`;
  }
  if (categoria === "Execução") {
    const centro = 12;
    const dentes = Array.from({ length: 8 }, (_, i) => {
      const angulo = (i * Math.PI) / 4;
      const x1 = centro + 7.2 * Math.cos(angulo);
      const y1 = centro + 7.2 * Math.sin(angulo);
      const x2 = centro + 9.6 * Math.cos(angulo);
      const y2 = centro + 9.6 * Math.sin(angulo);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" ${s}/>`;
    }).join("");
    return `${dentes}<circle cx="12" cy="12" r="6.2" ${s}/><circle cx="12" cy="12" r="2.2" fill="${cor}" stroke="none"/>`;
  }
  if (categoria === "Investigação") {
    return `<circle cx="10" cy="10" r="6" ${s}/><line x1="14.6" y1="14.6" x2="20.2" y2="20.2" ${s}/>`;
  }
  if (categoria === "Comunicação") {
    return `<path d="M4 10v4h3l6.5 4V6L7 10H4z" ${s}/><path d="M16.5 9.3a5 5 0 0 1 0 5.4" ${s}/><path d="M19 7.3a8 8 0 0 1 0 9.4" ${s}/>`;
  }
  // "Liderança" e qualquer categoria futura sem ícone próprio — alvo/bullseye, leitura universal de "foco/objectivo".
  return `<circle cx="12" cy="12" r="8" ${s}/><circle cx="12" cy="12" r="5" ${s}/><circle cx="12" cy="12" r="2" fill="${cor}" stroke="none"/>`;
}

/**
 * Correcção do especialista — nova secção "Para que tem facilidade
 * natural", entre "Quem é" e "O que o perfil sustenta". 6 cartões fixos
 * (Pessoas/Ideias/Execução/Investigação/Comunicação/Liderança), cor por
 * nível (verde/âmbar/vermelho suave) — tudo calculado por
 * `calcularFacilidadesNaturais` (method-engine), nunca pelo LLM. Mesmo
 * padrão visual de `.card-dom`/`.card-limitacao` acima, generalizado
 * para 3 cores em vez de 2.
 */
function blocoFacilidadesNaturais(pesos: PesoPlaneta[]): string {
  const facilidades = calcularFacilidadesNaturais(pesos);
  const cards = facilidades
    .map((f) => {
      const cor = corNivelFacilidade(f.nivel);
      return `
      <div class="card-facilidade" style="background:${cor}1a; border-left: 3px solid ${cor};">
        <svg class="card-facilidade-icone" viewBox="0 0 24 24" width="28" height="28">${iconeFacilidade(f.categoria, cor)}</svg>
        <p class="card-facilidade-titulo" style="color:${cor};">${escapeHtml(f.categoria)}</p>
        <span class="badge-nivel-facilidade" style="background:${cor};">${escapeHtml(f.nivel)}</span>
        <p class="card-facilidade-frase">${escapeHtml(f.frase)}</p>
      </div>`;
    })
    .join("");

  return `
    <section class="seccao">
      <h2 class="titulo-seccao">Para que tem facilidade natural</h2>
      <div class="grelha-facilidades">${cards}</div>
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
/**
 * Correcção do especialista (padrão de fundo confirmado por texto em
 * bruto real, 4 gerações seguidas) — o LLM deriva sistematicamente de
 * "CANDIDATA: Nome"/"GRUPO: nome1; nome2" para título markdown bold
 * ("**Nome** — Nível X, ..." / "**Grupo 1 — ...**"), mesmo com a
 * instrução e os exemplos negativos no prompt (ver
 * INSTRUCAO_SELECCAO_CANDIDATAS). Rede de segurança do lado do parser,
 * para quando a prompt não bastar: normaliza QUALQUER linha bold-header
 * ("**Texto** — resto") para o marcador literal ANTES de qualquer outro
 * parsing correr — assim toda a lógica existente (fronteiras, grupos,
 * diagramas) funciona sem alteração, sobre texto já normalizado.
 *
 * Candidatas individuais ("**Nome** — resto") tornam-se sempre
 * "CANDIDATA: Nome\nresto" — recuperam cartão e diagrama completos.
 *
 * Cabeçalhos de grupo ("**Grupo N** — resto", texto bold a começar por
 * "grupo") são DESCARTADOS, nunca convertidos em "GRUPO:" — sem uma
 * lista explícita de nomes separados por ";" nessa linha (o LLM nunca a
 * escreve neste formato de desvio), não há como reconstruir com
 * confiança QUAIS candidatas pertencem ao grupo; inventar essa
 * associação seria pior do que perder só o agrupamento. Resultado:
 * cada candidata que estaria nesse grupo continua a chegar como
 * "CANDIDATA:" individual completa (a convergência partilhada
 * descrita nesse cabeçalho perde-se, mas nenhuma candidata desaparece
 * — a falha grave que esta correcção visa eliminar).
 */
function normalizarBlocosCandidataImplicitos(corpo: string): string {
  const regexBoldHeader = /^\*\*([^*]+?)\*\*\s*[—–-]\s*(.*)$/gm;
  return corpo.replace(regexBoldHeader, (_linhaCompleta, nome: string, resto: string) => {
    const nomeNormalizado = nome.trim();
    if (/^grupo\b/i.test(semAcentos(nomeNormalizado))) return "";
    return `${MARCADORES.candidata} ${nomeNormalizado}\n${resto}`;
  });
}

interface ResumoCandidata {
  textoLimpo: string;
  via: string | null;
  custo: string | null;
}

/**
 * Correcção do especialista ("tabela resumo final das candidatas") —
 * extrai "VIA_RESUMIDA:"/"CUSTO_PRINCIPAL:" do corpo de UMA candidata
 * (mesmo mecanismo de marcador embutido já confirmado fiável para
 * CANDIDATA:/GRUPO:) e remove-as do texto visível do cartão — nunca
 * aparecem duas vezes (uma na tabela, outra solta no meio do texto).
 * `via`/`custo` ficam `null` quando o LLM não escreveu a linha — a
 * tabela mostra "—" nessa célula, nunca rebenta.
 */
function extrairResumoCandidata(texto: string): ResumoCandidata {
  const regexVia = new RegExp(`^${MARCADORES.viaResumida}\\s*(.*)$`, "im");
  const regexCusto = new RegExp(`^${MARCADORES.custoPrincipal}\\s*(.*)$`, "im");
  const via = texto.match(regexVia)?.[1]?.trim() || null;
  const custo = texto.match(regexCusto)?.[1]?.trim() || null;
  const textoLimpo = texto
    .replace(new RegExp(`^${MARCADORES.viaResumida}\\s*(.*)$`, "gim"), "")
    .replace(new RegExp(`^${MARCADORES.custoPrincipal}\\s*(.*)$`, "gim"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { textoLimpo, via, custo };
}

/**
 * Correcção do especialista ("tabela resumo final das candidatas") —
 * complemento aos cartões detalhados, nunca substituição: uma linha por
 * candidata apresentada (Opção, Nível — 100% determinístico, vem do
 * catálogo, nunca do LLM — Via de entrada resumida, Custo principal).
 * Reutiliza o estilo `.tabela-anexo` já usado no Anexo, em vez de
 * inventar um novo.
 */
function blocoTabelaResumoCandidatas(resumo: { nome: string; nivel: 1 | 2 | undefined; via: string | null; custo: string | null }[]): string {
  if (!resumo.length) return "";
  const linhas = resumo
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.nome)}</td>
        <td class="col-numero">${r.nivel ?? "—"}</td>
        <td>${escapeHtml(r.via ?? "—")}</td>
        <td>${escapeHtml(r.custo ?? "—")}</td>
      </tr>`,
    )
    .join("");
  return `
    <div class="tabela-resumo-candidatas-wrap">
      <p class="bloco-titulo">Resumo das Opções</p>
      <table class="tabela-anexo">
        <thead><tr><th>Opção</th><th class="col-numero">Nível</th><th>Via de entrada</th><th>Custo principal</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

/**
 * Correcção do especialista (Parte D, "ORDEM MESTRA") — candidatas
 * EFECTIVAMENTE escritas neste relatório, nunca a pool completa que
 * `catalogarDestinos()` produz (essa pool não tem tecto de 3 — TAREFA
 * #40 — e inclui candidatas que o LLM pode não ter escolhido escrever).
 * Usado para ligar dinamicamente cada característica/casa às
 * candidatas REAIS deste relatório específico — cada pessoa tem
 * candidatas diferentes, por isso a ligação nunca pode ser texto fixo,
 * tem de ser recalculada a cada geração a partir dos dados desta carta.
 */
function candidatasEfectivamenteEscritas(corpoCandidataForaDaLista: string, catalogo: ResultadoCatalogoVocacional | null): CandidataForaDaLista[] {
  if (!catalogo) return [];
  const corpoNormalizado = normalizarBlocosCandidataImplicitos(corpoCandidataForaDaLista);
  const { candidatas } = parseCandidataForaDaLista(corpoNormalizado);
  const resultado: CandidataForaDaLista[] = [];
  for (const c of candidatas) {
    const dados = catalogo.candidatasForaDaLista.find((cat) => cat.nome === c.nome);
    if (dados) resultado.push(dados);
  }
  return resultado;
}

/**
 * Correcção do especialista (Parte D) — junta os nomes de candidatas
 * numa frase em português ("A", "A e B", "A, B e C"), truncando para no
 * máximo 3 nomes (mais do que isso deixa de ser uma frase legível) e
 * assinalando quantas ficaram de fora.
 */
function juntarNomesCandidatas(nomes: string[]): string {
  const LIMITE = 3;
  const visiveis = nomes.slice(0, LIMITE);
  let frase: string;
  if (visiveis.length === 1) frase = visiveis[0];
  else frase = `${visiveis.slice(0, -1).join(", ")} e ${visiveis[visiveis.length - 1]}`;
  const resto = nomes.length - visiveis.length;
  return resto > 0 ? `${frase}, entre outras` : frase;
}

/** Candidatas (deste relatório) cujas camadas mencionam este planeta através de um dos elos mecânicos reais do motor de selecção (Planeta de maior peso, Atmakaraka, Amatyakaraka, Regente do Modo de Ganho dominante) — nunca por coincidência textual, só os tipos de camada que `catalogarDestinos()` de facto produz para este planeta específico. */
function candidatasPorPlaneta(planeta: ClassicalGraha, candidatas: CandidataForaDaLista[], axes: VocationIQAxes): CandidataForaDaLista[] {
  const encontrados = new Map<string, CandidataForaDaLista>();
  for (const c of candidatas) {
    for (const camada of c.camadas) {
      const ligaAoPlaneta =
        (camada.startsWith("Planeta de maior peso") && camada.includes(`(${planeta}`)) ||
        (camada.startsWith("Atmakaraka") && axes.missionAxis.atmakaraka === planeta) ||
        (camada.startsWith("Amatyakaraka") && axes.amatyakaraka === planeta) ||
        (camada.startsWith("Regente do Modo de Ganho dominante") && camada.includes(`(${planeta},`));
      if (ligaAoPlaneta) {
        encontrados.set(c.nome, c);
        break;
      }
    }
  }
  return [...encontrados.values()];
}

/** Candidatas (deste relatório) cujas camadas mencionam esta casa através de um elo mecânico real (Casa temática forte, Stellium na casa, Regente da casa dignificado). */
function candidatasPorCasa(casa: number, candidatas: CandidataForaDaLista[]): CandidataForaDaLista[] {
  const encontrados = new Map<string, CandidataForaDaLista>();
  for (const c of candidatas) {
    for (const camada of c.camadas) {
      const ligaACasa = camada.includes(`(casa ${casa})`) || camada.includes(`na casa ${casa} (`) || camada.startsWith(`Regente da casa ${casa} dignificado`);
      if (ligaACasa) {
        encontrados.set(c.nome, c);
        break;
      }
    }
  }
  return [...encontrados.values()];
}

/** União de `candidatasPorCasa` para dimensões/eixos ligados a mais do que uma casa clássica (ex.: Roda da Vida, algumas dimensões cobrem 2 casas). */
function candidatasPorCasas(casas: number[], candidatas: CandidataForaDaLista[]): CandidataForaDaLista[] {
  const encontrados = new Map<string, CandidataForaDaLista>();
  for (const casa of casas) for (const c of candidatasPorCasa(casa, candidatas)) encontrados.set(c.nome, c);
  return [...encontrados.values()];
}

/**
 * Correcção do especialista ("ORDEM — nomenclatura/cor", 6c) — texto de
 * síntese que abre o capítulo, ANTES de qualquer opção listada:
 * o que o capítulo faz, porque estas áreas estão a ser consideradas à
 * luz do perfil, e porque a pessoa deve olhar para elas especificamente
 * a partir da leitura da sua carta. Determinístico (nunca do LLM) — o
 * mesmo padrão já aplicado às explicações dos 4 gráficos: uma frase de
 * síntese fixa não tem risco de omissão, ao contrário de pedir ao LLM
 * para a escrever a cada geração.
 */
function introOpcoesForaDaLista(minConvergencia: number, usarTu: boolean): string {
  const seu = usarTu ? "teu" : "seu";
  const sua = usarTu ? "tua" : "sua";
  return `
    <div class="caixa-neutra">
      <p>${usarTu ? "Esta secção reúne áreas que o teu perfil sustenta com força" : "Esta secção reúne áreas que o seu perfil sustenta com força"} — mesmo sem terem estado na ${sua} lista original de opções. Nenhuma delas é uma sugestão genérica: cada uma só chega até aqui quando pelo menos ${minConvergencia} sinais independentes da ${sua} carta — regência de casa, dignidade planetária, o planeta mais forte do ${seu} perfil, entre outros — convergem na mesma direcção. Nenhuma é acidente.</p>
      <p>${usarTu ? "Olha para elas" : "Vale a pena olhar para elas"} porque a leitura que se segue não vem de uma lista de profissões populares — vem especificamente do ${seu} mapa. O que cada uma explica, a seguir, é só isso: porque faz sentido dentro do que a ${sua} carta já sustenta. A duração de formação, a via de entrada e o custo principal de cada opção estão resumidos numa tabela no fim desta secção — não repetidos aqui.</p>
    </div>`;
}

function blocoCandidataForaDaLista(corpo: string, catalogo: ResultadoCatalogoVocacional | null, usarTu: boolean): string {
  const corpoNormalizado = normalizarBlocosCandidataImplicitos(corpo);
  const { candidatas, textoSemCandidata } = parseCandidataForaDaLista(corpoNormalizado);
  if (!candidatas.length) {
    return `<div class="caixa-neutra">${markdownParaHtml(textoSemCandidata || corpo)}</div>`;
  }
  const grupos = parseGruposCandidatas(corpoNormalizado);
  const grupoPorNome = new Map<string, GrupoCandidatasTexto>();
  for (const g of grupos) for (const nome of g.membros) grupoPorNome.set(nome, g);
  const gruposJaRenderizados = new Set<GrupoCandidatasTexto>();
  const resumoParaTabela: { nome: string; nivel: 1 | 2 | undefined; via: string | null; custo: string | null }[] = [];
  const dadosPorNome = new Map(candidatas.map((c) => [c.nome, catalogo?.candidatasForaDaLista.find((cat) => cat.nome === c.nome)]));
  // 4 é o limiar mínimo de convergência que `catalogarDestinos()` exige
  // para uma opção sequer entrar na pool (LIMIAR_MINIMO_CANDIDATA em
  // catalogoVocacional.ts) — só serve de fallback se, por algum motivo,
  // uma opção escrita pelo LLM não tiver dados correspondentes no
  // catálogo (não deveria acontecer em condições normais).
  const minConvergencia = Math.min(...[...dadosPorNome.values()].map((d) => d?.convergencia ?? 4));

  // Correcção do especialista ("ORDEM — nomenclatura/cor", 6b/6d) — a
  // caixa "Porque esta opção não é acidente" (antigo `blocoDiagramaConvergencia`)
  // deixa de se repetir por opção (24 caixas repetidas no PDF real) — a
  // ideia já fica dita UMA VEZ em `introOpcoesForaDaLista`. E a caixa
  // âmbar `.card-candidata` por opção também desaparece — cada opção
  // passa a ser só nome como subtítulo + parágrafo, com uma divisória
  // fina entre opções (`.opcao-item`), nunca uma caixa colorida
  // individual. Os grupos mantêm a frase de abertura partilhada, como
  // já acontecia.
  const cartoes = candidatas
    .map((c) => {
      const dadosCatalogo = dadosPorNome.get(c.nome);
      const { textoLimpo, via, custo } = extrairResumoCandidata(c.texto);
      resumoParaTabela.push({ nome: c.nome, nivel: dadosCatalogo?.nivelConfianca, via, custo });
      const grupo = grupoPorNome.get(c.nome);
      let introGrupo = "";
      if (grupo && !gruposJaRenderizados.has(grupo)) {
        gruposJaRenderizados.add(grupo);
        introGrupo = `
        <div class="caixa-grupo-candidatas">
          <p class="card-candidata-header">${usarTu ? "Um conjunto de opções com a mesma convergência de base" : "Um conjunto de opções com a mesma convergência de base"}</p>
          ${markdownParaHtml(grupo.textoPartilhado)}
        </div>`;
      }
      return `
      ${introGrupo}
      <div class="opcao-item">
        <p class="opcao-nome">${escapeHtml(c.nome)}</p>
        ${markdownParaHtml(textoLimpo)}
      </div>`;
    })
    .join("\n");

  return `${introOpcoesForaDaLista(minConvergencia, usarTu)}\n${cartoes}\n${blocoTabelaResumoCandidatas(resumoParaTabela)}`;
}

const MS_POR_ANO = 365.25 * 24 * 60 * 60 * 1000;
const MS_POR_MES = 30.44 * 24 * 60 * 60 * 1000;

/**
 * Correcção do especialista ("4 correcções + 1 pista", ponto 3) —
 * "O seu calendário" mostrava "Período actual: VÉNUS" e, logo a
 * seguir, uma linha do tempo a destacar "Ketu 08/2025–10/2026" sem
 * nunca explicar que são dois níveis do MESMO sistema (Mahadasha, o
 * ciclo maior, com uma Antardasha, o ciclo menor, aninhada lá dentro)
 * — um leitor sem contexto lê os dois nomes de planeta como coisas
 * separadas ou contraditórias. Duração calculada a partir das datas
 * REAIS já computadas (`inicio`/`fim`), nunca de uma duração-tabela
 * genérica — o Mahadasha actual de uma pessoa pode ser mais curto do
 * que o ciclo completo do planeta se for o 1º dasha da vida dela
 * (resto do que já estava a decorrer à nascença). Reaproveita
 * `DASHA_O_QUE_PEDE`, já usado no Anexo "Os seus períodos", em vez de
 * inventar uma segunda explicação.
 */
function introSistemaPeriodos(datas: DadosDatas, usarTu: boolean): string {
  const dicionarioOQuePede = usarTu ? DASHA_O_QUE_PEDE_TU : DASHA_O_QUE_PEDE;
  const anos = Math.max(1, Math.round((datas.mahadashaAtual.fim.getTime() - datas.mahadashaAtual.inicio.getTime()) / MS_POR_ANO));
  const meses = Math.max(1, Math.round((datas.antardashaAtual.fim.getTime() - datas.antardashaAtual.inicio.getTime()) / MS_POR_MES));
  const nomeMaha = PLANETA_PT[datas.mahadashaAtual.senhor] ?? datas.mahadashaAtual.senhor;
  const nomeAntar = PLANETA_PT[datas.antardashaAtual.senhor] ?? datas.antardashaAtual.senhor;
  const pedeMaha = dicionarioOQuePede[datas.mahadashaAtual.senhor] ?? "";
  const pedeAntar = dicionarioOQuePede[datas.antardashaAtual.senhor] ?? "";
  return `
    <div class="caixa-neutra">
      <p>${usarTu ? "O teu" : "O seu"} calendário funciona em dois níveis, sempre aninhados um dentro do outro — nunca dois sistemas separados. Um ciclo maior (chamado Mahadasha) dura vários anos: ${usarTu ? "o teu" : "o seu"} ciclo actual é o de ${nomeMaha}, com cerca de ${anos} ano${anos === 1 ? "" : "s"}. Dentro dele corre sempre um ciclo mais curto (a Antardasha), que dura meses — ${usarTu ? "estás" : "está"} agora no de ${nomeAntar}, com cerca de ${meses} mes${meses === 1 ? "" : "es"}.</p>
      <p>${nomeMaha} ${pedeMaha ? pedeMaha.charAt(0).toLowerCase() + pedeMaha.slice(1) : ""} — esse é o tom de fundo dos próximos anos. ${nomeAntar} ${pedeAntar ? pedeAntar.charAt(0).toLowerCase() + pedeAntar.slice(1) : ""} — é o que pede mais atenção agora mesmo, dentro desse tom de fundo.</p>
    </div>`;
}

function blocoOPlano(corpo: string, datas: DadosDatas, usarTu: boolean): string {
  const { corpo: resto, primeiroPasso } = parsePlano(corpo);
  return `
    ${introSistemaPeriodos(datas, usarTu)}
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
  // Correcção do especialista ("erro de concordância verbal", pós-PDF
  // real) — com 2+ áreas na lista, o sujeito é composto ("X, Y e Z") e a
  // frase tem de ir para o plural (verbos, e "uma das casas centrais" →
  // "casas centrais", sem o "uma das" que só faz sentido no singular);
  // com exactamente 1 área, mantém-se a forma singular original.
  const plural = forteForaDaTese.length > 1;
  const nota = forteForaDaTese.length
    ? `<p class="anexo-nota">Nota: ${forteForaDaTese.map((h) => escapeHtml(areaVidaPt(h.casa, usarTu))).join(", ")} ${plural ? "aparecem" : "aparece"} com apoio Forte, mas ${plural ? "não são casas centrais" : "não é uma das casas centrais"} desta leitura (Eixo da Missão / Modo de Ganho) — reflecte${plural ? "m" : ""} sobretudo onde a força física do perfil está posicionada, não o tema principal da ${usarTu ? "tua" : "sua"} vocação.</p>`
    : "";
  // Correcção do especialista ("4 correcções + 1 pista", ponto 4) — esta
  // tabela usa a MESMA fórmula da Roda da Vida (visto mais cedo no
  // relatório, ver comentário em `computeRadarCompetencias`) — sem
  // explicação, lê-se como um número repetido sem função. A diferença
  // real: a Roda agrupa as 12 casas em 8 áreas de vida com leitura
  // narrativa; aqui vêm as 12 casas clássicas uma a uma, sem agrupar —
  // inclui casas que a Roda nem nomeia isoladamente (3, 8, 12) — para
  // quem quer verificar, casa a casa, os números técnicos que sustentam
  // o resto do relatório.
  const introTabela = usarTu
    ? "Esta tabela usa a mesma fórmula da Roda da Vida que já viste — mas em bruto, casa a casa, sem as agrupar em 8 áreas com leitura narrativa. Inclui também casas que a Roda não nomeia isoladamente. Serve para verificar, uma a uma, os números técnicos que sustentam o resto do relatório."
    : "Esta tabela usa a mesma fórmula da Roda da Vida já mostrada — mas em bruto, casa a casa, sem as agrupar em 8 áreas com leitura narrativa. Inclui também casas que a Roda não nomeia isoladamente. Serve para verificar, uma a uma, os números técnicos que sustentam o resto do relatório.";
  return `
    <p class="anexo-intro">${introTabela}</p>
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

interface ExplicacaoGraficoDeterministica {
  abertura: string;
  porCategoria: Record<string, string>;
}

/**
 * Correcção do especialista ("EXPLICAÇÃO_GRÁFICO, mudança de
 * abordagem") — depois de 5 gerações reais seguidas sem os blocos
 * EXPLICAÇÃO_GRÁFICO:/LINHA_GRÁFICO:, apesar de estarem na prompt
 * (INSTRUCAO_EXPLICACAO_GRAFICOS) E no critério 26 da crítica
 * automática (confirmado por leitura de código que ambos chegam ao
 * caminho real — o problema nunca foi ligação, foi o LLM a ignorar a
 * instrução mesmo depois de ser mandado reescrever), a explicação dos 4
 * gráficos deixa de depender do LLM escrever nada. É gerada AQUI,
 * determinística e exclusivamente a partir dos mesmos dados que os
 * próprios gráficos usam (pesos, savPorCasa, regentesCasas,
 * earningModes) — garante 100% de presença, sempre, sem excepção.
 * Perde-se a variação de prosa que só um LLM dá; ganha-se a garantia
 * que o requisito pedia como não-negociável.
 */
/**
 * Correcção do especialista (Parte D, "ORDEM MESTRA") — título renomeado
 * da tabela de peso (mais descritivo do que o rótulo humano usado no
 * resto do relatório, `caracteristicaPt`). Pedido explícito: a
 * renomeação aplica-se SÓ à tabela de peso — o diagrama de identidade e
 * todos os outros gráficos continuam a usar `caracteristicaPt`.
 */
const CARACTERISTICA_TITULO_TABELA_PESO: Record<string, string> = {
  Sun: "PROPÓSITO E IDENTIDADE (SOL)",
  Moon: "INTUIÇÃO E RESPOSTA EMOCIONAL (LUA)",
  Mars: "INICIATIVA E ACÇÃO (MARTE)",
  Mercury: "COMUNICAÇÃO E DECISÃO (MERCÚRIO)",
  Jupiter: "EXPANSÃO E DIRECÇÃO DE CRESCIMENTO (JÚPITER)",
  Venus: "VALOR PRÓPRIO E PRAZER (VÉNUS)",
  Saturn: "RESISTÊNCIA, DISCIPLINA E EXIGÊNCIA (SATURNO)",
};

/** Mesmo título de `CARACTERISTICA_TITULO_TABELA_PESO`, partido em 2 linhas para caber no eixo Y do gráfico de barras SVG (correcção do especialista — os novos títulos, mais longos que os antigos, precisam do rótulo dividido para não sair cortado). */
const CARACTERISTICA_TITULO_TABELA_PESO_LINHAS: Record<string, [string, string]> = {
  Sun: ["PROPÓSITO E", "IDENTIDADE (SOL)"],
  Moon: ["INTUIÇÃO E RESPOSTA", "EMOCIONAL (LUA)"],
  Mars: ["INICIATIVA E ACÇÃO", "(MARTE)"],
  Mercury: ["COMUNICAÇÃO E", "DECISÃO (MERCÚRIO)"],
  Jupiter: ["EXPANSÃO E DIRECÇÃO", "DE CRESCIMENTO (JÚPITER)"],
  Venus: ["VALOR PRÓPRIO E", "PRAZER (VÉNUS)"],
  Saturn: ["RESISTÊNCIA, DISCIPLINA", "E EXIGÊNCIA (SATURNO)"],
};

interface DetalheCaracteristica {
  significa: string;
  bom: string;
  aVigiar: string;
}

/** Conteúdo fixo (Significa/Bom/A vigiar) dos 7 planetas da tabela de peso — texto do especialista, "ORDEM MESTRA" Parte D1. Nunca gerado por LLM. */
const DETALHE_CARACTERISTICA_PESO: Record<string, DetalheCaracteristica> = {
  Saturn: {
    significa: "capacidade de perseverança, rotina e trabalho sustentado ao longo do tempo.",
    bom: "mantém-se firme e produtiva em tarefas longas onde outros desistem — fiabilidade que constrói autoridade ao longo do tempo.",
    aVigiar: "pode virar rigidez, dificuldade em largar caminhos que já não servem mesmo sabendo racionalmente que devia mudar.",
  },
  Moon: {
    significa: "reacção emocional instintiva, antes de qualquer análise racional.",
    bom: "capta com clareza o que os outros sentem antes de o dizerem.",
    aVigiar: "reagir primeiro pela emoção pode levar a comprometer-se antes de pensar nas consequências.",
  },
  Jupiter: {
    significa: "onde o crescimento acontece com mais naturalidade.",
    bom: "investir energia aqui dá retorno com relativa facilidade.",
    aVigiar: "por não ser o ponto mais forte, é fácil adiar este investimento a favor de áreas de mais controlo.",
  },
  Sun: {
    significa: "a direcção mais profunda do perfil.",
    bom: "noção real de propósito, mesmo sem verbalizar.",
    aVigiar: "pode ficar atrás de urgências financeiras/operacionais durante anos.",
  },
  Mars: {
    significa: "facilidade natural para tomar iniciativa e executar.",
    bom: "quando decide agir, fá-lo com mais peso e intenção do que quem age por impulso.",
    aVigiar: "hesitação inicial pode custar oportunidades que exigem resposta rápida.",
  },
  Venus: {
    significa: "o que traz prazer, harmonia e sentido de valor próprio, incluindo dinheiro.",
    bom: "sensibilidade estética e relacional real, mesmo que pouco reclamada.",
    aVigiar: "leva a sub-cobrar ou aceitar menos do que vale.",
  },
  Mercury: {
    significa: "estilo natural de comunicar e decidir no dia a dia.",
    bom: "fundida com Vénus — quando trabalha esta área, comunicação e valor próprio evoluem juntos.",
    aVigiar: "é a área mais frágil do perfil — dificuldade em comunicar o próprio valor trava o reconhecimento que o resto do perfil já sustenta.",
  },
};

/**
 * Correcção do especialista (Parte D, "ORDEM MESTRA", nota de rigor) —
 * Vénus e Mercúrio nunca aparecem como um tipo de camada mecânico em
 * `catalogarDestinos()` (confirmado por leitura de código — só Planeta
 * de maior peso, Atmakaraka, Amatyakaraka e Regente do Modo de Ganho
 * dominante ligam directamente um planeta a uma candidata) — por isso a
 * sua linha "Candidatas" nunca pode apontar nomes concretos sem
 * inventar uma ligação que o motor não faz. Fica como leitura de perfil
 * geral, texto fixo do especialista.
 */
const CANDIDATAS_FIXO_PESO: Partial<Record<string, string>> = {
  Venus: "área a trabalhar conscientemente, independentemente da opção escolhida — não é o motor a \"evitar\" caminhos, é uma competência a desenvolver em paralelo, sobretudo se a via envolver negociar directamente o próprio valor.",
  Mercury: "é por isto que o primeiro passo do relatório manda trabalhar comunicação e auto-valorização antes de qualquer decisão de carreira.",
};

/** Frase "Candidatas:" partilhada pelos 4 gráficos — dinâmica, calculada a cada geração a partir das candidatas REALMENTE escritas neste relatório (nunca uma lista fixa, cada pessoa tem candidatas diferentes). Ver nota de rigor da "ORDEM MESTRA": só afirma ligação quando o motor de facto a faz. */
function fraseCandidatasDinamica(encontrados: CandidataForaDaLista[]): string {
  if (!encontrados.length) return "é uma leitura de perfil geral nesta carta — não aparece como filtro directo em nenhuma das opções apresentadas nesta lista.";
  return `este sinal sustenta directamente ${juntarNomesCandidatas(encontrados.map((c) => c.nome))} — é uma das camadas que as leva a aparecer nesta lista.`;
}

function explicacaoPesoDeterministica(pesos: PesoPlaneta[], usarTu: boolean, axes: VocationIQAxes, candidatasEscritas: CandidataForaDaLista[]): ExplicacaoGraficoDeterministica {
  const abertura = `Este gráfico mede a força real de cada planeta ${usarTu ? "do teu" : "do seu"} perfil — não é sorte nem intuição, é o resultado de dois factores combinados: o estado do planeta (exaltado, em signo próprio, debilitado, etc.) e a força da casa onde está fisicamente sentado, medida pelo Sarvashtakavarga (uma tabela clássica de pontos de apoio, casa a casa). Quanto mais alto o número, mais esse planeta consegue sustentar o que promete no dia a dia — mais baixo não significa "mau", significa que precisa de mais esforço deliberado para render.`;
  const porCategoria: Record<string, string> = {};
  for (const p of pesos) {
    const classificacao = p.peso >= 1.3 ? "força natural, fácil de usar" : p.peso >= 0.9 ? "suporte moderado" : "o esforço vai ser maior aqui — não impossível, só menos natural";
    const estadoPt = ESTADO_PT[p.estado] ?? p.estado;
    const detalhe = DETALHE_CARACTERISTICA_PESO[p.planeta];
    const candidatasFixo = CANDIDATAS_FIXO_PESO[p.planeta];
    const linhaCandidatas = candidatasFixo ?? fraseCandidatasDinamica(candidatasPorPlaneta(p.planeta, candidatasEscritas, axes));
    const partes = [
      detalhe ? `Significa: ${detalhe.significa}` : "",
      `${usarTu ? "No teu" : "No seu"} perfil, peso ${p.peso.toFixed(2)} — ${classificacao}. Está ${estadoPt}, na casa ${p.casa} (${p.signo}).`,
      detalhe ? `Bom: ${detalhe.bom}` : "",
      detalhe ? `A vigiar: ${detalhe.aVigiar}` : "",
      `Opções: ${linhaCandidatas}`,
    ].filter(Boolean);
    porCategoria[PLANETA_PT[p.planeta] ?? p.planeta] = partes.join(" ");
  }
  return { abertura, porCategoria };
}

const DEFINICAO_COMPETENCIA: Record<string, string> = {
  Comunicação: "A capacidade de comunicar, ensinar e converter conhecimento em valor através da palavra.",
  Liderança: "A capacidade de assumir posições de autoridade e visibilidade pública.",
  Criatividade: "A capacidade de criar, expressar-se e gerar algo original a partir de si.",
  Estrutura: "A capacidade de manter disciplina, rotina, e resolver problemas concretos do dia a dia.",
  Relação: "A capacidade de negociar, colaborar e construir parcerias duradouras.",
  Execução: "A capacidade de agir, iniciar, e dar corpo próprio às decisões.",
};

/** Mesmos cortes já usados na Roda da Vida/Anexo (≥7 forte, 4-7 equilíbrio, <4 pede construção) — nunca inventar um corte novo para este gráfico. */
function classificacaoDez(valor: number): string {
  if (valor >= 7) return "força natural";
  if (valor >= 4) return "equilíbrio — nem o mais forte nem o mais fraco do perfil";
  return "pede mais construção deliberada";
}

/** Mesma casa clássica fixa de `computeRadarCompetencias` — repetida aqui só para a ligação dinâmica às candidatas (`candidatasPorCasa`), nunca para recalcular o valor. */
const CASA_POR_COMPETENCIA: Record<string, number> = {
  Comunicação: 2,
  Liderança: 10,
  Criatividade: 5,
  Estrutura: 6,
  Relação: 7,
  Execução: 1,
};

/**
 * Bom/A vigiar de cada competência — texto do especialista, "ORDEM
 * MESTRA" Parte D2. Correcção de rigor (aplicada nesta implementação,
 * não pedida explicitamente mas decorre da mesma nota de rigor da Parte
 * D): o rascunho original comparava Criatividade à Estrutura ("como a
 * Estrutura é o ponto mais forte...") e Relação/Execução a Vénus/Marte
 * como se fossem sempre as mais frágeis do perfil — verdade só na carta
 * da Alice, não em geral (nem sempre é a Estrutura a competência mais
 * forte, nem Vénus/Marte os planetas mais fracos). Suavizado para texto
 * condicional ("quando"/"se"), nunca uma comparação fixa entre eixos que
 * pode ser falsa noutra carta.
 */
const DETALHE_COMPETENCIA: Record<string, DetalheCaracteristica> = {
  Comunicação: {
    significa: "",
    bom: "base sólida para se expressar quando precisa.",
    aVigiar: "comunicar com impacto exige preparação consciente.",
  },
  Liderança: {
    significa: "",
    bom: "assume autoridade com naturalidade.",
    aVigiar: "sem o apoio da comunicação, lidera mas nem sempre se explica bem.",
  },
  Criatividade: {
    significa: "",
    bom: "capacidade funcional, não limita outras áreas.",
    aVigiar: "quando outras competências (sobretudo Estrutura) pesam mais do que esta, é mais provável sentir realização a organizar e aplicar ideias já existentes do que a criar do zero.",
  },
  Estrutura: {
    significa: "",
    bom: "base mais sólida de todo o perfil, quando é a competência mais forte.",
    aVigiar: "pode dificultar sair de um caminho já estabelecido mesmo quando já não faz sentido.",
  },
  Relação: {
    significa: "",
    bom: "constrói confiança e parcerias duradouras.",
    aVigiar: "se o valor próprio (Vénus, na tabela de peso) for uma área frágil do perfil, há risco de dar mais do que recebe de volta.",
  },
  Execução: {
    significa: "",
    bom: "executa bem quando o caminho já está claro.",
    aVigiar: "se a iniciativa (Marte, na tabela de peso) for uma área a desenvolver, iniciar do zero tende a ser mais lento.",
  },
};

function explicacaoCompetenciasDeterministica(eixos: { nome: string; valor: number }[], usarTu: boolean, candidatasEscritas: CandidataForaDaLista[]): ExplicacaoGraficoDeterministica {
  const abertura = `Este radar mede seis competências, cada uma ligada a uma casa clássica fixa ${usarTu ? "do teu" : "do seu"} perfil (Comunicação → casa 2, Liderança → casa 10, Criatividade → casa 5, Estrutura → casa 6, Relação → casa 7, Execução → casa 1) — a mesma fórmula usada na Roda da Vida e no Anexo, para nunca haver números diferentes para o mesmo sinal. Não são avaliações de personalidade — são a força real que o perfil sustenta em cada área.`;
  const porCategoria: Record<string, string> = {};
  for (const e of eixos) {
    const detalhe = DETALHE_COMPETENCIA[e.nome];
    const casa = CASA_POR_COMPETENCIA[e.nome];
    const linhaCandidatas = fraseCandidatasDinamica(casa !== undefined ? candidatasPorCasa(casa, candidatasEscritas) : []);
    const partes = [
      `Significa: ${DEFINICAO_COMPETENCIA[e.nome] ?? ""}`,
      `${usarTu ? "No teu" : "No seu"} perfil, ${e.valor.toFixed(1)}/10 — ${classificacaoDez(e.valor)}.`,
      detalhe ? `Bom: ${detalhe.bom}` : "",
      detalhe ? `A vigiar: ${detalhe.aVigiar}` : "",
      `Opções: ${linhaCandidatas}`,
    ].filter(Boolean);
    porCategoria[e.nome] = partes.join(" ");
  }
  return { abertura, porCategoria };
}

/** Mesmas casas de `computeRodaDaVida` (rodaDaVida.ts) — repetidas aqui só para a ligação dinâmica às candidatas, nunca para recalcular o valor. Manter sincronizado se `computeRodaDaVida` mudar as casas de alguma dimensão. */
const CASAS_POR_DIMENSAO_VIDA: Record<string, number[]> = {
  "Carreira / Propósito": [10],
  "Finanças / Recursos": [2],
  "Desenvolvimento Pessoal": [1, 9],
  "Saúde / Energia": [6],
  "Relações / Rede": [7, 11],
  "Criatividade / Expressão": [5],
  "Ambiente / Estilo de vida": [4],
  "Contribuição / Impacto": [9, 11],
};

/**
 * Bom/A vigiar de cada dimensão da Roda da Vida — texto do especialista,
 * "ORDEM MESTRA" Parte D3. Mesma correcção de rigor da Parte D2: o
 * rascunho original descrevia cada dimensão como se estivesse sempre no
 * nível que tem na carta da Alice (ex.: Saúde/Energia sempre "a mais
 * forte da roda") — suavizado para linguagem condicional, válida
 * independentemente do nível real desta pessoa (já reportado à parte,
 * na frase de classificação que já existia).
 */
const DETALHE_DIMENSAO_VIDA: Record<string, DetalheCaracteristica> = {
  "Carreira / Propósito": {
    significa: "",
    bom: "quando forte, é uma vocação profissional muito bem sustentada.",
    aVigiar: "risco de excesso de identificação com o trabalho.",
  },
  "Finanças / Recursos": {
    significa: "",
    bom: "gere recursos de forma funcional — nem sempre é a maior fragilidade do perfil.",
    aVigiar: "se o valor próprio (Vénus, na tabela de peso) for uma área frágil do perfil, é uma área que beneficia de trabalho consciente — não é sobre evitar caminhos, é uma competência a desenvolver em paralelo com qualquer escolha que envolva negociar directamente o que cobra.",
  },
  "Desenvolvimento Pessoal": {
    significa: "",
    bom: "abertura real para crescer e expandir o mundo.",
    aVigiar: "quando não é a maior força do perfil, o crescimento tende a acontecer mais por necessidade do que por iniciativa espontânea.",
  },
  "Saúde / Energia": {
    significa: "",
    bom: "quando forte, é uma reserva de energia excepcional — combustível para qualquer mudança.",
    aVigiar: "energia alta sem direcção clara pode virar inquietação.",
  },
  "Relações / Rede": {
    significa: "",
    bom: "rede sólida de contactos.",
    aVigiar: "pode não bastar sozinha para abrir portas em áreas totalmente novas.",
  },
  "Criatividade / Expressão": {
    significa: "",
    bom: "capacidade funcional, não limita outras áreas.",
    aVigiar: "quando outras competências pesam mais do que esta, é mais provável sentir realização a aplicar do que a criar do zero.",
  },
  "Ambiente / Estilo de vida": {
    significa: "",
    bom: "relação equilibrada com a base material.",
    aVigiar: "nem facilita nem impede, por si só, mudanças bruscas de contexto.",
  },
  "Contribuição / Impacto": {
    significa: "",
    bom: "quando forte, o que faz deixa marca real.",
    aVigiar: "pode gerar frustração quando o trabalho actual não permite sentir esse impacto.",
  },
};

function explicacaoVidaDeterministica(dimensoes: DimensaoVida[], usarTu: boolean, candidatasEscritas: CandidataForaDaLista[]): ExplicacaoGraficoDeterministica {
  const abertura = `Esta roda usa a mesma fórmula da Roda da Vida clássica, aplicada às casas ${usarTu ? "do teu" : "do seu"} perfil: cada fatia mede quanto suporte real (planetas presentes + peso do regente da área) essa área da vida recebe. Não é um julgamento — é um mapa de onde a energia flui com naturalidade e onde pede mais construção deliberada.`;
  const porCategoria: Record<string, string> = {};
  for (const d of dimensoes) {
    const detalhe = DETALHE_DIMENSAO_VIDA[d.nome];
    const casas = CASAS_POR_DIMENSAO_VIDA[d.nome] ?? [];
    const linhaCandidatas = fraseCandidatasDinamica(candidatasPorCasas(casas, candidatasEscritas));
    // Nota: `d.descricao` já é renderizado à parte em `blocoRodaDaVida`
    // (parágrafo próprio, antes deste bloco) — não repetir aqui, ou o
    // mesmo texto aparece duas vezes seguidas na roda.
    const partes = [
      `${usarTu ? "No teu" : "No seu"} perfil, ${d.valor.toFixed(1)}/10 — ${classificacaoDez(d.valor)}.`,
      detalhe ? `Bom: ${detalhe.bom}` : "",
      detalhe ? `A vigiar: ${detalhe.aVigiar}` : "",
      `Opções: ${linhaCandidatas}`,
    ].filter(Boolean);
    porCategoria[d.nome] = partes.join(" ");
  }
  return { abertura, porCategoria };
}

const CASAS_DE_BASTIDORES_TEMPLATE = new Set([6, 8, 12]);
const ROTULO_GANHO_BASE: Record<number, string> = {
  2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
  6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
  10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
};

/**
 * Mesma lógica de "casa de bastidores" já aplicada ao Modo de Ganho no
 * prompt (promptAdulto.ts, blocoModoDeGanho) — replicada aqui de forma
 * determinística para a barra dominante nunca deixar a contradição
 * visual por resolver (o gráfico mostra sempre o rótulo fixo da casa
 * vencedora, ex. "Liderando publicamente", mesmo quando o regente está
 * sentado numa casa de serviço/bastidores).
 */
/**
 * Bom/A vigiar de cada Modo de Ganho — texto do especialista, "ORDEM
 * MESTRA" Parte D4. Correcção de rigor (mesma nota da Parte D): o
 * rascunho original comparava directamente a Casa 6 e a Casa 2 à Casa
 * 10 como se esta fosse sempre a dominante ("mais fraca que a Casa 10")
 * — só é verdade quando a Casa 10 é de facto o modo dominante desta
 * pessoa, o que não é garantido para toda a gente. Reescrito para
 * linguagem condicional a "é/não é o modo dominante", nunca a uma casa
 * específica.
 */
const DETALHE_MODO_GANHO: Record<number, DetalheCaracteristica> = {
  10: {
    significa: "",
    bom: "quando é o modo dominante, o reconhecimento chega como consequência de ser imprescindível, não como objectivo em si.",
    aVigiar: "forçar uma versão \"de palco\" quando o perfil não a sustenta vai sentir-se desconfortável e pouco autêntico.",
  },
  6: {
    significa: "",
    bom: "alinha-se com a capacidade estrutural do dia a dia — resolver problemas concretos.",
    aVigiar: "quando não é o modo dominante, funciona melhor como complemento do que como modo principal isolado.",
  },
  2: {
    significa: "",
    bom: "ainda é um sinal presente — ensinar/aconselhar directamente não está fechado, mesmo quando não é o modo dominante.",
    aVigiar: "apostar tudo nesta via sozinha, sem o suporte de outro modo, é mais arriscado quando esta casa não é a dominante.",
  },
};

function explicacaoGanhoDeterministica(earningModes: EarningMode[], dominantes: number[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>, usarTu: boolean, candidatasEscritas: CandidataForaDaLista[]): ExplicacaoGraficoDeterministica {
  const abertura = `Este gráfico mostra qual das três formas clássicas de gerar valor (Artha Trikona: casas 2, 6 e 10) ${usarTu ? "o teu" : "o seu"} perfil mais sustenta — a barra laranja mais escura é a dominante, calculada a partir da dignidade do regente de cada casa, de quem está fisicamente lá dentro, e do peso real de cada um.`;
  const porCategoria: Record<string, string> = {};
  for (const e of earningModes) {
    const isDominante = dominantes.includes(e.house);
    const rotulo = ROTULO_GANHO_BASE[e.house] ?? "";
    const regente = regentesCasas[e.house];
    const casaDoRegente = pesos.find((p) => p.planeta === regente)?.casa;
    const emBastidores = casaDoRegente !== undefined && CASAS_DE_BASTIDORES_TEMPLATE.has(casaDoRegente);
    const rotuloVisual = (CASA_LABEL_LINHAS[e.house] ?? ["", ""]).join(" ").trim();
    let texto = `Pontuação ${e.score} — esta forma significa ${rotulo}.`;
    if (isDominante) {
      texto = `Este é ${usarTu ? "o teu" : "o seu"} modo dominante (pontuação ${e.score}, a mais alta das três) — o gráfico destaca esta barra a laranja mais escuro.`;
      texto += emBastidores
        ? ` O rótulo do gráfico diz "${rotuloVisual}" — mas ${usarTu ? "no teu" : "no seu"} caso isto não significa procurar exposição directa: o regente desta casa está sentado numa casa de bastidores, o que significa que o reconhecimento chega por se tornar imprescindível através do que sustenta por trás, não por procurar palco.`
        : ` O rótulo do gráfico ("${rotuloVisual}") reflecte bem esta posição — o regente está numa posição de exposição directa, coerente com o que a barra promete.`;
    }
    const detalhe = DETALHE_MODO_GANHO[e.house];
    const linhaCandidatas = fraseCandidatasDinamica(candidatasPorCasa(e.house, candidatasEscritas));
    const partes = [texto, detalhe ? `Bom: ${detalhe.bom}` : "", detalhe ? `A vigiar: ${detalhe.aVigiar}` : "", `Opções: ${linhaCandidatas}`].filter(Boolean);
    porCategoria[`Casa ${e.house}`] = partes.join(" ");
  }
  return { abertura, porCategoria };
}

function linhaExplicacaoDeterministica(explicacao: ExplicacaoGraficoDeterministica, categoria: string): string | null {
  return explicacao.porCategoria[categoria] ?? null;
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
  // Correcção do especialista — `removerBlocosExplicacaoGrafico` fica só
  // como limpeza defensiva de texto ANTIGO (rascunhos guardados antes
  // desta correcção, que ainda possam ter os marcadores
  // EXPLICAÇÃO_GRÁFICO:/LINHA_GRÁFICO:) — já não é preciso ler o
  // conteúdo deles, a explicação dos 4 gráficos é sempre gerada por
  // código (ver as 4 funções deterministicas acima).
  const textoLimpo = removerBlocosExplicacaoGrafico(texto);

  const seccoes = dividirEmSeccoes(textoLimpo);
  const dataGeracao = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const { opcoes, textoSemOpcao } = parseLeituraPorOpcao(seccoes[SECCAO_TITULOS.leituraPorOpcao] ?? "");
  const identidade = parseIdentidade(textoLimpo);
  const fraseAbertura = parseFraseAbertura(textoLimpo);
  // TAREFA 1 (correcção do especialista) — deriva o registo tu/você
  // directamente de `dados.ehAdolescente` (já correcto em todos os
  // chamadores) em vez de um 2º parâmetro booleano que podia divergir
  // dele — nunca dois flags a dizerem coisas diferentes sobre o mesmo
  // relatório.
  const usarTu = dados.ehAdolescente === true;

  // Correcção do especialista (Parte D, "ORDEM MESTRA") — candidatas
  // REALMENTE escritas neste relatório (não a pool completa), para as 4
  // explicações de gráfico poderem ligar-se dinamicamente a nomes reais
  // desta pessoa, nunca a uma lista fixa. Calculado uma só vez aqui,
  // antes das 4 chamadas deterministicas.
  const candidatasEscritas = candidatasEfectivamenteEscritas(seccoes[SECCAO_TITULOS.candidataForaDaLista] ?? "", catalogoResultados);

  // Explicações dos 4 gráficos — sempre geradas por código (ver as 4
  // funções deterministicas acima), nunca dependentes do LLM.
  const explicacaoPeso = explicacaoPesoDeterministica(pesos, usarTu, axes, candidatasEscritas);
  const eixosCompetencias = computeRadarCompetencias(pesos, savPorCasa, axes.regentesCasas);
  const explicacaoCompetencias = explicacaoCompetenciasDeterministica(eixosCompetencias, usarTu, candidatasEscritas);
  const dimensoesVida = computeRodaDaVida(savPorCasa, pesos, axes.regentesCasas, usarTu);
  const explicacaoVida = explicacaoVidaDeterministica(dimensoesVida, usarTu, candidatasEscritas);
  const explicacaoGanho = explicacaoGanhoDeterministica(earningModes, axes.earningModeDominante.map((e) => e.house), pesos, axes.regentesCasas, usarTu, candidatasEscritas);

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
  /* Correcção do especialista ("alinhamento à direita", diagnóstico confirmado ao vivo — sem overflow-wrap/word-break em lado nenhum, uma palavra/termo composto longo sem espaços transbordava 253px para a direita do seu contentor, sem quebrar, visível porque overflow é "visible" em toda a cadeia de contentores. Propriedades herdadas — aplicadas uma vez aqui, protegem todo o texto do relatório. */
  body { font-family: "Inter", Arial, Helvetica, sans-serif; color: #1A1A1A; background: #FFFFFF; margin: 0; padding: 0; overflow-wrap: break-word; word-break: break-word; }
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
  .lista-caracteristicas { margin: 14px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #4A4A4A; text-align: left; }
  .lista-caracteristicas strong { color: var(--azul); }
  /* Correcção do especialista ("explicação completa de todos os gráficos, linha a linha", pós-PDF real) — parágrafo de abertura escrito pelo LLM (o que o gráfico mede, de onde vêm os números), e a camada personalizada por linha/categoria, sempre a seguir à explicação geral já existente, nunca a substituir. */
  .grafico-explicacao-llm { font-size: 14px; margin: 10px 0 16px; max-width: 620px; }
  .grafico-explicacao-llm p { margin: 0 0 10px; }
  .grafico-explicacao-llm p:last-child { margin-bottom: 0; }
  .linha-explicacao-llm { display: block; font-style: normal; color: #4A4A4A; margin-top: 2px; }

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
  /* Correcção do especialista ("caixa vazia", pós-PDF real) — a causa não era o layout assumir um nº fixo de caixas (blocoSeccaoQuemE já é 100% dinâmico, um card por dom/limitação realmente escrita, nunca mais) — era a falta de page-break-inside:avoid nestes cards, dentro de uma grelha CSS que se parte mal entre páginas no PDF: o título de um card ficava numa página e o corpo escapava para a seguinte, deixando "um título sem texto" seguido de "uma caixa em branco" (o resto do card órfão). Mesma causa-raiz já corrigida 2x nesta sessão (candidatas, grupos). */
  .card-dom, .card-limitacao { border-radius: 8px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; page-break-inside: avoid; break-inside: avoid; }
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

  /* Correcção do especialista — secção "Para que tem facilidade natural": 6 cartões fixos, cor por nível (verde/âmbar/vermelho suave), calculados 100% deterministicamente (nunca pelo LLM) — mesmo padrão de .card-dom/.card-limitacao acima. */
  .grelha-facilidades { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .card-facilidade { border-radius: 8px; padding: 14px 16px; page-break-inside: avoid; break-inside: avoid; }
  .card-facilidade-icone { display: block; margin: 0 0 8px; }
  .card-facilidade-titulo { font-size: 13px; font-weight: 700; margin: 0 0 6px; }
  .badge-nivel-facilidade { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #FFFFFF; border-radius: 999px; padding: 2px 9px; margin-bottom: 8px; }
  .card-facilidade-frase { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ink, #1A1A1A); }

  /* Correcção do especialista ("ORDEM — nomenclatura/cor") — substitui o diagrama radial "Onde o perfil tem atrito" pelo mesmo estilo de cartão já confirmado elegante em .card-dom/.card-limitacao, com a cor de aviso (vermelho) em vez de âmbar — mantém a leitura "isto pede atenção" que o vermelho já tinha no diagrama antigo. */
  .card-atrito { background: #fbeee9; border-left: 3px solid ${VERMELHO}; border-radius: 8px; padding: 14px 16px; page-break-inside: avoid; break-inside: avoid; }
  .card-atrito-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${VERMELHO}; margin: 0 0 8px; }
  .card-atrito ul { margin: 0; padding-left: 18px; }
  .card-atrito li { font-size: 14px; line-height: 1.6; margin-bottom: 6px; }
  .card-atrito li:last-child { margin-bottom: 0; }

  .card-candidata-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ambar); margin: 0 0 6px; }
  .caixa-neutra { background: var(--cinza-claro); border-radius: 10px; padding: 20px; }

  /* Correcção do especialista ("ORDEM — nomenclatura/cor", 6d) — a caixa âmbar por opção (antigo .card-candidata) some: 24 caixas repetidas no PDF real não eram elegantes. Cada opção passa a ser só nome como subtítulo + parágrafo, com uma divisória fina acima (a primeira opção fica separada do texto de síntese que a antecede pela mesma divisória — leitura consistente). */
  .opcao-item { border-top: 1px solid #E6E6E6; padding-top: 14px; margin-top: 14px; page-break-inside: avoid; break-inside: avoid; }
  .opcao-nome { font-size: 18px; font-weight: 700; color: var(--azul); margin: 0 0 8px; }

  /* Correcção do especialista ("remover o tecto fixo de 3, com agrupamento por cluster") — caixa da convergência de base partilhada, uma vez por grupo. page-break-inside: avoid — bug visto no preview impresso (PDF): "Formação de Professores", o último item do cluster de 13, perdia a moldura ao atravessar uma quebra de página porque a caixa do grupo não tinha esta regra. */
  .caixa-grupo-candidatas { background: var(--cinza-claro); border-left: 4px solid var(--ambar); border-radius: 10px; padding: 18px 20px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
  .caixa-grupo-candidatas p { font-size: 14px; margin: 0 0 10px; }
  .caixa-grupo-candidatas p:last-child { margin-bottom: 0; }

  .timeline-wrap { overflow-x: auto; margin-bottom: 8px; }
  .destaque-passo { margin-top: 24px; }
  .destaque-passo p:last-child { font-size: 16px; font-weight: 600; color: var(--azul); }

  .anexo-espaco { margin-top: 32px; }
  /* Correcção do especialista ("tabela resumo final das candidatas") — complemento aos cartões, fim da secção, antes de "O plano". */
  .tabela-resumo-candidatas-wrap { margin-top: 28px; }
  .tabela-anexo { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  .tabela-anexo th { text-align: left; font-weight: 700; color: var(--azul); padding: 8px 10px; border-bottom: 2px solid var(--ambar); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tabela-anexo td { padding: 8px 10px; border-bottom: 1px solid #E6E6E6; vertical-align: top; }
  .tabela-anexo .col-numero { text-align: right; font-weight: 600; }
  .anexo-nota { font-size: 12px; color: #666; margin: 8px 0 0; font-style: italic; }
  .anexo-intro { font-size: 13px; color: #4A4A4A; margin: 0 0 12px; }
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
  .radar-wrap { margin-top: 20px; text-align: center; }

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

    ${blocoFacilidadesNaturais(pesos)}

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.oQueACartaSustenta)}</h2>
      ${markdownParaHtml(seccoes[SECCAO_TITULOS.oQueACartaSustenta] ?? "")}

      <div class="subseccao">
        <p class="bloco-titulo">${usarTu ? "O peso de cada característica do teu perfil" : "O peso de cada característica do seu perfil"}</p>
        <div class="caixa-neutra grafico-explicacao-llm">${markdownParaHtml(explicacaoPeso.abertura)}</div>
        <div class="grafico-wrap">${svgGraficoForcas(pesos, usarTu)}</div>
        <p class="grafico-legenda">Verde = o perfil apoia com força · Âmbar = suporte moderado · Vermelho = suporte fraco</p>
        <ul class="lista-caracteristicas">
          ${[...pesos]
            .sort((a, b) => b.peso - a.peso)
            .map((p) => {
              const personalizado = linhaExplicacaoDeterministica(explicacaoPeso, PLANETA_PT[p.planeta] ?? p.planeta);
              const titulo = CARACTERISTICA_TITULO_TABELA_PESO[p.planeta] ?? caracteristicaPt(p.planeta, usarTu);
              return `<li><strong>${escapeHtml(titulo)}</strong>${personalizado ? ` — <span class="linha-explicacao-llm">${escapeHtml(personalizado)}</span>` : ""}</li>`;
            })
            .join("")}
        </ul>
      </div>

      <div class="subseccao">${blocoRadarCompetencias(pesos, savPorCasa, axes.regentesCasas, usarTu, explicacaoCompetencias)}</div>

      ${blocoRodaDaVida(savPorCasa, pesos, axes.regentesCasas, usarTu, explicacaoVida)}

      <div class="subseccao">${blocoDiagramaAtrito(pesos, identidade)}</div>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${usarTu ? "Como ganhas melhor" : "Como ganha melhor"}</h2>
      <div class="caixa-neutra grafico-explicacao-llm">${markdownParaHtml(explicacaoGanho.abertura)}</div>
      <div class="grafico-wrap grafico-3barras">${svgModoDeGanho(earningModes, axes.earningModeDominante.map((e) => e.house))}</div>
      <p class="grafico-legenda" style="text-align:center">${usarTu ? "A barra em laranja mais escuro é o modo dominante — a forma que o teu perfil mais sustenta para gerar valor." : "A barra em laranja mais escuro é o modo dominante — a forma que o seu perfil mais sustenta para gerar valor."}</p>
      <ul class="lista-caracteristicas">
        ${earningModes
          .map((e) => {
            const personalizado = linhaExplicacaoDeterministica(explicacaoGanho, `Casa ${e.house}`);
            return personalizado ? `<li><strong>${usarTu ? "Casa" : "Casa"} ${e.house}</strong> — <span class="linha-explicacao-llm">${escapeHtml(personalizado)}</span></li>` : "";
          })
          .join("")}
      </ul>
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${escapeHtml(SECCAO_TITULOS.leituraPorOpcao)}</h2>
      ${opcoes.length ? opcoes.map((op) => cardOpcao(op, dados, pesos, axes)).join("") : `<div class="caixa-neutra">${markdownParaHtml(textoSemOpcao)}</div>`}
    </section>

    <section class="seccao">
      <h2 class="titulo-seccao">${usarTu ? "Opções que ainda não consideraste" : "Opções que ainda não considerou"}</h2>
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
