import { assignArchetype, type EngineWeights, type Profile } from "../engine/archetypeEngine";
import { ARCHETYPE_MATRIX, MOTOR_TABLE, WEIGHTS, type ArchetypeName, type MotorName } from "../data/tables";
import { FIRST_NAMES, LAST_NAMES } from "./names";
import { mulberry32, pick, randomBirthDate } from "./random";

export const ALL_ARCHETYPES: ArchetypeName[] = Object.values(ARCHETYPE_MATRIX).flatMap((byModality) =>
  Object.values(byModality),
);

export const ALL_MOTORS: MotorName[] = Object.values(MOTOR_TABLE);

export interface SimulationOptions {
  count: number;
  seed: number;
  minYear: number;
  maxYear: number;
  weights?: EngineWeights;
}

export interface SimulationResult {
  count: number;
  weights: EngineWeights;
  archetypeCounts: Record<ArchetypeName, number>;
  motorCounts: Record<MotorName, number>;
  displacedCount: number;
  profiles: Profile[];
}

export function generateRandomProfiles(rng: () => number, count: number, minYear: number, maxYear: number): Profile[] {
  const profiles: Profile[] = [];
  for (let i = 0; i < count; i++) {
    const fullName = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    const birthDate = randomBirthDate(rng, { minYear, maxYear });
    profiles.push({ birthDate, fullName });
  }
  return profiles;
}

export function runSimulation(options: SimulationOptions): SimulationResult {
  const { count, seed, minYear, maxYear, weights = WEIGHTS } = options;
  const rng = mulberry32(seed);
  const profiles = generateRandomProfiles(rng, count, minYear, maxYear);

  const archetypeCounts = Object.fromEntries(ALL_ARCHETYPES.map((a) => [a, 0])) as Record<ArchetypeName, number>;
  const motorCounts = Object.fromEntries(ALL_MOTORS.map((m) => [m, 0])) as Record<MotorName, number>;
  let displacedCount = 0;

  for (const profile of profiles) {
    const result = assignArchetype(profile, weights);
    archetypeCounts[result.archetype]++;
    motorCounts[result.motor]++;
    if (result.details.displaced) displacedCount++;
  }

  return { count, weights, archetypeCounts, motorCounts, displacedCount, profiles };
}
