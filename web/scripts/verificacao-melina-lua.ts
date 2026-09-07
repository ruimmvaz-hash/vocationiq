// Verificação pontual (não faz parte do produto) — FALTA 2: confirmar,
// com dados reais da Melina, se "Estética" (a área actual dela) está
// deterministicamente ligada à Lua antes de codificar qualquer regra
// que assuma essa ligação.
import { computeD1Table, computeVocationIQAxes, computePesosPlanetas, computeSavPorCasa, computeWesternTable, catalogarDestinos, type BirthInput } from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";

async function main() {
  const local = "São Paulo, Brasil";
  const dataNascimento = "1984-12-11";
  const horaNascimento = "08:30";
  const geo = await geocodeCityCountry(local);
  if (!geo) throw new Error("geo falhou");
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data invalida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  console.log("Lua — signo:", d1.rows.Moon.sign, "| casa:", d1.rows.Moon.house, "| avastha:", d1.rows.Moon.avastha, "| grau:", d1.rows.Moon.degreeInSign.toFixed(1));

  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(d1, pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })));
  const savPorCasa = computeSavPorCasa(d1);
  const westernTable = computeWesternTable(birth);

  const catalogo = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: "Estética", anosExperiencia: "5 a 10 anos", ideiaConcreta: undefined },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    westernTable.ascendant.ruler,
  );

  console.log("\nnotaAreaGenerica:", catalogo.notaAreaGenerica);
  console.log("\ndestinosDeAreaActual (que 'Estética' encontrou no catálogo):");
  for (const d of catalogo.destinosDeAreaActual) {
    console.log(`- ${d.nome} (id=${d.id}): convergência ${d.convergencia} — camadas: ${d.camadas.join(" | ")}`);
  }

  console.log("\nPeso de todos os planetas (para contexto):");
  for (const p of pesosPlanetas) console.log(`${p.planeta}: peso ${p.peso.toFixed(2)}, estado ${p.estado}, casa ${p.casa}`);
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
