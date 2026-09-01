// FASE 1, Passo 5 — verificacao.ts. Critérios A-K (CODE-1-esqueleto-v2.md
// A-E, CODE-1-esqueleto-v3.md F-K), conforme pedido nesta sessão
// (23/08/2026). Cada critério tem uma função própria + uma fixture em
// verificacao.test.ts que constrói um `RelatorioV3` mínimo violador e
// confirma que `verificarRelatorioV3` reprova exactamente nesse critério.
//
// DOIS DESVIOS AO PEDIDO LITERAL, REPORTADOS E APROVADOS ANTES DE ESCREVER
// ESTE FICHEIRO (ver relatório desta sessão, 23/08/2026):
//
// 1. GUARDA DE VOCABULÁRIO E DETECTOR DE REPETIÇÃO — o pedido dizia para
//    "manter" e "integrar" `FORBIDDEN_TERMS` (web/src/lib/report/prompt.ts)
//    e `crossChapterCheck.ts` (web/src/lib/report/crossChapterCheck.ts).
//    Ambos vivem no motor ANTIGO, workspace `web`. Importá-los directamente
//    para aqui violaria duas regras ao mesmo tempo: nunca tocar no motor
//    antigo (a importação cria uma dependência sobre os ficheiros dele) e a
//    arquitectura já estabelecida (`web` depende de `method-engine`, nunca
//    o inverso — ver a mesma nota em prompt-v3.ts, `DadosClienteV3`).
//    Mais grave ainda: `FORBIDDEN_TERMS` (prompt.ts) foi escrito para a
//    regra ANTIGA "zero termos técnicos" — bane literalmente "ascendente",
//    "trânsito", "casa N", nomes de planeta+verbo — exactamente o
//    vocabulário que a CORRECÇÃO GLOBAL de 23/08/2026 tornou OBRIGATÓRIO no
//    v3 (sempre com definição). Reutilizá-lo tal como está reprovaria texto
//    v3 correcto. Decisão aprovada: construir equivalentes PRÓPRIOS do v3
//    — `TERMOS_PROIBIDOS_V3` abaixo (escopo: vocabulário novo-idade sem
//    tradução Naveya, nunca o vocabulário astrológico que o v3 agora exige)
//    e `detectarRepeticaoEntreSeccoes` (mesmo algoritmo de shingles de
//    `crossChapterCheck.ts`, código genérico e independente de tipos do
//    motor antigo — reimplementado aqui, não importado).
//
// 2. FIXTURES DE F-K — o pedido dizia para usar CASOS-VIOLADORES.md como
//    referência. Esse ficheiro usa um esquema numerado antigo (1-33); só
//    tem entradas letradas "D" e "E", com substância diferente da definida
//    nesta sessão, e não cobre F-K. Decisão aprovada: construir as
//    fixtures de F-K de raiz, directamente dos templates de prompt dados
//    nesta sessão — não "referenciadas" de um documento que não as tem.

import type { RelatorioV3, CamadaA, Descoberta, NiveauConfianca, DesfechoEspinha } from "../types-v3";
import type { DadosClienteV3 } from "./prompt-v3";
import { bandaAbsolutaSav, DEFINICOES_NAKSHATRA } from "./linguagem-naveya";
import { CLASSICAL_GRAHAS } from "../lifeReport/types";

// ── Estrutura do resultado (exigida pelo pedido) ────────────────────────

export interface ResultadoVerificacao {
  passou: boolean;
  criterios: {
    [criterio: string]: {
      passou: boolean;
      motivo?: string;
    };
  };
  warnings: string[];
}

/**
 * Callback injectável para os critérios semânticos (D-semântico, F, G, H,
 * I, K). Devolve sempre `{passa, motivo}` — o mesmo contrato pedido para
 * cada prompt de LLM nesta secção. Sem esta callback, os critérios
 * semânticos degradam para "não verificado" (ver `verificarRelatorioV3`) em
 * vez de falhar — o pedido é explícito: "se não houver API key disponível,
 * registar como não verificado em vez de falhar".
 */
export type ChamadaLLM = (prompt: string) => Promise<{ passa: boolean; motivo: string }>;

interface ResultadoCriterio {
  passou: boolean;
  motivo?: string;
}

const OK: ResultadoCriterio = { passou: true };
function falha(motivo: string): ResultadoCriterio {
  return { passou: false, motivo };
}

// ═══════════════════════════════════════════════════════════════════════
// CRITÉRIOS DE CÓDIGO PURO (A, B, C) — determinísticos, sem chamada à API
// ═══════════════════════════════════════════════════════════════════════

/** Critério A — Abertura completa. */
function verificarCriterioA(relatorio: RelatorioV3): ResultadoCriterio {
  const a = relatorio.abertura;
  if (!a) return falha("abertura em falta");
  if (!a.nomeCliente.trim()) return falha("nomeCliente vazio");
  const campos = a.quadroDados;
  const camposObrigatorios: (keyof typeof campos)[] = [
    "dataNascimento",
    "horaNascimento",
    "localNascimento",
    "residenciaActual",
    "sistemasUsados",
    "profissao",
    "perguntaDeclarada",
    "situacaoDeclarada",
  ];
  for (const campo of camposObrigatorios) {
    if (!campos[campo]?.trim()) return falha(`quadroDados.${campo} vazio`);
  }
  if (!a.perguntaEnquadrada.trim()) return falha("perguntaEnquadrada vazio");
  if (!a.notaLeitura.oSigno.trim()) return falha("notaLeitura.oSigno vazio");
  if (!a.notaLeitura.aMedida.trim()) return falha("notaLeitura.aMedida vazio");
  if (!a.notaLeitura.ondeParar.trim()) return falha("notaLeitura.ondeParar vazio");
  return OK;
}

