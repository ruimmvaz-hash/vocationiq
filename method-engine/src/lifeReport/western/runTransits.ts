import { computeTransits } from "./transits";
import { fmtDeg } from "../format";

function report(name: string, natal: Parameters<typeof computeTransits>[0], transitDate: Date) {
  const t = computeTransits(natal, transitDate);
  console.log(`\n=== ${name} — trânsitos em ${transitDate.toISOString().slice(0, 10)} ===`);
  for (const key of ["saturn", "jupiter"] as const) {
    const p = t[key];
    const aspects = p.aspectsToNatal.map((a) => `${a.aspect} ${a.to} ${fmtDeg(a.orb)}`).join("; ");
    console.log(`${key}: ${p.sign} ${fmtDeg(p.degreeInSign)}, casa natal ${p.natalHouse} | ${aspects || "(sem aspectos duros em 2°)"}`);
  }
}

report("Rui Vaz", { utcDate: new Date(Date.UTC(1978, 1, 14, 19, 0, 0)), latitude: 38.7169, longitude: -9.1399 }, new Date("2026-07-25T12:00:00Z"));
report("Alice Amorim", { utcDate: new Date(Date.UTC(1983, 0, 10, 14, 2, 0)), latitude: -8.839, longitude: 13.2894 }, new Date("2026-07-24T12:00:00Z"));
