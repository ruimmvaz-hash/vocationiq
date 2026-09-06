import "server-only";
import { geocodeCityCountry } from "./reportGeo";
import { localBirthTimeToUtc } from "./localBirthTime";
import { SITUACOES, ANOS_EXPERIENCIA, TIPO_MUDANCA, AREAS_DESTINO } from "./validation";
import type { IntakeRow } from "./store";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  currentDasha,
  computeTransits,
  computeWesternTable,
  catalogarDestinos,
  computeElementosModalidades,
  computeAspectosPessoais,
  sugerirCursosParaCatalogo,
  ELEMENTO_PLANETA,
  MAHADASHA_CLASSIFICACAO,
  normalizarTextoLivre,
  type VocationiqIntakeAdulto,
  type DadosDatas,
  type BirthInput,
  type VocationIQAxes,
  type PesoPlaneta,
  type SavPorCasa,
  type Elemento,
  type ClassificacaoMahadashaEntry,
  type ResultadoCatalogoVocacional,
  type PerfilElementosModalidades,
  type AspectoPessoal,
  type CursosSugeridos,
} from "@naveya/method-engine";

// Pipeline de cálculo astrológico partilhada entre /api/relatorio (gera o
// rascunho) e a entrega automática (regenera o mesmo relatório para
// converter em PDF e enviar) — as duas pontas nunca podem divergir no
// que calculam a partir do mesmo pedido.

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));
const ANOS_LABEL = Object.fromEntries(ANOS_EXPERIENCIA.map((a) => [a.valor, a.label]));
const TIPO_MUDANCA_LABEL = Object.fromEntries(TIPO_MUDANCA.map((t) => [t.valor, t.label]));
const AREA_DESTINO_LABEL = Object.fromEntries(AREAS_DESTINO.map((a) => [a.valor, a.label]));

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

export class GeocodeError extends Error {}

/**
 * Correcção do especialista (RISCO ARQUITECTURAL 7) — antes desta
 * correcção, `resolverNascimento` chamava `geocodeCityCountry` (API
 * externa, ao vivo, nunca cacheada) sempre, em toda e qualquer chamada a
 * `calcularDadosAstrologicos` — "Gerar rascunho", "Ver PDF", "Aprovar e
 * enviar/reenviar" recalculavam a geocodificação do zero, sem nenhuma
 * garantia de que o resultado seria sempre o mesmo (o fornecedor pode
 * mudar de resposta; nada no código fixava a latitude/longitude
 * resolvidas ao pedido). `coordenadasExistentes`, quando fornecido pelo
 * chamador (lido de `viq_relatorios.coordenadas_nascimento`), salta a
 * geocodificação por completo — o pedido passa a ter sempre as MESMAS
 * coordenadas em toda a sua vida, geocodificadas uma única vez.
 */
export interface CoordenadasNascimento {
  latitude: number;
  longitude: number;
  timezone: string;
  localNormalizado: string;
}

async function resolverNascimento(
  localNascimento: string,
  dataNascimento: string,
  horaNascimento: string | null,
  coordenadasExistentes?: CoordenadasNascimento | null,
): Promise<{ birth: BirthInput; horaAproximada: boolean; coordenadas: CoordenadasNascimento }> {
  let coordenadas: CoordenadasNascimento;
  if (coordenadasExistentes) {
    coordenadas = coordenadasExistentes;
  } else {
    const geo = await geocodeCityCountry(localNascimento);
    if (!geo) throw new GeocodeError(`Não consegui geocodificar "${localNascimento}".`);
    coordenadas = { latitude: geo.latitude, longitude: geo.longitude, timezone: geo.timezone, localNormalizado: geo.resolvedName };
  }

  const [year, month, day] = dataNascimento.split("-").map(Number);
  // Sem hora de nascimento (campo opcional no intake), usa-se meio-dia
  // como convenção — o Ascendente/casas ficam menos fiáveis sem hora
  // real; `horaAproximada` avisa o prompt para tratar os elementos
  // sensíveis ao Ascendente com mais cautela.
  const horaAproximada = !horaNascimento;
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento || "12:00", coordenadas.timezone);
  if (!utcDate) throw new GeocodeError(`Data/hora de nascimento inválida (${dataNascimento} ${horaNascimento ?? "12:00"}).`);

  return { birth: { utcDate, latitude: coordenadas.latitude, longitude: coordenadas.longitude }, horaAproximada, coordenadas };
}

