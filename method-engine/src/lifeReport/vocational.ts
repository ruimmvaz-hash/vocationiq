import { SIGN_RULERS, functionalRulerships } from "./signRulers";
import type { ClassicalGraha, Graha } from "./types";
import { CLASSICAL_GRAHAS } from "./types";
import type { D1TableResult, GrahaRow } from "./d1Table";

// M-009 (Mapeamento Vocacional) — Camada 1 (astrológica) do algoritmo de
// 8 passos (M-009 Parte 4 §4.1). Este módulo só produz PASSO 1/2 (derivar
// os factores mais fortes + mapear às 8 famílias vocacionais da Parte 3);
// os passos 3-8 (cruzar com RIASEC/formulário, contraindicações finais,
// linguagem) exigem texto livre do cliente e ficam para a camada de
// redacção (prompt.ts) — o motor só entrega os FACTOS, nunca a síntese
// em prosa (mesmo padrão de yogas.ts/globalConfigs.ts).
//
// Nota de fidelidade: M-009 §4.1 passo 1 pede "AK, regente do Asc, planeta
// mais forte no D-10" — este motor ainda não tem um módulo D-10 dedicado
// (não construído nesta sessão); substitui-se por "planeta mais forte por
// dignidade clássica" entre os 7 grahas, que é o proxy mais próximo já
// disponível. Se um D-10 for construído no futuro, este é o ponto a
// actualizar.

export interface VocationalFamilyHit {
  id: string;
  label: string;
  score: number;
  signals: string[];
}

export interface VocationalCaution {
  id: string;
  label: string;
  reason: string;
}

export interface VocationalResult {
  primary: VocationalFamilyHit[];
  secondary: VocationalFamilyHit[];
  cautions: VocationalCaution[];
}

interface FamilyDef {
  id: string;
  label: string;
  keyPlanets: ClassicalGraha[];
  keyHouses: number[];
}

// M-009 Parte 3 — as 8 famílias, com os seus significadores principais
// (planetas + casas) tal como descritos em "Perfil astrológico de encaixe".
const FAMILIES: FamilyDef[] = [
  { id: "linguagem_comunicacao", label: "Linguagem e Comunicação", keyPlanets: ["Mercury"], keyHouses: [3] },
  { id: "criacao_forma", label: "Criação e Forma", keyPlanets: ["Venus", "Sun"], keyHouses: [5] },
  { id: "estrutura_sistema", label: "Estrutura e Sistema", keyPlanets: ["Saturn", "Mercury"], keyHouses: [6, 10] },
  { id: "cuidado_saude", label: "Cuidado e Saúde", keyPlanets: ["Moon", "Jupiter"], keyHouses: [6, 12] },
  { id: "investigacao_conhecimento", label: "Investigação e Conhecimento", keyPlanets: ["Saturn", "Jupiter"], keyHouses: [8, 9, 12] },
  { id: "gestao_negocio", label: "Gestão e Negócio", keyPlanets: ["Sun", "Mars", "Jupiter"], keyHouses: [2, 10, 11] },
  { id: "direito_justica", label: "Direito e Justiça", keyPlanets: ["Jupiter", "Saturn"], keyHouses: [7, 9] },
  { id: "educacao_desenvolvimento", label: "Educação e Desenvolvimento Humano", keyPlanets: ["Jupiter", "Moon"], keyHouses: [5, 9] },
];

const BENEFICS: Graha[] = ["Jupiter", "Venus", "Mercury"];
const DIGNITY_RANK: Record<string, number> = { Exalted: 5, Own: 4, Friend: 3, Neutral: 2, Enemy: 1, Debilitated: 0 };

function ruledBy(rulerships: Record<ClassicalGraha, number[]>, house: number): ClassicalGraha {
  const entry = Object.entries(rulerships).find(([, houses]) => houses.includes(house));
  return (entry ? entry[0] : "Sun") as ClassicalGraha;
}

/** Proxy para "planeta mais forte no D-10" (ver nota de fidelidade acima): melhor dignidade clássica entre os 7 grahas. */
function strongestByDignity(rows: Record<Graha, GrahaRow>): ClassicalGraha {
  let best: ClassicalGraha = "Sun";
  let bestRank = -1;
  for (const g of CLASSICAL_GRAHAS) {
    const rank = DIGNITY_RANK[rows[g].dignity ?? "Neutral"] ?? 2;
    if (rank > bestRank) {
      bestRank = rank;
      best = g;
    }
  }
  return best;
}

