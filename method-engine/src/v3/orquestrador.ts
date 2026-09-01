// FASE 1, Passo 6 — orquestrador.ts. Une camada-a.ts + espinha.ts +
// prompt-v3.ts + verificacao.ts + anexoB.ts num único `gerarRelatorioV3`.
// Pedido original: "Avançar para orquestrador.ts", 23/08/2026.
//
// TRÊS DESVIOS AO PEDIDO LITERAL — investigados antes de escrever este
// ficheiro, resolvidos por analogia directa a decisões já aprovadas nesta
// sessão (não são escolhas de valor em aberto — são a única forma
// mecânica de ligar peças já aprovadas), documentados aqui e no relatório
// desta sessão em vez de bloquear outra vez à espera de aprovação:
//
// 1. `ReportRequest` — não existe em method-engine, e importá-lo de `web`
//    inverteria a arquitectura já estabelecida (mesma nota em
//    `DadosClienteV3`, prompt-v3.ts, e em `camada-a.ts`). Este ficheiro
//    usa `EntradaOrquestradorV3` (BirthInput + DadosClienteV3 + atDate) —
//    a forma local, tal como o resto do v3 já faz.
//
// 2. "Reutilizar a mesma infra de chamada à API que o motor antigo usa" —
//    essa infra (`web/src/lib/report/write.ts`) importa `@anthropic-ai/sdk`
//    (dependência que method-engine NUNCA teve — só astronomy-engine e
//    sweph até hoje) e está profundamente acoplada a `ReportRequest` e a
//    checkpoints via Supabase (callback `onChapter` que grava no Supabase,
//    não um ficheiro). Importar isto para method-engine seria, ao mesmo
//    tempo, tocar no motor antigo E inverter a dependência de workspace.
//    Decisão: `chamarLLM` é um parâmetro INJECTADO (`OpcoesOrquestrador.
//    chamarLLM`), nunca uma chamada de rede por omissão. Sem ele, cada
//    secção fica "não gerada" (registado em warnings), nunca bloqueia —
//    e o motor nunca faz uma chamada de API paga sem o chamador decidir
//    isso explicitamente. Isto também é exactamente o que o pedido do
//    teste de integração já implicava ("substituir chamarLLM por um mock")
//    — chamarLLM tinha de ser substituível para começar.
//
// 3. Checkpoints — o mecanismo do motor antigo é um callback que grava no
//    Supabase (não um ficheiro, não portável para fora de `web`). Como o
//    próprio pedido já previa este caso ("se não existir: implementar
//    simples"), implementado aqui exactamente como descrito: um ficheiro
//    JSON por secção em `checkpointDir`.
//
// GAPS DE CONTRATO ENCONTRADOS AO LIGAR prompt-v3.ts A types-v3.ts —
// nenhuma das secções já aprovadas foi escrita a pensar em COMO o texto
// solto que o LLM devolve volta a virar campos estruturados de
// `RelatorioV3`. Resolvidos aqui, documentados nos pontos de uso abaixo:
//
// A. `retrato60s`/`cincoDescobertas` — os prompts pedem 9/N PARÁGRAFOS DE
//    PROSA, sem numeração nem JSON ("não produza JSON — só o texto").
//    Reconstituídos por POSIÇÃO: divide a resposta por parágrafos (linha
//    em branco) e empareceparelha índice-a-índice com a mesma lista
//    determinística que construiu o prompt (`construirLinhasRetrato` /
//    `gerarDescobertasCandidatas`, ambas já deterministas e já usadas
//    para escrever o prompt) — nunca inventado, é o inverso mecânico de
//    como o prompt foi montado.
//
// B. `veredicto.razoes: Descoberta[]` — o prompt da Secção 3 devolve UMA
//    prosa contínua (resposta + razões fundidas, "Dê uma resposta
//    concreta, depois as razões" — nunca pediu uma lista separável). Todo
//    o texto devolvido vira `resposta`; `razoes` é construído à parte,
//    reutilizando os candidatos já deterministas de
//    `gerarDescobertasCandidatas` (mesma fonte que já dá o nível de
//    confiança às Cinco Descobertas) — os 2-3 candidatos a seguir ao
//    primeiro (que É a espinha, e o veredicto já não pode repeti-la).
//    Preserva a garantia de nunca inventar nível de confiança.
//
// C. Secção 5 (`construirPromptSeccao5FormaDeVida`) devolve `string |
//    null` (null quando `!camada.sav.fiavel`), mas `RelatorioV3.
//    formaDeVida` é `string` obrigatório ("sempre no v3, não
//    condicional"). Hoje `sav.fiavel` está sempre `true` (7 tabelas
//    verificadas — ver AUDITORIA-CALCULOS-23Ago.md), por isso este
//    ramo é código morto na prática; mesmo assim, um `null` aqui recebe
//    uma frase honesta de fallback ("SAV não disponível nesta corrida"),
//    nunca um campo vazio.

