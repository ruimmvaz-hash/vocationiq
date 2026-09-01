import type { ClassicalGraha } from "../types";
import type { WesternResult } from "./westernTable";

// M-008 Módulo V — configurações globais (DEC-033). Detectadas a partir
// dos aspectos já calculados em westernTable.ts (Grand Trine/T-Square
// reaproveitam as entradas "Trigono"/"Oposicao"/"Quadratura" já
// presentes); o quincúncio (150°, usado só no Yod) não faz parte do
// grid de aspectos clássicos do motor, por isso é calculado aqui
// directamente a partir das longitudes tropicais.

export interface GlobalConfigHit {
  id: string;
  label: string;
  detail: string;
  planets: ClassicalGraha[];
}

const QUINCUNX_ORB = 3;

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function hasAspect(western: WesternResult, a: ClassicalGraha, b: ClassicalGraha, aspectName: string): boolean {
  return western.planets[a].aspects.some((asp) => asp.to === b && asp.hit.aspect === aspectName);
}

export function detectGlobalConfigurations(western: WesternResult): GlobalConfigHit[] {
  const hits: GlobalConfigHit[] = [];
  const planets = Object.keys(western.planets) as ClassicalGraha[];

  // ── Grand Trine — três planetas em trígono mútuo ────────────────────
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        const [a, b, c] = [planets[i], planets[j], planets[k]];
        if (hasAspect(western, a, b, "Trigono") && hasAspect(western, b, c, "Trigono") && hasAspect(western, a, c, "Trigono")) {
          hits.push({
            id: `grand_trine_${a}_${b}_${c}`,
            label: "Grande Trígono",
            detail: `${a}, ${b} e ${c} em trígono mútuo — dom natural integrado e fluido; risco de estagnação por zona de conforto.`,
            planets: [a, b, c],
          });
        }
      }
    }
  }

  // ── T-Square — dois planetas em oposição + um terceiro em quadratura a ambos ──
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const [a, b] = [planets[i], planets[j]];
      if (!hasAspect(western, a, b, "Oposicao")) continue;
      for (const focus of planets) {
        if (focus === a || focus === b) continue;
        if (hasAspect(western, focus, a, "Quadratura") && hasAspect(western, focus, b, "Quadratura")) {
          hits.push({
            id: `t_square_${a}_${b}_${focus}`,
            label: "T-Square",
            detail: `Oposição entre ${a} e ${b}, com ${focus} em quadratura a ambos (planeta foco) — a tensão descarrega-se em acção através de ${focus}.`,
            planets: [a, b, focus],
          });
        }
      }
    }
  }

  // ── Yod — dois planetas em sextil + um terceiro em quincúncio (150°) a ambos ──
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const [a, b] = [planets[i], planets[j]];
      if (!hasAspect(western, a, b, "Sextil")) continue;
      for (const apex of planets) {
        if (apex === a || apex === b) continue;
        const orbA = Math.abs(angularSeparation(western.planets[apex].longitude, western.planets[a].longitude) - 150);
        const orbB = Math.abs(angularSeparation(western.planets[apex].longitude, western.planets[b].longitude) - 150);
        if (orbA <= QUINCUNX_ORB && orbB <= QUINCUNX_ORB) {
          hits.push({
            id: `yod_${a}_${b}_${apex}`,
            label: "Yod (Dedo de Deus)",
            detail: `Sextil entre ${a} e ${b}, com ${apex} em quincúncio a ambos (planeta ápice) — missão específica que exige mudança de rota.`,
            planets: [a, b, apex],
          });
        }
      }
    }
  }

  // ── Stellium — 3+ planetas no mesmo signo, ou 3+ na mesma casa ──────
  const bySign = new Map<string, ClassicalGraha[]>();
  const byHouse = new Map<number, ClassicalGraha[]>();
  for (const p of planets) {
    const row = western.planets[p];
    bySign.set(row.sign, [...(bySign.get(row.sign) ?? []), p]);
    byHouse.set(row.house, [...(byHouse.get(row.house) ?? []), p]);
  }
  for (const [sign, group] of bySign) {
    if (group.length >= 3) {
      hits.push({ id: `stellium_sign_${sign}`, label: "Stellium (signo)", detail: `${group.join(", ")} concentrados no mesmo signo (${sign}) — tema dominante, risco de desequilíbrio por descurar o resto.`, planets: group });
    }
  }
  for (const [house, group] of byHouse) {
    if (group.length >= 3) {
      hits.push({ id: `stellium_house_${house}`, label: "Stellium (casa)", detail: `${group.join(", ")} concentrados na mesma casa (${house}) — área da vida dominada por este tema.`, planets: group });
    }
  }

  return hits;
}