export function detectVocationalFamilies(d1: D1TableResult): VocationalResult {
  const rows = d1.rows;
  const rulerships = functionalRulerships(d1.ascendant.sign);
  const ascLord = SIGN_RULERS[d1.ascendant.sign];
  const ak = d1.karakas.atmakaraka;
  const amk = d1.karakas.amatyakaraka;
  const strongest = strongestByDignity(rows);

  const hits: VocationalFamilyHit[] = FAMILIES.map((family) => {
    let score = 0;
    const signals: string[] = [];

    if (family.keyPlanets.includes(ak as ClassicalGraha)) {
      score += 3;
      signals.push(`motor da alma (Atmakaraka) em ${ak}`);
    }
    if (family.keyPlanets.includes(amk as ClassicalGraha)) {
      score += 2;
      signals.push(`indicador de carreira (Amatyakaraka) em ${amk}`);
    }
    if (family.keyPlanets.includes(ascLord)) {
      score += 2;
      signals.push(`regente do ponto de identidade é ${ascLord}`);
    }
    if (family.keyPlanets.includes(strongest)) {
      score += 2;
      signals.push(`planeta mais forte do perfil por dignidade é ${strongest} (${rows[strongest].dignity})`);
    }

    for (const house of family.keyHouses) {
      const lord = ruledBy(rulerships, house);
      if (family.keyPlanets.includes(lord)) {
        score += 1;
        signals.push(`regente da casa ${house} (${lord}) pertence a esta família`);
      }
      const classicalInHouse = CLASSICAL_GRAHAS.filter((g) => rows[g].house === house);
      for (const p of classicalInHouse) {
        if (family.keyPlanets.includes(p)) {
          score += 1;
          signals.push(`${p} presente na casa ${house}`);
        }
      }
      if (classicalInHouse.some((p) => BENEFICS.includes(p))) {
        score += 0.5;
        signals.push(`benéfico presente na casa ${house}`);
      }
    }

    for (const p of family.keyPlanets) {
      // Moolatrikona incluído (SPEC-003) — na escala 0-6 fica acima de
      // "Own"/Próprio (5 vs 4), por isso conta pelo menos tão forte.
      const dignity = rows[p].dignity;
      if (dignity === "Exalted" || dignity === "Own" || dignity === "Moolatrikona") {
        score += 1.5;
        signals.push(`${p} em dignidade forte (${dignity})`);
      } else if (dignity === "Debilitated") {
        score -= 1;
      }
    }

    return { id: family.id, label: family.label, score: Math.round(score * 10) / 10, signals };
  }).sort((a, b) => b.score - a.score);

  const withSignal = hits.filter((h) => h.signals.length > 0);
  const primary = withSignal.slice(0, 3).filter((h) => h.score >= 2);
  const secondary = withSignal.slice(primary.length, primary.length + 2).filter((h) => h.score >= 1);

  // Contraindicações (M-009 §4.2): família cujo planeta-chave é AK/AmK/regente
  // do Asc (ou seja, seria "óbvia" à partida) mas está debilitado SEM
  // reversão (Neechabhanga) — sinal misto que merece nota de cautela em vez
  // de recomendação directa.
  const cautions: VocationalCaution[] = [];
  for (const family of FAMILIES) {
    for (const p of family.keyPlanets) {
      const row = rows[p];
      if (row.dignity !== "Debilitated") continue;
      const isHeadlineSignificator = p === ak || p === amk || p === ascLord;
      if (!isHeadlineSignificator) continue;
      const signRuler = SIGN_RULERS[row.sign];
      const reversed = rows[signRuler].house === 1 || rows[signRuler].house === 4 || rows[signRuler].house === 7 || rows[signRuler].house === 10 || rows[signRuler].dignity === "Exalted";
      if (!reversed) {
        cautions.push({
          id: family.id,
          label: family.label,
          reason: `${p} (significador central desta família) está debilitado sem reversão — sinal misto: vale investigar se é bloqueio situacional ou incompatibilidade real antes de recomendar.`,
        });
      }
    }
  }

  return { primary, secondary, cautions: cautions.slice(0, 2) };
}