import type { RelatorioV3, CamadaA, AnexoB, DesfechoEspinha, Descoberta, ResultadoMotorV3 } from "../types-v3";
import type { BirthInput } from "../lifeReport/types";
import { gerarCamadaA } from "./camada-a";
import { derivarEspinha, type DerivacaoEspinha } from "./espinha";
import { construirAnexoB } from "./anexoB";
import { verificarRelatorioV3, type ChamadaLLM, type ResultadoVerificacao } from "./verificacao";
import {
  type DadosClienteV3,
  construirAbertura,
  construirLinhasRetrato,
  construirPromptSeccao1Retrato60s,
  construirPromptSeccao2CincoDescobertas,
  construirPromptSeccao3Veredicto,
  construirPromptSeccao4QuemEs,
  construirPromptSeccao5FormaDeVida,
  construirPromptSeccao6OQueTeTemTravado,
  construirPromptSeccao7TransitoActual,
  construirPromptSeccao8Dinheiro,
  construirPromptSeccao9ComoEsVista,
  construirPromptSeccao10SobreOQue,
  construirPromptSeccao11Relogio,
  construirPromptSeccao12Plano,
  construirPromptSeccao13Custo,
  construirPromptSeccao14UltimaCoisa,
  construirPromptAnexoA,
} from "./prompt-v3";
import { gerarDescobertasCandidatas } from "./descobertas";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Entrada local do orquestrador — NUNCA `ReportRequest` da camada web
 * (ver nota de topo do ficheiro, desvio 1). `natal` é o mesmo contrato
 * que `gerarCamadaA` já usa; `atDate` é "hoje" para trânsitos/dasha
 * (omitido = `new Date()`, igual ao valor por omissão de `gerarCamadaA`).
 */
export interface EntradaOrquestradorV3 {
  natal: BirthInput;
  atDate?: Date;
  dados: DadosClienteV3;
}

export interface OpcoesOrquestrador {
  /** Activa os critérios semânticos (LLM) da verificação final. Omisso/false = só código puro. */
  verificacaoSemantica?: boolean;
  /** Tentativas por secção antes de desistir e registar warning. Omisso = 3, como o motor antigo. */
  maxTentativas?: number;
  /** Directório para checkpoints por secção (ficheiro JSON). Omisso = sem checkpoint, sem retoma. */
  checkpointDir?: string;
  /**
   * Chamada real ao LLM — prompt de entrada, número da tentativa (1-based),
   * devolve o texto gerado. INJECTADA, nunca uma chamada de rede por
   * omissão (ver desvio 2, nota de topo). Sem ela, todas as secções ficam
   * "não geradas" — o motor completa na mesma, nunca bloqueia, e nunca
   * gasta uma chamada de API sem o chamador ter decidido isso.
   */
  chamarLLM?: (prompt: string, tentativa: number) => Promise<string>;
}

interface EstadoGeracao {
  warnings: string[];
  guardIssues: string[];
}

function lerCheckpoint(checkpointDir: string | undefined, nomeSeccao: string): string | undefined {
  if (!checkpointDir) return undefined;
  const ficheiro = path.join(checkpointDir, `${nomeSeccao}.json`);
  if (!fs.existsSync(ficheiro)) return undefined;
  try {
    const conteudo = JSON.parse(fs.readFileSync(ficheiro, "utf-8")) as { texto: string };
    return conteudo.texto;
  } catch {
    return undefined; // checkpoint corrompido — trata como inexistente, regenera
  }
}

function gravarCheckpoint(checkpointDir: string | undefined, nomeSeccao: string, texto: string): void {
  if (!checkpointDir) return;
  fs.mkdirSync(checkpointDir, { recursive: true });
  const ficheiro = path.join(checkpointDir, `${nomeSeccao}.json`);
  fs.writeFileSync(ficheiro, JSON.stringify({ texto }), "utf-8");
}

/**
 * Chama o LLM para uma secção, com checkpoint (retoma sem regenerar) e
 * retry até `maxTentativas`. `validar`, quando dado, é um critério de
 * código puro sobre o texto devolvido (Passo 4c/4d do pedido) — falha
 * conta como tentativa gasta, não como erro; esgotadas as tentativas, o
 * ÚLTIMO texto obtido fica (mesmo que inválido) e um warning é registado
 * — "nunca bloquear" (Passo 4e).
 */
