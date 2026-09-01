import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import { construirPromptSeccao11Relogio, type DadosClienteV3 } from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

describe("construirPromptSeccao11Relogio — Secção 11, carta da Melina", () => {
  const melina: BirthInput = {
    utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
    latitude: -(23 + 33 / 60 + 9 / 3600),
    longitude: -(46 + 37 / 60 + 29 / 3600),
  };
  const camada = gerarCamadaA(melina, new Date(Date.UTC(2026, 7, 22)));
  const espinha = derivarEspinha(camada);
  const dados: DadosClienteV3 = {
    nomeCliente: "Melina",
    dataNascimentoFormatada: "11 de Dezembro de 1984",
    horaNascimentoFormatada: "08:30",
    localNascimento: "São Paulo, Brasil",
    residenciaActual: "São Paulo, Brasil",
    profissao: "Esteticista",
    mainQuestion: "Como é que eu faço para ganhar dinheiro?",
    situacaoDeclarada: "Como é que eu faço para ganhar dinheiro?",
  };
  const prompt = construirPromptSeccao11Relogio(camada, espinha, dados);

  it("apresenta as 4 camadas, por esta ordem — era, trânsitos lentos, trânsito anual, dasha", () => {
    const iEra = prompt.indexOf("Camada 1 — Era");
    const iLentos = prompt.indexOf("Camada 2 — Trânsitos lentos");
    const iAnual = prompt.indexOf("Camada 3 — Trânsito anual");
    const iDasha = prompt.indexOf("Camada 4 — Dasha actual");
    expect(iEra).toBeGreaterThan(-1);
    expect(iLentos).toBeGreaterThan(iEra);
    expect(iAnual).toBeGreaterThan(iLentos);
    expect(iDasha).toBeGreaterThan(iAnual);
  });

  it("Camada 1 (era) para a Melina identifica Plutão em contacto exacto com Vénus natal", () => {
    expect(prompt).toMatch(/SINAL: trânsito de era — Plutão em posição crítica: Pluto/);
    expect(prompt).toMatch(/SINAL: o ponto da tua carta que este momento activa: Venus/);
  });

  it("todas as 6 linhas de trânsito lento aparecem, cada uma com o seu nível de confiança", () => {
    for (const corpo of ["Saturn", "Uranus", "Neptune", "Pluto", "Rahu", "Ketu"]) {
      expect(prompt).toMatch(new RegExp(`trânsito lento — o que este período de anos pede: ${corpo}`));
    }
    // Plutão tem contacto exacto (Vénus, 0.4°) — nível sinal-forte; os outros 5, sem contacto, leitura.
    const plutoIdx = prompt.indexOf("trânsito lento — o que este período de anos pede: Pluto");
    const trechoAntes = prompt.slice(Math.max(0, plutoIdx - 200), plutoIdx);
    expect(trechoAntes).toMatch(/sinal-forte/);
  });

  it("Camada 3 (trânsito anual) usa Júpiter, sempre nível leitura", () => {
    expect(prompt).toMatch(/trânsito anual — o tema dominante deste ano: Jupiter/);
    expect(prompt).toMatch(/Camada 3 — Trânsito anual \(este ano\)\nNível de confiança: \*\*leitura\*\*\./);
  });

  it("Camada 4 (dasha) usa Ketu (mahadasha) e Jupiter (antardasha actual), nível sinal-forte fixo", () => {
    expect(prompt).toMatch(/Camada 4 — Dasha actual \(o período pessoal\)\nNível de confiança: \*\*sinal-forte\*\*/);
    expect(prompt).toMatch(/mahadasha\) — o que esta década pede: Ketu/);
    expect(prompt).toMatch(/antardasha\) — o que pede AGORA: Jupiter/);
  });

  it("Camada 4 nunca deixa a data futura substituir o presente — Regra 6 citada e aplicada", () => {
    expect(prompt).toMatch(/Regra 6 — o que vem a seguir NUNCA substitui o que já vale agora/);
    expect(prompt).toMatch(/começa um novo capítulo pessoal/);
  });

  it("nenhuma data COMPUTADA no corpo desce ao dia — só mês e ano (Regra 19a); a única excepção é o próprio exemplo negativo da regra, ali para o LLM saber o que NÃO fazer", () => {
    const semExemploDaRegra = prompt.replace(/"até Setembro de 2026", nunca "até 12 de Setembro de 2026"/, "");
    const datasComDia = semExemploDaRegra.match(/\b\d{1,2}\s+de\s+(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\b/gi);
    expect(datasComDia).toBeNull();
  });

  it("liga a espinha ao momento actual, sem repetir a frase literal fora do bloco da espinha", () => {
    expect(prompt).toMatch(/A espinha — mostrar como o momento actual se relaciona com ela, nunca repetir/);
    expect(prompt).toMatch(/pelo menos uma das quatro camadas acima deve ligar-se explicitamente a este tema central/i);
  });

  it("proíbe promessa de acontecimento e nomeia a distinção com O Plano", () => {
    expect(prompt).toMatch(/"vai acontecer" está proibido/);
    expect(prompt).toMatch(/não a antecipe aqui/);
  });

  it("cita as regras de escrita 2, 6, 13, 18, 19a", () => {
    for (const regra of ["Regra 2", "Regra 6", "Regra 13", "Regra 18", "Regra 19a"]) {
      expect(prompt).toContain(regra);
    }
  });
});
