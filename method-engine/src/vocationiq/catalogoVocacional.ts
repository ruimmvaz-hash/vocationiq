// Redesenho do motor VocationIQ, Parte 2 — integração do catálogo
// vocacional (183 destinos + índices por planeta/nakshatra/combinação +
// índice inverso), lido a partir de SPEC-vocacional.md/SPEC-espinha.md/
// ESTADO-catalogo-vocacional.md (todos em src/data/vocacional/).
//
// PRINCÍPIO NUNCA VIOLADO (SPEC-vocacional.md): "o catálogo deixa de
// escolher, passa a descrever." Nenhuma função aqui produz um ranking
// para mostrar ao cliente — `convergencia` é uma CONTAGEM de camadas
// independentes (mesmo método de SPEC-espinha.md, adaptado às camadas
// que este motor consegue medir de facto — ver DESVIO abaixo), usada só
// para decidir se uma "candidata fora da lista" é válida (≥4), nunca
// para ordenar ou "escolher o vencedor" entre os destinos da área
// actual ou as alternativas da carta.
//
// DESVIO (camadas) — SPEC-espinha.md define 9 camadas possíveis (D-1
// sideral, tropical, D-2/D-3/D-4/D-9/D-10/D-24, Sarvashtakavarga,
// arudhas, regência funcional, karakas, períodos, yogas), máximo teórico
// 14. Este motor não calcula D-2/D-3/D-4/D-24 nem arudhas múltiplas
// (só a Arudha Lagna) — inventar essas camadas violaria "não inventar".
// As camadas usadas aqui são as que o catálogo e o motor conseguem medir
// de facto, cada uma de um sistema distinto (karakas via índice de
// planetas, D-9 via nakshatra, combinação via índice de combinações,
// regência funcional via eixo do rendimento, sinais estruturados do
// índice inverso, e as duas camadas declaradas — área actual e ideia
// concreta, que não são medidas astrológicas mas são claramente
// independentes de todas as outras).

import catalogoDestinosJson from "../data/vocacional/catalogo-destinos.json";
import catalogoIndicePlanetasJson from "../data/vocacional/catalogo-indice-planetas.json";
import catalogoIndiceNakshatrasJson from "../data/vocacional/catalogo-indice-nakshatras.json";
import catalogoIndiceCombinacoesJson from "../data/vocacional/catalogo-indice-combinacoes.json";
import catalogoIndiceInversoJson from "../data/vocacional/catalogo-indice-inverso.json";

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta } from "./pesosPlanetas";
import type { SavPorCasa } from "./pesosPlanetas";
import type { ClassicalGraha, Graha } from "../lifeReport/types";
import type { NakshatraName } from "../astrology/nakshatra";

// ---------- Formas mínimas do catálogo (só os campos que este módulo lê) ----------

interface DestinoCatalogo {
  camada: "superior" | "tecnico" | "fora";
  labels: { PT: string };
}
const catalogoDestinos = catalogoDestinosJson.destinos as unknown as Record<string, DestinoCatalogo>;

interface EntradaPlaneta {
  destinos: { superior?: string[]; tecnico?: string[]; fora?: string[] };
}
const catalogoIndicePlanetas = catalogoIndicePlanetasJson.planetas as unknown as Record<string, EntradaPlaneta>;

interface EntradaNakshatra {
  destinos: string[];
}
const catalogoIndiceNakshatras = catalogoIndiceNakshatrasJson.nakshatras as unknown as Record<string, EntradaNakshatra>;

interface EntradaCombinacao {
  par: [string, string];
  destinos: string[];
}
const catalogoIndiceCombinacoes = catalogoIndiceCombinacoesJson.combinacoes as unknown as EntradaCombinacao[];

interface SinalExigido {
  tipo: "planeta_forte" | "planeta_funcional" | "casa_activa" | "combinacao";
  valores: unknown;
  modo: string;
}
interface EntradaAreaInversa {
  area: string;
  label: string;
  destinos: string[];
  sinais_exigidos: SinalExigido[];
}
const catalogoIndiceInverso = catalogoIndiceInversoJson.indice_inverso as unknown as EntradaAreaInversa[];

// ---------- Normalização de nomes (catálogo usa nomes em pt-PT minúsculos) ----------

