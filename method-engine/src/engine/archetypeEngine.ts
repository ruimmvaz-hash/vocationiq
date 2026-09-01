import { calculateLifePath, type BirthDate } from "../numerology/lifePath";
import { calculateExpressionNumber } from "../numerology/expression";
import { calculateSunSign } from "../astrology/sunSign";
import {
  ARCHETYPE_MATRIX,
  MOTOR_TABLE,
  NUMBER_TABLE,
  SIGN_TABLE,
  WEIGHTS,
  type ArchetypeName,
  type Element,
  type ElementModality,
  type Modality,
  type MotorName,
  type ZodiacSign,
} from "../data/tables";

export interface Profile {
  birthDate: BirthDate;
  fullName: string;
}

export interface AssignmentResult {
  archetype: ArchetypeName;
  motor: MotorName;
  voice: MotorName;
  details: {
    sunSign: ZodiacSign;
    lifePath: number;
    expressionNumber: number;
    element: Element;
    modality: Modality;
    /** DEC-023: the archetype the Sun sign alone would give, exposed so the reading can acknowledge it even when displaced. */
    solArchetype: ArchetypeName;
    displaced: boolean;
  };
}

interface Vote<T extends string> {
  value: T;
  weight: number;
}

/**
 * Weighted-plurality winner. On a tie for the top score, the value cast by
 * the `tieBreakValue` voter prevails — M-002 §3.2 "Empate → prevalece o
 * signo solar".
 */
function pickWinner<T extends string>(votes: Vote<T>[], tieBreakValue: T): T {
  const scores = new Map<T, number>();
  for (const { value, weight } of votes) {
    scores.set(value, (scores.get(value) ?? 0) + weight);
  }
  const maxScore = Math.max(...scores.values());
  const winners = [...scores.entries()]
    .filter(([, score]) => score === maxScore)
    .map(([value]) => value);
  return winners.length === 1 ? winners[0] : tieBreakValue;
}

export interface EngineWeights {
  sunSign: number;
  lifePath: number;
  expression: number;
}

/**
 * Assigns {archetype, motor, voice} per M-002 §3 (v0.4, DEC-018) and §5/§6
 * (motor/voice from Life Path / Expression numbers).
 *
 * Element is always the Sun sign's element (no vote). Modality is decided by
 * a weighted vote between Sun, Life Path, and Expression (`weights` defaults
 * to the spec's 4/3/2, overridable for calibration experiments).
 */
export function assignArchetype(profile: Profile, weights: EngineWeights = WEIGHTS): AssignmentResult {
  const sunSign = calculateSunSign(profile.birthDate);
  const lifePath = calculateLifePath(profile.birthDate);
  const expressionNumber = calculateExpressionNumber(profile.fullName);

  const sunEM: ElementModality = SIGN_TABLE[sunSign];
  const lifePathEM: ElementModality = NUMBER_TABLE[lifePath];
  const expressionEM: ElementModality = NUMBER_TABLE[expressionNumber];

  const modalityVotes: Vote<Modality>[] = [
    { value: sunEM.modality, weight: weights.sunSign },
    { value: lifePathEM.modality, weight: weights.lifePath },
    { value: expressionEM.modality, weight: weights.expression },
  ];

  const element: Element = sunEM.element;
  const modality = pickWinner(modalityVotes, sunEM.modality);

  const archetype = ARCHETYPE_MATRIX[element][modality];
  const solArchetype = ARCHETYPE_MATRIX[sunEM.element][sunEM.modality];

  return {
    archetype,
    motor: MOTOR_TABLE[lifePath],
    voice: MOTOR_TABLE[expressionNumber],
    details: {
      sunSign,
      lifePath,
      expressionNumber,
      element,
      modality,
      solArchetype,
      displaced: archetype !== solArchetype,
    },
  };
}
