// FASE 1 — dignidade completa por planeta: a camada clássica fixa
// (exaltação/queda/domicílio/Moolatrikona, reaproveitada de
// `data/dignity.ts`, sem alteração a esse ficheiro) mais a Panchadha
// Maitri (v3, quando o planeta não está em signo próprio/exaltado/caído).
import { vedicDignityWithDegree, nodeDignityFromDispositor, type DignityDetail, type VedicPlanet } from "../data/dignity";
import { SIGN_RULERS } from "../lifeReport/signRulers";
import { CLASSICAL_GRAHAS, type ClassicalGraha } from "../lifeReport/types";
import type { ZodiacSign } from "../data/tables";
import { dignidadePanchadha, type NivelMaitri } from "./panchadhaMaitri";

export interface DignidadeCompleta {
  /** Exalted/Debilitated/Own/Moolatrikona/Friend/Enemy/Neutral — classificação clássica fixa (data/dignity.ts). */
  classica: DignityDetail;
  /**
   * Panchadha Maitri (v3) — só definido quando `classica` é Friend/Enemy/
   * Neutral (i.e., o planeta não está em signo próprio, exaltado ou em
   * Moolatrikona, onde a relação com o regente não se aplica).
   */
  panchadha: NivelMaitri | null;
}

/** Para os 7 grahas clássicos — a Panchadha Maitri entra sempre que a classificação clássica não for Own/Exalted/Moolatrikona/Debilitated. */
export function dignidadeCompleta(
  graha: ClassicalGraha,
  sign: ZodiacSign,
  degreeInSign: number,
  posicoesSigno: Record<ClassicalGraha, ZodiacSign>,
): DignidadeCompleta {
  const classica = vedicDignityWithDegree(graha as VedicPlanet, sign, degreeInSign);
  const semPanchadha: DignityDetail[] = ["Own", "Exalted", "Debilitated", "Moolatrikona"];
  if (semPanchadha.includes(classica)) return { classica, panchadha: null };
  return { classica, panchadha: dignidadePanchadha(graha, sign, SIGN_RULERS, posicoesSigno) };
}

/**
 * Rahu e Ketu — SPEC-003 v2 (Decisão 2): para o Life Report (ao contrário
 * do Snapshot, que ainda usa a linha própria de Rahu em DIGNITY_TABLE),
 * ambos os nós usam a convenção do dispositor (`nodeDignityFromDispositor`
 * sobre a dignidade do regente do signo que o nó ocupa) — nunca uma linha
 * de tabela própria. Sem Panchadha Maitri (os nós não entram em
 * NAISARGIKA_MAITRI, que é definida só para os 7 grahas clássicos).
 */
export function dignidadeNodo(sign: ZodiacSign, posicoesSigno: Record<ClassicalGraha, ZodiacSign>): DignidadeCompleta {
  const regente = SIGN_RULERS[sign];
  const dispositorSign = posicoesSigno[regente];
  const dispositorDignity = vedicDignityWithDegree(regente as VedicPlanet, dispositorSign, 0);
  return { classica: nodeDignityFromDispositor(dispositorDignity), panchadha: null };
}

export function dignidadesTodas(
  posicoes: Record<ClassicalGraha, { sign: ZodiacSign; degreeInSign: number }>,
): Record<ClassicalGraha, DignidadeCompleta> {
  const posicoesSigno = Object.fromEntries(CLASSICAL_GRAHAS.map((g) => [g, posicoes[g].sign])) as Record<ClassicalGraha, ZodiacSign>;
  const out = {} as Record<ClassicalGraha, DignidadeCompleta>;
  for (const g of CLASSICAL_GRAHAS) {
    out[g] = dignidadeCompleta(g, posicoes[g].sign, posicoes[g].degreeInSign, posicoesSigno);
  }
  return out;
}