/** Critério B — estrutura das secções obrigatórias. */
function verificarCriterioB(relatorio: RelatorioV3): ResultadoCriterio {
  if (relatorio.retrato60s.linhas.length !== 9) {
    return falha(`retrato60s tem ${relatorio.retrato60s.linhas.length} linhas, exige exactamente 9`);
  }
  if (relatorio.cincoDescobertas.length !== 5) {
    return falha(`cincoDescobertas tem ${relatorio.cincoDescobertas.length}, exige exactamente 5`);
  }
  const nRazoes = relatorio.veredicto.razoes.length;
  if (nRazoes < 2 || nRazoes > 3) {
    return falha(`veredicto.razoes tem ${nRazoes}, exige entre 2 e 3`);
  }

  // O Plano (oPlano) é prosa livre (RelatorioV3.oPlano: string), não um
  // objecto estruturado por bloco — a verificação dos 4 blocos obrigatórios
  // só pode ser heurística (procura dos rótulos que o próprio prompt da
  // Secção 12 exige, ver prompt-v3.ts linha ~1012: "introdução → tabela →
  // menu → o que não fazer"). Documentado como heurística, não garantia
  // semântica — o mesmo tipo de limite já aceite no Critério E.
  const plano = relatorio.oPlano.toLowerCase();
  if (!/\|.{0,40}\||quando.{0,20}o que.{0,20}com que/i.test(relatorio.oPlano) && !/\btabela\b/.test(plano)) {
    return falha("oPlano não tem uma tabela reconhecível (bloco 'tabela' em falta)");
  }
  if (!/\b(1[.)]|1º|primeira proposta|menu)\b/i.test(relatorio.oPlano)) {
    return falha("oPlano não tem um menu de propostas reconhecível (bloco 'menu' em falta)");
  }
  if (!/o que não fazer/i.test(relatorio.oPlano)) {
    return falha("oPlano não tem o bloco 'o que não fazer'");
  }
  if (relatorio.oPlano.trim().length === 0) {
    return falha("oPlano vazio — bloco 'introdução' em falta");
  }

  const paragrafosCusto = relatorio.custoDeNaoFazerNada
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragrafosCusto.length !== 2) {
    return falha(`custoDeNaoFazerNada tem ${paragrafosCusto.length} parágrafos, exige exactamente 2`);
  }
  return OK;
}

const NIVEIS_VALIDOS = new Set<NiveauConfianca>(["convergencia-forte", "sinal-forte", "leitura", "em-aberto"]);

function niveauValido(n: NiveauConfianca | undefined | null): boolean {
  return n != null && NIVEIS_VALIDOS.has(n);
}

/** Critério C — escala de confiança sempre presente e válida. */
function verificarCriterioC(relatorio: RelatorioV3): ResultadoCriterio {
  for (const [i, d] of relatorio.cincoDescobertas.entries()) {
    if (!niveauValido(d.confianca)) return falha(`cincoDescobertas[${i}].confianca inválida ou em falta`);
  }
  for (const [i, r] of relatorio.veredicto.razoes.entries()) {
    if (!niveauValido(r.confianca)) return falha(`veredicto.razoes[${i}].confianca inválida ou em falta`);
  }
  const desfecho = relatorio.espinha;
  if (!desfecho || !("tipo" in desfecho)) return falha("espinha (DesfechoEspinha) em falta");
  if (desfecho.tipo === "convergencia" && !niveauValido(desfecho.nivel)) {
    return falha("espinha.nivel inválido ou em falta");
  }
  if (desfecho.tipo !== "convergencia" && desfecho.tipo !== "padrao-estrutural" && desfecho.tipo !== "ausencia-declarada") {
    return falha(`espinha.tipo desconhecido: ${(desfecho as DesfechoEspinha).tipo}`);
  }
  return OK;
}

// ═══════════════════════════════════════════════════════════════════════
// CRITÉRIO D — ABERTURA ANTES DO CONTEÚDO (código puro + semântico)
// ═══════════════════════════════════════════════════════════════════════

/** Critério D, parte de código puro — o campo abertura existe e está preenchido. */
function verificarCriterioDCodigo(relatorio: RelatorioV3): ResultadoCriterio {
  const resultadoA = verificarCriterioA(relatorio);
  if (!resultadoA.passou) return falha(`abertura incompleta antes do conteúdo: ${resultadoA.motivo}`);
  return OK;
}

function promptCriterioDSemantico(relatorio: RelatorioV3): string {
  return `Esta abertura contém análise astrológica ou conteúdo interpretativo? Responde só {passa: boolean, motivo: string}.

ABERTURA:
Nome: ${relatorio.abertura.nomeCliente}
Quadro de dados: ${JSON.stringify(relatorio.abertura.quadroDados)}
Pergunta enquadrada: ${relatorio.abertura.perguntaEnquadrada}
Nota de leitura: ${JSON.stringify(relatorio.abertura.notaLeitura)}`;
}

async function verificarCriterioDSemantico(relatorio: RelatorioV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const r = await chamarLLM(promptCriterioDSemantico(relatorio));
  return r.passa ? OK : falha(r.motivo);
}

