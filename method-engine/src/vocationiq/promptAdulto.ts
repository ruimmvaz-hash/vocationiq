// VOCATIONIQ-ADULTO-metodologia.md — construção do prompt para o ramo
// "trabalho-quero-mudar". Segue o documento secção a secção; qualquer
// desvio do texto literal do documento está assinalado num comentário
// "DESVIO" a explicar porquê.

import type { VocationIQAxes, EarningModeHouse } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ClassicalGraha } from "../lifeReport/types";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import { nivelDeConfianca } from "./catalogoVocacional";
import { computeRodaDaVida } from "./rodaDaVida";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";
import type { D1TableResult } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";
import { calcularFacilidadesNaturais } from "./facilidadesNaturais";

/**
 * Dados já resolvidos para texto humano pelo chamador (o site) — os
 * slugs internos do formulário (ex.: "trabalho-conta-propria",
 * "consultoria") e as respectivas etiquetas em `lib/validation.ts`
 * pertencem à camada web, não ao motor astrológico.
 */
export interface VocationiqIntakeAdulto {
  nome: string;
  situacaoDeclarada: string;
  areaActual: string;
  anosExperiencia: string;
  oQueNaoFunciona?: string;
  paraOndeQuerIr?: string;
  perguntaEspecifica?: string;
  ideiaConcreta?: string;
  tipoMudanca: string[];
  /** Áreas de destino já traduzidas para etiqueta — exclui "outra" e "ainda-nao-sei", tratadas à parte abaixo. */
  areasDestino: string[];
  areasDestinoIncluiOutra: boolean;
  areasDestinoOutra?: string;
  areasDestinoIncluiAindaNaoSei: boolean;
}

/**
 * DESVIO — a assinatura do documento (`construirPromptAdulto(intake,
 * axes, pesosPlanetas): string`) não tem um parâmetro para as datas
 * reais que a Secção 5 exige ("Vimshottari + trânsitos"). Sem datas
 * calculadas aqui, a Secção 5 só poderia ser inventada pelo LLM — o que
 * a Secção 4 do documento ("nunca afirmar sem citar o facto técnico que
 * sustenta") proíbe directamente. Acrescentado um 4º parâmetro
 * `datas: DadosDatas`, construído a partir de `currentDasha` +
 * `computeTransits` (já existentes no motor) pelo chamador.
 *
 * DESVIO 2 — 5º parâmetro `horaNascimentoFornecida: boolean`,
 * acrescentado para a nota de cautela do Ascendente (correcção pedida
 * numa ronda seguinte): sem hora de nascimento real, a Arudha Lagna e as
 * casas usam meio-dia como convenção e podem estar erradas — o LLM tem
 * de saber disto para não afirmar com a mesma confiança elementos que
 * dependem da hora e elementos que não dependem.
 */
export interface DadosDatas {
  mahadashaAtual: { senhor: string; inicio: Date; fim: Date };
  antardashaAtual: { senhor: string; inicio: Date; fim: Date };
  /** As antardashas seguintes à actual, dentro da mesma mahadasha — para a "janela" da Secção 5 além do "agora". */
  proximasAntardashas: { senhor: string; inicio: Date; fim: Date }[];
  transitoJupiter: { signo: string; aspectosAoNatal: string[] };
  transitoSaturno: { signo: string; aspectosAoNatal: string[] };
}

/**
 * Títulos exactos das 5 secções — usados no prompt (o LLM tem de os
 * reproduzir literalmente como cabeçalho `## `) e exportados para quem
 * for fazer parsing do texto devolvido (ex.: o template HTML), para as
 * duas pontas nunca poderem divergir.
 */
export const SECCAO_TITULOS = {
  abertura: "Abertura",
  /** Correcção do especialista (nova secção) — retrato de personalidade, entre "Abertura" e "O que o perfil sustenta". Ver TAREFA 3 no prompt abaixo. */
  quemE: "Quem é",
  // TAREFA 3D (correcção do especialista) — "carta" está agora proibido em
  // todo o texto do relatório (ver PROIBIDO USAR A PALAVRA "CARTA" no
  // prompt abaixo); este título é escrito literalmente pelo LLM como
  // cabeçalho "## ", por isso tinha de mudar aqui também, não só na prosa.
  oQueACartaSustenta: "O que o perfil sustenta",
  leituraPorOpcao: "Leitura por opção",
  candidataForaDaLista: "Candidata fora da lista",
  oPlano: "O plano",
} as const;

/**
 * Marcadores máquina-legíveis exigidos ao LLM dentro do texto (rótulos
 * ASCII fixos, nunca traduzidos) — necessários para o template HTML
 * (Passo 4, ronda seguinte) conseguir desenhar cards por opção com
 * indicador de força, decidir se há candidata fora da lista sem
 * heurísticas frágeis, e destacar o primeiro passo do plano. O conteúdo
 * a seguir a cada marcador continua a ser escrito pelo LLM — só a
 * etiqueta em si é fixa, para as duas pontas (prompt e parser) nunca
 * divergirem.
 */
export const MARCADORES = {
  forca: "FORÇA:",
  candidata: "CANDIDATA:",
  primeiroPasso: "PRIMEIRO PASSO:",
  identidade: "IDENTIDADE:",
  /** Melhorias visuais ao template — a frase de abertura em destaque logo após a capa. */
  fraseAbertura: "FRASE_ABERTURA:",
  /** Melhorias visuais ao template — a frase de síntese no topo de cada card de opção. */
  insight: "INSIGHT:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): um dom (2-3 obrigatórios), uma linha por dom. */
  dom: "DOM:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): uma limitação (1-2 obrigatórias), uma linha por limitação. */
  limitacao: "LIMITAÇÃO:",
  /** Correcção do especialista — secção "Quem é" (TAREFA 3): a frase de síntese final da secção. */
  sinteseQuemE: "SÍNTESE:",
  /** TAREFA #40 (mudança de arquitectura — selecção pelo LLM) — bloco único, antes das 3 (ou menos) secções CANDIDATA, explicando qual dom já nomeado em "Quem é" liga a cada candidata escolhida e por que as restantes da pool completa não foram escolhidas. Nunca aparece no relatório final entregue ao cliente — extraído e removido do HTML tal como os outros marcadores internos (ver `relatorioTemplate.ts`). */
  seleccaoCandidatas: "SELECÇÃO_CANDIDATAS:",
  /**
   * Correcção do especialista ("remover o tecto fixo de 3, com
   * agrupamento por cluster") — abre um grupo de candidatas com
   * convergência de base quase idêntica (ver `gruposCandidatas` em
   * ResultadoCatalogoVocacional). Formato exigido na mesma linha do
   * marcador: os nomes exactos dos membros do grupo, separados por ";"
   * (nunca por vírgula — nomes de destinos podem conter vírgula). O texto
   * a seguir ao marcador, até ao primeiro "CANDIDATA:" seguinte, é a
   * convergência de base PARTILHADA por todo o grupo — escrita uma só
   * vez. Cada "CANDIDATA:" que se segue (uma por membro do grupo, pela
   * mesma ordem dos nomes) traz só a diferenciação específica dessa
   * candidata, nunca repetindo a convergência de base já escrita aqui.
   */
  grupo: "GRUPO:",
  /**
   * Correcção do especialista (ronda "relatório Marta", ponto 4a —
   * segmentação visual da lista de opções) — nome curto e descritivo do
   * grupo (2-5 palavras), na linha logo a seguir ao marcador "GRUPO:",
   * gerado a partir da MESMA convergência de base que o LLM já vai
   * escrever a seguir — nunca uma taxonomia nova, nunca inventado à
   * parte: é só dar um nome memorável ao que já foi calculado e vai ser
   * explicado por extenso. Ex.: "Estética e Rigor Técnico",
   * "Comunicação Visual e Criativa" — nunca genérico ("Grupo A") nem um
   * jargão técnico do motor (nunca "convergência de 4 camadas").
   */
  nomeGrupo: "NOME_GRUPO:",
  /**
   * LEGADO (correcção do especialista — "EXPLICAÇÃO_GRÁFICO, mudança de
   * abordagem") — já não é pedido ao LLM (ver a nota junto de
   * INSTRUCAO_VARGOTTAMA sobre porquê). Mantido só para
   * `relatorioTemplate.ts` conseguir limpar defensivamente este
   * marcador de rascunhos guardados ANTES desta correcção, que ainda o
   * possam conter — nunca aparece num rascunho novo.
   */
  explicacaoGrafico: "EXPLICAÇÃO_GRÁFICO:",
  /** LEGADO — ver `explicacaoGrafico`. */
  linhaGrafico: "LINHA_GRÁFICO:",
  /**
   * Correcção do especialista ("tabela resumo final das candidatas") —
   * uma linha por candidata (dentro do próprio bloco "candidata", nunca
   * um bloco à parte — o mesmo princípio que faz CANDIDATA:/GRUPO:
   * serem fiáveis: embutido num contexto já confirmado a funcionar,
   * nunca um marcador novo isolado) com o principal custo/trade-off de
   * escolher esta via, em 3-8 palavras. Alimenta a coluna "Custo
   * principal" da tabela resumo (ver `blocoTabelaResumoCandidatas`,
   * relatorioTemplate.ts) — extraída e removida do corpo visível da
   * candidata (nunca aparece duas vezes). Se faltar, a tabela mostra
   * "—" nessa célula — nunca rebenta, nunca inventa.
   */
  custoPrincipal: "CUSTO_PRINCIPAL:",
  /** Ver `custoPrincipal` — mesmo mecanismo, para a coluna "Via de entrada" da tabela resumo: resume, em 3-8 palavras, a "-- Via concreta para <nome> --" já dada nos dados técnicos (nunca inventa uma via nova). */
  viaResumida: "VIA_RESUMIDA:",
} as const;

export const FORCA_VALORES = ["forte", "moderada", "fraca"] as const;
export type ForcaValor = (typeof FORCA_VALORES)[number];

const GLOSA_TECNICA: Record<string, string> = {
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

export type Elemento = "Fogo" | "Terra" | "Água" | "Éter";

/** Elemento de cada planeta — mapeamento exacto pedido nesta ronda (nunca "Ar": não foi dado nenhum planeta para essa categoria). */
export const ELEMENTO_PLANETA: Record<string, Elemento> = {
  Sun: "Fogo",
  Mars: "Fogo",
  Jupiter: "Fogo",
  Mercury: "Terra",
  Venus: "Terra",
  Saturn: "Terra",
  Moon: "Água",
  Rahu: "Éter",
  Ketu: "Éter",
};

export interface ClassificacaoMahadashaEntry {
  tema: string;
  abertura: string;
}

/** Classificação do tom de cada Mahadasha — tabela exacta pedida nesta ronda (Parte 1D/4E). `abertura` é a frase-guia que a Secção "O plano" tem de usar para abrir, antes de qualquer data ou passo. */
export const MAHADASHA_CLASSIFICACAO: Record<string, ClassificacaoMahadashaEntry> = {
  Ketu: { tema: "dissolução/fecho", abertura: "prepare e feche, não colha" },
  Venus: { tema: "expansão/prazer/colheita", abertura: "avance, o ciclo favorece" },
  Sun: { tema: "afirmação/autoridade", abertura: "afirme e visibilize" },
  Moon: { tema: "emoção/fluxo/intuição", abertura: "siga o que sente, não o plano" },
  Mars: { tema: "acção/lançamento/conflito", abertura: "avance com força e decisão" },
  Rahu: { tema: "ambição/disrupção/ilusão", abertura: "risco real, oportunidade real" },
  Jupiter: { tema: "crescimento/sabedoria/expansão", abertura: "expanda com intenção" },
  Saturn: { tema: "estrutura/colheita lenta/responsabilidade", abertura: "construa devagar, vai durar" },
  Mercury: { tema: "comunicação/adaptação/aprendizagem", abertura: "aprenda e comunique" },
};

export const ESTADO_PT: Record<string, string> = {
  Exalted: "exaltado",
  Own: "próprio",
  Moolatrikona: "próprio (Moolatrikona)",
  Friend: "amigo",
  Neutral: "neutro",
  Enemy: "inimigo",
  Debilitated: "debilitado",
  NeechaBhanga: "debilitado com cancelação (Neecha Bhanga Raja Yoga) — lido como força",
  NeechaBhanga_Conjuncao: "debilitado com cancelação por conjunção de benéfico em Kendra — lido como força moderada",
};

/**
 * Termos proibidos no texto do relatório (correcção pedida — lista
 * expandida a partir dos 7 termos originais, alinhada com
 * FORBIDDEN_TERMS do motor da Naveya, mas escrita como enumeração em
 * português corrente para o LLM ler como instrução, não como regex).
 */
export const TERMOS_PROIBIDOS = [
  "Atmakaraka",
  "Karakamsha",
  "Amatyakaraka",
  "Sarvashtakavarga",
  "SAV",
  "bindu",
  "Mahadasha",
  "Antardasha",
  "Dasha",
  "Vimshottari",
  "Arudha Lagna",
  "D9",
  "D10",
  "Navamsha",
  "Dasamsha",
  "orbe",
  "grau",
  "minuto de arco",
  "Drishti",
  "aspecto",
  "Nakshatra",
  "Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati (os 27 nomes de Nakshatra)",
  "Rahu, Ketu, Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani (nomes de planetas em sânscrito)",
  "Aries/Áries, Taurus/Touro, Gemini/Gémeos, Cancer/Caranguejo, Leo/Leão, Virgo/Virgem, Libra/Balança, Scorpio/Escorpião, Sagittarius/Sagitário, Capricorn/Capricórnio, Aquarius/Aquário, Pisces/Peixes (nomes de signo, em inglês ou português)",
  "\"casa\" seguido de um número (ex.: \"casa 10\")",
  "signo",
  "dignidade",
  "regente",
  "trânsito (usa \"período actual\" ou \"este momento\")",
  "exaltado / exaltação",
  "debilitado / debilitação",
  "combusto / combustão",
  "em domicílio / signo próprio",
  "em queda / em exílio",
  "retrógrado / retrograde",
];

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-PT", { year: "numeric", month: "long" });
}

export function planetaPt(g: ClassicalGraha | string): string {
  return GLOSA_TECNICA[g] ?? g;
}

/**
 * TAREFA 7 (correcção do especialista) — normaliza o texto livre escrito
 * pela própria pessoa (nunca o texto do LLM) antes de entrar no prompt ou
 * no template: sentence case simples (1ª letra maiúscula, resto
 * minúsculas). Nunca corrige ortografia — preserva as palavras exactas da
 * pessoa, erros incluídos — só deixa de amplificar visualmente um erro de
 * maiúsculas com mais maiúsculas. Aplicado nos dois pontos onde texto
 * livre entra (aqui e em `relatorioTemplate.ts`), a mesma função, nunca
 * duas versões. DESVIO conhecido e aceite: uma sigla que a pessoa tenha
 * escrito em maiúsculas a meio da frase (ex.: "SAP") também é descida
 * para minúsculas — a instrução pedida é literal ("resto minúsculas"),
 * sem excepção para siglas.
 */
export function normalizarTextoLivre(texto: string): string {
  const t = texto.trim();
  if (!t) return t;
  const minusculo = t.toLowerCase();
  return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
}

/** Metodologia §1.1/§1.2 — deriva a lista de candidatas a partir de areasDestino/areasDestinoOutra. Vazio quando não há nada declarado (o LLM aplica o §1.3 nesse caso, ver texto do prompt). */
function candidatasDeclaradas(intake: VocationiqIntakeAdulto): string[] {
  const candidatas = [...intake.areasDestino];
  if (intake.areasDestinoIncluiOutra && intake.areasDestinoOutra?.trim()) candidatas.push(intake.areasDestinoOutra.trim());
  return candidatas;
}

