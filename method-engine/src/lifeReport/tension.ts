import type { Avastha } from "./avasthaBaladi";
import type { CombustionType } from "../astrology/combustion";

export interface TensionInput {
  vedicDignityScore: number | null;
  avasthaState: Avastha | null;
  combustionType: CombustionType | null;
}

export interface TensionFlags {
  tensaoInterna: boolean;
  tensaoEntre: string[];
}

const TERMINAL_AVASTHAS: Avastha[] = ["Vriddha", "Mrita"];
const SUPPRESSIVE_COMBUSTION: CombustionType[] = ["standard", "lua_nova"];

/**
 * SPEC-004 (Passo 4, Parte B) — a v2 original (SPEC-003, Decisão 1) tinha
 * um terceiro gatilho ("dignidade baixa com Cazimi OU com dignidade
 * ocidental alta"), removido nesta revisão por duas razões:
 *
 * 1. Não é uma OPOSIÇÃO — é reforço simples. Os gatilhos 1/2 são
 *    genuinamente contraditórios (capacidade real que existe mas não se
 *    manifesta: dignidade alta + supressão/Avastha terminal). O antigo
 *    gatilho 3 descrevia o inverso — uma limitação estrutural (dignidade
 *    baixa) somada a um reforço externo (Cazimi) — as duas coisas
 *    apontam na MESMA direcção (o planeta funciona melhor do que a
 *    dignidade base sugeria), não em direcções opostas. Não há nada para
 *    reconciliar; é só um facto composto, sem marca de tensão nenhuma.
 * 2. A metade "dignidade baixa + ocidental alta" ficou redundante com a
 *    instrução dedicada de `western_dignity_label` (SPEC-004 Parte B,
 *    campo 4), que já cobre toda a divergência védico/ocidental com um
 *    limiar mais preciso (forte/moderada/coincidência) do que este
 *    gatilho cru alguma vez teve.
 *
 * `tensao_interna` marca a tensão como DADO, não como síntese: o motor
 * não escreve a frase "está exaltado mas combusto", só assinala que dois
 * factores já calculados se contradizem (tensaoEntre) e deixa o agente
 * escrever a resolução com o contexto da casa e do mapa, que só ele tem.
 * Sem a marca, o agente escreve os dois factos em frases separadas e a
 * tensão desaparece.
 *
 * Dois gatilhos (OR, não mutuamente exclusivos — um graha pode acumular
 * os dois em simultâneo):
 *  1. dignidade védica alta (score >= 5) com combustão SUPRESSIVA activa
 *     (standard ou lua_nova).
 *  2. dignidade védica alta (score >= 5) com Avastha terminal
 *     (Vriddha ou Mrita).
 */
export function computeTensionFlags(input: TensionInput): TensionFlags {
  const { vedicDignityScore, avasthaState, combustionType } = input;
  const factors = new Set<string>();

  const highDignity = vedicDignityScore !== null && vedicDignityScore >= 5;

  if (highDignity && combustionType !== null && SUPPRESSIVE_COMBUSTION.includes(combustionType)) {
    factors.add("vedic_dignity");
    factors.add("combustion");
  }
  if (highDignity && avasthaState !== null && TERMINAL_AVASTHAS.includes(avasthaState)) {
    factors.add("vedic_dignity");
    factors.add("avastha");
  }

  return { tensaoInterna: factors.size > 0, tensaoEntre: Array.from(factors) };
}
