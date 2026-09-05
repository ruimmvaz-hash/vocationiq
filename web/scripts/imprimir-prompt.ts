// Ferramenta de auditoria — mostra o prompt EXACTO que seria enviado à
// Anthropic para um pedido real, sem nunca chamar a API. Lê o pedido do
// Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, as mesmas
// variáveis já usadas em produção — não vêm com este script), corre o
// mesmo pipeline de cálculo que /api/relatorio usa, e imprime o
// resultado de construirPromptAdulto() tal como sairia.
//
// Uso:
//   npx tsx scripts/imprimir-prompt.ts --id=<uuid>
//   npx tsx scripts/imprimir-prompt.ts --nome=nadia
//
// Requer no ambiente (nunca hardcoded aqui):
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
import { createClient } from "@supabase/supabase-js";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  currentDasha,
  computeTransits,
  construirPromptAdulto,
  catalogarDestinos,
  type DadosDatas,
  type BirthInput,
  type VocationiqIntakeAdulto,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { SITUACOES, ANOS_EXPERIENCIA, TIPO_MUDANCA, AREAS_DESTINO } from "../src/lib/validation";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));
const ANOS_LABEL = Object.fromEntries(ANOS_EXPERIENCIA.map((a) => [a.valor, a.label]));
const TIPO_MUDANCA_LABEL = Object.fromEntries(TIPO_MUDANCA.map((t) => [t.valor, t.label]));
const AREA_DESTINO_LABEL = Object.fromEntries(AREAS_DESTINO.map((a) => [a.valor, a.label]));

interface IntakeRow {
  id: string;
  nome: string;
  data_nascimento: string;
  hora_nascimento: string | null;
  local_nascimento: string;
  situacao: string;
  area_trabalho_actual: string | null;
  anos_experiencia: string | null;
  o_que_nao_funciona: string | null;
  tipo_mudanca: string[] | null;
  areas_destino: string[] | null;
  areas_destino_outra: string | null;
  ideia_concreta: string | null;
  para_onde_quer_ir: string | null;
  pergunta_especifica: string | null;
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

async function construirDadosDatas(birth: BirthInput, agora: Date): Promise<DadosDatas> {
  const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
  const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };
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

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Falta SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente. Define-os antes de correr este script.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let intake: IntakeRow | null = null;
  if (args.id) {
    const { data, error } = await supabase.from("vocationiq_intakes").select("*").eq("id", args.id).single();
    if (error) throw error;
    intake = data as IntakeRow;
  } else if (args.nome) {
    const { data, error } = await supabase.from("vocationiq_intakes").select("*").ilike("nome", `%${args.nome}%`).order("created_at", { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      console.error(`Nenhum pedido encontrado para nome ILIKE "%${args.nome}%".`);
      process.exit(1);
    }
    if (data.length > 1) {
      console.error(`${data.length} pedidos encontrados para "%${args.nome}%" — usa --id=<uuid> para escolher um:`);
      for (const row of data) console.error(`  ${row.id}  ${row.nome}  (${row.data_nascimento})`);
      process.exit(1);
    }
    intake = data[0] as IntakeRow;
  } else {
    console.error("Uso: npx tsx scripts/imprimir-prompt.ts --id=<uuid>  OU  --nome=<busca>");
    process.exit(1);
  }

  console.error(`Pedido encontrado: ${intake.nome} (${intake.id}), situação="${intake.situacao}".`);

  const geo = await geocodeCityCountry(intake.local_nascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${intake.local_nascimento}".`);
  const [year, month, day] = intake.data_nascimento.split("-").map(Number);
  const horaAproximada = !intake.hora_nascimento;
  const utcDate = localBirthTimeToUtc({ day, month, year }, intake.hora_nascimento || "12:00", geo.timezone);
  if (!utcDate) throw new Error(`Data/hora de nascimento inválida (${intake.data_nascimento} ${intake.hora_nascimento ?? "12:00"}).`);
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso })),
  );
  const datas = await construirDadosDatas(birth, new Date());
  const intakeAdulto = construirIntakeAdulto(intake);
  const savPorCasa = computeSavPorCasa(d1);
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: intakeAdulto.areaActual, anosExperiencia: intakeAdulto.anosExperiencia, ideiaConcreta: intakeAdulto.ideiaConcreta },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
  );

  const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, !horaAproximada, catalogoResultados, savPorCasa);

  console.error("\n=== PROMPT COMPLETO (nunca enviado à Anthropic por este script) ===\n");
  console.log(prompt);
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
