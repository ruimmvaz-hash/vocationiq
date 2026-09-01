export type BhavaMadhyaBand = "Maxima" | "Media/Alta" | "Moderada/Baixa" | "Penumbra";

/** M-004 C-2/C-PRO-1 point 8. Linear (never cyclic) distance within the graha's own sign to the "peak" degree (the Ascendant's degree-in-sign, repeated in every house's sign). */
export function bhavaMadhyaDistance(grahaDegreeInSign: number, ascendantDegreeInSign: number): number {
  return Math.abs(grahaDegreeInSign - ascendantDegreeInSign);
}

export function bhavaMadhyaBand(distance: number): BhavaMadhyaBand {
  if (distance <= 5) return "Maxima";
  if (distance <= 10) return "Media/Alta";
  if (distance <= 15) return "Moderada/Baixa";
  return "Penumbra";
}