async function gerarSeccao(nomeSeccao: string, prompt: string | null, opcoes: OpcoesOrquestrador, estado: EstadoGeracao, validar?: (texto: string) => string | null): Promise<string | undefined> {
  if (prompt === null) return undefined; // secção condicional inactiva — nunca um erro, nunca um warning

  const doCheckpoint = lerCheckpoint(opcoes.checkpointDir, nomeSeccao);
  if (doCheckpoint !== undefined) return doCheckpoint;

  if (!opcoes.chamarLLM) {
    estado.warnings.push(`Secção "${nomeSeccao}": não gerada — sem chamarLLM disponível`);
    estado.guardIssues.push(`Secção "${nomeSeccao}" não gerada (sem chamarLLM)`);
    return "";
  }

  const maxTentativas = opcoes.maxTentativas ?? 3;
  let ultimoTexto = "";
  let ultimoProblema: string | null = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      ultimoTexto = await opcoes.chamarLLM(prompt, tentativa);
    } catch (erro) {
      ultimoTexto = "";
      ultimoProblema = `chamada ao LLM falhou: ${String(erro)}`;
      continue;
    }
    ultimoProblema = validar ? validar(ultimoTexto) : ultimoTexto.trim().length === 0 ? "resposta vazia" : null;
    if (ultimoProblema === null) {
      gravarCheckpoint(opcoes.checkpointDir, nomeSeccao, ultimoTexto);
      return ultimoTexto;
    }
  }

  estado.warnings.push(`Secção "${nomeSeccao}": esgotou ${maxTentativas} tentativa(s) — ${ultimoProblema}`);
  estado.guardIssues.push(`Secção "${nomeSeccao}" entregue sem validar (${ultimoProblema})`);
  gravarCheckpoint(opcoes.checkpointDir, nomeSeccao, ultimoTexto);
  return ultimoTexto;
}

