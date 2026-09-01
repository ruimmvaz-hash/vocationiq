import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import {
  construirPromptSeccao1Retrato60s,
  construirPromptSeccao2CincoDescobertas,
  construirPromptSeccao3Veredicto,
  construirPromptSeccao4QuemEs,
  construirPromptSeccao5FormaDeVida,
  construirPromptSeccao6OQueTeTemTravado,
  construirPromptSeccao7TransitoActual,
  construirPromptSeccao8Dinheiro,
  construirPromptSeccao9ComoEsVista,
  construirPromptSeccao10SobreOQue,
  construirPromptSeccao11Relogio,
  construirPromptSeccao12Plano,
  construirPromptSeccao13Custo,
  construirPromptSeccao14UltimaCoisa,
  construirPromptAnexoA,
  type DadosClienteV3,
} from "../src/v3/prompt-v3.js";
import type { BirthInput } from "../src/lifeReport/types.js";

// CORRECÇÃO 23/08/2026 (primeiro relatório real, Alice Amorim) — a
// Secção 7 gerada para a Alice usou "você" em vez de "tu". Causa: nenhum
// prompt tinha uma instrução explícita de pronome, e a linha de abertura
// de todos os prompts ("Você és o redactor...") usava "você" para se
// dirigir ao modelo, o que arriscava contaminar o registo do texto
// gerado para o cliente. Corrigido em dois níveis: (1) cada prompt ganhou
// uma secção "## Pronome" explícita; (2) toda a linguagem "você" restante
// nos próprios prompts (a linha de abertura, o SINAL da Secção 7) foi
// trocada para "tu". Este ficheiro confirma os dois níveis, para as 14
// secções + Anexo A.
describe("Regra de pronome 'tu' — todos os prompts do v3, carta da Melina", () => {
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

  const veredicto = "resposta de teste, texto placeholder para a secção 12/13 dependerem de algo.";
  const relogio = "texto de teste do relógio, placeholder para a secção 12/13 dependerem de algo.";
  const plano = "texto de teste do plano, placeholder para a secção 13 depender de algo.";

  const prompts: Record<string, string | null> = {
    seccao1: construirPromptSeccao1Retrato60s(camada, espinha, dados),
    seccao2: construirPromptSeccao2CincoDescobertas(camada, espinha, dados),
    seccao3: construirPromptSeccao3Veredicto(camada, espinha, dados),
    seccao4: construirPromptSeccao4QuemEs(camada, espinha, dados),
    seccao5: construirPromptSeccao5FormaDeVida(camada, espinha, dados),
    seccao6: construirPromptSeccao6OQueTeTemTravado(camada, espinha, dados),
    seccao7: construirPromptSeccao7TransitoActual(camada, espinha, dados),
    seccao8: construirPromptSeccao8Dinheiro(camada, espinha, dados),
    seccao9: construirPromptSeccao9ComoEsVista(camada, espinha, dados),
    seccao10: construirPromptSeccao10SobreOQue(camada, espinha, dados),
    seccao11: construirPromptSeccao11Relogio(camada, espinha, dados),
    seccao12: construirPromptSeccao12Plano(camada, espinha, dados, veredicto, relogio),
    seccao13: construirPromptSeccao13Custo(camada, espinha, dados, veredicto, plano),
    seccao14: construirPromptSeccao14UltimaCoisa(camada, espinha, dados),
    anexoA: construirPromptAnexoA(camada, espinha, dados),
  };

  const gerados = Object.entries(prompts).filter((entry): entry is [string, string] => entry[1] !== null);

  it("gerou pelo menos as 10 secções obrigatórias + Anexo A (confirma que o fixture da Melina não ficou todo nulo)", () => {
    expect(gerados.length).toBeGreaterThanOrEqual(11);
  });

  it.each(gerados)("%s — contém a regra explícita 'tu, nunca você'", (_nome, prompt) => {
    expect(prompt).toContain('Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.');
  });

  it.each(gerados)("%s — 'você' só aparece dentro da própria regra, nunca em nenhum outro sítio do prompt", (_nome, prompt) => {
    const semARegra = prompt.replace('Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.', "");
    expect(semARegra).not.toMatch(/\bvocê\b/i);
  });

  it.each(gerados)("%s — abre com 'Tu és o redactor', nunca 'Você é o redactor'", (_nome, prompt) => {
    expect(prompt).toMatch(/^Tu és o redactor/);
  });
});
