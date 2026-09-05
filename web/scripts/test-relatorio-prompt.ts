// Script de teste único — gera o prompt para um caso de teste realista,
// SEM chamar a Anthropic nem o Supabase, só para inspeccionar o texto
// antes do deploy (pedido explícito da ronda). Corre a mesma pipeline
// da rota real (api/relatorio/route.ts), menos os dois passos externos.
//
// Uso: npx tsx scripts/test-relatorio-prompt.ts

import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  currentDasha,
  computeTransits,
  construirPromptAdulto,
  catalogarDestinos,
  type VocationiqIntakeAdulto,
  type DadosDatas,
  type BirthInput,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

async function main() {
  // Caso de teste: adulto a meio da carreira, área actual "Contabilidade",
  // 5-10 anos de experiência, duas opções declaradas (uma delas "outra"),
  // tipo de mudança inclui trabalhar por conta própria.
  const localNascimento = "Porto, Portugal";
  const dataNascimento = "1988-04-12";
  const horaNascimento = "07:35";

  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso })),
  );

  const agora = new Date();
  const dasha = currentDasha(birth.utcDate, agora);
  const proximas = dasha.allAntardashas.filter((a) => a.start >= dasha.antardasha.end).slice(0, 2);
  const transitos = computeTransits(birth, agora);
  const formatarAspectos = (hits: { to: string; aspect: string; orb: number }[]) => hits.map((h) => `${ASPECTO_LABEL[h.aspect] ?? h.aspect} com o ${PONTO_LABEL[h.to] ?? h.to} (orbe ${h.orb.toFixed(1)}°)`);

  const datas: DadosDatas = {
    mahadashaAtual: { senhor: dasha.mahadasha.lord, inicio: dasha.mahadasha.start, fim: dasha.mahadasha.end },
    antardashaAtual: { senhor: dasha.antardasha.lord, inicio: dasha.antardasha.start, fim: dasha.antardasha.end },
    proximasAntardashas: proximas.map((a) => ({ senhor: a.lord, inicio: a.start, fim: a.end })),
    transitoJupiter: { signo: transitos.jupiter.sign, aspectosAoNatal: formatarAspectos(transitos.jupiter.aspectsToNatal) },
    transitoSaturno: { signo: transitos.saturn.sign, aspectosAoNatal: formatarAspectos(transitos.saturn.aspectsToNatal) },
  };

  const intakeAdulto: VocationiqIntakeAdulto = {
    nome: "Rui (teste)",
    situacaoDeclarada: "Já trabalho e quero mudar",
    areaActual: "Contabilidade",
    anosExperiencia: "5 a 10 anos",
    oQueNaoFunciona: "Sinto que estou só a processar números para outras pessoas decidirem — quero estar mais perto da decisão em si.",
    paraOndeQuerIr: undefined,
    perguntaEspecifica: "Faz sentido tentar consultoria a solo ou é melhor procurar um cargo de gestão numa empresa maior?",
    ideiaConcreta: "Estou a pensar em consultoria financeira para pequenas empresas.",
    tipoMudanca: ["Evoluir dentro da mesma área", "Passar a trabalhar por conta própria"],
    areasDestino: ["Consultoria (SAP, RH, gestão, etc.)", "Finanças / contabilidade"],
    areasDestinoIncluiOutra: false,
    areasDestinoOutra: undefined,
    areasDestinoIncluiAindaNaoSei: false,
  };

  const savPorCasa = computeSavPorCasa(d1);
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: intakeAdulto.areaActual, anosExperiencia: intakeAdulto.anosExperiencia, ideiaConcreta: intakeAdulto.ideiaConcreta },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
  );

  const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, true, catalogoResultados, savPorCasa);

  console.log("=".repeat(80));
  console.log("PROMPT GERADO (caso de teste) — nunca enviado à Anthropic neste script");
  console.log("=".repeat(80));
  console.log(prompt);

  // Correcção 3 — confirma que a nota de cautela do Ascendente aparece
  // quando horaNascimentoFornecida=false (caso não coberto pelo prompt
  // principal acima, que tem hora real). Mesma pipeline da rota real
  // (resolverNascimento com hora "" -> fallback meio-dia), não só o
  // parâmetro a false isolado.
  const horaVaziaComoNoFormulario = "";
  const horaAproximada = !horaVaziaComoNoFormulario;
  const utcDateSemHora = localBirthTimeToUtc({ day, month, year }, horaVaziaComoNoFormulario || "12:00", geo.timezone);
  if (!utcDateSemHora) throw new Error("data/hora inválida (caso sem hora)");
  const birthSemHora: BirthInput = { utcDate: utcDateSemHora, latitude: geo.latitude, longitude: geo.longitude };

  const d1SemHora = computeD1Table(birthSemHora);
  const pesosSemHora = computePesosPlanetas(d1SemHora);
  const axesSemHora = computeVocationIQAxes(
    d1SemHora,
    pesosSemHora.map((p) => ({ planeta: p.planeta, peso: p.peso })),
  );
  const dashaSemHora = currentDasha(birthSemHora.utcDate, agora);
  const proximasSemHora = dashaSemHora.allAntardashas.filter((a) => a.start >= dashaSemHora.antardasha.end).slice(0, 2);
  const transitosSemHora = computeTransits(birthSemHora, agora);
  const datasSemHora: DadosDatas = {
    mahadashaAtual: { senhor: dashaSemHora.mahadasha.lord, inicio: dashaSemHora.mahadasha.start, fim: dashaSemHora.mahadasha.end },
    antardashaAtual: { senhor: dashaSemHora.antardasha.lord, inicio: dashaSemHora.antardasha.start, fim: dashaSemHora.antardasha.end },
    proximasAntardashas: proximasSemHora.map((a) => ({ senhor: a.lord, inicio: a.start, fim: a.end })),
    transitoJupiter: { signo: transitosSemHora.jupiter.sign, aspectosAoNatal: formatarAspectos(transitosSemHora.jupiter.aspectsToNatal) },
    transitoSaturno: { signo: transitosSemHora.saturn.sign, aspectosAoNatal: formatarAspectos(transitosSemHora.saturn.aspectsToNatal) },
  };

  const savPorCasaSemHora = computeSavPorCasa(d1SemHora);
  const catalogoResultadosSemHora = catalogarDestinos(
    axesSemHora,
    pesosSemHora,
    savPorCasaSemHora,
    { areaActual: intakeAdulto.areaActual, anosExperiencia: intakeAdulto.anosExperiencia, ideiaConcreta: intakeAdulto.ideiaConcreta },
    { planeta: axesSemHora.missionAxis.atmakaraka, nakshatra: d1SemHora.rows[axesSemHora.missionAxis.atmakaraka].nakshatra },
  );
  const promptSemHora = construirPromptAdulto(intakeAdulto, axesSemHora, pesosSemHora, datasSemHora, !horaAproximada, catalogoResultadosSemHora, savPorCasaSemHora);
  const indiceNota = promptSemHora.indexOf("NOTA INTERNA");
  console.log("\n" + "=".repeat(80));
  console.log('CASO 2 — hora_nascimento="" (mesmo fallback de meio-dia da rota real) — excerto com a nota do Ascendente:');
  console.log("=".repeat(80));
  console.log(indiceNota === -1 ? "AUSENTE ✗ — a nota não aparece no prompt." : promptSemHora.slice(Math.max(0, indiceNota - 120), indiceNota + 500));
  console.log("=".repeat(80));
  console.log(`Tamanho: ${prompt.length} caracteres`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});
