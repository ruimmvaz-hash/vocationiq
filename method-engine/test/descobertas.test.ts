import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { gerarDescobertasCandidatas } from "../src/v3/descobertas.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("gerarDescobertasCandidatas — carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
  const espinha = derivarEspinha(camada);
  const { candidatas, avisos } = gerarDescobertasCandidatas(camada, espinha);

  it("produz 5 candidatas distintas para esta carta (rica em sinais)", () => {
    expect(candidatas).toHaveLength(5);
    expect(avisos).toHaveLength(0);
  });

  it("a primeira candidata é sempre a espinha em acção", () => {
    expect(candidatas[0].fonteInterna).toMatch(/espinha/);
    expect(candidatas[0].nivel).toBe("convergencia-forte");
  });

  it("nenhuma das restantes 4 repete INTEIRAMENTE o tema da espinha (regra 4 do v2), mas podem partilhar planeta/casa entre si — são ângulos diferentes, não o mesmo dado", () => {
    const casasDaEspinha = new Set(candidatas[0].casasEnvolvidas);
    for (const c of candidatas.slice(1)) {
      const repeteInteiramente = c.casasEnvolvidas.every((casa) => casasDaEspinha.has(casa));
      expect(repeteInteiramente).toBe(false);
    }
    // as 5 fontes internas são todas diferentes entre si — é isso que garante que são ângulos distintos, não a exclusividade de casa.
    const fontes = candidatas.map((c) => c.fonteInterna.split(" (")[0]);
    expect(new Set(fontes).size).toBe(fontes.length);
  });

  it("os níveis de confiança vêm ordenados (2ª-5ª por força, nunca a esmo)", () => {
    for (let i = 2; i < candidatas.length; i++) {
      const ordem = { "convergencia-forte": 3, "sinal-forte": 2, leitura: 1, "em-aberto": 0 };
      expect(ordem[candidatas[i - 1].nivel]).toBeGreaterThanOrEqual(ordem[candidatas[i].nivel]);
    }
  });

  it("todos os sinais têm SINAL/DEFINIÇÃO NAVEYA/INSTRUÇÃO — o termo técnico vem sempre com a definição a seguir (correcção 23/08/2026: termos são permitidos, nunca sem definição)", () => {
    for (const c of candidatas) {
      for (const s of c.sinais) {
        expect(s.definicaoNaveya.length).toBeGreaterThan(0);
        expect(s.termoParaTexto).not.toBeNull();
        expect(s.instrucao).toMatch(/seguido de " — " e a definição Naveya/);
      }
    }
  });
});
