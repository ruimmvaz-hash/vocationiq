// Captura o estado ACTUAL (hoje, depois das correcções da auditoria) das
// candidatas do catálogo vocacional para cada cliente real da suite de
// regressão, e grava em baseline.json. Corre-se UMA VEZ, deliberadamente,
// cada vez que uma alteração ao catálogo/prompt é revista e aprovada como
// correcta — nunca automaticamente. `verificar.ts` compara contra isto.
//
// Uso: npx tsx --require ../../scripts/_no-server-only.cjs scripts/regressao/capturar-baseline.ts

import { writeFileSync } from "fs";
import { join } from "path";
import { FIXTURES } from "./fixtures";
import { computarSnapshot } from "./computar";

async function main() {
  const baseline: Record<string, ReturnType<typeof Object>> = {};
  for (const fixture of FIXTURES) {
    console.log(`A calcular ${fixture.chave}...`);
    const snapshot = await computarSnapshot(fixture);
    baseline[fixture.chave] = snapshot.candidatas;
    console.log(`  ${snapshot.candidatas.length} candidatas (${snapshot.candidatas.map((c) => c.nome).join(", ")})`);
  }
  const outPath = join(__dirname, "baseline.json");
  writeFileSync(outPath, JSON.stringify({ capturadoEm: new Date().toISOString(), clientes: baseline }, null, 2), "utf-8");
  console.log(`\nBaseline gravada em: ${outPath}`);
}

main().catch((err) => {
  console.error("Falha ao capturar baseline:", err);
  process.exit(1);
});
