// VocationIQ — TAREFA 4 (correcção do especialista): liga ao relatório os
// elementos/modalidades tropicais e os aspectos entre planetas pessoais,
// já calculados pela camada ocidental (`computeWesternTable`) mas nunca
// antes consumidos pelo VocationIQ. Nenhuma astronomia nova aqui — só
// leitura e formatação do que `computeWesternTable` já devolve.

import { SIGN_TABLE, type Element, type Modality } from "../data/tables";
import type { ClassicalGraha } from "../lifeReport/types";
import type { AspectName } from "../lifeReport/western/aspects";
import type { WesternPlanetRow } from "../lifeReport/western/westernTable";

// ---------- Elementos e modalidades ----------

const ELEMENTO_PT: Record<Element, string> = { Fire: "Fogo", Earth: "Terra", Air: "Ar", Water: "Água" };
const MODALIDADE_PT: Record<Modality, string> = { Cardinal: "Cardinal", Fixed: "Fixa", Mutable: "Mutável" };

export interface PerfilElementosModalidades {
  distribuicaoElementos: Record<string, number>; // chaves em PT: Fogo/Terra/Ar/Água
  distribuicaoModalidades: Record<string, number>; // chaves em PT: Cardinal/Fixa/Mutável
  elementoDominante: string;
  modalidadeDominante: string;
}

/**
 * Distribuição de elementos/modalidades pelos 7 planetas clássicos (não só
 * os 5 pessoais — o equilíbrio elementar tradicional usa o conjunto
 * completo, ao contrário dos aspectos abaixo, que a TAREFA 4 pede
 * restritos aos 5 pessoais). Empate no domínio resolve-se pelo elemento/
 * modalidade do Sol — é o ponto de identidade mais central da carta
 * ocidental, o mesmo papel que já tem em `archetypeEngine.ts`.
 */
export function computeElementosModalidades(planetas: Record<ClassicalGraha, WesternPlanetRow>): PerfilElementosModalidades {
  const distribuicaoElementos: Record<string, number> = { Fogo: 0, Terra: 0, Ar: 0, Água: 0 };
  const distribuicaoModalidades: Record<string, number> = { Cardinal: 0, Fixa: 0, Mutável: 0 };

  for (const row of Object.values(planetas)) {
    const { element, modality } = SIGN_TABLE[row.sign];
    distribuicaoElementos[ELEMENTO_PT[element]]++;
    distribuicaoModalidades[MODALIDADE_PT[modality]]++;
  }

  const maiorValor = (dist: Record<string, number>) => Math.max(...Object.values(dist));
  const empatados = (dist: Record<string, number>) => Object.keys(dist).filter((k) => dist[k] === maiorValor(dist));

  const solElemento = ELEMENTO_PT[SIGN_TABLE[planetas.Sun.sign].element];
  const solModalidade = MODALIDADE_PT[SIGN_TABLE[planetas.Sun.sign].modality];

  const elementosEmpatados = empatados(distribuicaoElementos);
  const modalidadesEmpatadas = empatados(distribuicaoModalidades);

  return {
    distribuicaoElementos,
    distribuicaoModalidades,
    elementoDominante: elementosEmpatados.length === 1 ? elementosEmpatados[0] : elementosEmpatados.includes(solElemento) ? solElemento : elementosEmpatados[0],
    modalidadeDominante: modalidadesEmpatadas.length === 1 ? modalidadesEmpatadas[0] : modalidadesEmpatadas.includes(solModalidade) ? solModalidade : modalidadesEmpatadas[0],
  };
}

// ---------- Aspectos entre planetas pessoais ----------

/** Os 5 "planetas pessoais" pedidos na TAREFA 4 — mais próximos, mudam de signo mais depressa, e são os mais lidos como traço de personalidade em astrologia ocidental. Júpiter/Saturno ficam de fora aqui (entram no equilíbrio elementar acima, não nos aspectos). */
const PLANETAS_PESSOAIS: ClassicalGraha[] = ["Sun", "Moon", "Mercury", "Venus", "Mars"];