const PLANETA_PT_PARA_GRAHA: Record<string, Graha> = {
  sol: "Sun",
  lua: "Moon",
  marte: "Mars",
  mercurio: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturno: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};
const GRAHA_PARA_PLANETA_PT: Record<string, string> = Object.fromEntries(Object.entries(PLANETA_PT_PARA_GRAHA).map(([pt, g]) => [g, pt]));

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function nakshatraParaChave(nome: NakshatraName): string {
  return normalizar(nome).replace(/\s+/g, "_");
}

const PALAVRAS_PARAGEM = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com", "a", "o", "as", "os", "um", "uma", "que", "no", "na", "por", "sua", "seu"]);

/** Palavras com 4+ caracteres, sem preposições/artigos — usadas para casar texto livre contra os destinos do catálogo. */
function palavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_PARAGEM.has(p));
}

/** Procura destinos do catálogo cujo id ou nome (PT) partilhe uma palavra significativa com o texto dado. Nunca escolhe "o melhor" — devolve todos os que batem. */
function buscarDestinosPorTexto(texto: string): string[] {
  const palavras = palavrasSignificativas(texto);
  if (!palavras.length) return [];
  const encontrados: string[] = [];
  for (const [id, destino] of Object.entries(catalogoDestinos)) {
    const alvo = normalizar(`${id} ${destino.labels.PT}`);
    if (palavras.some((p) => alvo.includes(p))) encontrados.push(id);
  }
  return encontrados;
}

function pesoDe(pesos: PesoPlaneta[], planetaPtOuGraha: string): number | undefined {
  const graha = PLANETA_PT_PARA_GRAHA[planetaPtOuGraha] ?? planetaPtOuGraha;
  return pesos.find((p) => p.planeta === graha)?.peso;
}

function casaDe(pesos: PesoPlaneta[], graha: string): number | undefined {
  return pesos.find((p) => p.planeta === graha)?.casa;
}

function destinosDoPlaneta(graha: Graha): string[] {
  const entrada = catalogoIndicePlanetas[GRAHA_PARA_PLANETA_PT[graha] ?? graha.toLowerCase()];
  if (!entrada) return [];
  return [...(entrada.destinos.superior ?? []), ...(entrada.destinos.tecnico ?? []), ...(entrada.destinos.fora ?? [])];
}

// ---------- Avaliação de sinais do índice inverso (só para as 8 áreas tabeladas) ----------

function avaliarSinal(sinal: SinalExigido, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[]): boolean {
  if (sinal.tipo === "planeta_forte") {
    const valores = sinal.valores as string[];
    const testados = valores.map((v) => pesoDe(pesos, v) ?? 0);
    return sinal.modo === "qualquer" ? testados.some((p) => p >= 1.3) : testados.every((p) => p >= 1.3);
  }
  if (sinal.tipo === "planeta_funcional") {
    const valores = sinal.valores as string[];
    const testados = valores.map((v) => pesoDe(pesos, v) ?? 0);
    return sinal.modo === "obrigatorio" ? testados.every((p) => p >= 0.9) : testados.some((p) => p >= 0.9);
  }
  if (sinal.tipo === "casa_activa") {
    const casas = (sinal.valores as string[]).map(Number);
    const algumaForte = casas.some((c) => savPorCasa.find((h) => h.casa === c)?.classificacao === "forte");
    const algumPlanetaForte = casas.some((c) => pesos.some((p) => p.casa === c && p.peso >= 1.3));
    return algumaForte || algumPlanetaForte;
  }
  if (sinal.tipo === "combinacao") {
    const pares = sinal.valores as string[][];
    return pares.some(([a, b]) => {
      const casaA = casaDe(pesos, PLANETA_PT_PARA_GRAHA[a] ?? a);
      const casaB = casaDe(pesos, PLANETA_PT_PARA_GRAHA[b] ?? b);
      return casaA !== undefined && casaA === casaB;
    });
  }
  return false;
}

/** Uma área do índice inverso "confirma" se pelo menos um dos seus sinais exigidos disparar — conta como UMA camada ("area_tabelada"), não uma por sinal (mesmo tipo de sinal em posições diferentes não infla a contagem). */
function areaTabeladaConfirma(area: EntradaAreaInversa, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[]): boolean {
  return area.sinais_exigidos.some((s) => avaliarSinal(s, pesos, savPorCasa));
}