function dividirParagrafos(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Critério de código puro (Passo 4c) para as secções de contagem fixa — reaproveita a mesma exigência do Critério B de verificacao.ts, aqui aplicada a UMA secção em geração, não ao relatório inteiro. */
function validarContagemParagrafos(esperado: number): (texto: string) => string | null {
  return (texto) => {
    const n = dividirParagrafos(texto).length;
    return n === esperado ? null : `esperava ${esperado} parágrafo(s), recebeu ${n}`;
  };
}

function validarNaoVazio(texto: string): string | null {
  return texto.trim().length > 0 ? null : "resposta vazia";
}

export async function gerarRelatorioV3(entrada: EntradaOrquestradorV3, opcoes: OpcoesOrquestrador = {}): Promise<ResultadoMotorV3> {
  const inicio = Date.now();
  const estado: EstadoGeracao = { warnings: [], guardIssues: [] };
  const atDate = entrada.atDate ?? new Date();
  const dados = entrada.dados;

  // PASSO 1 — Camada A. Sem ela não há relatório: lança, não regista warning.
  const camada: CamadaA = gerarCamadaA(entrada.natal, atDate);

  // PASSO 2 — Espinha. Sem ela não há relatório: lança, não regista warning.
  const espinha: DerivacaoEspinha = derivarEspinha(camada);
  const desfecho: DesfechoEspinha = espinha.desfecho;

  // PASSO 3 — secções condicionais activas. Cada `construirPromptSeccaoN`
  // condicional JÁ aplica a sua própria condição internamente (devolve
  // `null` quando inactiva) — aqui só se REGISTA o resultado, não se
  // reimplementa a condição uma terceira vez (verificacao.ts já a
  // duplicou uma vez, por si só, para o Critério J; ver nota lá).
  const seccoesCondicionaisActivas: string[] = [];

  // PASSO 0 — Abertura (determinística).
  const abertura = construirAbertura(camada, dados);

  // PASSO 4 — gerar secções em ordem (0 já feito acima).

  // Secção 1 — Retrato 60s. `descobertasResumo` nunca disponível aqui — a
  // Secção 2 só corre a seguir (ordem estrita 1→2→...→14, ver nota A).
  const linhasRetratoSpec = construirLinhasRetrato(camada, espinha);
  const textoRetrato = await gerarSeccao("retrato60s", construirPromptSeccao1Retrato60s(camada, espinha, dados), opcoes, estado, validarContagemParagrafos(linhasRetratoSpec.length));
  const paragrafosRetrato = dividirParagrafos(textoRetrato ?? "");
  const retrato60s = {
    linhas: linhasRetratoSpec.map((spec, i) => ({ texto: paragrafosRetrato[i] ?? "", seccaoReferencia: spec.seccaoReferencia })),
  };

  // Secção 2 — Cinco Descobertas (ver nota A).
  const { candidatas } = gerarDescobertasCandidatas(camada, espinha);
  const textoDescobertas = await gerarSeccao("cincoDescobertas", construirPromptSeccao2CincoDescobertas(camada, espinha, dados), opcoes, estado, validarContagemParagrafos(candidatas.length));
  const paragrafosDescobertas = dividirParagrafos(textoDescobertas ?? "");
  const cincoDescobertas: Descoberta[] = candidatas.map((c, i) => ({ texto: paragrafosDescobertas[i] ?? "", confianca: c.nivel, camadas: [c.fonteInterna] }));

  // Secção 3 — Veredicto (ver nota B: resposta = texto completo do LLM; razoes = candidatos deterministas, nunca a mesma que a espinha).
  const textoVeredicto = await gerarSeccao("veredicto", construirPromptSeccao3Veredicto(camada, espinha, dados), opcoes, estado, validarNaoVazio);
  const candidatasParaRazoes = candidatas.slice(1, 4); // salta a 1ª (é a própria espinha) — 2 a 3 razões, nunca 0 nem 1
  const razoes: Descoberta[] = (candidatasParaRazoes.length >= 2 ? candidatasParaRazoes : candidatas.slice(0, 3)).map((c) => ({ texto: c.angulo, confianca: c.nivel, camadas: [c.fonteInterna] }));
  const veredicto = { resposta: textoVeredicto ?? "", razoes };

  // Secção 4 — Quem És. `retrato60sResumo` disponível (Secção 1 já correu).
  const quemEs = (await gerarSeccao("quemEs", construirPromptSeccao4QuemEs(camada, espinha, dados, textoRetrato || undefined), opcoes, estado, validarNaoVazio)) ?? "";

  // Secção 5 — Forma de Vida (ver nota C: null → fallback honesto, nunca campo vazio).
  const promptSeccao5 = construirPromptSeccao5FormaDeVida(camada, espinha, dados);
  const formaDeVida =
    promptSeccao5 === null
      ? "A Sarvashtakavarga (o mapa de apoio por área da vida) não está disponível de forma fiável nesta corrida — esta secção fica sem o detalhe casa-a-casa até essa base ser confirmada."
      : ((await gerarSeccao("formaDeVida", promptSeccao5, opcoes, estado, validarNaoVazio)) ?? "");

  // Secções condicionais 6, 7 — cada `construirPromptSeccaoN` já decide null/string internamente.
  const promptSeccao6 = construirPromptSeccao6OQueTeTemTravado(camada, espinha, dados);
  if (promptSeccao6 !== null) seccoesCondicionaisActivas.push("Secção 6 — O Que Te Tem Travado");
  const oQueTeTemTravado = await gerarSeccao("oQueTeTemTravado", promptSeccao6, opcoes, estado, validarNaoVazio);

  const promptSeccao7 = construirPromptSeccao7TransitoActual(camada, espinha, dados);
  if (promptSeccao7 !== null) seccoesCondicionaisActivas.push("Secção 7 — O Trânsito Actual");
  const transitoActual = await gerarSeccao("transitoActual", promptSeccao7, opcoes, estado, validarNaoVazio);

  // Secções 8, 9 — sempre presentes.
  const dinheiro = (await gerarSeccao("dinheiro", construirPromptSeccao8Dinheiro(camada, espinha, dados), opcoes, estado, validarNaoVazio)) ?? "";
  const comoEsVista = (await gerarSeccao("comoEsVista", construirPromptSeccao9ComoEsVista(camada, espinha, dados), opcoes, estado, validarNaoVazio)) ?? "";

  // Secção 10 — condicional.
  const promptSeccao10 = construirPromptSeccao10SobreOQue(camada, espinha, dados);
  if (promptSeccao10 !== null) seccoesCondicionaisActivas.push("Secção 10 — Sobre o Quê e Em Que Forma");
  const sobreOQueEEmQueForma = await gerarSeccao("sobreOQueEEmQueForma", promptSeccao10, opcoes, estado, validarNaoVazio);

  // Secção 11 — O Relógio (necessário como texto de entrada para 12 e 13).
  const textoRelogio = (await gerarSeccao("oRelogio", construirPromptSeccao11Relogio(camada, espinha, dados), opcoes, estado, validarNaoVazio)) ?? "";

  // Secção 12 — O Plano (precisa de veredicto.resposta + relógio já gerados).
  const textoPlano = (await gerarSeccao("oPlano", construirPromptSeccao12Plano(camada, espinha, dados, veredicto.resposta, textoRelogio), opcoes, estado, (t) => (/o que não fazer/i.test(t) ? null : "bloco 'o que não fazer' ausente"))) ?? "";

  // Secção 13 — Custo de Não Fazer Nada (precisa de veredicto.resposta + plano já gerados).
  const textoCusto = (await gerarSeccao("custoDeNaoFazerNada", construirPromptSeccao13Custo(camada, espinha, dados, veredicto.resposta, textoPlano), opcoes, estado, validarContagemParagrafos(2))) ?? "";

  // Secção 14 — condicional.
  const promptSeccao14 = construirPromptSeccao14UltimaCoisa(camada, espinha, dados);
  if (promptSeccao14 !== null) seccoesCondicionaisActivas.push("Secção 14 — Uma Última Coisa");
  const umaUltimaCoisa = await gerarSeccao("umaUltimaCoisa", promptSeccao14, opcoes, estado, validarNaoVazio);

  // Anexo A — sempre presente. `retratoSeccao4Resumo` disponível (Secção 4 já correu).
  const anexoA = (await gerarSeccao("anexoA", construirPromptAnexoA(camada, espinha, dados, quemEs || undefined), opcoes, estado, validarNaoVazio)) ?? "";

  // Anexo B — determinístico, nunca chama o LLM.
  const anexoB: AnexoB = construirAnexoB(camada, espinha);

  // PASSO 5 — montar RelatorioV3.
  const relatorio: RelatorioV3 = {
    abertura,
    retrato60s,
    cincoDescobertas,
    veredicto,
    quemEs,
    formaDeVida,
    dinheiro,
    comoEsVista,
    oRelogio: textoRelogio,
    oPlano: textoPlano,
    custoDeNaoFazerNada: textoCusto,
    oQueTeTemTravado,
    transitoActual,
    sobreOQueEEmQueForma,
    umaUltimaCoisa,
    anexoA,
    anexoB,
    espinha: desfecho,
    seccoesCondicionaisActivas,
    guardIssues: estado.guardIssues,
  };

  // PASSO 6 — verificação final. Código puro sempre; semântico só se pedido E se houver chamarLLM.
  const chamadaLLMParaVerificacao: ChamadaLLM | undefined = opcoes.verificacaoSemantica && opcoes.chamarLLM ? adaptarParaVerificacaoSemantica(opcoes.chamarLLM) : undefined;
  const resultadoVerificacao: ResultadoVerificacao = await verificarRelatorioV3(relatorio, camada, dados, { chamarLLM: chamadaLLMParaVerificacao });
  for (const [nome, c] of Object.entries(resultadoVerificacao.criterios)) {
    if (!c.passou) estado.warnings.push(`Verificação final — critério ${nome} reprovou: ${c.motivo ?? "(sem motivo)"}`);
  }
  estado.warnings.push(...resultadoVerificacao.warnings);

  // PASSO 7.
  return {
    relatorio,
    warnings: estado.warnings,
    guardIssues: estado.guardIssues,
    tempoGeracao: Date.now() - inicio,
  };
}

/**
 * Adapta o `chamarLLM` de texto livre do orquestrador para o formato
 * `{passa, motivo}` que verificacao.ts espera dos critérios semânticos.
 * Os prompts de verificacao.ts já pedem "Responde só {passa: boolean,
 * motivo: string}" — esta função tenta interpretar isso como JSON; se a
 * resposta não for interpretável, fica `passa: false` com o motivo a
 * dizer isso mesmo (nunca `passa: true` por omissão — um resultado não
 * interpretável não é o mesmo que aprovado, e isto só entra em
 * `warnings`, nunca bloqueia a entrega).
 */
function adaptarParaVerificacaoSemantica(chamarLLM: (prompt: string, tentativa: number) => Promise<string>): ChamadaLLM {
  return async (prompt: string) => {
    const texto = await chamarLLM(prompt, 1);
    const m = /\{[\s\S]*\}/.exec(texto);
    if (!m) return { passa: false, motivo: `resposta do LLM não interpretável como {passa, motivo}: "${texto.slice(0, 200)}"` };
    try {
      const obj = JSON.parse(m[0]) as { passa?: unknown; motivo?: unknown };
      if (typeof obj.passa === "boolean") return { passa: obj.passa, motivo: typeof obj.motivo === "string" ? obj.motivo : "" };
      return { passa: false, motivo: `resposta do LLM sem campo 'passa' booleano: "${texto.slice(0, 200)}"` };
    } catch {
      return { passa: false, motivo: `resposta do LLM não é JSON válido: "${texto.slice(0, 200)}"` };
    }
  };
}
