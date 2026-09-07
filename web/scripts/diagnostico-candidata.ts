// Diagnóstico de "candidata fora da lista" para uma pessoa qualquer —
// sem precisar de um pedido no Supabase (dados de nascimento vêm da
// linha de comando). Usa a mesma pipeline real (computeD1Table,
// catalogarDestinos, detectarYogasVocacionais) que /api/relatorio usa,
// nunca chama a Anthropic.
//
// Uso:
//   npx tsx --require ./scripts/_no-server-only.cjs scripts/diagnostico-candidata.ts \
//     --nome="Nome" --data=YYYY-MM-DD --hora=HH:MM --local="Cidade, país" \
//     --areas="área1,área2"
//
// --hora e --areas são opcionais (sem --hora, usa meio-dia como
// convenção — mesmo fallback da rota real — e avisa; sem --areas, o
// catálogo deriva candidatas só do perfil, sem "Derivadas da área
// actual").
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  computeWesternTable,
  catalogarDestinos,
  detectarYogasVocacionais,
  type BirthInput,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";

const PLANETA_PT: Record<string, string> = {
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
const NOMES_PLANETAS = Object.keys(PLANETA_PT);

function arg(name: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

/** Extrai os nomes de planetas (em inglês, como aparecem em `camadas`/`detail`) mencionados num texto — usado para cruzar yogas com camadas de convergência. */
function planetasMencionados(texto: string): Set<string> {
  return new Set(NOMES_PLANETAS.filter((p) => texto.includes(p)));
}

async function main() {
  const nome = arg("nome") || "Pessoa de teste";
  const dataNascimento = arg("data");
  const horaNascimento = arg("hora");
  const local = arg("local");
  const areasTexto = arg("areas");

  if (!dataNascimento || !local) {
    console.error('Uso: npx tsx --require ./scripts/_no-server-only.cjs scripts/diagnostico-candidata.ts --nome="Nome" --data=YYYY-MM-DD --hora=HH:MM --local="Cidade, país" [--areas="área1,área2"]');
    process.exit(1);
  }

  const geo = await geocodeCityCountry(local);
  if (!geo) throw new Error(`Não consegui geocodificar "${local}".`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const horaAproximada = !horaNascimento;
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento || "12:00", geo.timezone);
  if (!utcDate) throw new Error(`Data/hora inválida (${dataNascimento} ${horaNascimento || "12:00"}).`);
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
  );
  const savPorCasa = computeSavPorCasa(d1);
  const westernTable = computeWesternTable(birth);
  const yogas = detectarYogasVocacionais(d1);

  const areasArr = areasTexto ? areasTexto.split(",").map((a) => a.trim()) : [];
  const areaActual = areasArr[0] ?? "";

  const catalogo = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual, anosExperiencia: "" },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    westernTable.ascendant.ruler,
  );

  console.log(`=== Diagnóstico de candidatas fora da lista — ${nome} ===`);
  console.log(`Nascimento: ${dataNascimento} ${horaNascimento || "(hora não fornecida)"}, ${local}`);
  if (horaAproximada) console.log("NOTA: sem hora de nascimento — Ascendente/casas calculados com meio-dia como convenção, tal como a rota real faz; podem estar errados.");
  console.log(`Área actual usada para o catálogo: "${areaActual || "(nenhuma — candidatas derivadas só do perfil)"}"`);
  console.log(`Atmakaraka: ${PLANETA_PT[axes.missionAxis.atmakaraka] ?? axes.missionAxis.atmakaraka}\n`);

  if (!catalogo.candidatasForaDaLista.length) {
    console.log("Nenhuma candidata fora da lista atingiu ≥4 camadas independentes.\n");
  } else {
    console.log(`${catalogo.candidatasForaDaLista.length} candidata(s) fora da lista:\n`);
    for (const c of catalogo.candidatasForaDaLista) {
      console.log(`- ${c.nome}: ${c.convergencia} camada(s)`);
      c.camadas.forEach((camada, i) => console.log(`    ${i + 1}. ${camada}`));
      // Cruzamento com yogas — a mesma condição que INSTRUCAO_YOGAS pede
      // ao LLM: "confirmação directa" quando o yoga partilha um planeta
      // com as camadas desta candidata.
      const planetasCandidata = new Set(c.camadas.flatMap((camada) => [...planetasMencionados(camada)]));
      const yogasLigados = yogas.filter((y) => [...planetasMencionados(y.detail)].some((p) => planetasCandidata.has(p)));
      if (yogasLigados.length) {
        console.log(`    → YOGA(S) EM CONFIRMAÇÃO DIRECTA (partilham planeta com esta candidata): ${yogasLigados.map((y) => y.label).join(", ")}`);
      }
      console.log("");
    }
  }

  console.log("=== As 4 camadas novas (avasthas/conjunções/yogas/Vargottama) — entram na SELECÇÃO de candidatas? ===");
  console.log("NÃO, por desenho: catalogarDestinos() (o cálculo determinístico de convergência acima) usa só Atmakaraka/Amatyakaraka/Nakshatra/Modo de Ganho/regência/área declarada/ideia concreta — nunca lê avasthas, conjunções, yogas ou Vargottama. As 4 camadas novas entram só na NARRATIVA do prompt (INSTRUCAO_YOGAS etc.), como reforço às candidatas já seleccionadas pelas camadas clássicas acima — nunca podem, por regra explícita do prompt, criar uma candidata que o catálogo não tenha já listado.");
  console.log(`\nYogas activos calculados para este perfil: ${yogas.length ? yogas.map((y) => `${y.label} (${y.detail})`).join("\n  ") : "nenhum"}`);
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