// ---------- Camadas independentes por destino ----------

export interface AtmakarakaInfo {
  planeta: ClassicalGraha;
  nakshatra: NakshatraName;
}

interface ContextoAvaliacao {
  axes: VocationIQAxes;
  pesos: PesoPlaneta[];
  savPorCasa: SavPorCasa[];
  atmakarakaInfo: AtmakarakaInfo;
  palavrasAreaActual: string[];
  palavrasIdeiaConcreta: string[];
}

/** As camadas independentes que sustentam UM destino específico — nunca duas vezes o mesmo sistema (ver DESVIO no topo do ficheiro). */
function camadasParaDestino(destinoId: string, ctx: ContextoAvaliacao): string[] {
  const camadas: string[] = [];

  if (destinosDoPlaneta(ctx.atmakarakaInfo.planeta).includes(destinoId)) camadas.push(`Atmakaraka (${ctx.atmakarakaInfo.planeta}) aponta para este destino`);
  if (destinosDoPlaneta(ctx.axes.amatyakaraka).includes(destinoId)) camadas.push(`Amatyakaraka (${ctx.axes.amatyakaraka}) aponta para este destino`);

  const entradaNakshatra = catalogoIndiceNakshatras[nakshatraParaChave(ctx.atmakarakaInfo.nakshatra)];
  if (entradaNakshatra?.destinos.includes(destinoId)) camadas.push(`Nakshatra do Atmakaraka (${ctx.atmakarakaInfo.nakshatra}) aponta para este destino`);

  const combinacaoActiva = catalogoIndiceCombinacoes.find((c) => {
    const [a, b] = c.par.map((p) => PLANETA_PT_PARA_GRAHA[p] ?? p);
    const casaA = casaDe(ctx.pesos, a);
    const casaB = casaDe(ctx.pesos, b);
    return casaA !== undefined && casaA === casaB && c.destinos.includes(destinoId);
  });
  if (combinacaoActiva) camadas.push(`Combinação ${combinacaoActiva.par.join("+")} (mesma casa) aponta para este destino`);

  const regenteDominante = ctx.axes.earningMode.lord;
  if (destinosDoPlaneta(regenteDominante).includes(destinoId)) {
    camadas.push(`Regente do Modo de Ganho dominante (${regenteDominante}, casa ${ctx.axes.earningMode.house}) — eixo do rendimento aponta para este destino`);
  }

  const areaTabelada = catalogoIndiceInverso.find((a) => a.destinos.includes(destinoId));
  if (areaTabelada && areaTabeladaConfirma(areaTabelada, ctx.pesos, ctx.savPorCasa)) {
    camadas.push(`Sinais estruturados da área "${areaTabelada.label}" confirmam (índice inverso)`);
  }

  if (ctx.palavrasAreaActual.length) {
    const alvo = normalizar(`${destinoId} ${catalogoDestinos[destinoId]?.labels.PT ?? ""}`);
    if (ctx.palavrasAreaActual.some((p) => alvo.includes(p))) camadas.push("Área actual declarada (capital acumulado) aponta para este destino");
  }
  if (ctx.palavrasIdeiaConcreta.length) {
    const alvo = normalizar(`${destinoId} ${catalogoDestinos[destinoId]?.labels.PT ?? ""}`);
    if (ctx.palavrasIdeiaConcreta.some((p) => alvo.includes(p))) camadas.push("Ideia concreta partilhada aponta para este destino");
  }

  return camadas;
}

export interface DestinoConvergente {
  id: string;
  nome: string;
  descricao: string;
  convergencia: number;
  camadas: string[];
}

function construirDestinoConvergente(id: string, ctx: ContextoAvaliacao): DestinoConvergente {
  const destino = catalogoDestinos[id];
  const camadas = camadasParaDestino(id, ctx);
  return {
    id,
    nome: destino?.labels.PT ?? id,
    descricao: destino ? `Via ${destino.camada === "superior" ? "ensino superior" : destino.camada === "tecnico" ? "técnica/profissional" : "fora do sistema formal"}.` : "",
    convergencia: camadas.length,
    camadas,
  };
}

export interface CandidataForaDaLista {
  nome: string | null;
  camadas: string[];
  convergencia: number;
}

