// FASE 1, Tarefa Extra 3 — Panchadha Maitri (amizade de 5 graus), a
// substituir a Naisargika Maitri simples (3 graus: amigo/inimigo/neutro)
// que o motor antigo usa em `data/dignity.ts`. Ficheiro NOVO, dentro de
// v3/ — não altera `data/dignity.ts` nem nenhum ficheiro do motor antigo
// (esse continua a usar a Naisargika simples, sem alteração).
//
// VERIFICADO — 23/08/2026, contra o Prokerala (Planet Relationship →
// Panchada Maitri Table) para a carta da Melina. Ver nota mais abaixo
// sobre uma divergência encontrada entre o pedido original e o resultado
// classicamente correcto para Vénus-Saturno.

import { CLASSICAL_GRAHAS, SIGNS_ORDER, type ClassicalGraha } from "../lifeReport/types";
import type { ZodiacSign } from "../data/tables";

export type RelacaoNatural = "amigo" | "inimigo" | "neutro";
export type RelacaoTemporal = "amigo" | "inimigo";
export type NivelMaitri = "adhi-mitra" | "mitra" | "sama" | "shatru" | "adhi-shatru";

/**
 * Naisargika Maitri (amizade natural, clássica, fixa — nunca muda com a
 * carta). Note-se que é ASSIMÉTRICA por desenho clássico (ex.: Mercúrio
 * considera o Sol amigo, mas o Sol considera Mercúrio neutro) — isto é
 * doutrina Parashari padrão, não um erro. Confirmado célula a célula
 * contra a tabela "Naisargika Maitri" do Prokerala
 * (prokerala.com/astrology/planet-relationship.php) para a carta da
 * Melina.
 */
export const NAISARGIKA_MAITRI: Record<ClassicalGraha, Record<ClassicalGraha, RelacaoNatural>> = {
  Sun: { Sun: "neutro", Moon: "amigo", Mars: "amigo", Mercury: "neutro", Jupiter: "amigo", Venus: "inimigo", Saturn: "inimigo" },
  Moon: { Sun: "amigo", Moon: "neutro", Mars: "neutro", Mercury: "amigo", Jupiter: "neutro", Venus: "neutro", Saturn: "neutro" },
  Mars: { Sun: "amigo", Moon: "amigo", Mars: "neutro", Mercury: "inimigo", Jupiter: "amigo", Venus: "neutro", Saturn: "neutro" },
  Mercury: { Sun: "amigo", Moon: "inimigo", Mars: "neutro", Mercury: "neutro", Jupiter: "neutro", Venus: "amigo", Saturn: "neutro" },
  Jupiter: { Sun: "amigo", Moon: "amigo", Mars: "amigo", Mercury: "inimigo", Jupiter: "neutro", Venus: "inimigo", Saturn: "neutro" },
  Venus: { Sun: "inimigo", Moon: "inimigo", Mars: "neutro", Mercury: "amigo", Jupiter: "neutro", Venus: "neutro", Saturn: "amigo" },
  Saturn: { Sun: "inimigo", Moon: "inimigo", Mars: "inimigo", Mercury: "amigo", Jupiter: "neutro", Venus: "amigo", Saturn: "neutro" },
};

/**
 * Tatkalika Maitri (amizade temporal — depende da carta): a partir da
 * posição do planeta A, os signos 2, 3, 4, 10, 11, 12 são amigos
 * temporários; os restantes (incluindo o próprio signo de A, offset 1) são
 * inimigos temporários — regra tal como especificada no pedido.
 */
export function tatkalikaMaitri(signA: ZodiacSign, signB: ZodiacSign): RelacaoTemporal {
  const idxA = SIGNS_ORDER.indexOf(signA);
  const idxB = SIGNS_ORDER.indexOf(signB);
  const offset = ((idxB - idxA + 12) % 12) + 1; // 1-12
  const amigos = [2, 3, 4, 10, 11, 12];
  return amigos.includes(offset) ? "amigo" : "inimigo";
}

/**
 * Combinação Natural + Temporal → Panchadha Maitri (5 graus).
 *
 * NOTA — o pedido original descrevia os 5 graus com uma condição a mais
 * ("neutro temporal", que não existe nesta implementação — a Tatkalika é
 * sempre binária, amigo ou inimigo, nunca neutra) e uma sobreposição entre
 * "Sama" e "Shatru" (as duas listavam "neutro natural + inimigo
 * temporal"). Implementado aqui o mapeamento clássico padrão (o mesmo que
 * o Prokerala usa, confirmado célula a célula contra a tabela "Panchada
 * Maitri" para a carta da Melina), que é bijectivo sobre as 6 combinações
 * possíveis (3 naturais × 2 temporais):
 *
 *   amigo   + amigo   → Adhi Mitra (grande amigo)
 *   neutro  + amigo   → Mitra (amigo)
 *   inimigo + amigo   → Sama (neutro)
 *   amigo   + inimigo → Sama (neutro)
 *   neutro  + inimigo → Shatru (inimigo)
 *   inimigo + inimigo → Adhi Shatru (grande inimigo)
 */
export function combinarMaitri(natural: RelacaoNatural, temporal: RelacaoTemporal): NivelMaitri {
  if (natural === "amigo" && temporal === "amigo") return "adhi-mitra";
  if (natural === "neutro" && temporal === "amigo") return "mitra";
  if (natural === "inimigo" && temporal === "amigo") return "sama";
  if (natural === "amigo" && temporal === "inimigo") return "sama";
  if (natural === "neutro" && temporal === "inimigo") return "shatru";
  return "adhi-shatru"; // inimigo + inimigo
}

export function panchadhaMaitri(
  grahaA: ClassicalGraha,
  signA: ZodiacSign,
  grahaB: ClassicalGraha,
  signB: ZodiacSign,
): NivelMaitri {
  const natural = NAISARGIKA_MAITRI[grahaA][grahaB];
  const temporal = tatkalikaMaitri(signA, signB);
  return combinarMaitri(natural, temporal);
}

/**
 * Dignidade de um planeta num signo pela Panchadha Maitri: a relação do
 * planeta com o REGENTE do signo que ocupa (não consigo próprio — signo
 * próprio e exaltação continuam a tratar-se à parte, como no motor
 * antigo). Precisa da posição ACTUAL do regente nesta carta (a relação
 * temporal conta casas entre as duas posições reais, nunca entre o
 * planeta e o signo que o regente apenas governa) — por isso recebe
 * `posicoes`, o mapa completo de posições dos 7 grahas clássicos nesta
 * carta. `signRulers` é injectado para não duplicar
 * `lifeReport/signRulers.ts` nem depender de um ficheiro do motor antigo
 * a partir daqui.
 */
export function dignidadePanchadha(
  graha: ClassicalGraha,
  signoOcupado: ZodiacSign,
  signRulers: Record<ZodiacSign, ClassicalGraha>,
  posicoes: Record<ClassicalGraha, ZodiacSign>,
): NivelMaitri {
  const regente = signRulers[signoOcupado];
  if (regente === graha) throw new Error("dignidadePanchadha: planeta em signo próprio não se avalia por Panchadha Maitri — tratar como 'Own'/signo próprio antes de chamar esta função.");
  return panchadhaMaitri(graha, signoOcupado, regente, posicoes[regente]);
}
