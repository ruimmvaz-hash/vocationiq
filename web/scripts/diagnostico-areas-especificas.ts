// Diagnóstico pontual (não faz parte do produto) — TAREFA #38 vs #39:
// para uma lista de áreas nomeadas manualmente, confirma (1) se cada
// uma existe como entrada no catálogo, (2) se existe, quantas camadas
// de convergência tem — SEM o limiar aplicado (via `depurarCamadasDestino`,
// já exportado exactamente para isto) — e (3) se falha por não ter
// cobertura no catálogo ou por ficar abaixo da fasquia de selecção.
//
// Réplica exacta da lógica de correspondência de `buscarDestinosPorTexto`
// (catalogoVocacional.ts, privada) — mesma normalização, mesmas palavras
// significativas (4+ caracteres, sem stopwords), mesmo critério de
// substring — para nunca divergir silenciosamente do que o motor real faz.
//
// Uso:
//   npx tsx --require ./scripts/_no-server-only.cjs scripts/diagnostico-areas-especificas.ts \
//     --nome="Nome" --data=YYYY-MM-DD --hora=HH:MM --local="Cidade, país" \
//     --areas="área1,área2,área3"
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  computeWesternTable,
  depurarCamadasDestino,
  type BirthInput,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import catalogoDestinosJson from "../../method-engine/src/data/vocacional/catalogo-destinos.json";

const catalogoDestinos = (catalogoDestinosJson as { destinos: Record<string, { labels: { PT: string } }> }).destinos;

const PALAVRAS_PARAGEM = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com", "a", "o", "as", "os", "um", "uma", "que", "no", "na", "por", "sua", "seu"]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function palavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_PARAGEM.has(p));
}

/** Réplica exacta de `buscarDestinosPorTexto` (catalogoVocacional.ts). */
function buscarDestinosPorTexto(texto: string): string[] {
  const palavras = palavrasSignificativas(texto);
  if (!palavras.length) return [];
  const encontrados: string[] = [];
  for (const [id, destino] of Object.entries(catalogoDestinos)) {
    const alvo = normalizar(`${id} ${destino.labels.PT}`);
    if (palavras.some((p) => alvo.includes(p))) encontrados.push(id);
  }
  return encontrados;
}

function arg(name: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

async function main() {
  const nome = arg("nome") || "Pessoa de teste";
  const dataNascimento = arg("data");
  const horaNascimento = arg("hora");
  const local = arg("local");
  const areasTexto = arg("areas");
  if (!dataNascimento || !local || !areasTexto) {
    console.error('Uso: --nome="Nome" --data=YYYY-MM-DD --hora=HH:MM --local="Cidade, país" --areas="área1,área2,..."');
    process.exit(1);
  }

  const geo = await geocodeCityCountry(local);
  if (!geo) throw new Error(`Não consegui geocodificar "${local}".`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento || "12:00", geo.timezone);
  if (!utcDate) throw new Error("Data/hora inválida.");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
  );
  const savPorCasa = computeSavPorCasa(d1);
  const westernTable = computeWesternTable(birth);
  const atmakaraka = axes.missionAxis.atmakaraka;
  const atmakarakaInfo = { planeta: atmakaraka, nakshatra: d1.rows[atmakaraka].nakshatra };

  const maiorPeso = [...pesosPlanetas].sort((a, b) => b.peso - a.peso)[0];

  console.log(`=== Diagnóstico por área nomeada — ${nome} ===`);
  console.log(`Nascimento: ${dataNascimento} ${horaNascimento || "(sem hora)"}, ${local}`);
  console.log(`Atmakaraka: ${atmakaraka} | Planeta de maior peso: ${maiorPeso.planeta} (peso ${maiorPeso.peso.toFixed(2)})`);
  console.log("Limiar de selecção como 'candidata fora da lista' (TAREFA #38, sistema em dois níveis): ≥4 camadas independentes E um indicador pessoal (Planeta de maior peso, Atmakaraka ou Amatyakaraka). Nunca suprimida — classificada em Nível 1 (inclui Planeta de maior peso, confiança plena) ou Nível 2 (só Atmakaraka/Amatyakaraka, confiança reduzida).\n");

  const areas = areasTexto.split(",").map((a) => a.trim());
  for (const area of areas) {
    const ids = buscarDestinosPorTexto(area);
    console.log(`--- "${area}" ---`);
    if (!ids.length) {
      console.log("  SEM ENTRADA NO CATÁLOGO — nenhum destino casa com esta palavra. Nunca chega a ser avaliado (problema de COBERTURA, não de fasquia).\n");
      continue;
    }
    for (const id of ids) {
      const camadas = depurarCamadasDestino(id, axes, pesosPlanetas, savPorCasa, { areaActual: area, anosExperiencia: "" }, atmakarakaInfo, westernTable.ascendant.ruler);
      const temPlanetaMaiorPeso = camadas.some((c) => c.startsWith("Planeta de maior peso"));
      const temIndicadorFraco = camadas.some((c) => c.startsWith("Atmakaraka") || c.startsWith("Amatyakaraka"));
      const passaLimiarContagem = camadas.length >= 4;
      const nivel: 1 | 2 | null = temPlanetaMaiorPeso ? 1 : temIndicadorFraco ? 2 : null;
      const seriaSeleccionada = passaLimiarContagem && nivel !== null;
      const tagNivel = nivel === 1 ? " [Nível 1 — confiança plena]" : nivel === 2 ? " [Nível 2 — confiança reduzida]" : " [NÃO inclui nenhum indicador pessoal]";
      console.log(`  id="${id}" (${catalogoDestinos[id]?.labels.PT ?? "?"}): ${camadas.length} camada(s)${tagNivel}`);
      camadas.forEach((c, i) => console.log(`      ${i + 1}. ${c}`));
      if (seriaSeleccionada) {
        console.log(`  → SERIA SELECCIONADA como candidata fora da lista (Nível ${nivel}).`);
      } else if (!passaLimiarContagem) {
        console.log(`  → NÃO seleccionada: abaixo da fasquia (${camadas.length}/4 camadas) — problema de FASQUIA, não de cobertura.`);
      } else {
        console.log("  → NÃO seleccionada: tem ≥4 camadas mas nenhum indicador pessoal (Planeta de maior peso, Atmakaraka ou Amatyakaraka).");
      }
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