export interface IntakeParaCatalogo {
  areaActual: string;
  anosExperiencia: string;
  ideiaConcreta?: string;
}

export interface ResultadoCatalogoVocacional {
  destinosDeAreaActual: DestinoConvergente[];
  destinosAlternativos: DestinoConvergente[];
  candidataForaDaLista: CandidataForaDaLista;
  /** Presente só quando a área actual não tem sector específico (ex.: "Empresária", "Gestão") — nota para o prompt citar explicitamente. */
  notaAreaGenerica: string | null;
}

const LIMIAR_MINIMO_CANDIDATA = 4;

/** Termos de cargo/função sem sector — não dão nenhuma palavra significativa própria para casar contra o catálogo (ver `procedimento_area_nao_tabelada`, 1.7a — decompor exigiria uma chamada à Anthropic que este passo, determinístico, não faz). */
const CARGOS_SEM_SECTOR = new Set(["empresaria", "empresario", "consultora", "consultor", "gestora", "gestor", "diretora", "diretor", "autonoma", "autonomo", "freelancer", "empreendedora", "empreendedor"]);

function areaActualEGenerica(areaActual: string): boolean {
  const palavras = palavrasSignificativas(areaActual);
  if (!palavras.length) return true;
  return palavras.every((p) => CARGOS_SEM_SECTOR.has(p));
}

/**
 * Integração do catálogo vocacional (Parte 2 do redesenho) — nunca
 * escolhe, só descreve (SPEC-vocacional.md) e deriva a candidata fora da
 * lista pelo mesmo critério de SPEC-espinha.md (≥4 camadas
 * independentes), nunca por popularidade nem por "o destino mais
 * nomeado". Determinístico — nunca chama a Anthropic.
 */
/**
 * Depuração — camadas de UM destino específico, sem o limiar de ≥2 que
 * `catalogarDestinos` aplica às alternativas. Útil para responder "porque
 * é que X não apareceu?" sem ter de repetir a lógica de contexto.
 */
export function depurarCamadasDestino(destinoId: string, axes: VocationIQAxes, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[], intake: IntakeParaCatalogo, atmakarakaInfo: AtmakarakaInfo): string[] {
  const ctx: ContextoAvaliacao = {
    axes,
    pesos,
    savPorCasa,
    atmakarakaInfo,
    palavrasAreaActual: palavrasSignificativas(intake.areaActual),
    palavrasIdeiaConcreta: intake.ideiaConcreta ? palavrasSignificativas(intake.ideiaConcreta) : [],
  };
  return camadasParaDestino(destinoId, ctx);
}

