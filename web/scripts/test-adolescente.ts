// TAREFA 6 (correcção do especialista) — caso de teste ponta-a-ponta do
// ramo adolescente, com um intake sintético. Corre o pipeline completo
// SEM chamar a Anthropic (só imprime o prompt gerado, nunca o envia).
//
// Usa `construirPromptAdolescente` — um RASCUNHO (ver aviso no topo de
// method-engine/src/vocationiq/promptAdolescente.ts), nunca revisto ao
// mesmo nível do prompt adulto. Este script serve para confirmar que os
// dados técnicos (eixos, elementos/modalidades, aspectos, cursos) chegam
// correctamente ao prompt — não para validar o texto que o LLM escreveria
// a partir dele.
//
// Uso: npx tsx scripts/test-adolescente.ts

import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  currentDasha,
  computeTransits,
  computeWesternTable,
  computeElementosModalidades,
  computeAspectosPessoais,
  catalogarDestinos,
  sugerirCursos,
  sugerirCursosParaCatalogo,
  construirPromptAdolescente,
  type DadosDatas,
  type BirthInput,
  type VocationiqIntakeAdolescente,
  type CursosSugeridos,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

// Mapeamento manual, só para este caso de teste — nunca fuzzy-matching em
// produção (ver DESVIO 3 em catalogoCursos.ts: ligar texto livre a um id
// do catálogo sem correspondência exacta arrisca ligar o curso errado ao
// destino errado; "design" sozinho, por exemplo, corresponde a 4 destinos
// diferentes no catálogo — design_grafico/industrial/interiores/moda —
// por isso a escolha abaixo é uma escolha arbitrária de teste, não uma
// resolução automática).
const ID_CATALOGO_POR_OPCAO: Record<string, string> = {
  medicina: "medicina",
  engenharia: "engenharia_informatica",
  design: "design_grafico",
};

async function main() {
  const nome = "João (teste adolescente)";
  const dataNascimento = "2008-03-15";
  const horaNascimento = "10:30";
  const localNascimento = "Lisboa, Portugal";
  const opcoesAdolescente = ["medicina", "engenharia", "design"];
  const opcaoMaisProvavel = "medicina";

  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  console.log("=== 1. Carta (D1) ===");
  const d1 = computeD1Table(birth);
  console.log(`Ascendente: ${d1.ascendant.sign}`);

  console.log("\n=== 2. Pesos + Eixos VocationIQ ===");
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
  );
  console.log(`Atmakaraka: ${axes.missionAxis.atmakaraka} (casa ${axes.missionAxis.akHouse})`);
  console.log(`Modo de Ganho dominante: casa ${axes.earningModeDominante[0].house}`);

  const savPorCasa = computeSavPorCasa(d1);

  console.log("\n=== 3. Elementos e modalidades ===");
  const westernTable = computeWesternTable(birth);
  const elementosModalidades = computeElementosModalidades(westernTable.planets);
  console.log(JSON.stringify(elementosModalidades, null, 2));

  console.log("\n=== 4. Aspectos entre planetas pessoais ===");
  const aspectosPessoais = computeAspectosPessoais(westernTable.planets);
  console.log(aspectosPessoais.length ? aspectosPessoais.map((a) => `${a.planetaA} ${a.aspecto} ${a.planetaB} (orbe ${a.orbe.toFixed(1)}°)`).join("\n") : "(nenhum)");

  console.log("\n=== 5. Catálogo + cursos ===");
  // Sem área de trabalho actual (é um adolescente) — areaActual/anosExperiencia
  // vazios; catalogarDestinos() foi desenhado para o ramo adulto, por isso
  // "Derivadas da área actual" fica sempre vazio aqui (esperado, não é um bug).
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: "", anosExperiencia: "" },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    westernTable.ascendant.ruler,
  );
  const cursosPorDestino: Record<string, CursosSugeridos> = sugerirCursosParaCatalogo(catalogoResultados);

  // Cursos por opção declarada — mapeamento manual de teste (ver nota acima).
  for (const opcao of opcoesAdolescente) {
    const id = ID_CATALOGO_POR_OPCAO[opcao];
    const cursos = id ? sugerirCursos(id) : null;
    if (cursos) cursosPorDestino[id] = cursos;
    console.log(`- ${opcao} (id "${id}"): ${cursos ? JSON.stringify(cursos.cursos[0]) : "sem correspondência"}`);
  }
  console.log(`Candidatas fora da lista (até 3): ${catalogoResultados.candidatasForaDaLista.length ? catalogoResultados.candidatasForaDaLista.map((c) => c.nome).join(", ") : "nenhuma"}`);

  console.log("\n=== 6. Datas reais ===");
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
  console.log(`Mahadasha actual: ${datas.mahadashaAtual.senhor}`);

  console.log("\n=== 7. Prompt completo (RASCUNHO — nunca enviado à Anthropic) ===");
  const intakeAdolescente: VocationiqIntakeAdolescente = {
    nome,
    situacaoDeclarada: "10º-12º ano",
    opcoesAdolescente,
    opcaoMaisProvavel,
  };
  const prompt = construirPromptAdolescente(intakeAdolescente, axes, pesosPlanetas, datas, true, catalogoResultados, savPorCasa, elementosModalidades, aspectosPessoais, cursosPorDestino);
  console.log(prompt);

  console.log("\n=== Confirmação de conteúdo (TAREFA 6) ===");
  const checks: [string, boolean][] = [
    ["Dados técnicos completos (Eixo da Missão)", prompt.includes("Eixo da Missão")],
    ["Elementos e modalidades", prompt.includes("Elemento dominante")],
    ["Aspectos principais", prompt.includes("Aspectos principais")],
    ["Cursos concretos por opção (medicina)", prompt.includes(opcaoMaisProvavel) && prompt.toLowerCase().includes("entrada no mercado")],
    ["Secção de candidata fora da lista", prompt.includes("Candidata")],
  ];
  for (const [label, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${label}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});
