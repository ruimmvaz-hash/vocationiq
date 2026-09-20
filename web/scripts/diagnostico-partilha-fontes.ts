// Diagnóstico ad-hoc (pedido do Rui) — dump completo de camadas cruas por
// candidata "fora da lista" + cruzamento com yogas + contagem de quantas
// candidatas partilham cada FONTE única — para localizar onde uma
// combinação/planeta está a ser citado como reforço em massa em vez de
// por destino. Usa as fixtures reais de scripts/regressao/fixtures.ts
// (coordenadas fixas, sem geocodificação — este ambiente não tem acesso
// à API). Nunca inventa dados de nascimento.
//
// Uso (a partir de web/):
//   npx tsx --require ./scripts/_no-server-only.cjs scripts/diagnostico-partilha-fontes.ts <chave-fixture>

import { calcularDadosAstrologicos, calcularDadosAstrologicosAdolescente } from "../src/lib/relatorioAdultoCompute";
import { FIXTURES } from "./regressao/fixtures";

async function main() {
  const chave = process.argv[2];
  if (!chave) {
    console.error("Uso: ... diagnostico-partilha-fontes.ts <chave-fixture> (ex.: nadia, alexandra)");
    process.exit(1);
  }
  const fixture = FIXTURES.find((f) => f.chave === chave);
  if (!fixture) {
    console.error(`Fixture "${chave}" não encontrada. Disponíveis: ${FIXTURES.map((f) => f.chave).join(", ")}`);
    process.exit(1);
  }

  const dados =
    fixture.ramo === "adulto"
      ? await calcularDadosAstrologicos(fixture.intake, fixture.coordenadas)
      : await calcularDadosAstrologicosAdolescente(fixture.intake as any, fixture.coordenadas);

  const catalogo = (dados as any).catalogoResultados;
  const yogas = (dados as any).yogas;
  const NOMES_PLANETAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const planetasMencionados = (t: string) => new Set(NOMES_PLANETAS.filter((p) => t.includes(p)));

  console.log(`=== ${fixture.intake.nome} (${fixture.chave}) — camadas cruas de TODAS as candidatas fora da lista ===\n`);
  console.log(`Yogas activos neste perfil:`);
  for (const y of yogas) console.log(`  - ${y.label}: ${y.detail}`);
  console.log("");

  const PREFIXOS_ESTREITOS = ["Atmakaraka", "Amatyakaraka", "Planeta de maior peso", "Combinação"];
  const ehCamadaEstreita = (c: string) => PREFIXOS_ESTREITOS.some((p) => c.startsWith(p));

  let totalComYogaAntes = 0;
  let totalComYogaDepois = 0;
  for (const c of catalogo.candidatasForaDaLista) {
    console.log(`--- ${c.nome} — ${c.convergencia} camada(s) distinta(s), soma de pesos ${c.somaPesoCamadas.toFixed(2)}, Nível ${c.nivelConfianca} ---`);
    c.camadas.forEach((camada: string, i: number) => console.log(`  ${i + 1}. ${camada}`));
    const planetasCandidata = new Set(c.camadas.flatMap((camada: string) => [...planetasMencionados(camada)]));
    const planetasCandidataEstreitos = new Set(c.camadas.filter(ehCamadaEstreita).flatMap((camada: string) => [...planetasMencionados(camada)]));
    const yogasLigadosAntes = yogas.filter((y: any) => [...planetasMencionados(y.detail)].some((p) => planetasCandidata.has(p as string)));
    const yogasLigadosDepois = yogas.filter((y: any) => [...planetasMencionados(y.detail)].some((p) => planetasCandidataEstreitos.has(p as string)));
    if (yogasLigadosAntes.length) totalComYogaAntes++;
    if (yogasLigadosDepois.length) totalComYogaDepois++;
    if (yogasLigadosAntes.length) {
      console.log(`  -> ANTES da correcção: ${yogasLigadosAntes.map((y: any) => y.label).join(", ")}`);
    }
    if (yogasLigadosDepois.length) {
      console.log(`  -> DEPOIS da correcção (só camadas estreitas): ${yogasLigadosDepois.map((y: any) => y.label).join(", ")}`);
    } else {
      console.log(`  -> DEPOIS da correcção: nenhum yoga aplicável (sinal era só de grupo/casa/área, não desta candidata)`);
    }
    console.log("");
  }
  console.log(`RESUMO: candidatas com yoga citável ANTES = ${totalComYogaAntes}/${catalogo.candidatasForaDaLista.length}; DEPOIS = ${totalComYogaDepois}/${catalogo.candidatasForaDaLista.length}\n`);

  console.log("=== Grupos de candidatas (assinatura de camadas idêntica/quase idêntica) ===");
  catalogo.gruposCandidatas.forEach((g: string[], i: number) => {
    console.log(`Grupo ${i + 1} (${g.length}): ${g.join(", ")}`);
  });

  console.log("\n=== Sobreposição de FONTES entre todas as candidatas (para medir concentração) ===");
  const contagemFonte = new Map<string, string[]>();
  for (const c of catalogo.candidatasForaDaLista) {
    for (const camada of c.camadas) {
      const chaveFonte = camada.split(" — ")[0].split(" (")[0].trim();
      if (!contagemFonte.has(chaveFonte)) contagemFonte.set(chaveFonte, []);
      contagemFonte.get(chaveFonte)!.push(c.nome);
    }
  }
  const ordenado = [...contagemFonte.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [fonte, nomes] of ordenado) {
    console.log(`  "${fonte}" -- ${nomes.length}/${catalogo.candidatasForaDaLista.length} candidatas: ${nomes.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