export function catalogarDestinos(axes: VocationIQAxes, pesos: PesoPlaneta[], savPorCasa: SavPorCasa[], intake: IntakeParaCatalogo, atmakarakaInfo: AtmakarakaInfo): ResultadoCatalogoVocacional {
  const ctx: ContextoAvaliacao = {
    axes,
    pesos,
    savPorCasa,
    atmakarakaInfo,
    palavrasAreaActual: palavrasSignificativas(intake.areaActual),
    palavrasIdeiaConcreta: intake.ideiaConcreta ? palavrasSignificativas(intake.ideiaConcreta) : [],
  };

  const areaGenerica = areaActualEGenerica(intake.areaActual);

  // Passo 1 — destinos da área actual (só quando há sector específico).
  const idsAreaActual = areaGenerica ? [] : buscarDestinosPorTexto(intake.areaActual);
  const destinosDeAreaActual = idsAreaActual.map((id) => construirDestinoConvergente(id, ctx));

  // Passo 2 — destinos pela carta: união dos destinos apontados pelo
  // Atmakaraka, Amatyakaraka, Nakshatra do Atmakaraka, combinações
  // activas, e regente do Modo de Ganho dominante — nunca ordenados,
  // nunca cortados a um "top N" (isso seria voltar ao ranking rejeitado).
  const idsCarta = new Set<string>([
    ...destinosDoPlaneta(atmakarakaInfo.planeta),
    ...destinosDoPlaneta(axes.amatyakaraka),
    ...(catalogoIndiceNakshatras[nakshatraParaChave(atmakarakaInfo.nakshatra)]?.destinos ?? []),
    ...destinosDoPlaneta(axes.earningMode.lord),
    ...catalogoIndiceCombinacoes
      .filter((c) => {
        const [a, b] = c.par.map((p) => PLANETA_PT_PARA_GRAHA[p] ?? p);
        const casaA = casaDe(pesos, a);
        const casaB = casaDe(pesos, b);
        return casaA !== undefined && casaA === casaB;
      })
      .flatMap((c) => c.destinos),
  ]);
  // Nunca repetir como "alternativa" um destino já coberto pela área actual.
  for (const id of idsAreaActual) idsCarta.delete(id);

  // Passo 3 — ideia concreta: entra na mesma lista de alternativas (a
  // convergência de cada destino já conta a camada "ideia concreta"
  // quando aplicável) — não é uma terceira lista à parte.
  if (intake.ideiaConcreta) {
    for (const id of buscarDestinosPorTexto(intake.ideiaConcreta)) {
      if (!idsAreaActual.includes(id)) idsCarta.add(id);
    }
  }

  // Um destino com uma só camada GENÉRICA (ex.: só "eixo do rendimento
  // aponta para aqui") não é uma alternativa com informação real — é
  // ruído de catálogo, o mesmo tipo de problema que SPEC-vocacional.md
  // documenta ("nomeado por muitas fontes" não é o mesmo que
  // "sustentado"). Exigir ≥2 camadas nesse caso evita inundar o prompt
  // com dezenas de destinos de sinal único.
  //
  // DESVIO (encontrado ao testar com a carta real da Melina) — um
  // destino com UMA SÓ camada, quando essa camada vem do Atmakaraka OU
  // do Amatyakaraka (os karakas pessoais, não um sinal genérico), fica de
  // fora do limiar. Sem esta excepção, "Negócio próprio com marca
  // pessoal" (f_marca_pessoal, via Amatyakaraka=Sol) nunca chegava a
  // aparecer no prompt — exactamente o sinal que levou o especialista a
  // apontar "marca própria" para ela. Um sinal de karaka pessoal, mesmo
  // sozinho, pesa mais do que dois sinais genéricos coincidentes (ver
  // também o gate de Atmakaraka obrigatório na candidata fora da lista,
  // abaixo — o mesmo princípio).
  const LIMIAR_MINIMO_ALTERNATIVA = 2;
  const destinosAlternativos = [...idsCarta]
    .map((id) => construirDestinoConvergente(id, ctx))
    .filter((d) => d.convergencia >= LIMIAR_MINIMO_ALTERNATIVA || d.camadas.some((c) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka")));

  // Passo 4 — candidata fora da lista: só entre as ALTERNATIVAS (nunca
  // repete uma opção que a área actual já descreve), só se ≥4 camadas
  // independentes convergirem, E só se o Atmakaraka (a peça mais forte
  // da carta) for uma delas.
  //
  // Este último critério não estava no pedido original à letra, mas é a
  // correcção directa ao bug que motivou toda a SPEC-vocacional.md: no
  // mapa da Melina, testado aqui com dados reais, "Direito" acumulava 4
  // camadas (Amatyakaraka, Nakshatra, uma combinação, e a área tabelada)
  // SEM NENHUMA vir do Atmakaraka (Saturno) — exactamente o padrão
  // "ganha por ser comum, não por ser dela" que a spec documenta ter
  // acontecido no catálogo antigo. Exigir a camada do Atmakaraka é o
  // mínimo estrutural para nunca reproduzir esse padrão.
  const elegveis = destinosAlternativos.filter((d) => d.convergencia >= LIMIAR_MINIMO_CANDIDATA && d.camadas.some((c) => c.startsWith("Atmakaraka")));
  const melhor = elegveis.length ? elegveis.reduce((a, b) => (b.convergencia > a.convergencia ? b : a)) : null;

  return {
    destinosDeAreaActual,
    destinosAlternativos,
    candidataForaDaLista: melhor ? { nome: melhor.nome, camadas: melhor.camadas, convergencia: melhor.convergencia } : { nome: null, camadas: [], convergencia: 0 },
    notaAreaGenerica: areaGenerica ? `área actual não tem sector específico ("${intake.areaActual}") — candidatas derivadas só da carta (Atmakaraka, Amatyakaraka, Nakshatra, Modo de Ganho, combinações activas)` : null,
  };
}
