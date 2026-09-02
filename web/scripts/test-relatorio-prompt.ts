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
  currentDasha,
  computeTransits,
  construirPromptAdulto,
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
  const axes = computeVocationIQAxes(d1);
  const pesosPlanetas = computePesosPlanetas(d1);

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

  const prompt = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, true);

  console.log("=".repeat(80));
  console.log("PROMPT GERADO (caso de teste) — nunca enviado à Anthropic neste script");
  console.log("=".repeat(80));
  console.log(prompt);

  // Correcção 3 — confirma que a nota de cautela do Ascendente aparece
  // quando horaNascimentoFornecida=false (caso não coberto pelo prompt
  // principal acima, que tem hora real).
  const promptSemHora = construirPromptAdulto(intakeAdulto, axes, pesosPlanetas, datas, false);
  const notaPresente = promptSemHora.includes("NOTA INTERNA — hora de nascimento não fornecida");
  console.log("\n" + "=".repeat(80));
  console.log(`Nota do Ascendente (horaNascimentoFornecida=false): ${notaPresente ? "PRESENTE ✓" : "AUSENTE ✗"}`);
  console.log("=".repeat(80));
  console.log("=".repeat(80));
  console.log(`Tamanho: ${prompt.length} caracteres`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});
