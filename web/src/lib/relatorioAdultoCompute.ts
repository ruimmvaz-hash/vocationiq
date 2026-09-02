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
  type VocationiqIntakeAdulto,
  type DadosDatas,
  type BirthInput,
  type VocationIQAxes,
  type PesoPlaneta,
  type SavPorCasa,
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

async function resolverNascimento(localNascimento: string, dataNascimento: string, horaNascimento: string | null): Promise<{ birth: BirthInput; horaAproximada: boolean }> {
  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new GeocodeError(`Não consegui geocodificar "${localNascimento}".`);

  const [year, month, day] = dataNascimento.split("-").map(Number);
  // Sem hora de nascimento (campo opcional no intake), usa-se meio-dia
  // como convenção — o Ascendente/casas ficam menos fiáveis sem hora
  // real; `horaAproximada` avisa o prompt para tratar os elementos
  // sensíveis ao Ascendente com mais cautela.
  const horaAproximada = !horaNascimento;
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento || "12:00", geo.timezone);
  if (!utcDate) throw new GeocodeError(`Data/hora de nascimento inválida (${dataNascimento} ${horaNascimento ?? "12:00"}).`);

  return { birth: { utcDate, latitude: geo.latitude, longitude: geo.longitude }, horaAproximada };
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
    areasDestinoOutra: intake.areas_destino_outra ?? undefined,
    areasDestinoIncluiAindaNaoSei: (intake.areas_destino ?? []).includes("ainda-nao-sei"),
  };
}

export interface DadosAstrologicos {
  horaAproximada: boolean;
  axes: VocationIQAxes;
  pesosPlanetas: PesoPlaneta[];
  savPorCasa: SavPorCasa[];
  datas: DadosDatas;
  intakeAdulto: VocationiqIntakeAdulto;
}

/** Recalcula tudo o que o motor VocationIQ Adulto precisa a partir de um pedido — determinístico, sempre o mesmo resultado para os mesmos dados de nascimento. Lança GeocodeError se o local/hora de nascimento não puder ser resolvido. */
export async function calcularDadosAstrologicos(intake: IntakeRow): Promise<DadosAstrologicos> {
  const { birth, horaAproximada } = await resolverNascimento(intake.local_nascimento, intake.data_nascimento, intake.hora_nascimento);

  const d1 = computeD1Table(birth);
  const axes = computeVocationIQAxes(d1);
  const pesosPlanetas = computePesosPlanetas(d1);
  const savPorCasa = computeSavPorCasa(d1);
  const datas = construirDadosDatas(birth, new Date());
  const intakeAdulto = construirIntakeAdulto(intake);

  return { horaAproximada, axes, pesosPlanetas, savPorCasa, datas, intakeAdulto };
}