// ═══════════════════════════════════════════════════════════════════════
// CRITÉRIO E — SEM JARGÃO SEM DEFINIÇÃO (código puro)
// TERMOS_PROIBIDOS_V3 — a mesma lista serve de "guarda de vocabulário"
// próprio do v3 (ver nota de topo do ficheiro, desvio 1)
// ═══════════════════════════════════════════════════════════════════════
//
// DECISÃO EXPLÍCITA DESTA SESSÃO (mensagem "Três decisões tomadas",
// 23/08/2026): Critério E e a "guarda de vocabulário" (que substitui
// FORBIDDEN_TERMS do motor antigo) partilham o MESMO mecanismo — todo o
// termo desta lista, encontrado no texto do cliente, tem de vir seguido
// de " — " ou " (" dentro de 80 caracteres (formato "termo — definição").
// Não há dois mecanismos diferentes: a frase de abertura do pedido
// ("termos que nunca devem aparecer no texto do cliente SEM DEFINIÇÃO
// NAVEYA A SEGUIR") aplica-se a toda a lista, incluindo "mapa"/"carta" e
// "casa N" — nenhum destes é uma proibição absoluta.
//
// Cada item é já o SOURCE de uma regex (não uma palavra simples) — para
// suportar o padrão "casa N" (N variável), que uma lista de palavras
// literais não representa.
//
// CORRECÇÃO 23/08/2026 ("Correcção antes de orquestrador") — "Sol", "Lua"
// e "carta" são palavras portuguesas comuns fora de um contexto
// astrológico ("tomar sol", "lua de mel", "carta de apresentação"). O
// risco estava assinalado (ver git history desta secção) e a correcção
// pedida troca o match de palavra simples por CONTEXTO delimitado só
// para estes três: "Sol"/"Lua" só disparam em "o planeta Sol/Lua" ou em
// "Sol/[a] Lua em <signo ou casa N>"; "carta"/"mapa" só disparam nas 3
// frases fixas dadas ("a tua carta natal", "o teu mapa natal", "a carta
// astral") — nunca a palavra solta. Fora destas construções, "Sol",
// "Lua", "mapa" e "carta" NÃO são verificados por este critério — pedido
// explícito, assimetria face aos outros planetas (que continuam a
// disparar em qualquer menção) documentada aqui, não escondida.
//
// Nomes evocativos de nakshatra (DEFINICOES_NAKSHATRA) entram
// dinamicamente — são frases (não uma só palavra), por isso escapadas
// para regex antes de entrar na lista.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TERMOS_PLANETAS_SIMPLES = ["Saturno", "Júpiter", "Marte", "Vénus", "Mercúrio", "Rahu", "Ketu", "Urano", "Neptuno", "Plutão"];
const TERMOS_SIGNOS = ["Carneiro", "Touro", "Gémeos", "Caranguejo", "Leão", "Virgem", "Balança", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"];
const TERMOS_DIGNIDADE = ["exaltado", "exaltada", "debilitado", "debilitada", "combusto", "combusta"];
const TERMOS_SANSCRITOS = ["atmakaraka", "karakamsha", "avastha", "drishti", "dasha", "antardasha", "mahadasha", "nakshatra", "sarvashtakavarga", "vargottama", "bindu", "bhava"];
const TERMOS_OCIDENTAIS_ESTRUTURAIS = ["T-quadrado", "Yod", "Grand Trine", "Grand Cross", "Kite", "orbe"];

/** Nome de signo, em PT, capitalizado — usado dentro do padrão "Sol/Lua em <signo>" abaixo. */
const SIGNO_OU_CASA = `(?:casa\\s+\\d+|${TERMOS_SIGNOS.map(escapeRegex).join("|")})`;

/** "Sol" — só em "o planeta Sol" ou "Sol em <signo/casa>", nunca a palavra solta ("tomar sol", "ao sol"). */
const PADROES_SOL = [`\\bo\\s+planeta\\s+sol\\b`, `\\bsol\\s+em\\s+${SIGNO_OU_CASA}`];
/** "Lua" — só em "o planeta Lua" ou "a Lua em <signo/casa>", nunca a palavra solta ("lua cheia", "lua de mel"). */
const PADROES_LUA = [`\\bo\\s+planeta\\s+lua\\b`, `\\ba\\s+lua\\s+em\\s+${SIGNO_OU_CASA}`];
/** "mapa"/"carta" — só nas 3 frases fixas dadas, nunca a palavra solta ("carta de apresentação", "escrever uma carta"). */
const PADROES_MAPA_CARTA = ["a tua carta natal", "o teu mapa natal", "a carta astral"].map((f) => `\\b${escapeRegex(f)}\\b`);

/**
 * Lista unificada de termos proibidos SEM definição a seguir — serve
 * simultaneamente o Critério E e a guarda de vocabulário v3 (ver nota
 * acima). Cada entrada já é source de regex, com `\b` embutido — os
 * nomes de planeta/signo/sânscrito/ocidental são palavras simples
 * (escapadas e ladeadas de `\b`); "casa N", "Sol"/"Lua em..." e as frases
 * fixas de "mapa"/"carta" são os padrões genuínos (contexto delimitado).
 */
export const TERMOS_PROIBIDOS_V3: string[] = [
  ...[...TERMOS_PLANETAS_SIMPLES, ...TERMOS_SIGNOS, ...TERMOS_DIGNIDADE, ...TERMOS_SANSCRITOS, ...TERMOS_OCIDENTAIS_ESTRUTURAIS].map((t) => `\\b${escapeRegex(t)}\\b`),
  "\\bcasa\\s+\\d+\\b",
  ...PADROES_SOL,
  ...PADROES_LUA,
  ...PADROES_MAPA_CARTA,
  ...Object.values(DEFINICOES_NAKSHATRA).map((n) => `\\b${escapeRegex(n.nomeEvocativo)}\\b`),
];

/**
 * Verifica que todo o termo de `TERMOS_PROIBIDOS_V3` encontrado no texto
 * é seguido de " — " ou " (" dentro de 80 caracteres (formato "termo —
 * definição" da correcção global de 23/08/2026). Exportada porque é
 * reutilizável fora deste ficheiro (ex.: um linter de prompt).
 */
/**
 * CORRIGIDO 23/08/2026 (primeiro relatório real, Alice Amorim) — a regra
 * "termo — definição" só exige a definição na PRIMEIRA menção de cada
 * termo dentro do texto; da segunda menção em diante, o termo pode
 * aparecer sozinho (boa prosa não repete a definição inteira a cada
 * ocorrência). Antes desta correcção, cada ocorrência era verificada
 * independentemente — no relatório real da Alice isto produziu dezenas de
 * "violações" que eram, na verdade, segundas/terceiras menções legítimas
 * dentro da mesma secção (ex.: "casa 10" definida uma vez em
 * `comoEsVista`, depois reutilizada sem repetir a definição). Agora só a
 * PRIMEIRA ocorrência de cada termo é examinada; encontrada ou não, as
 * restantes nunca são sinalizadas.
 */
export function verificarJargaoComDefinicao(texto: string): { passa: boolean; violacoes: string[] } {
  const violacoes: string[] = [];
  for (const padrao of TERMOS_PROIBIDOS_V3) {
    const re = new RegExp(padrao, "i");
    const m = re.exec(texto); // só a primeira ocorrência deste termo neste texto
    if (m == null) continue;
    const depois = texto.slice(m.index + m[0].length, m.index + m[0].length + 80);
    if (!depois.startsWith(" —") && !depois.startsWith(" (")) {
      violacoes.push(`"${m[0]}" sem definição a seguir (contexto: "${texto.slice(Math.max(0, m.index - 10), m.index + 40)}")`);
    }
  }
  return { passa: violacoes.length === 0, violacoes };
}

/** Todas as secções em prosa livre do relatório, rótulo → texto — usada pelo Critério E, pelo guarda de vocabulário e pelo detector de repetição. A nota de leitura (abertura) fica deliberadamente FORA desta lista: a excepção documentada do Critério E (signo solar nomeado uma vez, sem definição, como âncora da abertura) resolve-se por omissão, não por regra especial dentro do detector. */
function seccoesTextuais(relatorio: RelatorioV3): Record<string, string> {
  const out: Record<string, string> = {
    quemEs: relatorio.quemEs,
    formaDeVida: relatorio.formaDeVida,
    dinheiro: relatorio.dinheiro,
    comoEsVista: relatorio.comoEsVista,
    oRelogio: relatorio.oRelogio,
    oPlano: relatorio.oPlano,
    custoDeNaoFazerNada: relatorio.custoDeNaoFazerNada,
    veredictoResposta: relatorio.veredicto.resposta,
  };
  if (relatorio.oQueTeTemTravado) out.oQueTeTemTravado = relatorio.oQueTeTemTravado;
  if (relatorio.transitoActual) out.transitoActual = relatorio.transitoActual;
  if (relatorio.sobreOQueEEmQueForma) out.sobreOQueEEmQueForma = relatorio.sobreOQueEEmQueForma;
  if (relatorio.umaUltimaCoisa) out.umaUltimaCoisa = relatorio.umaUltimaCoisa;
  if (relatorio.anexoA) out.anexoA = relatorio.anexoA;
  for (const [i, d] of relatorio.cincoDescobertas.entries()) out[`descoberta${i + 1}`] = d.texto;
  for (const [i, l] of relatorio.retrato60s.linhas.entries()) out[`retrato60s_linha${i + 1}`] = l.texto;
  // Anexo B é estruturado (AnexoB), não prosa livre — só os campos com
  // texto real entram no rastreio ("14 secções + 2 anexos", pedido
  // explícito do detector de repetição).
  if (relatorio.anexoB) {
    for (const [i, f] of relatorio.anexoB.figurasFechadas.entries()) out[`anexoB_figura${i + 1}`] = f.detalhe;
    for (const [i, l] of relatorio.anexoB.tabelaRastreio.entries()) out[`anexoB_rastreio${i + 1}`] = `${l.afirmacao} ${l.base}`;
  }
  return out;
}

/**
 * CORRIGIDO 23/08/2026 (primeiro relatório real, Alice Amorim) — o Anexo B
 * (`figurasFechadas.detalhe`, `tabelaRastreio`) é texto TÉCNICO gerado por
 * código (`anexoB.ts`), nunca prosa do cliente — nunca teve de seguir a
 * regra "termo — definição" (essa regra é sobre como o LLM escreve para o
 * cliente, não sobre a notação técnica interna). Excluído aqui do scan de
 * jargão; continua incluído em `detectarRepeticaoEntreSeccoes` (pedido
 * separado, "14 secções + 2 anexos" ainda se aplica ao detector de
 * repetição, só não ao Critério E).
 */
function seccoesTextuaisParaJargao(relatorio: RelatorioV3): Record<string, string> {
  const todas = seccoesTextuais(relatorio);
  const filtradas: Record<string, string> = {};
  for (const [nome, texto] of Object.entries(todas)) {
    if (nome.startsWith("anexoB_")) continue;
    filtradas[nome] = texto;
  }
  return filtradas;
}

function verificarCriterioE(relatorio: RelatorioV3): ResultadoCriterio {
  const secs = seccoesTextuaisParaJargao(relatorio);
  const todasViolacoes: string[] = [];
  for (const [nome, texto] of Object.entries(secs)) {
    const r = verificarJargaoComDefinicao(texto);
    if (!r.passa) todasViolacoes.push(...r.violacoes.map((v) => `[${nome}] ${v}`));
  }
  if (todasViolacoes.length > 0) return falha(todasViolacoes.join("; "));
  return OK;
}

// ═══════════════════════════════════════════════════════════════════════
// CRITÉRIOS SEMÂNTICOS (F a K) — verificação por LLM
// ═══════════════════════════════════════════════════════════════════════

// Número da secção → como existe em RelatorioV3 (obrigatória: sempre
// presente; condicional: presente sse o campo correspondente não é
// null/undefined). Fonte: types-v3.ts, comentários "secção N" em cada
// campo de RelatorioV3.
const SECCAO_PRESENTE: Record<number, (r: RelatorioV3) => boolean> = {
  1: () => true, // retrato60s
  2: () => true, // cincoDescobertas
  3: () => true, // veredicto
  4: () => true, // quemEs
  5: () => true, // formaDeVida
  6: (r) => r.oQueTeTemTravado != null,
  7: (r) => r.transitoActual != null,
  8: () => true, // dinheiro
  9: () => true, // comoEsVista
  10: (r) => r.sobreOQueEEmQueForma != null,
  11: () => true, // oRelogio
  12: () => true, // oPlano
  13: () => true, // custoDeNaoFazerNada
  14: (r) => r.umaUltimaCoisa != null,
};

/**
 * Critério F, camada de código puro — só verifica que `seccaoReferencia`,
 * quando nomeia uma secção numerada ("Secção N — ..."), aponta para uma
 * secção que de facto existe neste relatório (nunca uma condicional
 * omitida). Não verifica correspondência TEMÁTICA real — isso fica para
 * a camada semântica abaixo, que degrada graciosamente sem LLM.
 */
function verificarCriterioFCodigo(relatorio: RelatorioV3): ResultadoCriterio {
  const problemas: string[] = [];
  for (const [i, l] of relatorio.retrato60s.linhas.entries()) {
    const m = /secç(ã|a)o\s+(\d+)/i.exec(l.seccaoReferencia);
    if (!m) continue; // referência em prosa livre, sem número — nada a verificar por código
    const n = Number(m[2]);
    const existeFn = SECCAO_PRESENTE[n];
    if (!existeFn) {
      problemas.push(`linha ${i + 1} aponta para "Secção ${n}", que não existe no v3 (1-14)`);
      continue;
    }
    if (!existeFn(relatorio)) {
      problemas.push(`linha ${i + 1} ("${l.texto}") aponta para "${l.seccaoReferencia}", secção condicional AUSENTE neste relatório`);
    }
  }
  if (problemas.length > 0) return falha(problemas.join("; "));
  return OK;
}

function promptCriterioF(relatorio: RelatorioV3): string {
  const linhas = relatorio.retrato60s.linhas.map((l, i) => `${i + 1}. "${l.texto}" (rastreio declarado: ${l.seccaoReferencia})`).join("\n");
  return `Cada linha do Retrato 60 Segundos deve apontar para um tema que aparece desenvolvido numa secção posterior do relatório. Verifica se as 9 linhas têm correspondência real com o conteúdo das secções que se seguem. Responde {passa: boolean, motivo: string}.

RETRATO 60 SEGUNDOS:
${linhas}

SECÇÕES DISPONÍVEIS NO RELATÓRIO: ${Object.keys(seccoesTextuais(relatorio)).join(", ")}`;
}

async function verificarCriterioFSemantico(relatorio: RelatorioV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const r = await chamarLLM(promptCriterioF(relatorio));
  return r.passa ? OK : falha(r.motivo);
}

function afirmacaoEspinha(relatorio: RelatorioV3): string | null {
  const d = relatorio.espinha;
  return "afirmacao" in d ? d.afirmacao : null;
}

/**
 * Critério G, camada de código puro — repetição LITERAL (palavra-por-
 * palavra) da afirmação da espinha em 2+ secções distintas. A detecção de
 * PARÁFRASE (não literal) fica só na camada semântica — código puro não
 * julga proximidade semântica.
 */
/** As primeiras N palavras de uma frase — usado como "frase-molde" da espinha (Critério G, correcção 25/08/2026). */
function primeirasPalavras(texto: string, n: number): string {
  return texto.trim().split(/\s+/).slice(0, n).join(" ");
}

function contarOcorrencias(texto: string, procurado: string): number {
  if (procurado.length === 0) return 0;
  let n = 0;
  let i = texto.indexOf(procurado);
  while (i !== -1) {
    n++;
    i = texto.indexOf(procurado, i + procurado.length);
  }
  return n;
}

/**
 * CORRIGIDO 25/08/2026 ("Correcções críticas ao motor v3", ponto 3A) — o
 * Critério G original só apanhava a frase INTEIRA da espinha repetida
 * literalmente em 2+ secções. No relatório real da Alice, o LLM nunca
 * copiou a frase inteira — repetiu antes um FRAGMENTO reconhecível dela
 * (a cláusula do graha, "a necessidade de ser reconhecida como fonte...")
 * umas 12 vezes, sem nunca disparar o critério original. Acrescentada
 * uma segunda verificação, puramente de código: conta quantas vezes as
 * PRIMEIRAS 8 PALAVRAS da afirmação aparecem, literalmente, em TODO o
 * texto do relatório (não só em secções distintas — ocorrências a
 * mais dentro da mesma secção também contam) — falha se > 3.
 *
 * NOTA HONESTA — mesmo esta verificação mais ampla não teria apanhado o
 * padrão real da Alice (que repetia a SEGUNDA metade da afirmação, a
 * definição do graha, não as primeiras 8 palavras, que começam sempre
 * por "Quem esta pessoa é, por dentro, e..."). Implementado exactamente
 * como pedido nesta sessão; a limitação fica registada aqui, não
 * escondida, para calibração futura.
 */
function verificarCriterioGCodigo(relatorio: RelatorioV3): ResultadoCriterio {
  const afirmacao = afirmacaoEspinha(relatorio);
  if (!afirmacao) return OK; // "ausencia-declarada" não tem afirmação para repetir

  const secs = seccoesTextuais(relatorio);
  const ocorrenciasPorSeccao = Object.entries(secs).filter(([, texto]) => texto.includes(afirmacao));
  if (ocorrenciasPorSeccao.length >= 2) {
    return falha(`a afirmação da espinha ("${afirmacao}") aparece literalmente em ${ocorrenciasPorSeccao.length} secções: ${ocorrenciasPorSeccao.map(([n]) => n).join(", ")}`);
  }

  const moldeEspinha = primeirasPalavras(afirmacao, 8);
  const textoCompleto = Object.values(secs).join("\n\n");
  const totalOcorrencias = contarOcorrencias(textoCompleto, moldeEspinha);
  if (totalOcorrencias > 3) {
    return falha(`a frase-molde da espinha ("${moldeEspinha}...") aparece ${totalOcorrencias} vezes em todo o relatório — acima do limite de 3`);
  }

  return OK;
}

function promptCriterioG(relatorio: RelatorioV3, afirmacao: string): string {
  const secs = seccoesTextuais(relatorio);
  return `A espinha central é: "${afirmacao}". Verifica se esta frase ou uma paráfrase muito próxima aparece mais do que uma vez no relatório. Repetição é diferente de ilustração — cada secção deve aprofundar um ângulo diferente. Responde {passa: boolean, motivo: string}.

TEXTO COMPLETO DAS SECÇÕES:
${Object.entries(secs)
  .map(([nome, texto]) => `--- ${nome} ---\n${texto}`)
  .join("\n\n")}`;
}

async function verificarCriterioGSemantico(relatorio: RelatorioV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const afirmacao = afirmacaoEspinha(relatorio);
  if (!afirmacao) return OK;
  const r = await chamarLLM(promptCriterioG(relatorio, afirmacao));
  return r.passa ? OK : falha(r.motivo);
}

/**
 * Critério H, camada de código puro — o bloco "o que não fazer" existe
 * (rótulo presente) e não fica vazio logo a seguir (há texto substantivo
 * antes do fim da secção ou da próxima quebra dupla de linha). A
 * ESPECIFICIDADE do conteúdo (é desta carta, não uma generalidade) fica
 * só na camada semântica.
 */
function verificarCriterioHCodigo(relatorio: RelatorioV3): ResultadoCriterio {
  const m = /o que não fazer[:\s—-]*/i.exec(relatorio.oPlano);
  if (!m) return falha("bloco 'o que não fazer' ausente do Plano");
  const depois = relatorio.oPlano.slice(m.index + m[0].length);
  const conteudo = depois.split(/\n\s*\n/)[0]?.trim() ?? "";
  if (conteudo.length < 10) return falha("bloco 'o que não fazer' está vazio ou quase vazio");
  return OK;
}

function promptCriterioH(relatorio: RelatorioV3): string {
  return `O Plano deve ter um bloco explícito sobre o que NÃO fazer neste momento. Verifica se esse bloco existe e se é específico desta carta (não uma generalidade). Responde {passa: boolean, motivo: string}.

O PLANO:
${relatorio.oPlano}`;
}

async function verificarCriterioHSemantico(relatorio: RelatorioV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const r = await chamarLLM(promptCriterioH(relatorio));
  return r.passa ? OK : falha(r.motivo);
}

function promptCriterioI(relatorio: RelatorioV3, mainQuestion: string): string {
  return `A pergunta declarada é: "${mainQuestion}". O veredicto responde directamente a esta pergunta? Não esquiva, não generaliza? Responde {passa: boolean, motivo: string}.

VEREDICTO:
${relatorio.veredicto.resposta}`;
}

async function verificarCriterioI(relatorio: RelatorioV3, dados: DadosClienteV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const r = await chamarLLM(promptCriterioI(relatorio, dados.mainQuestion));
  return r.passa ? OK : falha(r.motivo);
}

// ── Critério J — secções condicionais só quando activas (código puro) ──
//
// As condições abaixo espelham deliberadamente (não importam) as mesmas
// condições já implementadas em prompt-v3.ts (`construirPromptSeccao6...`,
// `construirPromptSeccao7...`, `construirPromptSeccao14...`) — reportado
// como simplificação aceite (mesma classe de decisão já aprovada para a
// tabela de rastreio do Anexo B): duplicar a condição aqui evita alterar
// ficheiros já aprovados e testados só para servir este critério. Se as
// condições de activação em prompt-v3.ts mudarem, este critério tem de ser
// actualizado a par — risco documentado, não escondido.

function seccao6DeveriaExistir(camada: CamadaA, dados: DadosClienteV3): boolean {
  const savPorCasa = new Map(camada.sav.byHouse.map((h) => [h.casa, h.pontuacao]));
  const PALAVRAS_DINHEIRO = ["dinheiro", "ganhar", "ganho", "rendimento", "rendiment", "sustento", "financeir", "pagar", "pagamento", "cobrar", "preço", "salário", "receita"];
  const texto = `${dados.mainQuestion} ${dados.situacaoDeclarada}`.toLowerCase();
  const perguntaEnvolveDinheiro = PALAVRAS_DINHEIRO.some((p) => texto.includes(p));
  const casasRelevantes = perguntaEnvolveDinheiro ? [2, 6, 7, 10, 11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const casasFracasRelevantes = casasRelevantes.filter((c) => bandaAbsolutaSav(savPorCasa.get(c) ?? 28) === "fraco");

  const FORTE_CLASSICA = new Set(["Exalted", "Own", "Moolatrikona"]);
  const FORTE_MAITRI = new Set(["adhi-mitra", "mitra"]);
  const planetasFortesEmCasaFraca = CLASSICAL_GRAHAS.filter((g) => {
    const dign = camada.dignidades[g];
    const forte = FORTE_CLASSICA.has(dign.classica) || (dign.panchadha != null && FORTE_MAITRI.has(dign.panchadha));
    const casa = camada.posicoesPlanetarias[g].house;
    return forte && bandaAbsolutaSav(savPorCasa.get(casa) ?? 28) === "fraco";
  });

  const ak = camada.karakas.atmakaraka;
  const figurasComAk = camada.figurasFechadas.filter((f) => f.pontos.includes(ak));

  return casasFracasRelevantes.length > 0 || planetasFortesEmCasaFraca.length > 0 || figurasComAk.length > 0;
}

function seccao7DeveriaExistir(camada: CamadaA): boolean {
  return camada.slowTransits.some((t) => t.contactosNatal.length > 0);
}

function seccao14DeveriaExistir(camada: CamadaA): boolean {
  const FORTE_CLASSICA = new Set(["Exalted", "Own", "Moolatrikona"]);
  const FORTE_MAITRI = new Set(["adhi-mitra", "mitra"]);
  const planetaForte = (g: (typeof CLASSICAL_GRAHAS)[number]): boolean => {
    const dign = camada.dignidades[g];
    const forteClassica = FORTE_CLASSICA.has(dign.classica);
    const forteMaitri = dign.panchadha != null && FORTE_MAITRI.has(dign.panchadha);
    const avasthaFavoravel = camada.avasthas[g] === "Yuva";
    return forteClassica || forteMaitri || avasthaFavoravel;
  };
  const ocupantesCasa = (casa: number): (typeof CLASSICAL_GRAHAS)[number][] =>
    CLASSICAL_GRAHAS.filter((g) => camada.posicoesPlanetarias[g].house === casa);
  const fortesCasa12 = ocupantesCasa(12).filter(planetaForte);
  const fortesCasa9 = ocupantesCasa(9).filter(planetaForte);
  const pontosCasa9e12 = new Set<string>([...ocupantesCasa(12), ...ocupantesCasa(9)]);
  const figuraRelevante = camada.figurasFechadas.some((f) => f.pontos.some((p) => pontosCasa9e12.has(p)));
  const transitoRelevante = camada.slowTransits.some((t) => t.contactosNatal.length > 0 && (t.casaAPartirDoAscendente === 9 || t.casaAPartirDoAscendente === 12));
  return fortesCasa12.length > 0 || fortesCasa9.length > 0 || figuraRelevante || transitoRelevante;
}

function verificarCriterioJ(relatorio: RelatorioV3, camada: CamadaA, dados: DadosClienteV3): ResultadoCriterio {
  const problemas: string[] = [];

  const existe6 = relatorio.oQueTeTemTravado != null;
  const deveria6 = seccao6DeveriaExistir(camada, dados);
  if (existe6 && !deveria6) problemas.push("Secção 6 existe mas nenhuma condição de activação está satisfeita");

  const existe7 = relatorio.transitoActual != null;
  const deveria7 = seccao7DeveriaExistir(camada);
  if (existe7 && !deveria7) problemas.push("Secção 7 existe mas não há slowTransits activos");

  const existe10 = relatorio.sobreOQueEEmQueForma != null;
  // seccao10Activa não é importado aqui de propósito: chamá-lo exigiria
  // acoplar verificacao.ts a prompt-v3.ts para uma função de uma linha.
  // Reimplementado localmente por simetria com seccao6/7/14 acima.
  const PALAVRAS_VOCACAO = ["fazer", "faço", "fazes", "faz ", "fazemos", "fazem", "fazendo", "trabalh", "carreira", "vocaç", "vocac", "área", "area", "profiss", "caminho", "missão", "missao", "propósit", "proposit", "sou boa", "onde rendo", "onde rende"];
  const textoVocacao = `${dados.mainQuestion} ${dados.situacaoDeclarada}`.toLowerCase();
  const deveria10 = PALAVRAS_VOCACAO.some((p) => textoVocacao.includes(p));
  if (existe10 && !deveria10) problemas.push("Secção 10 existe mas seccao10Activa() seria false para esta pergunta");

  const existe14 = relatorio.umaUltimaCoisa != null;
  const deveria14 = seccao14DeveriaExistir(camada);
  if (existe14 && !deveria14) problemas.push("Secção 14 existe mas não há casa 9/12 com planeta forte, figura ou trânsito relevante");

  if (problemas.length > 0) return falha(problemas.join("; "));
  return OK;
}

// Frases de medo artificial dadas literalmente no pedido desta sessão
// ("Três decisões tomadas", 23/08/2026) — detecção de código puro para o
// caso óbvio; a camada semântica cobre manipulação mais subtil que estas
// frases fixas não apanham.
const FRASES_MEDO_ARTIFICIAL_K = [/vai correr mal/i, /última oportunidade/i, /nunca mais vais ter esta hipótese/i, /não vais ter outra (chance|oportunidade)/i, /se não (agires|agir|fizeres) agora/i];

function verificarCriterioKCodigo(relatorio: RelatorioV3): ResultadoCriterio {
  const encontradas = FRASES_MEDO_ARTIFICIAL_K.filter((re) => re.test(relatorio.custoDeNaoFazerNada));
  if (encontradas.length > 0) {
    return falha(`linguagem de medo artificial encontrada: ${encontradas.map((re) => re.source).join(", ")}`);
  }
  return OK;
}

function promptCriterioK(relatorio: RelatorioV3): string {
  return `A secção 'Custo de não fazer nada' usa linguagem de medo, urgência artificial ou manipulação? Deve descrever o padrão que continua se nada mudar — nunca ameaçar. Responde {passa: boolean, motivo: string}.

CUSTO DE NÃO FAZER NADA:
${relatorio.custoDeNaoFazerNada}`;
}

async function verificarCriterioKSemantico(relatorio: RelatorioV3, chamarLLM: ChamadaLLM): Promise<ResultadoCriterio> {
  const r = await chamarLLM(promptCriterioK(relatorio));
  return r.passa ? OK : falha(r.motivo);
}

// ═══════════════════════════════════════════════════════════════════════
// GUARDA DE VOCABULÁRIO v3 — equivalente próprio a FORBIDDEN_TERMS
// (ver nota de topo do ficheiro, desvio 1). Mesmo mecanismo e mesma
// lista do Critério E (`TERMOS_PROIBIDOS_V3` / `verificarJargaoComDefinicao`,
// acima) — exposta como critério próprio, com nome distinto, por pedido
// explícito ("Integrar como critério adicional — não substituto"), não
// porque a lógica seja diferente.
// ═══════════════════════════════════════════════════════════════════════

function verificarVocabularioProibido(relatorio: RelatorioV3): ResultadoCriterio {
  return verificarCriterioE(relatorio);
}

// ═══════════════════════════════════════════════════════════════════════
// DETECTOR DE REPETIÇÃO ENTRE SECÇÕES — equivalente próprio a
// crossChapterCheck.ts (ver nota de topo do ficheiro, desvio 1).
//
// LIMIAR — DECISÃO EXPLÍCITA DESTA SESSÃO (mensagem "Três decisões
// tomadas", 23/08/2026): "3+ shingles iguais entre DUAS secções
// diferentes = warning". Isto é mais simples do que o desenho original de
// `crossChapterCheck.ts` (union-find, grupo tem de atravessar 3+ SECÇÕES
// distintas) — aqui o par de secções já dispara com N shingles PARTILHADOS
// entre as duas, sem precisar de uma terceira secção envolvida. A mesma
// mensagem também diz "mesmo algoritmo do crossChapterCheck existente" —
// as duas frases não descrevem exactamente o mesmo limiar; segui a
// definição mais explícita e mais recente (a contagem por par), reportado
// aqui como a leitura escolhida. Continua a nunca bloquear — só
// `warnings`, código genérico (shingles de 5 palavras), sem dependência
// de tipos do motor antigo.
//
// LIMIAR SUBIDO DE 3 PARA 7 — 23/08/2026, depois do primeiro relatório
// real (Alice Amorim): com limiar 3, ~90 dos 147 warnings eram a espinha
// a ecoar por design em quase todas as secções (o próprio motivo de
// existir da espinha) — ruído, não sinal. 7 shingles partilhados (35
// palavras em sequência comum, contando sobreposições) filtra a coerência
// temática intencional e continua a apanhar repetição literal genuína.
// ═══════════════════════════════════════════════════════════════════════

const LIMIAR_SHINGLES_PARTILHADOS = 7;

export interface RepeticaoEntreSeccoes {
  seccaoA: string;
  seccaoB: string;
  shinglesPartilhados: string[];
}

const STOPWORDS_PT = new Set(["o", "a", "os", "as", "de", "da", "do", "das", "dos", "que", "e", "um", "uma", "em", "no", "na", "nos", "nas", "para", "com", "por", "se", "é", "não", "mais", "como", "já", "ao", "à", "ou", "também", "isso", "este", "esta"]);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[^\wà-öø-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shinglesDe(texto: string, n = 5): Set<string> {
  const palavras = normalizar(texto)
    .split(" ")
    .filter((w) => w.length > 1);
  const out = new Set<string>();
  for (let i = 0; i + n <= palavras.length; i++) {
    const grupo = palavras.slice(i, i + n);
    if (grupo.every((w) => STOPWORDS_PT.has(w))) continue;
    out.add(grupo.join(" "));
  }
  return out;
}

/** Detecta pares de secções com `LIMIAR_SHINGLES_PARTILHADOS`+ shingles de 5 palavras partilhados — candidatos a repetição literal entre as 14 secções + 2 anexos. */
export function detectarRepeticaoEntreSeccoes(relatorio: RelatorioV3): RepeticaoEntreSeccoes[] {
  const secs = Object.entries(seccoesTextuais(relatorio)).map(([seccao, texto]) => ({ seccao, shingles: shinglesDe(texto) }));

  const flags: RepeticaoEntreSeccoes[] = [];
  for (let i = 0; i < secs.length; i++) {
    for (let j = i + 1; j < secs.length; j++) {
      const partilhados = [...secs[i].shingles].filter((g) => secs[j].shingles.has(g));
      if (partilhados.length >= LIMIAR_SHINGLES_PARTILHADOS) {
        flags.push({ seccaoA: secs[i].seccao, seccaoB: secs[j].seccao, shinglesPartilhados: partilhados });
      }
    }
  }
  return flags;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

export interface OpcoesVerificacao {
  /** Callback de LLM para os critérios semânticos. Sem ela, esses critérios ficam "não verificado" (warning), nunca falham a geração por falta de API key. */
  chamarLLM?: ChamadaLLM;
}

export async function verificarRelatorioV3(relatorio: RelatorioV3, camada: CamadaA, request: DadosClienteV3, opcoes: OpcoesVerificacao = {}): Promise<ResultadoVerificacao> {
  const criterios: ResultadoVerificacao["criterios"] = {};
  const warnings: string[] = [];

  // Código puro — sempre síncrono.
  criterios.A = verificarCriterioA(relatorio);
  criterios.B = verificarCriterioB(relatorio);
  criterios.C = verificarCriterioC(relatorio);
  criterios.D_codigo = verificarCriterioDCodigo(relatorio);
  criterios.E = verificarCriterioE(relatorio);
  criterios.F_codigo = verificarCriterioFCodigo(relatorio);
  criterios.G_codigo = verificarCriterioGCodigo(relatorio);
  criterios.H_codigo = verificarCriterioHCodigo(relatorio);
  criterios.J = verificarCriterioJ(relatorio, camada, request);
  criterios.K_codigo = verificarCriterioKCodigo(relatorio);
  criterios.vocabularioProibido = verificarVocabularioProibido(relatorio);

  const repeticoes = detectarRepeticaoEntreSeccoes(relatorio);
  if (repeticoes.length > 0) {
    warnings.push(...repeticoes.map((r) => `Repetição candidata entre secções: ${r.seccaoA} ↔ ${r.seccaoB} — "${r.shinglesPartilhados[0]}"`));
  }

  // Semânticos — opcionais, degradam para "não verificado".
  const { chamarLLM } = opcoes;
  const chaveSemantico: [string, () => Promise<ResultadoCriterio>][] = [
    ["D_semantico", () => verificarCriterioDSemantico(relatorio, chamarLLM!)],
    ["F_semantico", () => verificarCriterioFSemantico(relatorio, chamarLLM!)],
    ["G_semantico", () => verificarCriterioGSemantico(relatorio, chamarLLM!)],
    ["H_semantico", () => verificarCriterioHSemantico(relatorio, chamarLLM!)],
    ["I", () => verificarCriterioI(relatorio, request, chamarLLM!)],
    ["K_semantico", () => verificarCriterioKSemantico(relatorio, chamarLLM!)],
  ];

  for (const [nome, fn] of chaveSemantico) {
    if (!chamarLLM) {
      warnings.push(`Critério ${nome}: não verificado — sem callback de LLM disponível`);
      continue;
    }
    criterios[nome] = await fn();
  }

  const passou = Object.values(criterios).every((c) => c.passou);
  return { passou, criterios, warnings };
}