function construirDadosDatas(birth: BirthInput, agora: Date): DadosDatas {
  const dasha = currentDasha(birth.utcDate, agora);
  const proximas = dasha.allAntardashas.filter((a) => a.start >= dasha.antardasha.end).slice(0, 2);
  const transitos = computeTransits(birth, agora);

  const formatarAspectos = (hits: { to: string; aspect: string; orb: number }[]) =>
    hits.map((h) => `${ASPECTO_LABEL[h.aspect] ?? h.aspect} com o ${PONTO_LABEL[h.to] ?? h.to} (orbe ${h.orb.toFixed(1)}°)`);

  return {
    mahadashaAtual: { senhor: dasha.mahadasha.lord, inicio: dasha.mahadasha.start, fim: dasha.mahadasha.end },
    antardashaAtual: { senhor: dasha.antardasha.lord, inicio: dasha.antardasha.start, fim: dasha.antardasha.end },
    proximasAntardashas: proximas.map((a) => ({ senhor: a.lord, inicio: a.start, fim: a.end })),
    transitoJupiter: { signo: transitos.jupiter.sign, aspectosAoNatal: formatarAspectos(transitos.jupiter.aspectsToNatal) },
    transitoSaturno: { signo: transitos.saturn.sign, aspectosAoNatal: formatarAspectos(transitos.saturn.aspectsToNatal) },
  };
}

function construirIntakeAdulto(intake: IntakeRow): VocationiqIntakeAdulto {
  return {
    nome: intake.nome,
    situacaoDeclarada: SITUACAO_LABEL[intake.situacao] ?? intake.situacao,
    areaActual: intake.area_trabalho_actual ?? "",
    anosExperiencia: (intake.anos_experiencia && ANOS_LABEL[intake.anos_experiencia]) ?? "",
    oQueNaoFunciona: intake.o_que_nao_funciona ?? undefined,
    paraOndeQuerIr: intake.para_onde_quer_ir ?? undefined,
    perguntaEspecifica: intake.pergunta_especifica ?? undefined,
    ideiaConcreta: intake.ideia_concreta ?? undefined,
    tipoMudanca: (intake.tipo_mudanca ?? []).map((t) => TIPO_MUDANCA_LABEL[t] ?? t),
    areasDestino: (intake.areas_destino ?? []).filter((a) => a !== "outra" && a !== "ainda-nao-sei").map((a) => AREA_DESTINO_LABEL[a] ?? a),
    areasDestinoIncluiOutra: (intake.areas_destino ?? []).includes("outra"),
    // Correcção do especialista (TAREFA 5) — `areasDestinoOutra` é texto
    // livre da pessoa (a única entrada de "outra" no formulário), tal como
    // oQueNaoFunciona/ideiaConcreta/perguntaEspecifica — mas tem DOIS
    // consumidores (candidatasDeclaradas() no prompt, e opcoesConsideradas
    // em 5 rotas diferentes que geram o template), por isso normaliza-se
    // aqui, na única origem, em vez de em cada um dos 6 sítios onde entra
    // depois (evita repetir a chamada, e evita esquecê-la nalgum deles —
    // exactamente o que tinha acontecido até esta correcção).
    areasDestinoOutra: intake.areas_destino_outra ? normalizarTextoLivre(intake.areas_destino_outra) : undefined,
    areasDestinoIncluiAindaNaoSei: (intake.areas_destino ?? []).includes("ainda-nao-sei"),
  };
}

export interface ElementoPlaneta {
  planeta: string;
  elemento: Elemento;
}

/** Dados mais ricos pedidos nesta ronda (Parte 1D) — nenhum exige cálculo astrológico novo: elementos e classificação da Mahadasha são glosas fixas (method-engine); a cadeia de regência já vem em `axes.missionAxis` (calculada lá, onde `signOfHouse`/`SIGN_RULERS` já estavam em âmbito); o SAV das 12 casas já era `savPorCasa` (sempre as 12, nunca só as ocupadas). */
export interface DadosRicos {
  elementos: ElementoPlaneta[];
  classificacaoMahadashaAtual: ClassificacaoMahadashaEntry;
}

function construirDadosRicos(datas: DadosDatas): DadosRicos {
  const elementos = Object.entries(ELEMENTO_PLANETA).map(([planeta, elemento]) => ({ planeta, elemento }));
  const classificacaoMahadashaAtual = MAHADASHA_CLASSIFICACAO[datas.mahadashaAtual.senhor] ?? { tema: "—", abertura: "—" };
  return { elementos, classificacaoMahadashaAtual };
}

export interface DadosAstrologicos {
  horaAproximada: boolean;
  axes: VocationIQAxes;
  pesosPlanetas: PesoPlaneta[];
  savPorCasa: SavPorCasa[];
  datas: DadosDatas;
  intakeAdulto: VocationiqIntakeAdulto;
  dadosRicos: DadosRicos;
  catalogoResultados: ResultadoCatalogoVocacional;
  /** Correcção do especialista (RISCO ARQUITECTURAL 7) — as coordenadas efectivamente usadas nesta chamada: as que vieram de `coordenadasExistentes`, ou as recém-geocodificadas quando não havia nenhuma guardada ainda. O chamador persiste este valor (`guardarRascunho`/backfill nas rotas de regeneração) para nunca mais precisar de geocodificar este pedido. */
  coordenadasNascimento: CoordenadasNascimento;
  /** TAREFA 4 (correcção do especialista) — elementos/modalidades tropicais e aspectos entre planetas pessoais, ambos lidos de `computeWesternTable` (já calculada aqui para `regenteAscendenteOcidental` — nunca uma segunda chamada). */
  elementosModalidades: PerfilElementosModalidades;
  aspectosPessoais: AspectoPessoal[];
  /** TAREFA 5 (correcção do especialista) — vias concretas de entrada por destino, para todos os destinos que `catalogarDestinos` já resolveu com id. */
  cursosPorDestino: Record<string, CursosSugeridos>;
}