export interface AspectoPessoal {
  planetaA: ClassicalGraha;
  planetaB: ClassicalGraha;
  aspecto: AspectName;
  orbe: number;
  aplicando: boolean;
  /** Leitura em linguagem simples — combina o tema do par de planetas com o tipo de aspecto (ver TEMA_PAR/FRAMING_ASPECTO abaixo). Nunca jargão (nunca "orbe", "aspecto", "quadratura" — esses ficam só nos dados internos). */
  significado: string;
}

/** O que cada par de planetas pessoais governa em conjunto — conhecimento astrológico estabelecido, não um facto específico de ninguém. Chave: "A-B" pela ordem de PLANETAS_PESSOAIS (A sempre antes de B nessa ordem). */
const TEMA_PAR: Record<string, string> = {
  "Sun-Moon": "o que quer conscientemente e o que precisa por dentro",
  "Sun-Mercury": "a identidade e a forma como a comunica",
  "Sun-Venus": "a identidade e aquilo que valoriza ou acha bonito",
  "Sun-Mars": "a vontade consciente e a forma como age sobre ela",
  "Moon-Mercury": "o mundo emocional e a forma como o põe em palavras",
  "Moon-Venus": "a necessidade emocional e o que valoriza nas relações",
  "Moon-Mars": "o que sente e o impulso de agir sobre isso",
  "Mercury-Venus": "a forma como pensa/comunica e o que valoriza esteticamente",
  "Mercury-Mars": "a forma como pensa e a urgência de agir",
  "Venus-Mars": "o que atrai e a forma como o persegue",
};

/** Framing genérico por tipo de aspecto — combina-se com o tema do par acima para formar a frase completa. */
const FRAMING_ASPECTO: Record<AspectName, string> = {
  Conjuncao: "os dois operam fundidos, quase como um só impulso — força real, mas pouca distância entre eles para os separar quando é preciso",
  Sextil: "os dois cooperam com facilidade, sem esforço — uma oportunidade disponível, que ainda assim precisa de ser usada para render",
  Quadratura: "há fricção activa entre os dois — uma tensão que pede resolução repetida, não uma vez só",
  Trigono: "os dois fluem em harmonia natural, quase sem esforço consciente",
  Oposicao: "os dois puxam em direcções opostas — uma polaridade que pede integração consciente, nunca escolher um lado e ignorar o outro",
};

function chaveTema(a: ClassicalGraha, b: ClassicalGraha): string {
  const [primeiro, segundo] = PLANETAS_PESSOAIS.indexOf(a) < PLANETAS_PESSOAIS.indexOf(b) ? [a, b] : [b, a];
  return `${primeiro}-${segundo}`;
}

/**
 * Aspectos natais entre os 5 planetas pessoais — reaproveita a grelha de
 * aspectos JÁ calculada por `computeWesternTable` (cada planeta guarda os
 * seus próprios aspectos em `.aspects`), só filtrando para os pares onde
 * ambos os lados são planetas pessoais e removendo a duplicação (a grelha
 * regista cada par duas vezes, uma a partir de cada planeta). Ordenado por
 * orbe (o mais exacto primeiro) — é o critério mais simples e honesto de
 * "mais relevante" sem inventar uma escala de importância nova.
 */
export function computeAspectosPessoais(planetas: Record<ClassicalGraha, WesternPlanetRow>): AspectoPessoal[] {
  const resultado: AspectoPessoal[] = [];
  for (let i = 0; i < PLANETAS_PESSOAIS.length; i++) {
    for (let j = i + 1; j < PLANETAS_PESSOAIS.length; j++) {
      const a = PLANETAS_PESSOAIS[i];
      const b = PLANETAS_PESSOAIS[j];
      const hit = planetas[a].aspects.find((e) => e.to === b);
      if (!hit) continue;
      const tema = TEMA_PAR[chaveTema(a, b)];
      resultado.push({
        planetaA: a,
        planetaB: b,
        aspecto: hit.hit.aspect,
        orbe: hit.hit.orb,
        aplicando: hit.hit.applying,
        significado: `${tema} — ${FRAMING_ASPECTO[hit.hit.aspect]}.`,
      });
    }
  }
  return resultado.sort((x, y) => x.orbe - y.orbe);
}
