// GATE de regressão — corre antes de qualquer commit que toque
// catalogoVocacional.ts, promptAdulto.ts, promptAdolescente.ts ou
// relatorioAdultoCompute.ts (ver docs/REGRESSAO.md). Recalcula as
// candidatas para os clientes reais da suite e compara contra
// baseline.json (o estado revisto e aprovado como correcto). Sai com
// código de erro ≠0, e lista exactamente o que mudou, se alguma
// candidata que estava na baseline desaparecer ou perder nível de
// confiança — nunca falha silenciosamente, nunca passa por omissão.
//
// Uma candidata NOVA a aparecer, ou a subir de confiança, não é falha —
// só desaparecer ou piorar é. Isto é deliberado: o objectivo é apanhar
// perdas, nunca travar melhorias genuínas.
//
// Uso: npx tsx --require ../../scripts/_no-server-only.cjs scripts/regressao/verificar.ts

import { readFileSync } from "fs";
import { join } from "path";
import { FIXTURES } from "./fixtures";
import { computarSnapshot, type CandidataSnapshot } from "./computar";

interface Baseline {
  capturadoEm: string;
  clientes: Record<string, CandidataSnapshot[]>;
}

function chave(c: CandidataSnapshot): string {
  return `${c.origem}:${c.id}`;
}

async function main() {
  const baselinePath = join(__dirname, "baseline.json");
  let baseline: Baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
  } catch {
    console.error(`Não encontrei ${baselinePath}. Corre primeiro: npx tsx --require ./scripts/_no-server-only.cjs scripts/regressao/capturar-baseline.ts`);
    process.exit(1);
    return;
  }

  let falhas = 0;
  console.log(`Baseline capturada em: ${baseline.capturadoEm}\n`);

  for (const fixture of FIXTURES) {
    const esperado = baseline.clientes[fixture.chave] ?? [];
    if (esperado.length === 0) {
      console.log(`[${fixture.chave}] SEM BASELINE — a saltar (corre capturar-baseline.ts).`);
      continue;
    }
    const actual = await computarSnapshot(fixture);
    const mapaActual = new Map(actual.candidatas.map((c) => [chave(c), c]));

    const problemas: string[] = [];
    for (const c of esperado) {
      const agora = mapaActual.get(chave(c));
      if (!agora) {
        problemas.push(`DESAPARECEU: "${c.nome}" (${c.origem}, tinha convergência ${c.convergencia}${c.nivelConfianca ? `, nível ${c.nivelConfianca}` : ""})`);
        continue;
      }
      if (c.nivelConfianca !== undefined && agora.nivelConfianca !== undefined && agora.nivelConfianca > c.nivelConfianca) {
        problemas.push(`PERDEU CONFIANÇA: "${c.nome}" (nível ${c.nivelConfianca} -> ${agora.nivelConfianca})`);
      }
    }

    const novas = actual.candidatas.filter((c) => !esperado.some((e) => chave(e) === chave(c)));

    if (problemas.length > 0) {
      falhas++;
      console.log(`[${fixture.chave}] FALHOU:`);
      for (const p of problemas) console.log(`  - ${p}`);
    } else {
      console.log(`[${fixture.chave}] OK (${actual.candidatas.length} candidatas${novas.length ? `, ${novas.length} novas: ${novas.map((c) => c.nome).join(", ")}` : ""})`);
    }
  }

  console.log("");
  if (falhas > 0) {
    console.error(`REGRESSÃO DETECTADA em ${falhas} cliente(s) — não avançar sem rever.`);
    process.exit(1);
  }
  console.log("Sem regressões — todas as candidatas da baseline continuam presentes.");
}

main().catch((err) => {
  console.error("Falha ao verificar regressão:", err);
  process.exit(1);
});