/**
 * Recalcula tudo o que o motor VocationIQ Adulto precisa a partir de um
 * pedido — determinístico, sempre o mesmo resultado para os mesmos
 * dados de nascimento. Lança GeocodeError se o local/hora de nascimento
 * não puder ser resolvido.
 *
 * Ordem importa: `pesosPlanetas` calcula-se ANTES de `axes` (invertido
 * face à versão anterior) porque `computeVocationIQAxes` agora aceita os
 * pesos já calculados, para o Modo de Ganho pesar a força REAL dos
 * planetas envolvidos, não só dignidade/presença/Drishti (Parte 1B desta
 * ronda) — e porque os pesos já vêm com Neecha Bhanga Raja Yoga
 * verificado (Parte 1A), por isso o Modo de Ganho herda a correcção
 * automaticamente.
 *
 * `coordenadasExistentes` (RISCO ARQUITECTURAL 7) — quando o chamador já
 * tem `viq_relatorios.coordenadas_nascimento` guardadas para este pedido,
 * passa-as aqui para saltar a geocodificação ao vivo por completo.
 */
export async function calcularDadosAstrologicos(intake: IntakeRow, coordenadasExistentes?: CoordenadasNascimento | null): Promise<DadosAstrologicos> {
  const { birth, horaAproximada, coordenadas } = await resolverNascimento(intake.local_nascimento, intake.data_nascimento, intake.hora_nascimento, coordenadasExistentes);

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
  );
  const savPorCasa = computeSavPorCasa(d1);
  const datas = construirDadosDatas(birth, new Date());
  const intakeAdulto = construirIntakeAdulto(intake);
  const dadosRicos = construirDadosRicos(datas);

  // Parte 2 do redesenho — catálogo vocacional (183 destinos + índices).
  // atmakarakaInfo vem daqui (d1.rows tem a nakshatra já calculada) porque
  // `catalogarDestinos` recebe só axes/pesos/savPorCasa/intake/atmakarakaInfo,
  // nunca o D1 em bruto (ver DESVIO em catalogoVocacional.ts).
  const atmakaraka = axes.missionAxis.atmakaraka;
  // Correcção do especialista (Correcção 3) — regente do Ascendente
  // ocidental/tropical, para o sinal "casa temática forte" (o Ascendente
  // pode estar representado por qualquer um dos dois sistemas). Calculado
  // aqui e não no method-engine porque `catalogarDestinos` nunca recebeu
  // o D1 em bruto (ver DESVIO em catalogoVocacional.ts) — este é o mesmo
  // padrão de `atmakarakaInfo` acima, resolvido pelo chamador.
  //
  // TAREFA 4 (correcção do especialista) — a mesma `westernTable` já
  // trazia, sem consumidor, a grelha completa de posições/aspectos
  // (`planets`) que os elementos/modalidades e os aspectos entre
  // planetas pessoais precisam — antes desta correcção só se lia
  // `.ascendant.ruler` e o resto era descartado.
  const westernTable = computeWesternTable(birth);
  const regenteAscendenteOcidental = westernTable.ascendant.ruler;
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: intakeAdulto.areaActual, anosExperiencia: intakeAdulto.anosExperiencia, ideiaConcreta: intakeAdulto.ideiaConcreta },
    { planeta: atmakaraka, nakshatra: d1.rows[atmakaraka].nakshatra },
    regenteAscendenteOcidental,
  );
  const elementosModalidades = computeElementosModalidades(westernTable.planets);
  const aspectosPessoais = computeAspectosPessoais(westernTable.planets);
  // TAREFA 5 (correcção do especialista) — vias concretas por destino,
  // derivadas do próprio catálogo (nunca de texto livre — ver DESVIO em
  // catalogoCursos.ts).
  const cursosPorDestino = sugerirCursosParaCatalogo(catalogoResultados);

  return {
    horaAproximada,
    axes,
    pesosPlanetas,
    savPorCasa,
    datas,
    intakeAdulto,
    dadosRicos,
    catalogoResultados,
    coordenadasNascimento: coordenadas,
    elementosModalidades,
    aspectosPessoais,
    cursosPorDestino,
  };
}