function blocoAbertura(intake: VocationiqIntakeAdulto): string {
  const linhas = [
    `Nome: ${intake.nome}`,
    `Situação declarada: ${intake.situacaoDeclarada}`,
    `Área actual: ${intake.areaActual}`,
    `Anos de experiência na área actual: ${intake.anosExperiencia}`,
    intake.oQueNaoFunciona ? `O que não está a funcionar (nas palavras da pessoa): "${normalizarTextoLivre(intake.oQueNaoFunciona)}"` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

export function blocoEixoMissao(axes: VocationIQAxes): string {
  const m = axes.missionAxis;
  return [
    `Atmakaraka (o planeta que representa a vontade/missão mais forte da pessoa neste perfil): ${planetaPt(m.atmakaraka)}, na casa ${m.akHouse}, em ${m.akSign}, estado ${ESTADO_PT[m.akDignity ?? "Neutral"] ?? m.akDignity}.`,
    `Karakamsha (onde essa missão aterra em termos de expressão prática, lido no D9): signo ${m.karakamshaSign}, casa ${m.karakamshaHouse} a partir do Ascendente.`,
    `Amatyakaraka (o planeta que comanda a ferramenta de trabalho do dia a dia): ${planetaPt(axes.amatyakaraka)}.`,
  ].join("\n");
}

// Correcção do especialista ("Modo de Ganho — casa de bastidores") — a
// pontuação que decide qual casa (2/6/10) vence já incorpora onde o
// regente dessa casa está fisicamente sentado (via `peso`, que depende do
// SAV da casa que o regente ocupa — ver computeEarningModes,
// vocationIQ.ts). Mas o RÓTULO narrativo que descreve a casa vencedora ao
// LLM era um texto fixo por número de casa, sempre o mesmo independente
// de onde o regente estivesse — confirmado no diagnóstico da Alice:
// regente do Modo de Ganho (casa 10) sentado na casa 6 (bastidores,
// exaltado) recebia a mesma frase "assumir a cara pública, ser vista a
// fazer, não a assistir por trás" que receberia se estivesse na própria
// casa 10 ou na 1 — o oposto do que a posição real sustenta. Corrigido:
// quando o regente da casa vencedora está sentado numa casa de bastidores
// clássica (6/8/12 — dificuldade, serviço, oculto), o rótulo ganha uma
// cláusula de nuance própria para essa casa, em vez do genérico de
// exposição/visibilidade directa.
const CASAS_DE_BASTIDORES = new Set([6, 8, 12]);

// DESVIO (correcção do especialista, ronda seguinte — pós-PDF real) — a
// primeira versão desta cláusula tinha 3 frases em cadeia de "não
// significa X, significa Y", cada uma a hedgear a anterior. Suspeita
// directa do especialista, a confirmar com geração real: o LLM pode ter
// absorvido esse tom hesitante para a SÍNTESE do Modo de Ganho em "O
// que o perfil sustenta", enfraquecendo uma frase que antes era directa.
// Reescrita mais curta e AFIRMATIVA — nuance real, sem hedging em
// cadeia — e reforçada com uma instrução explícita (ver `NOTA_TOM_NUANCE`
// abaixo) para nunca confundir "mais precisa" com "mais hesitante".
const NUANCE_REGENTE_EM_BASTIDORES: Record<EarningModeHouse, string> = {
  2: " — e o regente está numa casa de bastidores (6, 8 ou 12): a voz ganha peso ao dizer verdades difíceis, não pelo charme social",
  6: " — e o regente está também numa casa de bastidores (6, 8 ou 12): reforça o padrão — reconhecimento por resolver o que ninguém mais quer tocar",
  10: " — mas o regente está numa casa de bastidores (6, 8 ou 12): a autoridade não vem de exposição directa, vem de se tornar imprescindível através do que sustenta por trás",
};

const NOTA_TOM_NUANCE = `A nuance de "casa de bastidores" acima (quando presente) é informação para tornar a frase mais PRECISA, nunca mais hesitante — escreve-a com a mesma confiança directa que escreverias sem ela. Errado: "talvez o reconhecimento venha mais de resolver do que de aparecer". Certo: "o reconhecimento vem de se tornar imprescindível, não de procurar palco" — afirmativo, específico, sem qualificadores fracos ("talvez", "pode ser que", "de certa forma").`;

export function blocoModoDeGanho(axes: VocationIQAxes, pesosPlanetas: PesoPlaneta[]): string {
  const dominantes = axes.earningModeDominante;
  const ROTULO_HUMANO_BASE: Record<number, string> = {
    2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
    6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
    10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
  };
  const casaDoRegente = (lord: ClassicalGraha) => pesosPlanetas.find((p) => p.planeta === lord)?.casa;
  let algumaNuanceAplicada = false;
  const ROTULO_HUMANO: Record<number, string> = Object.fromEntries(
    dominantes.map((d) => {
      const casaRegente = casaDoRegente(d.lord);
      const temNuance = casaRegente !== undefined && CASAS_DE_BASTIDORES.has(casaRegente);
      if (temNuance) algumaNuanceAplicada = true;
      return [d.house, `${ROTULO_HUMANO_BASE[d.house]}${temNuance ? NUANCE_REGENTE_EM_BASTIDORES[d.house] : ""}`];
    }),
  );
  // TAREFA 2 (correcção do especialista) — antes desta correcção, um
  // empate exacto entre duas casas resolvia-se por acidente da ordem do
  // array interno, nunca por decisão metodológica. Agora, empate real
  // (mesma pontuação E mesmo nº de camadas convergentes, ver
  // `resolverEarningModeDominante`) devolve as duas casas como
  // co-dominantes — o LLM tem de as apresentar como igualmente sustentadas,
  // nunca escolher uma só para simplificar.
  const linhaDominante =
    dominantes.length > 1
      ? `Modo de Ganho CO-DOMINANTE (empate real, mesma pontuação e mesmo nº de camadas convergentes — nunca escolhas só um dos dois): casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}) e casa ${dominantes[1].house} (${ROTULO_HUMANO[dominantes[1].house]}), ambas com pontuação ${dominantes[0].score}. Usa esta frase, ou uma equivalente, ao escrever sobre o Modo de Ganho: "Modo de Ganho co-dominante: casa ${dominantes[0].house} e casa ${dominantes[1].house} — o perfil sustenta os dois com igual força."`
      : `Modo de Ganho dominante: casa ${dominantes[0].house} (${ROTULO_HUMANO[dominantes[0].house]}), pontuação ${dominantes[0].score}.`;
  const linhas = [
    linhaDominante,
    `Sinais que sustentam ${dominantes.length > 1 ? "estas casas" : "esta casa"}: ${dominantes
      .map((d) => `casa ${d.house}: ${d.signals.length ? d.signals.join("; ") : "nenhum sinal directo — só a dignidade base do regente"}`)
      .join(" | ")}`,
    `As três Artha Trikonas, por ordem de força neste perfil: ${axes.earningModeAll.map((e) => `casa ${e.house} (pontuação ${e.score})`).join(", ")}.`,
  ];
  if (algumaNuanceAplicada) linhas.push(NOTA_TOM_NUANCE);
  return linhas.join("\n");
}

// BUG REAL, corrigido (ronda "auditoria de paridade adulto/adolescente")
// — exportada para promptAdolescente.ts também poder incluir este eixo:
// estava calculado (faz parte de `axes`, sempre) mas nunca chegava ao
// prompt adolescente — ver import em promptAdolescente.ts.
export function blocoMontraMercado(axes: VocationIQAxes): string {
  const m = axes.marketShowcase;
  const casa11 = m.house11FromAL;
  return [
    `Arudha Lagna (como esta pessoa é vista de fora, a "montra"): signo ${m.arudhaLagnaSign}, casa ${m.arudhaLagnaHouseFromAscendant} a partir do Ascendente.`,
    `Casa 11 a partir da Arudha Lagna (o que o mercado reconhece e paga): signo ${casa11.sign}, regente ${planetaPt(casa11.lord)}${casa11.planets.length ? `, com ${casa11.planets.map(planetaPt).join(" e ")} presente(s)` : ""}.`,
  ].join("\n");
}

export function blocoPesos(pesos: PesoPlaneta[]): string {
  const linhas = pesos
    .slice()
    .sort((a, b) => b.peso - a.peso)
    .map((p) => {
      const base = `${planetaPt(p.planeta)}: casa ${p.casa} (${p.signo}), estado ${ESTADO_PT[p.estado] ?? p.estado}, SAV da casa ${p.savCasa} (média do perfil ${p.savMedia.toFixed(1)}) → peso ${p.peso.toFixed(3)}.`;
      return p.notaCancelamento ? `${base} NOTA: ${p.notaCancelamento}.` : base;
    });
  return linhas.join("\n");
}

/**
 * Correcção do especialista (nova secção "Para que tem facilidade
 * natural", entre "Quem é" e "O que o perfil sustenta") — texto para o
 * bloco de dados técnicos do prompt; os cartões visuais (cor por nível,
 * ícone) são gerados à parte, por código, em relatorioTemplate.ts —
 * nunca pelo LLM (`calcularFacilidadesNaturais` é 100% determinística).
 */
export function blocoFacilidadesNaturais(pesos: PesoPlaneta[], usarTu = false): string {
  return calcularFacilidadesNaturais(pesos, usarTu)
    .map((f) => `${f.emoji} ${f.categoria} (${f.nivel}): ${f.frase}`)
    .join("\n");
}

export function blocoDatas(datas: DadosDatas): string {
  const classificacao = MAHADASHA_CLASSIFICACAO[datas.mahadashaAtual.senhor];
  return [
    `Mahadasha actual: ${planetaPt(datas.mahadashaAtual.senhor)}, de ${formatarData(datas.mahadashaAtual.inicio)} a ${formatarData(datas.mahadashaAtual.fim)}.`,
    classificacao
      ? `Classificação deste ciclo (usa esta frase, ou uma equivalente, para abrir a secção "O plano", antes de qualquer data ou passo): tema "${classificacao.tema}" — "${classificacao.abertura}".`
      : null,
    `Antardasha actual (o período mais fino, o que está activo agora): ${planetaPt(datas.antardashaAtual.senhor)}, de ${formatarData(datas.antardashaAtual.inicio)} a ${formatarData(datas.antardashaAtual.fim)}.`,
    datas.proximasAntardashas.length
      ? `Antardashas seguintes, dentro da mesma mahadasha: ${datas.proximasAntardashas.map((a) => `${planetaPt(a.senhor)} (${formatarData(a.inicio)} a ${formatarData(a.fim)})`).join("; ")}.`
      : null,
    `Trânsito de Júpiter: em ${datas.transitoJupiter.signo}${datas.transitoJupiter.aspectosAoNatal.length ? `, ${datas.transitoJupiter.aspectosAoNatal.join("; ")}` : ", sem aspecto duro activo aos pontos natais principais"}.`,
    `Trânsito de Saturno: em ${datas.transitoSaturno.signo}${datas.transitoSaturno.aspectosAoNatal.length ? `, ${datas.transitoSaturno.aspectosAoNatal.join("; ")}` : ", sem aspecto duro activo aos pontos natais principais"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** TAREFA 5 (correcção do especialista) — formata a via concreta de entrada de um destino, para adultos ("entrada no mercado", nunca cursos — ver `catalogoCursos.ts`). `undefined` quando o destino não está no catálogo de cursos (não deveria acontecer para um id vindo de `catalogarDestinos`, mas protege). */
function formatarViaConcreta(cursos: CursosSugeridos | undefined): string {
  if (!cursos) return "";
  return ` [Entrada no mercado: ${cursos.entradaMercadoAdulto.join("; ")}]`;
}

/** Redesenho do motor (Parte 2C) — traduz o resultado de `catalogarDestinos()` para o formato de dados técnicos pedido. Nunca lista mais do que o catálogo devolveu, nunca ordena por "força" (SPEC-vocacional.md: o catálogo descreve, não escolhe). */
export function blocoCatalogoVocacional(catalogo: ResultadoCatalogoVocacional, cursosPorDestino: Record<string, CursosSugeridos>): string {
  const listar = (destinos: ResultadoCatalogoVocacional["destinosDeAreaActual"]) =>
    destinos.length ? destinos.map((d) => `- ${d.nome}: convergência ${d.convergencia} (${d.camadas.join("; ") || "sem camada identificada"})${formatarViaConcreta(cursosPorDestino[d.id])}`).join("\n") : "(nenhum destino do catálogo corresponde)";

  // TAREFA "Alternativas como candidatas de excepção" (21 Set, pedido do
  // Rui — ver PASSO 1B em INSTRUCAO_SELECCAO_CANDIDATAS abaixo para o
  // porquê): marca aqui, deterministicamente, o Nível de cada alternativa
  // (mesmo cálculo `nivelDeConfianca` que já decide o Nível da pool
  // garantida — nunca um segundo critério). "sem indicador pessoal" quer
  // dizer literalmente isso: só camadas genéricas (Eixo do rendimento,
  // Regente do Modo de Ganho, Casa temática, Sinais estruturados) — o
  // LLM NUNCA promove uma destas a candidata, mesmo com ligação
  // narrativa aparente (ver PASSO 1B).
  const listarAlternativas = (destinos: ResultadoCatalogoVocacional["destinosAlternativos"]) =>
    destinos.length
      ? destinos
          .map((d) => {
            const nivel = nivelDeConfianca(d.camadas);
            const rotuloNivel = nivel === 1 ? "Nível 1 (planeta de maior peso)" : nivel === 2 ? "Nível 2 (âncora pessoal)" : "sem indicador pessoal — NUNCA promover a candidata";
            return `- ${d.nome}: convergência ${d.convergencia}, ${rotuloNivel} (${d.camadas.join("; ") || "sem camada identificada"})`;
          })
          .join("\n")
      : "(nenhuma alternativa)";

  // TAREFA #40 (mudança de arquitectura — substitui a TAREFA 1 e a TAREFA
  // #39) — `catalogarDestinos()` já não escolhe as 3 finais; entrega a
  // POOL COMPLETA de candidatas que atingem ≥4 camadas (Nível 1 ou 2, sem
  // limite de 3). A escolha de até 3 passa a ser feita AQUI, pelo LLM, na
  // mesma chamada que escreve "Quem é" — ver INSTRUCAO_SELECCAO_CANDIDATAS
  // logo abaixo. Cada linha da pool traz o nível (TAREFA #38) e a soma de
  // pesos das camadas (`somaPesoCamadas`) explícita, para o LLM ter um
  // número concreto a citar quando usar isso como desempate — nunca como
  // critério principal.
  const candidatasTexto = catalogo.candidatasForaDaLista.length
    ? catalogo.candidatasForaDaLista
        .map(
          (c) =>
            `- ${c.nome}: convergência ${c.convergencia}, Nível ${c.nivelConfianca} (${c.nivelConfianca === 1 ? "inclui o planeta de maior peso — confiança plena" : "âncora pessoal (Atmakaraka/Amatyakaraka/Stellium/Regente de casa dignificado), sem o planeta de maior peso — confiança reduzida"}), soma de pesos das camadas ${c.somaPesoCamadas.toFixed(2)} (${c.camadas.join("; ")}). FACTOR DE DOM (já traduzido para linguagem humana, usa isto — nunca inventes outro): "${c.fatorDeDom}".`,
        )
        .join("\n")
    : "nenhuma — nenhum destino reuniu 4 camadas independentes incluindo um indicador pessoal (planeta de maior peso, Atmakaraka ou Amatyakaraka).";

  // Correcção do especialista ("remover o tecto fixo de 3, com
  // agrupamento por cluster") — `gruposCandidatas` (catalogoVocacional.ts)
  // já vem calculado deterministicamente: listas de nomes cuja
  // assinatura de TIPOS de camada é idêntica ou difere em, no máximo, 1
  // tipo. Exposto aqui em texto simples para o LLM usar como base do
  // agrupamento na apresentação final (ver INSTRUCAO_SELECCAO_CANDIDATAS)
  // — o LLM NUNCA decide sozinho quem se parece com quem, usa sempre este
  // cálculo já feito.
  const gruposTexto = catalogo.gruposCandidatas.length
    ? catalogo.gruposCandidatas.map((g, i) => `Grupo ${i + 1} (${g.length} candidatas, convergência de base quase idêntica): ${g.join(", ")}.`).join("\n")
    : "nenhum — todas as candidatas da pool têm assinatura de camadas própria (sem par a ≤1 tipo de distância).";

  // TAREFA 3 (correcção do especialista, ronda seguinte) — cada candidata
  // da pool ganha o seu próprio bloco "-- Via concreta para [destino] --",
  // separado da listagem acima (antes vinha só inline, apensa à linha da
  // candidata). Formato exacto pedido: tipo de formação, certificação,
  // como se entra, tempo médio até à primeira actividade remunerada. Com a
  // pool completa (TAREFA #40), isto cobre TODAS as candidatas elegíveis,
  // não só as 3 que vierem a ser escolhidas — necessário para o LLM poder
  // escolher qualquer uma da pool com a via concreta já disponível.
  const viasConcretasCandidatas = catalogo.candidatasForaDaLista
    .map((c) => {
      const cursos = cursosPorDestino[c.id];
      if (!cursos) return null;
      return `-- Via concreta para ${c.nome} --\n${cursos.entradaMercadoAdulto.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    catalogo.notaAreaGenerica ? `NOTA: ${catalogo.notaAreaGenerica}.` : null,
    `Derivadas da área actual:\n${listar(catalogo.destinosDeAreaActual)}`,
    `Alternativas pelo perfil — convergência 2-3, ABAIXO do piso da pool garantida (Atmakaraka, Amatyakaraka, Nakshatra, Modo de Ganho, combinações, eixo do rendimento). Nunca tratar como pool — ver PASSO 1B em INSTRUCAO_SELECCAO_CANDIDATAS para a única forma admissível de usar isto:\n${listarAlternativas(catalogo.destinosAlternativos)}`,
    `Candidatas do catálogo — pool completa (≥4 convergências, Nível 1 ou 2 conforme indicado, SEM LIMITE nenhum — apresentam-se TODAS as que passam o filtro de ligação narrativa, ver INSTRUCAO_SELECCAO_CANDIDATAS):\n${candidatasTexto}`,
    `Grupos de candidatas (assinatura de camadas idêntica ou quase idêntica — usar para agrupar a apresentação, ver INSTRUCAO_SELECCAO_CANDIDATAS):\n${gruposTexto}`,
    viasConcretasCandidatas || null,
    catalogo.notaEixoDoRendimento
      ? `NOTA sobre o eixo do rendimento (o que dá sentido vs. o que paga): ${catalogo.notaEixoDoRendimento.leitura}.${catalogo.notaEixoDoRendimento.regraDeEscrita ? ` Como escrever isto: ${catalogo.notaEixoDoRendimento.regraDeEscrita}` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Redesenho do motor (Parte 5A) — o LLM nunca via a Roda da Vida antes disto (só o template a desenhava, depois de o texto já estar escrito), por isso não podia cumprir a instrução de referenciar valores extremos. Calculada aqui com a mesma função que o template usa (`computeRodaDaVida`, movida para o method-engine), nunca inventada de novo. */
export function blocoRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): string {
  const dimensoes = computeRodaDaVida(savPorCasa, pesos, regentesCasas);
  return dimensoes.map((d) => `${d.nome}: ${d.valor.toFixed(1)}/10${d.valor <= 4 || d.valor >= 7 ? " — EXTREMO, tem de ser referenciado no texto" : ""}`).join("\n");
}

const ASPECTO_PT: Record<string, string> = {
  Conjuncao: "conjunção",
  Sextil: "sextil",
  Quadratura: "quadratura",
  Trigono: "trígono",
  Oposicao: "oposição",
};

/** TAREFA 4 (correcção do especialista) — traduz `computeElementosModalidades` para o formato de dados técnicos pedido. */
export function blocoElementosModalidades(perfil: PerfilElementosModalidades): string {
  const el = perfil.distribuicaoElementos;
  const mod = perfil.distribuicaoModalidades;
  return [
    `Elemento dominante: ${perfil.elementoDominante}`,
    `Distribuição de elementos: Fogo ${el.Fogo} | Terra ${el.Terra} | Ar ${el.Ar} | Água ${el.Água}`,
    `Modalidade dominante: ${perfil.modalidadeDominante}`,
    `Distribuição de modalidades: Cardinal ${mod.Cardinal} | Fixa ${mod.Fixa} | Mutável ${mod.Mutável}`,
  ].join("\n");
}

/** TAREFA 4 (correcção do especialista) — traduz `computeAspectosPessoais` para o formato de dados técnicos pedido. */
export function blocoAspectosPessoais(aspectos: AspectoPessoal[]): string {
  if (!aspectos.length) return "(nenhum aspecto relevante entre os 5 planetas pessoais neste perfil)";
  return aspectos.map((a) => `${planetaPt(a.planetaA)} ${ASPECTO_PT[a.aspecto]} ${planetaPt(a.planetaB)}: ${a.significado}`).join("\n");
}

// ── CAMADA 1 (correcção do especialista) — Avasthas Baladi (maturidade de
// cada planeta clássico, já calculada por `computeD1Table` → `d1.rows[g].avastha`,
// nunca recalculada aqui). Rahu/Ketu não têm avastha (sempre `null` na
// tabela D1, sem excepção clássica documentada) — omitidos por desenho.
const AVASTHA_PT: Record<string, string> = {
  Bala: "criança — energia bruta, ainda não controlada, forte em impulso mas fraca em consistência",
  Kumara: "jovem — energia em desenvolvimento, cheia de promessa mas ainda não testada",
  Yuva: "jovem adulto — força máxima, plena expressão",
  Vriddha: "idoso — energia madura mas a declinar, mais sabedoria do que força",
  Mrita: "morta — energia bloqueada, dificuldade real de expressão",
};

// `d1.rows[g].avastha`/`.degreeInSign` já vêm calculados por
// `computeD1Table()` — não existe (nem é preciso) um `computeAvasthaBaladi(d1)`
// à parte; seria só um invólucro a reler o mesmo valor.
export function blocoAvasthas(d1: D1TableResult): string {
  const linhas: string[] = [];
  for (const r of Object.values(d1.rows)) {
    if (!r.avastha) continue;
    linhas.push(`${planetaPt(r.graha)}: ${r.avastha} (${r.degreeInSign.toFixed(1)}°) — ${AVASTHA_PT[r.avastha]}`);
  }
  return linhas.join("\n");
}

// ── CAMADA 2 — conjunções (mesmo signo, já calculadas por `computeD1Table`
// → `d1.conjunctions`, nunca recalculadas aqui). Classificação de natureza
// por pares exactos (correcção do especialista, ronda seguinte — lista
// fechada, não uma regra geral de benéfico/maléfico): Júpiter+Vénus,
// Júpiter+Lua e Vénus+Lua são benéficas; Saturno+Marte, Sol+Saturno e
// Marte+Lua são tensão (Marte+Lua = Angaraka Yoga, volatilidade emocional
// clássica — não é "maléfico toca neutro", é o par em si); qualquer outro
// par é neutro.
const CONJUNCOES_BENEFICAS: [string, string][] = [
  ["Jupiter", "Venus"],
  ["Jupiter", "Moon"],
  ["Venus", "Moon"],
];
const CONJUNCOES_TENSAO: [string, string][] = [
  ["Saturn", "Mars"],
  ["Sun", "Saturn"],
  ["Mars", "Moon"],
];

function parCoincide(par: [string, string], a: string, b: string): boolean {
  return (par[0] === a && par[1] === b) || (par[0] === b && par[1] === a);
}

function naturezaConjuncao(a: string, b: string): "benéfica" | "tensão" | "neutra" {
  if (CONJUNCOES_BENEFICAS.some((par) => parCoincide(par, a, b))) return "benéfica";
  if (CONJUNCOES_TENSAO.some((par) => parCoincide(par, a, b))) return "tensão";
  return "neutra";
}

export function blocoConjuncoes(d1: D1TableResult): string {
  if (!d1.conjunctions.length) return "(nenhuma conjunção entre os 9 grahas neste perfil)";
  return d1.conjunctions.map((c) => `${planetaPt(c.a)} conjunção ${planetaPt(c.b)} (casa ${d1.rows[c.a].house}, natureza ${naturezaConjuncao(c.a, c.b)})`).join("\n");
}

// ── CAMADA 3 (correcção do especialista, ronda seguinte) — 3 yogas
// vocacionais construídos de raiz em `vocationiq/yogasVocationais.ts`
// (Raja/Dhana/Viparita Raja, condições específicas pedidas — não a versão
// genérica de `lifeReport/yogas.ts`, que cobre 8 yogas com condições mais
// largas e nunca foi desenhada para este produto). Nunca inclui Neecha
// Bhanga — o VocationIQ já tem o seu próprio detector, mais rigoroso (4
// condições clássicas, `pesosPlanetas.ts`), usado no peso de cada planeta.
export function blocoYogas(yogas: YogaHit[]): string {
  if (!yogas.length) return "(nenhum yoga clássico detectado neste perfil)";
  return yogas.map((y) => `${y.label}: ${y.detail}`).join("\n");
}

// ── CAMADA 4 — Vargottama (mesmo signo em D-1 e D-9), já calculado por
// `computeD9Table` → `d1.d9.rows[g].vargottama`, nunca recalculado aqui.
export function blocoVargottama(d1: D1TableResult): string {
  const linhas = Object.values(d1.d9.rows)
    .filter((r) => r.vargottama)
    .map((r) => `${planetaPt(r.graha)}: Vargottama (mesmo signo ${r.d1Sign} em D-1 e D-9)`);
  return linhas.length ? linhas.join("\n") : "(nenhum planeta Vargottama neste perfil)";
}

/**
 * 4 instruções "REGRAS OBRIGATÓRIAS" das camadas técnicas (correcção do
 * especialista, ronda seguinte — a versão anterior era genérica demais e
 * o LLM não as estava a seguir). Partilhadas entre `construirPromptAdulto`
 * e `construirPromptAdolescente` (FALTA 1 dessa ronda: nunca só um dos
 * dois motores) — o texto dos exemplos não usa "tu"/"você" em lado
 * nenhum, por isso funciona sem alteração nos dois registos.
 *
 * DESVIO (correcção do especialista, FALTA 2 dessa ronda) — o texto
 * original pedia "se a área actual é governada por um planeta Mrita",
 * mas não existe no motor nenhum facto único "o planeta que governa a
 * área actual": `intake.areaActual` é texto livre, casado contra o
 * catálogo por `buscarDestinosPorTexto` (`catalogoVocacional.ts`), e os
 * planetas relevantes só aparecem dentro das CAMADAS de cada destino
 * correspondente (ex.: "Regente do Modo de Ganho dominante (Venus, casa
 * 10)"). Verificado com os dados reais da Melina antes de escrever isto:
 * a área dela ("Estética") liga-se a Vénus (regente do Modo de Ganho,
 * peso 0,86, Vriddha) — NUNCA à Lua (peso 0,98, Mrita, mas em casa 7,
 * sem nenhuma ligação a "Estética" nas camadas do catálogo). A instrução
 * abaixo aponta para o mecanismo real (as camadas de "Derivadas da área
 * actual", já no prompt) em vez de inventar um facto "planeta que
 * governa a área actual" que o motor não calcula.
 */
export const INSTRUCAO_AVASTHAS = `AVASTHAS — REGRAS OBRIGATÓRIAS na secção "${SECCAO_TITULOS.quemE}":
· PLANETA LIGADO À ÁREA ACTUAL EM MRITA: olha para os planetas citados nas camadas de "Derivadas da área actual" (dados técnicos, "Candidatas do catálogo"). Se um deles está em Mrita, nomeia-o explicitamente: "Trabalhou durante X anos no campo de [planeta] — mas [planeta] Mrita está bloqueado neste perfil, o que explica com precisão porque essa área nunca trouxe realização plena. Não é falta de talento — é falta de ressonância estrutural."
· PLANETA FORTE (peso ≥1,3) EM MRITA: nomeia a contradição: "[Planeta] tem força técnica alta (peso X) mas está em Mrita — o potencial existe mas a expressão está bloqueada. O que parece capacidade adormecida é na verdade uma barreira real a trabalhar."
· PLANETA FRACO (peso <0,9) EM YUVA: nomeia a surpresa positiva: "[Planeta] tem peso baixo (X) mas está em Yuva — tem mais capacidade de expressão do que os números sugerem. É um músculo que responde bem ao treino."
NUNCA listar avasthas sem as usar para explicar algo concreto sobre a pessoa
VERIFICAÇÃO OBRIGATÓRIA, PLANETA A PLANETA (correcção do especialista — bug real: um planeta fraco em Yuva ficou de fora do texto final): antes de dares a secção "${SECCAO_TITULOS.quemE}" por terminada, percorre a lista de avasthas nos dados técnicos ("Avasthas (maturidade dos planetas)") planeta a planeta e testa cada um contra as 3 regras acima (peso, ver pesos de planeta nos dados técnicos) — não confies numa impressão geral de que "já falei disto". Qualquer planeta que cumpra uma das 3 condições e ainda não tenha uma frase própria no texto é uma falha a corrigir antes de terminar, mesmo que isso obrigue a acrescentar uma frase nova.`;

export const INSTRUCAO_CONJUNCOES = `CONJUNÇÕES — REGRAS OBRIGATÓRIAS: para cada conjunção activa, a secção "${SECCAO_TITULOS.quemE}" TEM de ter uma frase que explique a fusão ou tensão.
· CONJUNÇÃO BENÉFICA (com Júpiter ou Vénus): "[Planeta] conjunção [Júpiter/Vénus] — [Planeta] recebe elevação natural. O que seria apenas [qualidade do planeta] torna-se [qualidade elevada]."
· CONJUNÇÃO DE TENSÃO (Saturno+Marte, Sol+Saturno, Marte+Lua): "[Planeta A] conjunção [Planeta B] — dois impulsos opostos no mesmo espaço. O que parece contradição ([impulso A] vs [impulso B]) é na verdade a tensão criativa que define como esta pessoa age. Resolver esta tensão é o trabalho de uma vida — mas também é a fonte de energia mais original deste perfil."
NUNCA ignorar conjunções activas
· CONJUNÇÃO NEUTRA (qualquer par fora das duas listas acima — correcção do especialista, bug real: uma conjunção neutra ficou sem frase própria, só implícita dentro de outro assunto): tem SEMPRE direito à sua própria frase distinta, tal como as outras — nunca ignorada só por não ser benéfica nem de tensão. "[Planeta A] conjunção [Planeta B] — dois temas do perfil que passam a andar juntos, sem que um domine o outro. [nomeia concretamente o que cada planeta traz e como a combinação se sente na prática para esta pessoa]."
NUNCA ignorar conjunções activas — incluindo as neutras.
3 OU MAIS PLANETAS CONJUNTOS (correcção do especialista — bug real: com 3 planetas mutuamente conjuntos, o texto descreveu o conjunto todo como um bloco só, e o par neutro dentro dele — nem benéfico nem de tensão — ficou sem a sua própria frase, diluído na descrição geral): quando 3 ou mais planetas estão todos mutuamente conjuntos, podes descrevê-los como um grupo (é natural e preferível a 3 frases redundantes) — mas essa descrição de grupo tem de nomear explicitamente o que CADA par contribui, incluindo o(s) par(es) neutro(s): não basta uma frase genérica sobre "estes três planetas juntos", tem de haver, dentro dessa mesma passagem, uma cláusula própria para o par neutro tal como as regras acima pedem para um par isolado.`;

// CORRECÇÃO 2 (correcção do especialista, ronda seguinte) — a versão
// anterior ("cada yoga tem de se ligar a uma candidata... que já citam o
// MESMO planeta") já pedia a mesma verificação de planeta partilhado, mas
// não distinguia "o yoga confirma esta candidata especificamente" de "o
// yoga só reforça capacidade geral", nem obrigava a testar as 3
// candidatas (só falava de "uma candidata"). Versão mais precisa e
// exaustiva, com frase-molde quase literal.
// Correcção do especialista ("ORDEM — nomenclatura/cor", 6a) — a
// frase-molde tinha "esta candidata" no texto VISÍVEL ao cliente
// (dentro do padrão exacto que o LLM copia quase literalmente para o
// relatório) — "candidata" remete para concurso de beleza, tom errado.
// Corrigido para "esta opção", mantendo a palavra "candidata" só na
// prosa instrutiva (nunca lida pelo cliente).
// BUG REAL, corrigido (ronda "Miguel/Alexandra — discurso vago", pedido
// do especialista) — o exemplo dado aqui ("'Raja Yoga', 'configuração
// de autoridade real'") tinha uma segunda opção vaga a mais, e o LLM
// (confirmado em geração real, duas pessoas diferentes) estava a usá-la
// como licença para escrever sempre "uma configuração técnica neste
// perfil (capacidade estrutural para posições de destaque)" — a MESMA
// frase, quase literal, a justificar destinos completamente diferentes
// no mesmo relatório (Psicologia, Direito, Artes do Espetáculo, no caso
// do Miguel), nunca nomeando qual dos 3 yogas está realmente activo.
// Efeito nomeado ("configuração técnica"/"capacidade estrutural"), nunca
// o mecanismo (qual yoga, formado por que planetas). Corrigido: só o
// nome real do yoga é aceite, nunca uma paráfrase genérica.
export const INSTRUCAO_YOGAS = `YOGAS — INSTRUÇÃO OBRIGATÓRIA PARA CANDIDATAS: para CADA candidata fora da lista apresentada, verifica se algum yoga activo (Raja Yoga, Dhana Yoga, Viparita Raja Yoga) cita pelo menos um dos planetas que fazem parte das camadas de convergência dessa candidata.

VERIFICAÇÃO OBRIGATÓRIA, PLANETA A PLANETA (correcção do especialista —
bug real: uma geração concluiu "não encontrei nenhum yoga aplicável"
para uma candidata cujo próprio Sol era o mesmo planeta central de um
Raja Yoga activo listado nos dados técnicos — a verificação tinha sido
feita "de memória"/por impressão geral, não planeta a planeta). Antes de
escreveres "não encontrei yoga aplicável" para qualquer candidata, faz
esta comparação explícita: lista os planetas de CADA yoga activo (dados
técnicos, secção de yogas) lado a lado com os planetas nas camadas de
convergência desta candidata (dados técnicos, secção desta candidata) —
se houver pelo menos um planeta em comum entre as duas listas, o yoga
APLICA-SE, mesmo que a ligação não seja óbvia à primeira leitura.

QUAIS CAMADAS CONTAM PARA ESTE TESTE (correcção do especialista — bug real, confirmado com dados reais da Nádia: 20 de 22 candidatas citavam o MESMO Raja Yoga, porque os planetas desse yoga só apareciam nelas via camadas genéricas partilhadas por dezenas de destinos ao mesmo tempo — "Eixo do rendimento", "Casa temática forte", "Regente da casa dignificado", "Parivartana entre regentes de casa", "Sinais estruturados da área" — nunca por uma ligação própria desta candidata específica): para o teste "planeta a planeta" acima, só contam os planetas citados nas camadas "Atmakaraka", "Amatyakaraka", "Planeta de maior peso" e "Combinação" desta candidata (as únicas camadas ligadas a um planeta através de uma lista de destinos própria e estreita desse planeta) — NUNCA planetas que só aparecem via "Eixo do rendimento", "Casa temática forte", "Regente da casa dignificado", "Parivartana entre regentes de casa" ou "Sinais estruturados da área" (camadas ligadas a uma CASA ou ÁREA inteira, partilhadas por muitos destinos ao mesmo tempo — um planeta que só aparece por aí não é um sinal específico desta candidata, é um sinal do grupo inteiro). Se, depois de aplicar este filtro, já não sobrar nenhum planeta em comum, o yoga NÃO se aplica a esta candidata — mesmo que apareça na lista completa de camadas dela.

Se sim, a leitura desta candidata DEVE incluir uma frase com este padrão exacto: "Existe também, [de forma independente desta convergência / reforçando esta convergência], um [Raja Yoga / Dhana Yoga / Viparita Raja Yoga — o nome REAL do yoga activo, nunca outro] neste perfil, formado por [os planetas/casas que o formam, em linguagem simples] que [confirma directamente esta opção / reforça o teu/seu potencial nesta área de forma mais geral]"
PROIBIDO ABSOLUTO: substituir o nome do yoga por uma paráfrase vaga — "configuração técnica", "capacidade estrutural", "sinal estruturado próprio", "configuração de autoridade" e qualquer equivalente que nomeie um efeito sem nomear QUAL yoga e QUE planetas o formam. Se não souberes/não houver yoga aplicável, não escrevas esta frase — nunca a uses como fórmula genérica de reforço.
Distingue sempre:
· Yoga cujos planetas coincidem com os desta candidata: "confirmação directa" — usa "confirma directamente esta opção".
· Yoga que reforça capacidade geral sem ligação aos planetas desta candidata: "reforço geral" — usa "reforça o teu/seu potencial nesta área de forma mais geral".
Se, depois da verificação planeta a planeta acima, NÃO houver mesmo nenhum yoga cujos planetas coincidam com os planetas da candidata, não menciones yogas nessa candidata — PROIBIDO inventar ligação para preencher espaço.
Esta verificação é obrigatória para TODAS as candidatas apresentadas (a pool completa, sem tecto de 3 — ver INSTRUCAO_SELECCAO_CANDIDATAS), não só a primeira. Se todas tiverem yogas aplicáveis, todas devem citá-los.
YOGA DE GRUPO — TODAS OU NENHUMA (correcção do especialista — bug real: o próprio bloco "${MARCADORES.seleccaoCandidatas}" concluiu correctamente que um yoga se aplica como reforço geral a um grupo de 3 candidatas, mas o texto final só incluiu a frase "Existe também..." em 2 delas — a 3ª ficou sem, apesar de o raciocínio a incluir explicitamente no mesmo grupo): quando o teu próprio raciocínio em "${MARCADORES.seleccaoCandidatas}" identificar um yoga como aplicável a um GRUPO de candidatas (reforço geral partilhado por várias, não só confirmação directa de uma), a frase "Existe também..." tem de aparecer no bloco de CADA uma dessas candidatas individualmente — nunca só nalgumas do grupo. Antes de dares a secção por terminada, volta a "${MARCADORES.seleccaoCandidatas}" e confirma, candidata a candidata, que todas as que lá ficaram marcadas com yoga aplicável têm mesmo a frase no seu próprio bloco de texto — não só no raciocínio.`;

// BUG REAL, corrigido (ronda "Miguel/Alexandra — discurso vago", pedido
// do especialista) — o mesmo padrão do INSTRUCAO_YOGAS acima (nomear um
// efeito sem nomear o mecanismo) não estava confinado aos yogas —
// confirmado em geração real: "uma configuração técnica neste perfil
// (capacidade estrutural para posições de destaque)" repetida quase
// verbatim a justificar destinos diferentes no mesmo relatório. Regra
// geral, nunca só para yogas: sempre que o texto afirma um sinal, tem de
// citar o quê (planeta, casa, dignidade), em linguagem simples mas
// rastreável — nunca um efeito nomeado sozinho. E, no lado oposto do
// mesmo problema: quando o sinal é genuinamente fraco ou ausente, dizer
// isso directamente é melhor do que uma frase que finge medir algo.
export const INSTRUCAO_MECANISMO_NUNCA_SO_EFEITO = `MECANISMO, NUNCA SÓ EFEITO (regra geral, não só para yogas): sempre que uma frase afirmar que existe um sinal, uma configuração, uma capacidade ou um ponto forte no perfil, essa mesma frase (ou a seguinte) tem de nomear O QUÊ, em linguagem simples mas rastreável — qual planeta, qual casa, qual dignidade, qual eixo (Atmakaraka/Amatyakaraka/Modo de Ganho/etc.). PROIBIDO ABSOLUTO nomear só o efeito: "uma configuração técnica neste perfil", "capacidade estrutural para posições de destaque", "sinal estruturado próprio", "um ponto forte real" e qualquer equivalente que descreva uma força sem dizer de onde ela vem — isto é especialmente proibido como frase repetida quase igual a justificar destinos DIFERENTES no mesmo relatório (confirmado em geração real: a mesma frase a "confirmar" Psicologia, Direito e Artes do Espetáculo ao mesmo tempo — se a frase serve para tudo, não está a medir nada).
Ao mesmo tempo, e pelo lado oposto: onde o sinal for genuinamente fraco, genérico, ou nem sequer existir para esta candidata/opção específica, DIZE ISSO DIRECTAMENTE — "não encontrei uma ligação específica para esta opção" (ou equivalente) é sempre melhor do que forçar uma frase vaga só para não deixar a secção curta. Uma leitura honesta e curta vale mais do que uma leitura confiante e vazia.`;

/**
 * BUG REAL, corrigido (ronda "Miguel/Alexandra — discurso vago", pedido
 * do especialista, 2ª parte): mesmo depois de proibir o efeito-sem-
 * mecanismo, falta a parte construtiva — nomear as ferramentas reais da
 * pessoa como património PRÓPRIO dela, independente de qualquer opção,
 * cedo no relatório, e depois REFERENCIAR essas mesmas ferramentas em
 * cada leitura por opção (em vez de reinventar a explicação do zero em
 * cada cartão, o que é onde a linguagem vaga mais aparece). Objectivo
 * explícito do fundador: mesmo que a pessoa não escolha nenhuma das
 * opções fortes, sai do relatório a saber que ferramentas tem e onde
 * mais as pode aplicar.
 */
export const INSTRUCAO_FERRAMENTAS_PATRIMONIO = `FERRAMENTAS COMO PATRIMÓNIO PRÓPRIO — OBRIGATÓRIO: dentro da secção "${SECCAO_TITULOS.oQueACartaSustenta}", antes de ligar isto a qualquer opção, nomeia explicitamente 2 a 4 ferramentas ou capacidades concretas desta pessoa — vindas dos sinais mais fortes do perfil (Atmakaraka, Amatyakaraka, planetas de peso mais alto, Modo de Ganho) — apresentadas como património PRÓPRIO da pessoa, nunca como argumento a favor de nenhuma opção específica. Cada ferramenta é uma frase curta e concreta (ex.: "a tua capacidade de assumir posição pública sem hesitar", "a tua mente que liga o que sentes ao que dizes"), sempre com o mecanismo já nomeado (ver MECANISMO, NUNCA SÓ EFEITO).
Depois, dentro de CADA bloco de "${SECCAO_TITULOS.leituraPorOpcao}" e de cada candidata em "${SECCAO_TITULOS.candidataForaDaLista}", ao explicar porque uma opção faz sentido, refere explicitamente QUAL dessas ferramentas já nomeadas está a ser usada e COMO — nunca inventes uma explicação nova e desligada das ferramentas já apresentadas. O objectivo: mesmo que a pessoa não escolha nenhuma das opções mais fortes, sai do relatório a saber que ferramentas tem e onde mais as pode aplicar — as ferramentas são o património que fica, as opções são só exemplos de onde esse património pode ser usado
CITAR O MECANISMO NÃO É REPETIR A EXPLICAÇÃO (correcção do especialista — bug real: a fusão Sol+Lua, já explicada por completo em "${SECCAO_TITULOS.quemE}", foi reexplicada aqui como se fosse a primeira vez): ao nomeares o mecanismo de cada ferramenta (exigido por MECANISMO, NUNCA SÓ EFEITO), se esse mecanismo já foi explicado por extenso em "${SECCAO_TITULOS.quemE}" (uma conjunção, uma fusão, uma avastha, um yoga), aqui basta uma citação curta entre parêntesis ("(Sol+Lua fundidos, já visto)" ou equivalente) — nunca repetir a frase ou o raciocínio que já explicou o que essa fusão significa. A novidade desta secção é a ferramenta/capacidade que daí resulta, não o mecanismo em si — esse já ficou explicado
REFORMULAR NÃO É CITAR (correcção do especialista — bug real, recorrente apesar do fix anterior: a citação "(já visto)" foi acrescentada correctamente, mas a frase à volta dela continuou a reexplicar o que a fusão significa, só com outras palavras — "a tua capacidade de comunicar aquilo que sentes de forma organizada" é uma repetição disfarçada de "o que queres conscientemente e o que sentes por dentro andam juntos", não uma ferramenta nova): o teste não é se a frase é literalmente igual à de "${SECCAO_TITULOS.quemE}" — é se, lida sozinha, ela está a explicar o que o mecanismo É ou SIGNIFICA (mesmo por palavras diferentes) em vez de nomear directamente a capacidade concreta que ele dá. Começa a frase pela capacidade em si ("a tua capacidade de...", "a tua facilidade em...") e usa o mecanismo só como etiqueta entre parênteses no fim — nunca como o assunto da frase.`;

// BUG REAL, corrigido (ronda "Miguel/Alexandra — discurso vago", pedido
// do especialista, 3ª parte) — as duas instruções acima (MECANISMO,
// NUNCA SÓ EFEITO / FERRAMENTAS COMO PATRIMÓNIO) dizem o que proibir,
// mas não o que fazer bem. O especialista forneceu a sua própria leitura
// directa do mapa do Miguel (fora do relatório automático) como padrão
// de tom e nível de detalhe a imitar — citada aqui verbatim, nunca
// parafraseada, para o modelo ter um exemplo real do padrão "nomear a
// técnica exacta → traduzir em linguagem simples → distinguir sinal
// forte de fraco sem amortecer → nomear ferramentas como património da
// pessoa, não como argumento a favor de uma opção".
export const EXEMPLO_TOM_ESPECIALISTA = `EXEMPLO DE TOM E NÍVEL DE DETALHE (referência directa do especialista, não copiar o conteúdo — imitar o PADRÃO): esta é uma leitura real feita à mão sobre outro mapa. Repara em como nomeia sempre a técnica exacta antes de traduzir em linguagem simples, distingue sinal forte de sinal fraco sem amortecer nenhum dos dois, e nomeia as ferramentas da pessoa como propriedade dela — nunca como argumento a favor de uma opção:
"O centro: identidade que se prova pela profundidade, não pela exposição imediata. O Atmakaraka é o Sol, em Leo (signo próprio, dignidade forte), mas na casa 8 — a casa do oculto, da crise, da investigação. Sol quer ser visto e reconhecido; a casa 8 exige que isso se ganhe primeiro através de mergulhar em algo complexo, difícil ou escondido. O Karakamsha confirma e afina isto: signo Libra, também na casa 8 — a 'cor' dessa profundidade é equilíbrio, julgamento justo, sensibilidade estética, mediação.
Há um stellium real na casa 8, em Leo: Sol, Lua e Mercúrio, os três juntos — não é um sinal isolado. A intensidade emocional (Lua), a clareza verbal/analítica (Mercúrio) e a identidade (Sol) canalizam-se todas pela mesma porta.
O modo de ganho é inequívoco, e a margem é grande: casa 10 com pontuação 8, muito à frente da casa 2 (2.5) e da casa 6 (1.8). Vénus, regente da casa, em Moolatrikona, com o maior peso da carta (1.38); Marte também presente. Vénus própria + Marte na casa 10, ambos em Libra: um dos sinais mais clássicos e específicos para 'ganha reconhecimento público através de julgamento equilibrado, argumentação ou sentido estético' — não é genérico, é uma configuração de peso real.
O ponto de atenção, seja qual for o caminho: Saturno é o planeta mais fraco de toda a carta (peso 0.744). Disciplina, rotina e consistência vão custar-lhe mais do que a maioria."
Nunca copiar frases deste exemplo para o relatório — é um padrão de escrita a seguir, não texto reutilizável.`;

// CORRECÇÃO 3 (correcção do especialista, ronda seguinte) — obriga o
// mesmo formato de nomeação técnica nos dois motores (adulto e
// adolescente), para as avasthas e as conjunções nunca aparecerem como
// prosa livre sem o termo técnico entre parênteses — torna o critério 18/
// 19 da crítica automática verificável por padrão de texto, não por
// interpretação.
//
// Correcção do especialista (ronda "relatório Marta", ponto 12) — o
// formato original pedia DOIS parênteses seguidos na mesma frase
// ("...está numa fase (avastha) de declínio (Vriddha)...") — tecnicamente
// verificável, mas lido em voz alta soa a "parênteses dentro de
// parênteses" (o exemplo real reportado: "energia mais imediata ainda
// está numa fase (avastha) inicial, quase de arranque (Bala)"). Um único
// parêntese com os dois termos juntos mantém a mesma verificabilidade
// (o critério 18 só precisa de confirmar que "avastha" e o nome técnico
// aparecem os dois, entre parênteses, perto da menção) com metade do
// ruído visual.
export const INSTRUCAO_CONSISTENCIA_TECNICA = `CONSISTÊNCIA TÉCNICA ENTRE MOTORES — obrigatório em ambos, adulto e adolescente:
Sempre que o texto descrever o estado de maturidade de um planeta, a frase DEVE incluir, num ÚNICO parêntese (nunca dois parênteses seguidos na mesma frase), a palavra "avastha" seguida do nome técnico do estado (Bala/Yuva/Vriddha/Mrita), no formato: "...está numa fase de declínio (avastha Vriddha)..." — nunca "...está numa fase (avastha) de declínio (Vriddha)..." (dois parênteses seguidos, proibido — soa a jargão dentro de jargão).
Sempre que o texto descrever uma conjunção (dois traços "fundidos" ou "quase como uma coisa só"), a frase DEVE incluir entre parênteses os dois planetas envolvidos: "...(Lua+Marte fundidos)..."`;

/**
 * CORRECÇÃO 4 (correcção do especialista, ronda seguinte).
 *
 * DESVIO — o texto pedido dizia "que já viste acima" (registo "tu").
 * Esta é uma constante partilhada entre `construirPromptAdulto`
 * ("você") e `construirPromptAdolescente` ("tu") — "viste" (2ª pessoa
 * do singular, pretérito) está certo para o adolescente mas seria
 * gramaticalmente errado no relatório adulto ("você viu", nunca "você
 * viste"). Substituído por "que já foi nomeado acima" — construção
 * impessoal, correcta nos dois registos, sem perder o sentido pedido
 * (referenciar um dom já nomeado antes na secção "Quem é").
 */
// TAREFA #40 (correcção do especialista — MUDANÇA DE ARQUITECTURA) —
// depois de quatro rondas a afinar limiares/gates/desempates dentro de
// `catalogarDestinos()` (cada um resolvendo o caso que o motivou e
// quebrando outro — ver comentário TAREFA #40 em catalogoVocacional.ts),
// a escolha de QUAIS até 3 candidatas mostrar deixa de ser uma fórmula
// numérica e passa a ser um julgamento do próprio LLM, no mesmo sítio
// onde já se confia nele para escrever "Quem é" — porque é aí, e só aí,
// que "esta candidata liga-se com clareza a um dom já nomeado" pode ser
// avaliado de facto, não aproximado por peso ou contagem de camadas.
// CORRECÇÃO (correcção do especialista, ronda seguinte à mudança de
// arquitectura) — a primeira versão desta instrução ("ligação narrativa
// é o critério principal, soma de pesos só desempate") deixava espaço
// para o LLM tratar "Nível 1" como sinónimo de "liga-se melhor" — não
// era essa a intenção (nível é só sobre confiança da escrita, nunca
// sobre elegibilidade), mas na prática, na carta real da Alice, a
// selecção preferiu 3 candidatas Nível 1 (somas 3.86/3.76/3.76, já
// deduplicadas) a "Ciências da Educação" (Nível 2, soma 4.19 — A MAIS
// ALTA DAS 5), só por causa do nível. Correcção: a LIGAÇÃO NARRATIVA
// continua a ser um FILTRO DE ELEGIBILIDADE (nunca escolher uma
// candidata que não se ligue genuinamente a um dom já nomeado) — mas
// deixa de decidir a ORDEM/PRIORIDADE entre as elegíveis. Essa ordem
// passa a ser SEMPRE a soma de pesos (já deduplicada por planeta, ver
// catalogoVocacional.ts), nunca o nível.
// CORRECÇÃO (correcção do especialista — "remover o tecto fixo de 3, com
// agrupamento por cluster") — a versão anterior desta instrução limitava
// a apresentação a "até 3", com a soma de pesos a decidir quais 3 vagas
// eram preenchidas. O especialista pediu para remover esse tecto por
// inteiro: mostrar TODAS as candidatas que passam o Passo 1, sem limite
// artificial nem ranking de "mais importante" — e, quando várias
// partilham a mesma convergência de base (ex.: o cluster de 13 destinos
// ligados à casa 9 exaltada da Alice), agrupá-las na apresentação em vez
// de repetir a mesma explicação astrológica 13 vezes. O Passo 1 (filtro
// de ligação narrativa) e a lógica de soma de pesos NÃO mudam — só deixam
// de servir para CORTAR a três; passam a servir para decidir QUEM fica de
// fora (só quem reprova o Passo 1) e em que ORDEM de apresentação as
// restantes aparecem (nunca como hierarquia de importância).
export const INSTRUCAO_SELECCAO_CANDIDATAS = `APRESENTAÇÃO DAS CANDIDATAS FORA DA LISTA — SEM TECTO DE 3: a secção "Candidatas do catálogo" traz a pool completa (Nível 1 ou 2), sem limite nenhum. A tua tarefa NÃO é escolher até 3 — é decidir quais passam o filtro de ligação narrativa (Passo 1) e apresentar TODAS as que passam, agrupando as que partilham convergência de base quase idêntica (Passo 3). Nunca inventar nenhuma candidata fora da pool; nunca omitir uma candidata elegível só para manter a secção curta.
Processo em TRÊS PASSOS, nesta ordem exacta:
PASSO 1 — FILTRO DE ELEGIBILIDADE (ligação narrativa, único filtro que existe): de toda a pool, elimina qualquer candidata cujas camadas NÃO consigas ligar com clareza a um dom ou traço JÁ NOMEADO na secção "${SECCAO_TITULOS.quemE}" — essa ligação é a mesma que vais citar na frase de abertura obrigatória (ver INSTRUCAO_ABERTURA_CANDIDATAS). Filtro binário (liga-se genuinamente, ou não) — nunca uma escala de "liga-se melhor/pior" entre candidatas que já se ligam, e nunca um segundo filtro de "quantas quero mostrar". TODAS as que passam ficam, sem limite.
PASSO 1B — EXCEPÇÃO CONTROLADA A PARTIR DE "ALTERNATIVAS PELO PERFIL" (correcção do especialista, 21 Set — caso real: convergência 3 de "Engenharia Civil"/"Engenharia de Minas", com Nível 1, ficava de fora inteiramente por estar 1 abaixo do piso de 4, mesmo sendo o sinal mais forte do perfil dessa pessoa; testámos primeiro baixar o piso globalmente e testámos contar tipos de camada distintos — as duas regras numéricas admitiram ruído claro, ex.: "Ciências Militares" e "Técnico de Ourivesaria" tinham exactamente a mesma forma que a Engenharia genuína. Não há atalho numérico — por isso esta excepção pede o MESMO julgamento narrativo do Passo 1, com uma barra mais alta, nunca um número): podes promover um destino de "Alternativas pelo perfil" a candidata SÓ SE, TODAS estas três condições:
(a) tiver Nível 1 ou 2 marcado explicitamente nos dados técnicos ("sem indicador pessoal" = nunca promover, sem excepção nenhuma, mesmo que a ligação narrativa pareça óbvia);
(b) a ligação ao dom já nomeado em "${SECCAO_TITULOS.quemE}" for tão específica quanto a exigida no Passo 1 — nunca uma ligação que serviria igualmente bem para metade dos destinos do catálogo (isso é o sinal de ruído, não de convergência genuína);
(c) na dúvida, NÃO promove — esta excepção existe para os casos claros que o piso deixa de fora por estarem a 1 camada de distância, nunca para encher a secção. Esperado: 0 ou 1 promoções por relatório, raramente mais.
Cada promoção por esta via é OBRIGATORIAMENTE citada, pelo nome, no bloco "${MARCADORES.seleccaoCandidatas}" (ver mais abaixo), com a frase "promovida de Alternativas pelo perfil (Passo 1B)" e a razão específica — nunca silenciosa, nunca indistinguível de uma candidata da pool garantida nesse bloco de raciocínio.
PASSO 2 — ORDEM DE APRESENTAÇÃO (soma de pesos, nunca ranking): entre as candidatas que passaram o Passo 1, ordena a apresentação (grupos e candidatas individuais) pela soma de pesos mais alta primeiro — serve só para dar uma ordem estável ao texto, nunca como hierarquia de importância (ver a regra "SEM RANKING" na secção "${SECCAO_TITULOS.candidataForaDaLista}"). O Nível (1 ou 2) nunca decide inclusão nem ordem — só a linguagem de confiança de cada candidata (INSTRUCAO_NIVEL_CANDIDATAS).
PASSO 3 — AGRUPAMENTO POR ASSINATURA (apresentação, nunca qualificação): os dados técnicos trazem "Grupos de candidatas" — listas de nomes já calculadas deterministicamente cuja convergência de base (o CONJUNTO de tipos de camada, não o texto exacto) é idêntica ou quase idêntica. Para cada grupo em que 2 ou mais membros passaram o Passo 1: escreve a convergência astrológica de base UMA SÓ VEZ para o grupo inteiro num bloco "${MARCADORES.grupo}" (que camadas partilham, o que isso significa em conjunto) — depois, para CADA membro desse grupo que passou o Passo 1, um bloco "${MARCADORES.candidata}" curto (2-4 linhas): porquê esta e não as outras do mesmo grupo, a via concreta dela, prós e contras específicos. NUNCA repetir a convergência de base dentro do bloco de cada candidata — já foi escrita uma vez, no bloco "${MARCADORES.grupo}". Se um grupo, depois do Passo 1, fica com só 1 membro sobrevivente, essa candidata deixa de ser "grupo" — escreve-a no formato individual completo (ver formato exacto na secção "${SECCAO_TITULOS.candidataForaDaLista}"), sem bloco "${MARCADORES.grupo}". Candidatas sem grupo (assinatura própria, nenhuma outra a ≤1 tipo de distância) mantêm sempre o formato individual completo.
REPETIÇÃO ENTRE CANDIDATAS SEM GRUPO FORMAL (correcção do especialista — bug real: duas candidatas sem grupo calculado, mas com o MESMO conjunto de planetas na base da convergência, saíram com a explicação astrológica de base escrita quase palavra por palavra duas vezes seguidas — exactamente a repetição que o agrupamento existe para evitar, só que sem grupo formal para a apanhar): mesmo sem bloco "${MARCADORES.grupo}", se a candidata que vais escrever agora partilha o MESMO conjunto de planetas-base já explicado numa candidata anterior desta secção, NÃO reescrevas essa explicação — refere-a directamente ("a mesma [força/ligação] que já sustenta [nome da candidata anterior]...") e usa o espaço da frase para o que É diferente nesta candidata (a via concreta, o ângulo específico, o que a distingue na prática). Só reescreve a explicação de base por inteiro quando ela usa planetas ou camadas genuinamente diferentes da candidata anterior.
Nunca escolhas só pela contagem de camadas (convergência) — usa sempre a soma de pesos para ordenar.
Antes de qualquer bloco "${MARCADORES.grupo}" ou "${MARCADORES.candidata}", escreve OBRIGATORIAMENTE um bloco único "${MARCADORES.seleccaoCandidatas}" (machine-readable, nunca omitido), explicando em prosa curta: (a) a que dom já nomeado em "${SECCAO_TITULOS.quemE}" cada candidata que passou o Passo 1 se liga, (b) quais candidatas da pool completa (nomeia-as pelo nome, com a sua soma de pesos) reprovaram o Passo 1 e porquê, (c) como as que passaram ficaram agrupadas — que grupos, com que nomes, e quais ficaram individuais, (d) se consideraste alguma "Alternativa pelo perfil" para o Passo 1B — nomeia-a mesmo quando a resposta é não promover (ex.: "considerei X, tem Nível 2, mas a ligação a QUALQUER dom nomeado seria genérica demais, não promovo"); se não havia nenhuma alternativa com Nível 1/2 sequer, di-lo também, numa frase. Este bloco nunca aparece no relatório entregue ao cliente — é só para auditoria interna do raciocínio.
ERRO CONFIRMADO EM GERAÇÕES REAIS (correcção do especialista — nunca repetir isto): candidatas fora de um grupo explícito saíram, por 4 vezes seguidas, formatadas como título markdown em vez do marcador — e mesmo o cabeçalho de um grupo saiu em bold em vez de "${MARCADORES.grupo}". Isto faz a candidata (ou o grupo inteiro) desaparecer do relatório final — o parser só reconhece o marcador literal, nunca markdown como substituto, por mais parecido que pareça a um humano.
ERRADO (nunca escrever assim, para nenhuma candidata, agrupada ou não):
**Ciências da Educação** — Nível 2, liga-se ao dom de ensinar já nomeado acima...
**Grupo 1 — Autoridade institucional**
Este grupo partilha a convergência do Modo de Ganho na casa 10...
CERTO (o único formato que o template reconhece, sempre, mesmo quando o conteúdo da frase é idêntico ao exemplo errado acima):
${MARCADORES.candidata} Ciências da Educação
Liga-se ao dom de ensinar já nomeado acima...
${MARCADORES.grupo} Administração Pública; Gestão
Este grupo partilha a convergência do Modo de Ganho na casa 10...
A diferença entre os dois é só a etiqueta no início da linha — nunca "**Nome** —", sempre "${MARCADORES.candidata} Nome" (ou "${MARCADORES.grupo} nome1; nome2; ..." para grupos, com a lista de nomes separada por ";", nunca só um título descritivo).`;

// Correcção do especialista ("candidata voltou, pior") — a 1ª versão
// desta regra ("NUNCA A PALAVRA CANDIDATA(S)...") explicava a proibição
// repetindo a própria palavra proibida cerca de 9 vezes num único
// parágrafo. Resultado real: a palavra apareceu MAIS no texto visível
// depois desta instrução, não menos — o padrão clássico de "não penses
// num elefante", onde repetir uma palavra (mesmo a proibir) aumenta a
// probabilidade de o LLM a gerar. Reescrita para nunca nomear a palavra
// proibida — só descreve o comportamento desejado, uma vez, em
// linguagem positiva. A garantia real já não depende disto: o template
// (`web/src/lib/relatorioTemplate.ts`, função `semPalavraCandidata`)
// substitui deterministicamente qualquer ocorrência que ainda escape,
// exactamente pelo mesmo motivo que EXPLICAÇÃO_GRÁFICO deixou de
// depender do LLM nesta sessão — esta instrução é só a 1ª linha de
// defesa, não a garantia. Constante partilhada (promptAdulto.ts e
// promptAdolescente.ts) para nunca divergir entre os dois motores.
export const INSTRUCAO_NUNCA_CANDIDATA = `Na prosa que a pessoa lê — abertura de grupo, texto de cada opção, qualquer secção — chama a cada uma destas áreas "opção" ou "opções". O termo usado nos dados técnicos abaixo é só para uso interno teu, nunca para o texto final.`;

// Correcção do especialista ("dom/talento em vez de percurso", pós-PDF
// real) — as descrições de cada candidata estavam centradas em duração
// de curso e trajecto académico, sem nunca dizer o essencial: PORQUÊ
// esta pessoa tem talento nato para esta área. A instrução anterior
// ("liga-se a um dom já nomeado em Quem é") ainda deixava a ligação
// vaga — o LLM tinha de escolher livremente A QUE dom ligar. Agora o
// factor concreto já vem dado, por candidata, calculado deterministica-
// mente pelo mesmo portão que já decidiu o Nível dela (Planeta de maior
// peso, Atmakaraka, Amatyakaraka, Stellium, ou Regente da casa
// dignificado) e já traduzido para linguagem humana por
// `rotuloHumanoCamada()` — o MESMO tradutor usado no cartão "Porque
// esta opção não é acidente", nunca um segundo mecanismo a divergir
// dele. O LLM nunca escolhe nem traduz o factor — só o usa.
export const INSTRUCAO_ABERTURA_CANDIDATAS = `CANDIDATA FORA DA LISTA — ABRE SEMPRE COM O DOM, E NUNCA MENCIONA PERCURSO/DURAÇÃO/VIA DE ENTRADA NO CORPO DO TEXTO: cada candidata (individual, ou o bloco "${MARCADORES.grupo}" partilhado) DEVE abrir com uma frase sobre o dom/talento inato que a liga a esta área, e o resto do texto explica SÓ isto: porque é que esta área faz sentido especificamente dentro deste perfil. Duração de formação, trajecto académico e via de entrada NUNCA aparecem como frase no corpo do texto — essa informação vive só nas linhas "${MARCADORES.viaResumida}"/"${MARCADORES.custoPrincipal}" (ver instrução própria abaixo), que alimentam a tabela-resumo no fim da secção. Repetir essa informação como prosa é redundante com a tabela — não o faças.
A frase de dom usa sempre o "FACTOR DE DOM" já dado nos dados técnicos desta candidata (já traduzido para linguagem humana — nunca inventes outro factor, nunca traduzas tu mesmo o jargão astrológico, usa a tradução exacta dada, citada quase literalmente).
CORRECÇÃO DO ESPECIALISTA (ronda "relatório Marta", ponto 9b) — o CONTEÚDO é obrigatório (ligar o FACTOR DE DOM a uma qualidade concreta e específica desta área — nunca genérica, nunca "tens talento para liderança" sem mais nada), mas a FRASE em si tem de VARIAR de candidata para candidata dentro do mesmo relatório — nunca o mesmo molde repetido ipsis verbis dezenas de vezes ao longo da lista, mesmo trocando só o nome da qualidade. Eis exemplos de estruturas diferentes para alternar entre elas (não uma lista fechada — qualquer frase que ligue claramente o FACTOR DE DOM à qualidade concreta e varie a construção serve):
- "O [FACTOR DE DOM] traduz-se aqui em [qualidade concreta] — [porquê esta área em particular]."
- "[Qualidade concreta] é o que o [FACTOR DE DOM] já sustenta, e é exactamente isso que esta área pede."
- "Esta área pede [qualidade concreta] — e é precisamente aí que o [FACTOR DE DOM] mais se nota."
- "Há uma ligação directa entre o [FACTOR DE DOM] e [qualidade concreta], o que torna esta área um encaixe natural."
PROIBIDO usar a mesma estrutura de frase (ex.: "[FACTOR] indica uma capacidade natural para [qualidade], é isto que a distingue") em 3 ou mais candidatas seguidas — se notares que vais repetir a mesma construção uma terceira vez seguida, muda de estrutura antes de escrever essa frase.
Depois da frase de dom, o resto do texto (1 a 3 frases) aprofunda SÓ o porquê estrutural — que outros sinais da carta (regência de casa, dignidade, yoga, o que a carta sustenta noutras secções) reforçam esta ligação. Nunca introduzir percurso/formação aqui.
GRUPOS (correcção do especialista — agrupamento por cluster): quando várias candidatas partilham bloco "${MARCADORES.grupo}", a frase de dom é escrita UMA VEZ nesse bloco (usa o "FACTOR DE DOM" da primeira candidata do grupo — os membros de um grupo partilham quase sempre o mesmo factor, por serem a mesma convergência de base) — os blocos "${MARCADORES.candidata}" dentro do grupo NÃO repetem a frase de dom, vão directos à diferenciação específica de cada uma (porque É QUE esta em particular, dentro do grupo, faz sentido — nunca percurso).
Obrigatório em todas as candidatas apresentadas, individuais ou em grupo (uma vez por grupo, uma vez por individual), sem excepção — nunca omitir só porque a pool tem muitas candidatas.`;

// TAREFA #38 (correcção do especialista, sistema em dois níveis) —
// dados técnicos: cada candidata fora da lista chega com "Nível 1" ou
// "Nível 2" (ver blocoCatalogoVocacional acima). Sem esta instrução, o
// LLM trataria as duas com a mesma confiança, porque ambas passam o
// limiar de ≥4 camadas — mas ≥4 camadas com Atmakaraka/Amatyakaraka
// sozinho (Nível 2) é um sinal genuíno e mais fraco do que ≥4 camadas
// com o planeta de maior peso (Nível 1), pelo mesmo princípio já usado
// para yogas (INSTRUCAO_YOGAS: "confirmação directa" vs "reforço
// geral") e para a ESCALA DE CONFIANÇA geral do relatório (nº de
// camadas ↔ força da linguagem) — aqui aplicado dentro da própria
// categoria "≥4 camadas", que a escala geral trata sempre como
// "convergência forte, sem reserva".
export const INSTRUCAO_NIVEL_CANDIDATAS = `NÍVEL DE CONFIANÇA DA CANDIDATA FORA DA LISTA — cada candidata vem marcada nos dados técnicos como "Nível 1" ou "Nível 2". Nunca as escrevas com a mesma confiança:
· Nível 1 (inclui o planeta de maior peso): escreve com confiança plena, sem qualquer qualificador — é a peça mais forte do perfil a confirmar esta direcção.
· Nível 2 (âncora pessoal — Atmakaraka, Amatyakaraka, Stellium, ou Regente de casa dignificado — mas sem o planeta de maior peso): é um sinal real, nunca inventado — mas mais específico e menos robusto do que Nível 1. A frase tem de o dizer, com linguagem como "há aqui um fio que vale a pena puxar" / "não é o sinal mais forte do perfil, mas é genuíno e específico" / "vale explorar, sem ser ainda uma certeza estrutural". PROIBIDO escrever uma candidata Nível 2 com a mesma linguagem sem reserva de "o seu perfil sustenta X com clareza" que a escala de confiança geral reserva para convergência forte — aqui a convergência existe, mas a sua origem (um indicador pessoal específico, não o planeta mais forte da carta) pede a reserva.
Nunca omitir nem suavizar a diferença chamando as duas de "candidata" sem mais nada — o nível tem de ser audível na frase, não só presente nos dados.
GRUPOS COM NÍVEIS MISTOS (correcção do especialista — agrupamento por cluster): um grupo pode ter membros de Nível 1 e Nível 2 ao mesmo tempo (a convergência de base é quase idêntica, mas o indicador pessoal que ancora cada destino pode ser diferente). O bloco "${MARCADORES.grupo}" nunca assume um nível único para o grupo inteiro — a linguagem de confiança (plena ou com reserva) é sempre decidida dentro do bloco "${MARCADORES.candidata}" de cada membro, de acordo com o Nível PRÓPRIO dessa candidata
VERIFICAÇÃO OBRIGATÓRIA, CANDIDATA A CANDIDATA (correcção do especialista — bug real: uma candidata Nível 2 saiu escrita com a mesma confiança plena de uma Nível 1): antes de dares a secção por terminada, relê o parágrafo de CADA candidata marcada "Nível 2" nos dados técnicos e confirma que contém um dos qualificadores de reserva pedidos acima ("vale a pena puxar" / "não é o sinal mais forte" / "vale explorar, sem ser ainda certeza"). Se faltar, reescreve essa frase antes de terminar — não avances com uma candidata Nível 2 em linguagem de certeza plena.`;

// CORRECÇÃO 1 (correcção do especialista, confirmada com 3 relatórios
// reais) — a versão anterior ("TEM de incluir... este traço é
// estrutural...") já era obrigatória em teoria, mas deixava a frase
// exacta ao critério do LLM; nos 3 relatórios reais revistos, Vargottama
// nunca apareceu apesar de estar calculado (confirmado por diagnóstico:
// tanto esta instrução como os dados "-- Vargottama --" chegam ao prompt
// real, ver relatório da ronda). Versão mais directiva: um padrão de
// frase quase literal, não uma paráfrase livre. "Carta" substituído por
// "perfil" no texto pedido — a palavra "carta" está proibida em todo o
// relatório desde uma correcção anterior (TAREFA 3D).
export const INSTRUCAO_VARGOTTAMA = `VARGOTTAMA — INSTRUÇÃO OBRIGATÓRIA: se existe planeta Vargottama, a secção "${SECCAO_TITULOS.quemE}" DEVE conter uma frase com este padrão exacto: "[Nome do planeta em português] é o traço mais estável deste perfil — aparece com a mesma força em duas dimensões independentes do perfil, o que significa que não muda com as circunstâncias nem depende de esforço para existir." Esta frase é obrigatória. Se não existe planeta Vargottama, não mencionar.`;

// AUDITORIA (correcção do especialista — bug real, confirmado em DUAS
// gerações reais seguidas do relatório da Alexandra: o Karakamsha nunca
// foi mencionado nem traduzido em nenhuma delas, apesar dos dados
// (karakamshaSign/karakamshaHouse) estarem sempre presentes em
// `blocoEixoMissao`). Causa: a instrução de leitura conjunta obrigatória
// existia só como uma frase genérica dentro de "REGRA CRÍTICA — LEITURA
// CONJUNTA" (construirPromptAdulto) e nem existia no ramo adolescente
// (promptAdolescente.ts tinha "Eixo da Missão" como bloco único, sem
// separar o Karakamsha como o seu próprio passo obrigatório). Mesmo
// padrão já provado a funcionar com Vargottama (INSTRUCAO_VARGOTTAMA
// acima): uma instrução obrigatória e autónoma, não só uma frase a mais
// dentro de uma regra maior — mas aqui sem template literal fixo (ao
// contrário de Vargottama), porque a tradução de signo+casa em
// linguagem simples depende de dados reais que não podem ser
// pré-escritos sem risco de inventar conteúdo astrológico errado.
export const INSTRUCAO_KARAKAMSHA = `KARAKAMSHA — INSTRUÇÃO OBRIGATÓRIA, AUTÓNOMA (nunca só uma frase dentro de outra regra): a secção "${SECCAO_TITULOS.quemE}" TEM de conter, logo a seguir à leitura do Atmakaraka, uma frase ou parágrafo próprio e distinto que traduza o Karakamsha (signo + casa a partir do Ascendente, dados em "Eixo da Missão" abaixo) em linguagem simples e concreta — nunca a palavra "Karakamsha" em si (está na lista de termos proibidos, tal como "Atmakaraka"), mas o que ela significa na prática: onde e como essa força/missão mais profunda encontra expressão concreta no dia-a-dia desta pessoa. Nunca tratar como repetição da leitura do Atmakaraka — é a confirmação e afinação prática dele, um passo à frente, não a mesma frase com outras palavras. Esta frase é obrigatória sempre — os dados de Karakamsha estão sempre presentes
EXCLUSIVO DE "${SECCAO_TITULOS.quemE}" (correcção do especialista — bug real: esta leitura saiu duplicada, quase palavra por palavra, também em "${SECCAO_TITULOS.oQueACartaSustenta}"): esta tradução do Karakamsha é escrita UMA ÚNICA VEZ, só aqui, nunca reaparece — nem por outras palavras — em "${SECCAO_TITULOS.oQueACartaSustenta}" nem em nenhuma outra secção (ver REGRA ANTI-REPETIÇÃO). Ao escreveres "${SECCAO_TITULOS.oQueACartaSustenta}", o Eixo da Missão é traduzido de novo, mas a partir do ângulo do Modo de Ganho e da acção prática — nunca repetindo a frase ou a conclusão já usada aqui para o Karakamsha.`;

// DESVIO (correcção do especialista — "EXPLICAÇÃO_GRÁFICO, mudança de
// abordagem") — chegou a existir aqui uma INSTRUCAO_EXPLICACAO_GRAFICOS,
// pedindo ao LLM para escrever 4 blocos machine-readable explicando os
// gráficos "peso"/"competencias"/"vida"/"ganho", linha a linha. Depois
// de 5 gerações reais seguidas sem NENHUMA ocorrência desses blocos —
// apesar da instrução, de exemplos negativos explícitos, e de um
// critério na crítica automática a forçar reescrita quando faltassem —
// a decisão foi abandonar esta secção como responsabilidade do LLM. A
// explicação dos 4 gráficos é agora gerada 100% por código, directamente
// em relatorioTemplate.ts (funções `explicacaoXDeterministica`), a
// partir dos mesmos dados que os próprios gráficos usam. Os marcadores
// "EXPLICAÇÃO_GRÁFICO:"/"LINHA_GRÁFICO:" continuam em MARCADORES só
// para o template conseguir limpar defensivamente texto residual de
// rascunhos antigos (gerados antes desta correcção) — nunca mais são
// pedidos ao LLM.

// Correcção do especialista (bug crítico — pergunta concreta sem
// resposta directa) — diagnóstico directo com o relatório real da
// Alexandra: perguntou "seria gestão ou economia?", o relatório
// respondeu "economia" nalgum ponto do texto mas depois sugeriu
// "Direito" como candidata fora da lista sem nunca reconhecer que isso
// contradiz a resposta já dada — as duas afirmações coexistiam sem
// nenhuma relação entre si. Esta instrução obriga (a) a secção "Leitura
// por opção" a abrir SEMPRE com a resposta directa, antes de qualquer
// outra análise, quando existe pergunta específica declarada, e (b) a
// secção "Candidata fora da lista" a nunca deixar uma contradição
// directa por explicar. Constante partilhada (promptAdulto.ts e
// promptAdolescente.ts) — nunca diverge entre os dois motores.
//
// BUG REAL, corrigido (ronda "relatório Alexandra 2", regeneração
// pós-correcção do timeout) — a correcção acima resolveu a ambiguidade,
// mas abriu uma segunda: quando "opcaoMaisProvavel" faz uma pergunta em
// formato sim/não ("É 'gestão' mesmo a mais provável?"), "resposta clara
// e sem rodeios" degenerava num "não" seco, repetido ao pé da letra em
// "Abertura" e em "Leitura por opção" (por desenho — "nunca contradita")
// — texto real confirmado: "...tem resposta directa: não é a opção mais
// sustentada..." e, na segunda secção, "...tem resposta directa: não —
// direito tem mais sustentação estrutural...". Um "não" seco a responder
// à própria escolha da pessoa É um veredicto fechado, só disfarçado de
// resposta directa — a mesma coisa que "zero fatalismo" (ver
// INSTRUCAO_GERAL/regras gerais, abaixo) proíbe explicitamente. A
// correcção agora é impedir as duas falhas ao mesmo tempo: continua
// proibido fugir à resposta (bug original), mas a resposta nunca pode
// ser um "sim"/"não" isolado nem funcionar como veredicto sobre a opção
// que a pessoa já tinha em mente.
export const INSTRUCAO_PERGUNTA_ESPECIFICA = `PERGUNTA ESPECÍFICA — OBRIGATÓRIO: se existe uma pergunta específica declarada, a secção "${SECCAO_TITULOS.leituraPorOpcao}" tem de abrir, antes de qualquer outra análise, com a resposta directa a essa pergunta, neste formato: "A pergunta [citar a pergunta tal como foi escrita] tem resposta directa: [o que o perfil sustenta com mais força]. Aqui está porquê: [razão técnica em linguagem simples]."
PROIBIDO responder com um "sim"/"não" isolado, ou qualquer variante que funcione como veredicto sobre a opção que a pessoa já tinha em mente (proibido, por exemplo: "não é a opção mais sustentada", "não — [outra opção] tem mais sustentação estrutural"). Isso é exactamente o veredicto fechado que a regra "zero fatalismo" proíbe, só disfarçado de resposta directa. A resposta directa descreve sempre o que o perfil sustenta, nunca julga se a pessoa acertou ou errou na própria pergunta. Os exemplos abaixo ilustram só o CONTEÚDO da parte "[o que o perfil sustenta com mais força]" do template no início desta instrução — NUNCA substituem o template inteiro, que continua obrigatório da primeira à última palavra (correcção do especialista, bug real, critério 28: numa ronda real a secção "${SECCAO_TITULOS.leituraPorOpcao}" abriu directamente com "O perfil sustenta economia e gestão com mais força estrutural do que direito..." — exactamente o texto do exemplo "Correcto" abaixo, mas SEM o prefixo obrigatório "A pergunta [...] tem resposta directa:" à frente; o modelo copiou o exemplo tal como está escrito em vez de o encaixar dentro do template completo). Errado (frase isolada, nunca aparece assim, nem dentro nem fora do template): "não, direito é mais sustentado do que gestão." Correcto (é só o CONTEÚDO — encaixa sempre a seguir a "tem resposta directa:", nunca como abertura sozinha da secção): "[...] tem resposta directa: O perfil sustenta [opção com mais força] com mais força estrutural do que [opção da pergunta] neste momento — isso não torna [opção da pergunta] uma escolha errada, é informação para pesar. Aqui está porquê: [razão técnica]." A directeza exigida é sobre NUNCA fugir à resposta (o bug original desta regra) — não sobre reduzir a resposta a um veredicto de uma palavra.
NUNCA apresentar, na secção "${SECCAO_TITULOS.candidataForaDaLista}", uma candidata que contradiga directamente essa resposta sem o dizer de forma explícita — se uma candidata fora da lista vai numa direcção diferente da resposta já dada, o texto dessa candidata tem de reconhecer a tensão ("isto parece contradizer a resposta dada a [pergunta] — mas..." ou equivalente) ou, se a contradição não tiver explicação defensável, essa candidata não é apresentada. Nunca deixar as duas respostas a coexistir sem relação nenhuma entre si — é essa a contradição que esta regra existe para impedir
DUAS FRASES OBRIGATÓRIAS, NUNCA SÓ A PRIMEIRA (correcção do especialista — bug real: o texto parou depois de "sustenta X com mais força estrutural do que Y", sem a frase de fecho, o que a torna um veredicto fechado disfarçado): o parágrafo de resposta directa só está completo com a frase de fecho tipo "isso não torna [opção da pergunta] uma escolha errada, é informação para pesar" (ou equivalente) — sem ela, mesmo que a primeira frase esteja correcta, o parágrafo inteiro é FALHA. Confirma as duas frases antes de avançar para o resto da secção.
OPÇÃO NOMEADA NA PERGUNTA MAS SEM SUPORTE NO PERFIL — NUNCA SILÊNCIO (correcção do especialista, bug real, caso Alexandra: a pergunta nomeava três opções — "economia, gestão ou direito" — mas só duas eram opções declaradas em "Opções em cima da mesa"; a terceira nunca apareceu no relatório final, nem como opção declarada, nem como candidata fora da lista, nem sequer mencionada uma vez a dizer porque ficou de fora. Silêncio total sobre um terço da própria pergunta da pessoa — o oposto do que "resposta directa" significa): se a pergunta específica (ou a preferência da família) nomeia uma área concreta que NÃO está nas opções declaradas NEM aparece, com nenhum nome, na pool de candidatas do catálogo fornecida (nem em "Candidatas do catálogo" nem em "Grupos de candidatas"), essa ausência já É o resultado do cálculo determinístico — não convergiu o suficiente para entrar na pool. Isso não é licença para a ignorares — é precisamente a resposta que falta dar. Nesse caso, a resposta directa (aqui e em "${SECCAO_TITULOS.abertura}") tem de, numa frase curta a seguir à resposta principal, nomear essa área explicitamente e dizer, com base em sinais REAIS já estabelecidos em "${SECCAO_TITULOS.quemE}" (nunca inventando um sinal novo só para justificar), porque é que o perfil não a destacou com a mesma força das áreas analisadas a seguir. Nunca criar um bloco "### " para ela (não é opção declarada) nem um bloco de candidata fora da lista (não está na pool) — só esta frase curta de reconhecimento explícito, nunca omitida.
NUNCA REPETIR A CONCLUSÃO JÁ DADA (correcção do especialista, bug real, ronda seguinte: a frase de reconhecimento tornou-se um parágrafo inteiro à parte, dentro da própria "${SECCAO_TITULOS.abertura}", que voltava a explicar qual área é mais forte, quase com as mesmas palavras da resposta directa dada no parágrafo anterior — repetição da mesma conclusão dentro da MESMA secção, exactamente o que a regra de REPETIÇÃO proíbe, mesmo não sendo entre "${SECCAO_TITULOS.abertura}" e "${SECCAO_TITULOS.leituraPorOpcao}"): esta frase de reconhecimento NUNCA re-deriva nem repete qual área tem mais força — isso já foi dito na resposta directa, no mesmo parágrafo ou no parágrafo imediatamente anterior. Vai directa à área ausente específica e à razão CONCRETA da sua própria ausência (um sinal real do perfil que explica essa área em particular, não uma repetição da comparação geral entre todas as áreas). É literalmente UMA frase dentro do mesmo bloco de texto da resposta directa, nunca um parágrafo novo a seguir.`;

// Correcção do especialista (bug crítico — abertura não responde à
// situação da pessoa) — a mesma ronda de diagnóstico da Alexandra
// confirmou que o primeiro parágrafo do relatório abria por dados
// técnicos/enquadramento genérico, nunca respondendo de frente à
// pergunta ou à falta dela. Reaproveita o mesmo formato de
// INSTRUCAO_PERGUNTA_ESPECIFICA para nunca divergir entre as duas
// secções que citam a mesma resposta.
export const INSTRUCAO_ABERTURA_RESPONDE = `ABERTURA DO RELATÓRIO — OBRIGATÓRIO: o primeiro parágrafo da secção "${SECCAO_TITULOS.abertura}" responde directamente à situação da pessoa — nunca começa por dados técnicos, gráficos ou análise abstracta.
Se existe pergunta específica declarada: usa o mesmo formato exigido em PERGUNTA ESPECÍFICA (ver INSTRUCAO_PERGUNTA_ESPECIFICA) — a resposta directa aparece já aqui, no primeiro parágrafo, e é retomada (nunca contradita) quando a secção "${SECCAO_TITULOS.leituraPorOpcao}" a repetir.
Se NÃO existe pergunta específica declarada: abre com uma âncora baseada nos dados — nomeia directamente 2 a 3 pontos onde o perfil sustenta força natural, em linguagem directa, sem preâmbulo técnico. Exemplo de formato: "Ainda não há uma direcção clara — e isso é mais comum do que parece. O que os dados mostram é força natural para [X] e [Y]. É por aí que vale começar."
Proibido abrir com "o perfil mostra", "os dados indicam", o nome de um eixo técnico, ou qualquer formulação abstracta antes desta resposta/âncora.`;

// Correcção do especialista (bug crítico — validação directa das
// opções declaradas) — a secção "Leitura por opção" descrevia prós e
// contras de cada opção mas nem sempre chegava a uma conclusão
// explícita, deixando a pessoa sem saber se o perfil sustenta ou não
// cada opção que já tinha em cima da mesa.
export const INSTRUCAO_VALIDACAO_OPCOES = `VALIDAÇÃO DAS OPÇÕES DECLARADAS — OBRIGATÓRIO: para cada opção que a pessoa declarou, a secção "${SECCAO_TITULOS.leituraPorOpcao}" tem de terminar com uma de três conclusões explícitas, sem deixar a leitura em aberto:
· "O perfil sustenta esta opção com clareza — aqui está porquê: [razão técnica]."
· "O perfil sustenta esta opção parcialmente — o que vai a favor é [X], o que vai exigir mais esforço é [Y]."
· "O perfil não sustenta esta opção de forma natural — não é impossível, mas vai custar mais do que as alternativas. Aqui está porquê: [razão técnica]."
Nunca deixar uma opção sem nenhuma destas três conclusões, e nunca escrever prosa que descreve prós/contras sem chegar a uma delas — a pessoa tem de ficar a saber, sem ambiguidade, qual das três se aplica a cada opção que trouxe.`;

// Correcção do especialista (bug crítico — plano em datas vagas) — "O
// plano" usava datas fixas do calendário ou períodos vagos ("nos
// próximos tempos"), que envelhecem mal (um relatório lido 6 meses
// depois de gerado com uma data fixa perde sentido) e raramente
// davam uma acção verificável.
export const INSTRUCAO_PLANO_PERIODOS_RELATIVOS = `O PLANO — FORMATO OBRIGATÓRIO: usa sempre períodos relativos ao momento da leitura, nunca datas fixas nem meses do calendário (excepção: a data em que a Mahadasha/Antardasha actual termina, já dada nos dados técnicos, mantém-se como data real). Estrutura obrigatória, cada uma com uma acção CONCRETA e ESPECÍFICA (nunca genérica):
"Nas próximas 2 semanas: [acção concreta e específica]."
"No próximo mês: [acção concreta e específica]."
"Nos próximos 3 meses: [acção ou decisão concreta]."
"Nos próximos 6 a 12 meses: [decisão maior]."
Correcto: "Falar com um profissional da área X durante 30 minutos sobre o dia a dia real da profissão." Proibido: "Explorar opções na área X" ou qualquer acção que sirva para qualquer pessoa em qualquer área — tem de ser rastreável a esta pessoa e a esta opção especificamente.`;

// Correcção do especialista (nova secção "Para que tem facilidade
// natural") — os níveis já vêm calculados deterministicamente (ver
// facilidadesNaturais.ts); esta instrução só governa como a secção
// "Quem é" pode CITAR esse dado já calculado, nunca recalculá-lo nem
// inventar categorias novas.
export const INSTRUCAO_FACILIDADES_NATURAIS = `PARA QUE TEM FACILIDADE NATURAL: esta secção já vem calculada nos dados técnicos ("-- Para que tem facilidade natural --" abaixo) — 6 categorias fixas, cada uma já com o nível (Alto/Médio/Baixo) resolvido a partir dos pesos planetários desta pessoa. Na secção "${SECCAO_TITULOS.quemE}", referencia pelo menos 2 das categorias marcadas "Alto" como confirmação adicional dos dons já nomeados — nunca inventes uma categoria que não esteja nesta lista, nunca mudes o nível dado, e nunca a apresentes como uma secção à parte (os cartões visuais já existem fora do teu texto — a tua tarefa é só tecê-la na narrativa de "${SECCAO_TITULOS.quemE}").`;

/**
 * ORDEM do especialista ("novo parágrafo de abertura em 'Opções que
 * ainda não considerou', anti 'isto dá para tudo'") — risco real do
 * cliente concluir "isto dá para tudo, não é específico para mim" ao
 * ler a lista de candidatas, o que mina a credibilidade central do
 * produto. Texto evergreen, aplica-se a qualquer cliente — a ÚNICA
 * parte variável são as duas opções citadas como exemplo de convergência
 * partilhada, e essas vêm SEMPRE de `catalogo.parOpcoesContraste`
 * (`escolherParOpcoesContraste`, catalogoVocacional.ts — reaproveita a
 * mesma lógica que já forma os "Grupos de candidatas", nunca hardcoded,
 * nunca inventado). O parágrafo inteiro (já com as duas opções reais
 * substituídas) é dado ao LLM PRONTO A COPIAR — nunca pedido ao LLM
 * para preencher {OPÇÃO_A}/{OPÇÃO_B} ele próprio, o mesmo motivo por
 * trás de EXPLICAÇÃO_GRÁFICO ter deixado de depender do LLM: texto que
 * tem de sair exactamente igual não pode depender de reprodução fiel
 * por geração — só a DECISÃO de quais duas opções usar é que precisa
 * de dados reais, e essa já vem resolvida por código antes de chegar
 * aqui.
 *
 * DESVIO — o texto original do especialista dizia "concentrada no seu
 * mapa"; "mapa" (como "carta"/"mapa astral"/"mapa natal") está proibido
 * em todo o relatório desde a TAREFA 3D — substituído por "perfil",
 * sem alterar o sentido, para não reintroduzir a própria palavra que
 * essa correcção anterior existe para banir.
 *
 * `null` quando `parOpcoesContraste` é `null` (pool com menos de 2
 * candidatas) — nesse caso a secção já cai na regra "nenhuma"/candidata
 * única, e o risco "dá para tudo" não se aplica.
 */
export function paragrafoAntiDaParaTudo(par: [string, string] | null, usarTu: boolean): string | null {
  if (!par) return null;
  const [opcaoA, opcaoB] = par;
  if (usarTu) {
    return `Vais reparar que esta lista atravessa áreas muito diferentes entre si — algumas técnicas, outras humanistas, outras de contacto directo com pessoas, outras de trabalho solitário. Isso não significa que o teu perfil sirva para tudo. Significa precisamente o contrário: existe uma força concreta e concentrada no teu perfil — não um conjunto disperso de talentos genéricos — que pode encontrar expressão em superfícies muito diferentes. A mesma raiz que sustenta ${opcaoA} sustenta também ${opcaoB} — duas áreas que, à primeira vista, pouco têm em comum. O nome da profissão muda; a raiz que a sustenta é sempre a mesma — e é essa raiz, não a lista de nomes, que é a informação real deste capítulo.

Por isso, a forma certa de ler o que se segue não é perguntar "para quantas destas é que eu sirvo?" — é perguntar "qual destas, ao lê-la, me faz parar?". Não precisas de escolher nenhuma agora, nem de levar todas a sério com o mesmo peso. Precisas só de notar qual delas ressoa quando a lês — é aí, e só aí, que esta lista se torna útil para ti, e não uma colecção de possibilidades quaisquer.`;
  }
  return `Vai reparar que esta lista atravessa áreas muito diferentes entre si — algumas técnicas, outras humanistas, outras de contacto directo com pessoas, outras de trabalho solitário. Isso não significa que o seu perfil sirva para tudo. Significa precisamente o contrário: existe uma força concreta e concentrada no seu perfil — não um conjunto disperso de talentos genéricos — que pode encontrar expressão em superfícies muito diferentes. A mesma raiz que sustenta ${opcaoA} sustenta também ${opcaoB} — duas áreas que, à primeira vista, pouco têm em comum. O nome da profissão muda; a raiz que a sustenta é sempre a mesma — e é essa raiz, não a lista de nomes, que é a informação real deste capítulo.

Por isso, a forma certa de ler o que se segue não é perguntar "para quantas destas é que eu sirvo?" — é perguntar "qual destas, ao lê-la, me faz parar?". Não precisa de escolher nenhuma agora, nem de levar todas a sério com o mesmo peso. Precisa só de notar qual delas ressoa quando a lê — é aí, e só aí, que esta lista se torna útil para si, e não uma colecção de possibilidades quaisquer.`;
}

export function construirPromptAdulto(
  intake: VocationiqIntakeAdulto,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
  catalogo: ResultadoCatalogoVocacional,
  savPorCasa: SavPorCasa[],
  elementosModalidades: PerfilElementosModalidades,
  aspectosPessoais: AspectoPessoal[],
  cursosPorDestino: Record<string, CursosSugeridos>,
  /** 4 camadas técnicas (correcção do especialista) — avastha/conjunções/Vargottama vêm todos de `d1` (já calculados por `computeD1Table`, nunca recalculados aqui); `yogas` vem de `detectYogas(d1)`, já filtrado pelo chamador (sem os hits `neechabhanga_*`, ver `blocoYogas`). */
  d1: D1TableResult,
  yogas: YogaHit[],
): string {
  const candidatas = candidatasDeclaradas(intake);

  // Correcção do especialista (bug crítico — pergunta específica
  // silenciosamente ignorada) — confirmado por verificação directa do
  // texto do prompt: `perguntaEspecifica`/`paraOndeQuerIr` só eram
  // mostrados ao LLM quando a pessoa NÃO tinha declarado opções
  // concretas (`!candidatas.length`). Isto é exactamente o caso mais
  // comum de todos — alguém que já sabe o que quer ("gestão ou
  // economia?") e TAMBÉM declara essas opções — e nesse caso a
  // pergunta desaparecia do prompt por inteiro, mesmo com
  // INSTRUCAO_PERGUNTA_ESPECIFICA/INSTRUCAO_ABERTURA_RESPONDE a exigir
  // uma resposta directa a algo que o LLM nunca chegava a ver. A ideia
  // concreta mantém-se condicionada (já tinha uma 2ª linha própria só
  // para o caso "com candidatas", ver mais abaixo) — só a pergunta
  // específica e "para onde quer ir" passam a ser sempre mostradas.
  const linhasTextoLivre = [
    intake.paraOndeQuerIr && `"Para onde quer ir": ${normalizarTextoLivre(intake.paraOndeQuerIr)}`,
    intake.perguntaEspecifica && `Pergunta específica: ${normalizarTextoLivre(intake.perguntaEspecifica)}`,
    !candidatas.length && intake.ideiaConcreta && `Ideia concreta: ${normalizarTextoLivre(intake.ideiaConcreta)}`,
  ].filter((l): l is string => Boolean(l));
  const blocoTextoLivre = linhasTextoLivre.length ? linhasTextoLivre.join("\n") : !candidatas.length ? "(nenhum texto livre preenchido — escreve só a partir do que o perfil sustenta em geral.)" : "";

  // ORDEM do especialista ("novo parágrafo de abertura em 'Opções que
  // ainda não considerou', anti 'isto dá para tudo'") — ver
  // paragrafoAntiDaParaTudo acima.
  const paragrafoAntiDaParaTudoTexto = paragrafoAntiDaParaTudo(catalogo.parOpcoesContraste, false);

  return `
És um especialista em análise vocacional. Vais escrever um relatório personalizado para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- LÍNGUA — OBRIGATÓRIO 100% PORTUGUÊS: todo o texto visível ao cliente, em TODAS as secções, tem de estar inteiramente em português — nunca uma palavra ou expressão em inglês a meio de uma frase portuguesa (ex.: "already", "however", "overview"), mesmo que pareça natural nesse ponto da frase. Isto aplica-se mesmo a nomes próprios de sinais/planetas quando têm tradução comum em português (ex.: "Sol", nunca "Sun"). Revê a frase inteira antes de a dar como terminada — um único termo em inglês invalida a frase.
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Você tem..." / "O seu perfil sustenta...", nunca "Marte na casa X indica...").
- REGRA CRÍTICA DE TRATAMENTO: Usa SEMPRE "você" — nunca "tu", nunca "teu/tua", nunca "tens". Esta regra não tem excepção. Exemplos correctos: "você tem", "o seu perfil", "para si". Exemplos proibidos: "tu tens", "o teu perfil", "para ti".
- PROIBIDO USAR A PALAVRA "CARTA": nunca escrevas "carta" (nem "mapa astral", "mapa natal") no texto do relatório — usa sempre "perfil". Correcto: "o seu perfil sustenta X". Proibido: "a sua carta sustenta X". Esta proibição aplica-se a TODO o relatório sem excepção (correcção do especialista — bug real: "o planeta de maior peso de toda a tua carta" apareceu dentro de um bloco "${MARCADORES.candidata}", já longe desta regra no prompt) — inclui, em particular, o texto dentro de cada bloco "${MARCADORES.candidata}"/"${MARCADORES.grupo}" em "${SECCAO_TITULOS.candidataForaDaLista}", onde já reincidiu.
- PROIBIDO: primeira pessoa do plural — REGRA GERAL, não uma lista fechada (correcção do especialista — bug real: "nomeámos" passou porque só constava uma lista de exemplos, não a regra gramatical em si): qualquer verbo conjugado na 1ª pessoa do plural ("nós"), com a terminação típica "-ámos"/"-emos"/"-imos" ou equivalente ("identificámos", "vimos", "calculámos", "sabemos", "analisámos", "concluímos", "nomeámos", "referimos", e qualquer outro verbo na mesma forma, mesmo que não esteja nesta lista de exemplos), é proibido — o relatório fala só da pessoa, nunca do "nós" de quem o escreveu. Antes de usar um verbo assim, pergunta-te: "quem é o sujeito desta frase?" — se for "nós" (a equipa/o método/o sistema), reescreve com "o perfil" ou "os dados" como sujeito. Correcto: "o perfil mostra", "os dados indicam", "esta força já foi nomeada". Proibido: qualquer variante de "nós [verbo]".
- Zero fatalismo. Nada é inevitável nem escrito em pedra.
- Nunca escrevas "deves ir para X" ou qualquer veredicto fechado. Apresenta o que o perfil sustenta e o que custa — a decisão é sempre da pessoa.
- Nunca uses o padrão genérico de coaching (identificar 3 exemplos, embrulhar num método, oferecer um serviço) sem ligar explicitamente a uma camada técnica calculada abaixo. Cada frase de conselho tem de ser rastreável a um facto técnico específico desta lista — nunca a generalidades sobre a profissão.
- REGRA ANTI-REPETIÇÃO (reforçada): Cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a MESMA CONCLUSÃO com palavras diferentes — mesmo que a frase literal seja nova. Se "você ganha pela voz" aparece em "O que o perfil sustenta", não pode voltar a ser demonstrado em "Leitura por opção" nem em "Candidata fora da lista". Cada secção só pode usar um facto técnico como prova se acrescenta algo genuinamente novo — um custo, uma tensão, uma especificidade. Se não acrescenta nada novo, a secção é curta e remete, nunca repete.
- PLANETAS FRACOS (peso < 0,9): Devem ser mencionados explicitamente — nunca deixar uma barra vermelha na tabela sem texto correspondente. Se o planeta mais ligado à comunicação (Mercúrio) tem peso fraco, e a tese central é "você ganha pela voz", essa tensão TEM de ser nomeada. Não é contradição — é honestidade. Exemplo correcto: "A sua estrutura aponta para comunicação, mas o canal comunicativo em si é o elo mais fraco do perfil — o que significa que esta competência precisa de ser construída, não é natural."
- ÁREA ACTUAL DA PESSOA: Nunca tratar como dado morto. É o ponto de partida obrigatório de qualquer leitura. Perguntas que o texto deve responder: o que na área actual já serve o que o perfil pede? O que na área actual está a trabalhar contra? Que ponte existe entre o que já é e o que quer ser? A transição começa sempre de onde a pessoa está — nunca de zero. Quando a pessoa tem 5+ anos numa área, essa experiência é um activo real — não um obstáculo a ignorar. Nunca tratar a área actual como ponto de partida neutro — é capital acumulado, positivo ou negativo.
- IDEIA CONCRETA (ideiaConcreta): Quando a pessoa partilhou uma ideia concreta, usá-la para desdobrar a opção declarada — nunca tratar como contexto genérico. Se disse "consultoria SAP", o texto deve diferenciar: o perfil sustenta mais "SAP" ou mais "consultoria"? Sustenta o modelo independente ou o modelo de empresa? A ideia concreta é a oportunidade de ser específico — nunca desperdiçar.
- TENSÃO INTERNA: Sempre que dois sinais do perfil apontam em direcções diferentes, o texto É OBRIGADO a nomeá-lo. Nunca escolher só o lado bonito. Exemplos de tensões reais: tese central em "voz/comunicação" mas Mercúrio fraco — nomear. Modo de Ganho aponta para liderança pública mas Montra de Mercado aponta para bastidores — nomear. Missão de longo prazo mas período actual pede pausa — nomear. A tensão é informação, não ruído.
- O RELATÓRIO NÃO É PARA CONFIRMAR O QUE A PESSOA JÁ PENSA: é para mostrar o que o perfil vê — mesmo que contradiga as opções declaradas. Se o perfil aponta claramente para uma direcção que a pessoa não declarou, o motor tem de a nomear — não esperar que ela apareça nas opções. A "Candidata fora da lista" não é uma secção opcional — é o momento onde o relatório tem mais valor único. Se os dados convergem em 4 camadas para algo que a pessoa não viu, dizer isso com clareza é o trabalho.
- REGRA CRÍTICA — LEITURA CONJUNTA: Nunca ler um eixo isolado. Ordem obrigatória: 1. Atmakaraka — o que a pessoa é por dentro. 2. Karakamsha (signo + casa JUNTOS, sempre) — onde isso aterra. 3. Modo de Ganho — por onde entra o dinheiro, testado contra 1+2. 4. Planetas fracos — explicam o passado, apontam onde falta apoio. Só depois disto testado e amarrado é que se avalia a opção declarada.
- KARAKAMSHA — NUNCA ISOLADO: Atmakaraka casa 10 + Karakamsha casa 4 NÃO é contradição. É "autoridade que se constrói a partir de base própria, nunca dentro de estrutura alheia." Lidos juntos, os dois eixos dizem a mesma coisa com instrumentos diferentes.
- ${INSTRUCAO_KARAKAMSHA}
- PLANETA FRACO + ÁREA ACTUAL: Se a área actual é governada por um planeta fraco (peso < 0,9), isso explica o porquê da insatisfação com precisão. É obrigatório nomear. EXEMPLO: Vénus fraca + estética = "passou anos no campo do planeta mais fraco do seu perfil — explica o desgaste, não invalida o talento."
- OPÇÃO DECLARADA — TRADUZIR SEMPRE: A opção que a pessoa declarou é o vocabulário que tinha à mão. SEMPRE traduzir: o que quis dizer, nos termos do perfil? "Quero ser consultora SAP" pode significar "quero ser autoridade que ensina e aconselha com nome próprio" — testar essa tradução, nunca aceitar a opção ao pé da letra.
- MAHADASHA — CLASSIFICAÇÃO E REGRA: O tom da Mahadasha actual ABRE a secção do plano, antes de qualquer data ou passo. Classificação: Ketu = dissolução/fecho ("prepare e feche, não colha"); Vénus = expansão/prazer/colheita ("avance, o ciclo favorece"); Sol = afirmação/autoridade ("afirme e visibilize"); Lua = emoção/fluxo/intuição ("siga o que sente, não o plano"); Marte = acção/lançamento/conflito ("avance com força e decisão"); Rahu = ambição/disrupção/ilusão ("risco real, oportunidade real"); Júpiter = crescimento/sabedoria/expansão ("expanda com intenção"); Saturno = estrutura/colheita lenta/responsabilidade ("construa devagar, vai durar"); Mercúrio = comunicação/adaptação/aprendizagem ("aprenda e comunique"). A colheita a sério só abre depois do fim da Mahadasha actual — sempre nomear essa data.
- MARCADORES OBRIGATÓRIOS (recapitulação — cada um já está descrito no lugar exacto onde vai abaixo, mas fica aqui reunido para nunca esquecer nenhum): antes de ${MARCADORES.identidade} "${MARCADORES.fraseAbertura} <frase de 10-15 palavras, poderosa e específica>"; dentro de cada bloco "### <opção>", antes do ponto 1: "${MARCADORES.insight} <frase de síntese em menos de 15 palavras>"; na secção "${SECCAO_TITULOS.candidataForaDaLista}", antes de qualquer "${MARCADORES.candidata}": "${MARCADORES.seleccaoCandidatas} <raciocínio da escolha entre a pool completa>" (só quando há pelo menos 1 candidata na pool). São machine-readable e obrigatórios — nunca omitir.
- COERÊNCIA COM OS VISUAIS: o relatório tem elementos visuais gerados automaticamente — gráfico de forças (7 planetas com pesos calculados), radar de competências (6 eixos), Roda da Vida (8 dimensões), tabela de tensões. O texto DEVE referenciar estes visuais quando relevante ("Como mostra o gráfico de forças...", "A sua roda de vida revela...", "O radar de competências confirma..."). NUNCA contradizer o que os visuais mostram — se um visual mostra um valor fraco, o texto não pode dizer que é forte.
- VALOR ALTO NUM ELEMENTO VISUAL NÃO É O TEMA CENTRAL DA VIDA (correcção do especialista): uma casa com valor alto no gráfico (Roda da Vida, Anexo) pode reflectir onde o planeta mais forte do perfil está fisicamente posicionado — não necessariamente o tema mais importante da vida da pessoa. O tema central é determinado pelo Eixo da Missão e pelo Modo de Ganho, nunca pelo valor mais alto da roda. Exemplo: se "Saúde/Energia" ou "Como lida com obstáculos e o trabalho do dia a dia" (casa 6) aparecer com o valor mais alto de toda a Roda da Vida só porque o planeta mais forte do perfil está fisicamente aí, o texto nunca pode tratar essa área como o propósito central da pessoa — referencia o valor (é obrigatório, ver regra dos extremos), mas contextualiza-o como "onde a força física do perfil se concentra", nunca como substituto do Eixo da Missão/Modo de Ganho ao decidir do que este relatório trata.
- ESCALA DE CONFIANÇA (correcção do especialista, obrigatória em todo o relatório) — a linguagem usada tem de bater sempre com o nº de camadas que sustentam a afirmação, nunca mais confiante do que os dados permitem:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva. Ex.: "O seu perfil sustenta X com clareza."
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes. Ex.: "Dois sinais independentes apontam para X — o Eixo da Missão e o Modo de Ganho convergem aqui."
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto. Ex.: "Uma leitura possível deste perfil é X — não como facto, mas como direcção."
  · EM ABERTO (o perfil não distingue): diz isso directamente. Ex.: "O perfil não distingue entre X e Y — a decisão fica com você."
  Proibido usar linguagem de "Convergência forte" para algo que só tem um "Sinal forte" — o nível de confiança da frase tem de corresponder exactamente ao nível de convergência que a sustenta.
- PROIBIDO EXPOR NÚMEROS DE CÁLCULO INTERNO NO TEXTO VISÍVEL (correcção do especialista, pós-PDF real — confirmado no texto: "a soma de pesos mais alta de toda a pool (7,27)" apareceu em prosa normal, fora do bloco de raciocínio já escondido): "soma de pesos", "convergência N camadas", "Nível 1"/"Nível 2", e o peso numérico exacto de um planeta (ex.: "peso 1,76") são ferramentas de CÁLCULO interno — nunca podem aparecer, em nenhuma secção visível ao cliente, como número em bruto ou citados pelo nome técnico. Traduz sempre para a linguagem de confiança já pedida (ver ESCALA DE CONFIANÇA acima) — "esta é a opção onde mais camadas do seu perfil convergem" em vez de "soma de pesos 7,27"; "é o planeta mais forte do seu perfil" em vez de "peso 1,76". Isto aplica-se a TODAS as secções, não só à "${SECCAO_TITULOS.candidataForaDaLista}" onde foi encontrado — o "${MARCADORES.seleccaoCandidatas}" é o ÚNICO sítio onde estes números podem ser citados, e mesmo esse nunca chega ao cliente. ISTO INCLUI OS PLANETAS FRACOS E AS AVASTHAS (correcção do especialista — bug real: "Júpiter tem o peso mais baixo (0.890)" e "Marte é o planeta mais fraco (0.817)" apareceram em "${SECCAO_TITULOS.quemE}", texto visível): quando a instrução de PLANETAS FRACOS ou de AVASTHAS pede para "confirmar contra a lista de pesos" ou "nomear o peso baixo/alto", isso é só para TI decidires qual planeta qualifica — nunca significa escrever esse número no texto. "Júpiter, apesar de reger o teu Modo de Ganho, é um dos planetas mais fracos do teu perfil" está correcto; "Júpiter (0.890)" ou "peso 0.890" nunca pode aparecer fora do bloco "${MARCADORES.seleccaoCandidatas}".
- ${INSTRUCAO_AVASTHAS}
- ${INSTRUCAO_CONJUNCOES}
- ${INSTRUCAO_YOGAS}
- ${INSTRUCAO_MECANISMO_NUNCA_SO_EFEITO}
- ${INSTRUCAO_FERRAMENTAS_PATRIMONIO}
- ${EXEMPLO_TOM_ESPECIALISTA}
- ${INSTRUCAO_VARGOTTAMA}
- ${INSTRUCAO_CONSISTENCIA_TECNICA}
- ${INSTRUCAO_NUNCA_CANDIDATA}
- ${INSTRUCAO_SELECCAO_CANDIDATAS}
- ${INSTRUCAO_ABERTURA_CANDIDATAS}
- ${INSTRUCAO_NIVEL_CANDIDATAS}
- ${INSTRUCAO_PERGUNTA_ESPECIFICA}
- ${INSTRUCAO_ABERTURA_RESPONDE}
- ${INSTRUCAO_VALIDACAO_OPCOES}
- ${INSTRUCAO_PLANO_PERIODOS_RELATIVOS}
- ${INSTRUCAO_FACILIDADES_NATURAIS}
- Tom adulto, directo, sem gíria de coach, sem emojis.

VOLUME: Cada secção deve ser tão longa quanto os dados sustentam — nunca mais, nunca menos. Se uma secção não tem nada genuinamente novo a acrescentar, é curta. Não preencher para atingir um mínimo. Proibido: repetir para parecer completo. Permitido: ser curto e preciso.
${
  horaNascimentoFornecida
    ? ""
    : `
NOTA INTERNA — hora de nascimento não fornecida. A Arudha Lagna e os regentes das casas angulares foram calculados com hora de meio-dia como convenção — podem estar errados. Trata todos os elementos que dependem do Ascendente (Arudha Lagna, Montra de Mercado, posições de casas) com cautela explícita no texto — nunca os apresentes com a mesma confiança dos elementos que não dependem da hora (Atmakaraka, Modo de Ganho por dignidade, dashas).`
}

=== DADOS TÉCNICOS ===

-- Quem é, e a pergunta --
${blocoAbertura(intake)}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes, pesosPlanetas)}

-- Montra de Mercado --
${blocoMontraMercado(axes)}

-- Peso de cada planeta (estado × SAV da casa / média do perfil) --
${blocoPesos(pesosPlanetas)}

Usa estes pesos para calibrar a força de cada afirmação:
· Peso ≥ 1,3: o perfil apoia com força — podes afirmar com clareza
· Peso 0,9 a 1,3: suporte moderado — afirma mas sem excesso de confiança
· Peso < 0,9: suporte fraco — diz isso com clareza, nunca escrevas com a mesma confiança sobre um planeta de peso 0,58 e um de 1,87
Nunca trates todos os planetas como equivalentes.

-- Para que tem facilidade natural (já calculado — ver INSTRUCAO_FACILIDADES_NATURAIS) --
${blocoFacilidadesNaturais(pesosPlanetas)}

-- Avasthas (maturidade dos planetas) --
${blocoAvasthas(d1)}

-- Conjunções activas --
${blocoConjuncoes(d1)}

-- Yogas activos --
${blocoYogas(yogas)}

-- Vargottama --
${blocoVargottama(d1)}

-- Datas reais (Vimshottari + trânsitos) --
${blocoDatas(datas)}

-- Candidatas do catálogo --
${blocoCatalogoVocacional(catalogo, cursosPorDestino)}

-- Roda da Vida (8 dimensões, 0-10) --
${blocoRodaDaVida(savPorCasa, pesosPlanetas, axes.regentesCasas)}
Para cada dimensão marcada EXTREMO (≤4 ou ≥7), o texto tem de ter pelo menos uma frase que explique o que esse valor significa para esta pessoa especificamente — nunca deixar um extremo sem menção. VERIFICAÇÃO OBRIGATÓRIA, LINHA A LINHA (correcção do especialista — bug real: um extremo ≤4 ficou sem menção enquanto os extremos ≥7 foram tratados): antes de terminares "${SECCAO_TITULOS.quemE}", conta quantas linhas da Roda da Vida acima dizem "EXTREMO" — cada uma delas, sem excepção, tem de ter a sua frase no texto, tanto as ≤4 como as ≥7. Não presumas que "já falei dos extremos" só por teres tratado os de valor alto.

-- Perfil de elementos e modalidades --
${blocoElementosModalidades(elementosModalidades)}

-- Aspectos principais --
${blocoAspectosPessoais(aspectosPessoais)}

-- Opções declaradas --
${
  candidatas.length
    ? `A pessoa declarou estas opções (avalia TODAS, mesmo as que o perfil sustenta fracamente):\n${candidatas.map((c) => `- ${c}`).join("\n")}`
    : `A pessoa NÃO declarou opções concretas${intake.areasDestinoIncluiAindaNaoSei ? ' (escolheu "ainda não sei")' : ""}. Deriva até 3 candidatas plausíveis a partir do texto livre abaixo — se não conseguires nenhuma candidata clara, NÃO bloqueies o relatório: escreve a Secção 2 (o que o perfil sustenta, em geral) e resolve o relatório inteiro pela Secção 4 ("${SECCAO_TITULOS.candidataForaDaLista}", que aparece ao cliente como "Opções que ainda não considerou" — nunca uses o nome interno "candidata" a referir-te a esta secção no texto visível). Texto livre disponível:`
}
${blocoTextoLivre}
${intake.tipoMudanca.length ? `\nTipo de mudança que a pessoa diz querer (usa para calibrar a parte 4 de cada leitura — ex.: se inclui trabalhar por conta própria ou abrir negócio, responde explicitamente se o perfil sustenta trabalho a solo nessa opção): ${intake.tipoMudanca.join(", ")}.` : ""}
${intake.ideiaConcreta && candidatas.length ? `\nIdeia concreta partilhada (contexto adicional, não é uma opção à parte): ${normalizarTextoLivre(intake.ideiaConcreta)}` : ""}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 5 secções, por esta ordem ===

ANTES de ${MARCADORES.identidade}, escreve, numa linha própria: "${MARCADORES.fraseAbertura} " seguido de uma frase de 10 a 15 palavras que captura a essência deste perfil — poderosa, específica, nunca genérica. Não é um resumo. É a frase que a pessoa vai lembrar deste relatório. Exemplos do formato: "Saturno exaltado não pede que seja reconhecida — pede que construa algo que dure.", "A voz que ensina vale mais do que o cargo que ostenta." Proibido: clichés de coaching, frases genéricas de auto-ajuda. Este marcador é obrigatório e machine-readable, não o omitas.

DEPOIS de ${MARCADORES.fraseAbertura}, escreve, numa linha própria: "${MARCADORES.identidade} " seguido de uma frase de 8 a 12 palavras que descreve o que esta pessoa foi feita para ser — não o que perguntou, não a sua opção, mas a sua natureza estrutural. Deve ser específica deste perfil, nunca genérica. Exemplos do formato: "Autoridade que forma e transmite pelo exemplo directo", "Arquitecta de sistemas que comunica o que outros não conseguem ver". Proibido: "pessoa comunicativa", "líder nato", qualquer cliché de coaching. Este marcador é obrigatório e machine-readable, não o omitas.

FORMATO DE SAÍDA (obrigatório): escreve em Markdown. Cada secção começa com um cabeçalho de nível 2, EXACTAMENTE com este texto (sem números, sem variações):
## ${SECCAO_TITULOS.abertura}
## ${SECCAO_TITULOS.quemE}
## ${SECCAO_TITULOS.oQueACartaSustenta}
## ${SECCAO_TITULOS.leituraPorOpcao}
## ${SECCAO_TITULOS.candidataForaDaLista}
## ${SECCAO_TITULOS.oPlano}
Se não houver candidata fora da lista (4 camadas não convergiram), inclui o cabeçalho "## ${SECCAO_TITULOS.candidataForaDaLista}" na mesma, seguido só da frase que explica que não há — nunca omitas o cabeçalho.

## ${SECCAO_TITULOS.abertura}
O primeiro parágrafo é a resposta directa ou a âncora — ver INSTRUCAO_ABERTURA_RESPONDE, obrigatório, nunca dados técnicos nem análise abstracta antes disto. Só depois desse parágrafo: quadro de dados (nome, situação, área actual) e o enquadramento da pergunta que a pessoa trouxe. O texto da pergunta do cliente deve ser apresentado tal como foi escrito — não o coloques em maiúsculas nem em destaque tipográfico. Usa-o como contexto, não como título.

## ${SECCAO_TITULOS.quemE}
Secção nova (correcção do especialista) — um retrato de personalidade, ANTES de qualquer opção ser mencionada. Formato EXACTO, obrigatório e machine-readable — não omitas nem reordenes os marcadores:

DONS — 2 a 3 linhas "${MARCADORES.dom} <frase>", obrigatório:
- Um dom = um planeta com peso ≥ 1,3. Se nenhum planeta atingir 1,3, usa os dois planetas de maior peso do perfil (mesmo abaixo de 1,3) — nunca deixes esta secção sem dons.
- Cada dom cita o planeta + a casa + a dignidade, traduzidos para linguagem simples (nunca o nome técnico do planeta/casa/dignidade em jargão — mesma lista de termos proibidos de sempre). Nunca um adjectivo solto ("é comunicativa") sem estar rastreável a este dado técnico específico.
- A confiança da frase deve corresponder ao peso real (um peso de 1,8 não se escreve com a mesma força que um de 1,32 — ver ESCALA DE CONFIANÇA acima).

LIMITAÇÕES — 1 a 2 linhas "${MARCADORES.limitacao} <frase>", obrigatório:
- Uma limitação = um planeta com peso < 0,9.
- Frase PRÓPRIA e ESPECÍFICA para cada planeta fraco — PROIBIDO repetir a mesma frase genérica para planetas diferentes. Cada planeta tem uma implicação prática concreta, nunca genérica: Mercúrio fraco afecta a fluidez de explicar e ser entendida; Vénus fraca afecta o sentido de valor próprio e o à-vontade a cobrar; Lua fraca afecta a gestão emocional e a intuição em decisões; Marte fraco afecta a capacidade de agir com rapidez e decisão; Sol fraco afecta a afirmação pública da identidade profissional; Júpiter fraco afecta a expansão/crescimento (custa mais do que para outros); Saturno fraco afecta a estrutura e a disciplina de longo prazo (precisa de sistemas externos). Usa estas implicações como ponto de partida, nunca como frase a copiar literalmente duas vezes.
- REGRA DE NÃO-DUPLICAÇÃO: o relatório já tem, mais abaixo, uma tabela determinística ("Onde o perfil tem atrito") com a implicação prática detalhada de CADA planeta fraco. Se vais nomear aqui um planeta fraco que essa tabela já desenvolve, NÃO repitas a explicação inteira — uma frase curta que o nomeia e remete (ex.: "Vénus, a área mais fraca do perfil, aparece desenvolvida mais à frente") chega; o desenvolvimento completo fica só na tabela.

O QUE VALORIZA — sempre com conteúdo real (nunca omitir, mesmo quando Vénus é a camada mais fraca do perfil — "o que valoriza" nunca fica só como um número solto no gráfico de pesos, sem explicação no texto): um parágrafo curto, sem marcador, sobre o que esta pessoa genuinamente valoriza, ancorado em Vénus e nos dons/limitações já nomeados.

ELEMENTOS E MODALIDADES (correcção do especialista): o elemento dominante revela como a pessoa processa e actua no mundo. A modalidade dominante revela o seu ritmo natural de mudança. Usa estes dados para enriquecer o retrato de personalidade nesta secção — não como lista, mas integrados na narrativa dos dons/limitações já escritos, nunca como parágrafo à parte só sobre elementos.

ASPECTOS ENTRE PLANETAS PESSOAIS (correcção do especialista): os aspectos revelam tensões e harmonias internas. Nomeia os aspectos mais relevantes (especialmente quadraturas e oposições, ver "-- Aspectos principais --" acima) como parte das limitações ou tensões internas do perfil — nunca como secção nova, sempre integrados onde já estás a nomear dons/limitações/tensões.

RODA DA VIDA — LEMBRETE À PARTE (correcção do especialista — bug real, RECORRENTE: a instrução completa está na secção de dados técnicos "-- Roda da Vida --" acima, mas fica "longe" do momento real de escrever esta secção e continua a ser esquecida): antes de escreveres a linha de síntese abaixo, volta atrás e confirma — CADA dimensão da Roda da Vida marcada "EXTREMO" nos dados técnicos (tanto as ≤4 como as ≥7) tem, algures nesta secção, pelo menos uma frase que nomeie o que esse valor significa para esta pessoa. Não avances sem esta confirmação.

Termina a secção com uma linha "${MARCADORES.sinteseQuemE} <frase>" — uma frase compacta que resume: quem é, o que a move, o que a trava, onde rende mais, onde rende menos. Nunca introduzas aqui um facto novo que não vá aparecer depois no corpo do relatório — é síntese do que já foi dito, não uma antecipação de algo só explicado mais tarde.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções declaradas. NUNCA REPETE A MESMA COMPARACAO DE FORCA JA FEITA NA ABERTURA (correccao do especialista -- bug real: a conclusao "o modo de ganho X e mais forte que Y e Z" apareceu quase palavra por palavra em "${SECCAO_TITULOS.abertura}" e outra vez aqui, com quase os mesmos termos, sem trazer nada novo): se a "${SECCAO_TITULOS.abertura}" ja comparou a forca relativa dos modos de ganho ou eixos, esta seccao tem de trazer um ANGULO DIFERENTE -- o MECANISMO por tras dessa forca (que planetas/factores a sustentam e porque), nunca reafirmar o mesmo ranking com palavras parecidas. A unica repeticao permitida no relatorio inteiro e a resposta directa entre "${SECCAO_TITULOS.abertura}" e "${SECCAO_TITULOS.leituraPorOpcao}" (ver INSTRUCAO_PERGUNTA_ESPECIFICA) -- em mais nenhum par de seccoes.

## ${SECCAO_TITULOS.leituraPorOpcao}
Se existe pergunta específica declarada, esta secção abre, ANTES do primeiro bloco "### ", com a resposta directa no formato exigido por INSTRUCAO_PERGUNTA_ESPECIFICA — nunca só na "${SECCAO_TITULOS.abertura}", tem de estar retomada aqui também, com a mesma resposta, nunca uma diferente.

PROFUNDIDADE OBRIGATÓRIA (correcção do especialista, ronda "relatório Marta", ponto 9a) — quando a pessoa DECLAROU opções reais (o caso mais comum desta secção), esta é a secção que responde directamente à pergunta que a trouxe até aqui: tem de ser a mais desenvolvida do relatório inteiro, nunca a mais resumida. Cada um dos 6 pontos abaixo (1 a 6, incluindo a conclusão do ponto 6) é um parágrafo próprio de pelo menos 3-4 frases, nunca uma única frase-resumo por ponto — texto corrido e argumentado, no mesmo espírito de uma leitura real feita por um orientador vocacional a sério, nunca 6 caixas curtas telegráficas.
ERRO CONFIRMADO EM GERAÇÃO REAL (correcção do especialista, mesma ronda — nunca repetir isto): uma opção declarada saiu, de facto, como uma única frase com um badge de força e nada mais — nenhum dos 6 pontos numerados chegou a aparecer. Isto é uma falha grave: a pessoa perguntou especificamente sobre esta opção, e uma frase não é uma resposta. A crítica automática que se segue a esta geração vai medir isto directamente (critério 33) — conta quantas frases tem cada ponto e obriga a reescrever o bloco inteiro se algum tiver menos de 3. VERIFICAÇÃO OBRIGATÓRIA, PONTO A PONTO (correcção do especialista — bug real, ronda seguinte: 5 dos 6 pontos tinham 3-4 frases, mas um ponto isolado — nem sempre o mesmo — saiu com só 2): antes de avançares para a próxima opção candidata, conta as frases de CADA um dos 6 pontos que acabaste de escrever, um a um — não confies na impressão geral de que "o bloco parece completo". Qualquer ponto com menos de 3 frases é uma falha a corrigir, acrescentando conteúdo real (nunca frases de enchimento), antes de continuares.

Para CADA opção candidata (declarada ou derivada), este formato EXACTO, por esta ordem — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios e machine-readable, não os omitas nem os traduzas:

### <nome exacto da opção, tal como foi declarada ou derivada>
${MARCADORES.forca} <forte, moderada ou fraca — forte se ≥2 fontes independentes fortes convergem, moderada se há suporte real mas não forte, fraca se só um sinal fraco isolado sustenta a opção>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras — específica deste perfil, nunca genérica. Obrigatório e machine-readable, não o omitas.>
1. O que o perfil sustenta nesta opção. Para dizer que o perfil sustenta uma opção, cita pelo menos duas fontes independentes (Eixo da Missão, Modo de Ganho, peso de planeta, Montra de Mercado) — mas não te limites a citá-las: desenvolve o que cada uma significa em termos concretos, e como se traduz especificamente nos dons já nomeados na secção "${SECCAO_TITULOS.quemE}" — nomeia esses dons e explica CONCRETAMENTE como vão ser usados na prática dentro desta área (não "tem facilidade para comunicar", mas o que essa facilidade permite fazer especificamente nesta profissão). Uma opção sustentada por um único sinal fraco não é sustentada — diz isso, e usa "${MARCADORES.forca} fraca" nesse caso.
2. O que esta opção lhe vai custar — o custo específico DESTE perfil nesta escolha, nunca o risco genérico da profissão. Liga sempre a uma limitação já nomeada na secção "${SECCAO_TITULOS.quemE}": se esta pessoa tem dificuldade nomeada com pressão, confronto directo, exposição pública, trabalho solitário, etc., diz explicitamente o que isso significa escolher esta área em concreto (ex.: se a limitação é dificuldade com confronto directo e a opção é Direito, diz que a prática forense/contenciosa vai exigir mais esforço deliberado do que outras vertentes da área — nunca deixes essa tensão por explicar).
3. Sub-áreas dentro desta opção que fazem mais sentido para ESTE perfil especificamente — toda área de estudo/profissão tem vertentes internas diferentes (ex.: dentro de Direito: contencioso vs. consultivo vs. corporate; dentro de Psicologia: clínica vs. organizacional vs. investigação); usa os dons e o Modo de Ganho já nomeados para apontar 1-2 vertentes concretas que encaixam melhor neste perfil do que outras dentro da MESMA área, e explica porquê. Nunca inventes uma vertente sem ligação aos dados desta pessoa — a escolha da vertente tem de decorrer do mesmo raciocínio já usado no resto da secção.
4. O que esta opção pede e que falta actualmente (correcção do especialista — bug real, recorrente: este ponto saiu sistematicamente com 1-2 frases, muito abaixo dos outros 5, em 3 opções seguidas do mesmo relatório): não te fiques pelo "falta X, mas aprende-se" — desenvolve em pelo menos 3 frases: nomeia a lacuna concreta (que capacidade, que hábito de trabalho, que tipo de raciocínio), diz se é algo que se aprende com prática/tempo ou uma tensão mais estrutural com um traço já nomeado em "${SECCAO_TITULOS.quemE}", e aponta um sinal concreto de progresso (o que mudaria, na prática do dia a dia, quando essa lacuna estiver a fechar-se). Este ponto mede-se pela mesma régua de profundidade dos outros 5 — nunca o mais curto do bloco.
5. Onde entra a matéria desta pessoa nesta opção — nunca o sector como resposta, sempre a forma/função (usa o Modo de Ganho para decidir se entra pela voz, pela resolução directa, ou pela liderança/execução pública) (correcção do especialista — bug real, RECORRENTE em duas rondas seguidas do mesmo relatório, sempre neste ponto exacto, em ambas as opções declaradas: saiu sistematicamente com só 2 frases, abaixo do mínimo dos outros 5 — ao contrário do ponto 4, este nunca tinha reforço próprio de profundidade, só uma linha de definição): desenvolve em pelo menos 3 frases — nomeia uma tarefa ou função concreta do dia a dia desta área onde essa forma de entrada se aplicaria na prática, contrasta com outra tarefa ou função da MESMA área que NÃO encaixa tão bem neste perfil (para mostrar que não é a área toda, é uma parte específica dela), e fecha ligando de volta ao dom ou traço já nomeado que decide essa entrada. Este ponto mede-se pela mesma régua de profundidade dos outros 5 — nunca o mais curto do bloco.
6. Conclusão explícita — ver INSTRUCAO_VALIDACAO_OPCOES: uma das três frases-molde exactas (sustenta com clareza / sustenta parcialmente / não sustenta de forma natural), nunca omitida, nunca substituída por prosa que descreve prós/contras sem fechar numa das três.

Repete o bloco "### <nome> / ${MARCADORES.forca} / ${MARCADORES.insight} / 1. / 2. / 3. / 4. / 5. / 6." para cada opção candidata, uma a seguir à outra.

## ${SECCAO_TITULOS.candidataForaDaLista}
As candidatas elegíveis já vêm calculadas deterministicamente na secção "Candidatas do catálogo" acima — a POOL COMPLETA, SEM LIMITE nenhum. NÃO calcules a tua própria convergência, NÃO inventes nenhuma candidata diferente das listadas lá. A tua tarefa nesta secção é APRESENTAR TODAS as candidatas da pool que passam o Passo 1 — ligação narrativa a um dom já nomeado (ver INSTRUCAO_SELECCAO_CANDIDATAS) —, agrupando as que partilham convergência de base quase idêntica (Passo 3, mesma instrução), e escrever o bloco de raciocínio obrigatório antes delas. Nunca "escolher até 3" — isso já não é a regra.

Escreve primeiro a tua própria frase de abertura da secção (1-2 frases, o enquadramento habitual). ${
    paragrafoAntiDaParaTudoTexto
      ? `Logo a seguir a essa frase, ANTES de qualquer candidata ou bloco de raciocínio, insere este parágrafo — EXACTO, sem alterar uma única palavra nem parafrasear (as duas opções já vêm resolvidas dos dados reais desta pessoa, nunca as substituas por outras): "${paragrafoAntiDaParaTudoTexto}"`
      : "(esta pessoa tem menos de 2 candidatas na pool — não insiras nenhum parágrafo extra aqui, segue directamente para a regra \"nenhuma\"/candidata única abaixo.)"
  }

Se essa secção diz "nenhuma", a primeira e única linha é "${MARCADORES.candidata} nenhuma" — "o seu perfil não aponta a nada fora do que já pensava" é uma resposta válida e completa, não a evites. Não é preciso bloco de raciocínio quando não há nenhuma candidata na pool.

Se essa secção lista 1 ou mais candidatas, primeiro escreve o bloco único "${MARCADORES.seleccaoCandidatas}" (ver INSTRUCAO_SELECCAO_CANDIDATAS para o conteúdo exacto exigido). Depois, para cada candidata que passou o Passo 1, um de dois formatos — nunca misturar os dois para a mesma candidata:

FORMATO INDIVIDUAL (candidata sem grupo, ou grupo reduzido a 1 sobrevivente depois do Passo 1) — "${MARCADORES.candidata} <nome exacto>" seguido do texto explicativo dessa candidata, NESTA ORDEM (ver INSTRUCAO_ABERTURA_CANDIDATAS): (1) a frase de dom, usando o FACTOR DE DOM já dado; (2) 1 a 3 frases sobre porque é que esta área faz sentido especificamente dentro deste perfil (que outros sinais reforçam a ligação). NUNCA menciona percurso, formação ou duração no corpo do texto — essa informação vive só nas linhas "${MARCADORES.viaResumida}"/"${MARCADORES.custoPrincipal}" (ver instrução própria abaixo) (correcção do especialista — bug real: uma candidata escapou a esta regra sem citar nenhum número, só uma comparação relativa — "é a via mais longa de toda esta lista, e vale a pena teres isso presente antes de a levares muito a sério" — isto TAMBÉM é menção de percurso/duração, só que qualitativa em vez de numérica, e viola a regra na mesma: qualquer frase que compare, avalie ou comente a extensão, dificuldade ou exigência do PERCURSO de uma candidata contra as outras pertence exclusivamente à linha "${MARCADORES.custoPrincipal}", nunca ao corpo do texto, mesmo sem números). Usa só as camadas exactas já listadas para ela na pool (nunca inventes camadas novas nem omitas as que vêm calculadas).

FORMATO DE GRUPO (2 ou mais candidatas da secção "Grupos de candidatas" acima que passaram o Passo 1) — "${MARCADORES.grupo} <nome1>; <nome2>; <nome3 ...>" (os nomes exactos dos membros deste grupo que passaram o Passo 1, separados por ";", pela ordem em que os blocos "${MARCADORES.candidata}" a seguir vão aparecer). Na linha seguinte, obrigatório: "${MARCADORES.nomeGrupo} <nome curto e descritivo, 2-5 palavras>" — um nome memorável para este grupo, extraído da MESMA convergência que vais explicar a seguir (nunca uma categoria nova, nunca genérico como "Grupo A"; ex.: "Estética e Rigor Técnico"). Só depois, o texto da convergência astrológica de base PARTILHADA por todo o grupo — o que estas opções têm em comum, escrito UMA SÓ VEZ. Logo a seguir, um bloco "${MARCADORES.candidata} <nome exacto>" por cada membro listado no "${MARCADORES.grupo}", nesta ordem, cada um com só a sua diferenciação específica (1-3 linhas: porquê esta e não as outras do mesmo grupo faz sentido dentro deste perfil) — nunca percurso/formação, e NUNCA repetir a convergência de base já escrita no bloco "${MARCADORES.grupo}".

Repete este padrão (individual ou de grupo) para toda a pool que passou o Passo 1 — nunca pares a meio, nunca omitas uma candidata elegível para "não alongar a secção". A ordem de aparição dos grupos/individuais no texto segue o Passo 2 (soma de pesos) — a ordem NÃO é ranking (ver regra abaixo).

VIA CONCRETA — SÓ NA TABELA, NUNCA NO CORPO DO TEXTO (correcção do especialista — "revisão estrutural de candidata fora da lista", pós-PDF real: a tabela-resumo no fim da secção já mostra Via de entrada e Custo principal para cada opção; repetir essa informação como frase solta no corpo é redundante e desvia da única coisa que acrescenta valor aqui — porque esta área faz sentido para este perfil): cada candidata da pool tem um bloco próprio "-- Via concreta para <nome> --" na secção "Candidatas do catálogo" acima. Usa-o só para preencher as linhas "${MARCADORES.viaResumida}"/"${MARCADORES.custoPrincipal}" (ver instrução própria abaixo) — nunca para escrever uma frase de percurso no corpo do texto da candidata.

REGRA ABSOLUTA — SEM RANKING ENTRE CANDIDATAS (correcção do especialista, estendida ao agrupamento por cluster): candidatas e grupos apresentam-se sempre em PÉ DE IGUALDADE — nunca entre si, nem dentro do mesmo grupo. PROIBIDO: "1ª escolha", "2ª escolha", "a mais forte", "a mais provável", "em primeiro lugar", qualquer numeração ordinal, ou tratar uma candidata/grupo como "menção honrosa"/"nota à parte"/de segunda categoria. Dentro de um grupo, "porquê esta e não as outras" (a diferenciação pedida) é sobre ENCAIXE (que via concreta serve melhor esta pessoa), nunca sobre qual candidata é "melhor" ou "mais forte" do que a outra — todas no grupo já convergem com a mesma força de base, só a via difere. Cada candidata/grupo tem a sua própria justificação, completa e independente das outras — a comparação entre candidatas da pool só acontece dentro do bloco "${MARCADORES.seleccaoCandidatas}", nunca no texto visível ao cliente.

TABELA RESUMO — VIA_RESUMIDA e CUSTO_PRINCIPAL (correcção do especialista, "tabela resumo final das candidatas") — dentro do texto de CADA candidata apresentada (individual ou membro de grupo), inclui DUAS linhas próprias, cada uma na sua própria linha:
"${MARCADORES.viaResumida} <3-8 palavras>" — resume a "-- Via concreta para <nome> --" já dada nos dados técnicos (nunca inventa uma via nova, nunca nomeia uma entidade concreta) — ex.: "${MARCADORES.viaResumida} curso superior + estágio, 3-4 anos", "${MARCADORES.viaResumida} certificação profissional, entrada directa".
"${MARCADORES.custoPrincipal} <3-8 palavras>" com o principal custo/trade-off de escolher esta via — ex.: "${MARCADORES.custoPrincipal} anos de formação longa antes de rendimento", "${MARCADORES.custoPrincipal} instabilidade inicial sem estrutura fixa".
Ambas curtas e específicas desta candidata — nunca genéricas, nunca repetidas iguais para duas candidatas diferentes. Alimentam uma tabela resumo no fim da secção — nunca aparecem como frase solta no meio do texto, são sempre a própria linha do marcador.

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA (correcção do especialista): PROIBIDO nomear qualquer candidata, mesmo como pista abaixo do limiar, sem que venha explicitamente da secção "Candidatas do catálogo" acima. Se nenhuma candidata do catálogo atingiu ≥4 camadas, a resposta é "${MARCADORES.candidata} nenhuma" — explica honestamente que o perfil não aponta a nada fora do que já foi pensado. NUNCA preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos. Exemplo do que NÃO fazer: sugerir "engenharia, auditoria, saúde pública" por associação livre a "Saturno = estrutura/rigor" — essas profissões não vieram do catálogo, vieram de associação livre; isto é invenção, não leitura, e é exactamente o que esta regra proíbe.

## ${SECCAO_TITULOS.oPlano}
Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima) — antes de qualquer período ou passo. Depois disso, segue exactamente o formato de INSTRUCAO_PLANO_PERIODOS_RELATIVOS (períodos relativos — "nas próximas 2 semanas"/"no próximo mês"/"nos próximos 3 meses"/"nos próximos 6 a 12 meses" — nunca datas fixas nem meses do calendário, excepto a data real de fim da Mahadasha/Antardasha actual). Destaca o primeiro passo accionável das "próximas 2 semanas" numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " (obrigatório, machine-readable, não o omitas) — ex.: "${MARCADORES.primeiroPasso} Contacte duas pessoas que já fazem consultoria a solo e pergunte-lhes o que ninguém conta sobre o primeiro ano." Nunca um plano genérico sem acção concreta e específica em cada um dos 4 períodos.

HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, afirmações com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo, nunca como previsão. A Mahadasha até ao fim do seu ciclo é contexto, não calendário.
`.trim();
}
