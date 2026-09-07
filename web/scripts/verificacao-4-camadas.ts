// Verificação pontual (não faz parte do produto) — TAREFA "VERIFICAÇÃO
// APÓS IMPLEMENTAR": mostra os dados REAIS computados pelas 4 camadas
// novas (avastha/conjunções/yogas/Vargottama) para a Melina e a Nádia,
// usando as FUNÇÕES REAIS exportadas (computeD1Table, detectYogas,
// blocoAvasthas/blocoConjuncoes/blocoYogas/blocoVargottama) — nada
// reimplementado.
import { computeD1Table, detectYogas, blocoAvasthas, blocoConjuncoes, blocoYogas, blocoVargottama, type BirthInput } from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";

async function mostrar(nome: string, local: string, dataNascimento: string, horaNascimento: string) {
  const geo = await geocodeCityCountry(local);
  if (!geo) throw new Error(`Não consegui geocodificar "${local}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const yogas = detectYogas(d1).filter((y) => !y.id.startsWith("neechabhanga"));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`${nome} — ${local}, ${dataNascimento} ${horaNascimento}`);
  console.log("=".repeat(70));

  console.log("\n-- Avasthas (maturidade dos planetas) --");
  console.log(blocoAvasthas(d1));

  console.log("\n-- Conjunções activas --");
  console.log(blocoConjuncoes(d1));

  console.log("\n-- Yogas activos (Neecha Bhanga filtrado — VocationIQ já tem o seu próprio) --");
  console.log(blocoYogas(yogas));

  console.log("\n-- Vargottama --");
  console.log(blocoVargottama(d1));
}

async function main() {
  await mostrar("Melina (teste)", "São Paulo, Brasil", "1984-12-11", "08:30");
  await mostrar("Nádia (teste)", "Luanda, Angola", "1983-01-10", "15:02");
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
