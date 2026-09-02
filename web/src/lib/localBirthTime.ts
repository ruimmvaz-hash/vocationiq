import { DateTime } from "luxon";

/**
 * Converte a data+hora local de nascimento (do formulário) + um fuso
 * IANA já resolvido (por reportGeo.ts) na instância UTC que o motor
 * astrológico precisa (`BirthInput.utcDate`). Portado do
 * naveya/web/src/lib/geo.ts — usa luxon para aplicar as regras de
 * DST/offset históricas da data de nascimento, não as de hoje.
 */
export function localBirthTimeToUtc(birthDate: { day: number; month: number; year: number }, birthTime: string, timezone: string): Date | null {
  const [hour, minute] = birthTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  const dt = DateTime.fromObject({ year: birthDate.year, month: birthDate.month, day: birthDate.day, hour, minute }, { zone: timezone });
  if (!dt.isValid) return null;
  return dt.toJSDate();
}
