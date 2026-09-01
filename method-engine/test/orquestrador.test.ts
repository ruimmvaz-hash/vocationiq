import { describe, expect, it } from "vitest";
import { gerarRelatorioV3 } from "../src/v3/orquestrador.js";
import type { BirthInput } from "../src/lifeReport/types.js";
import type { DadosClienteV3 } from "../src/v3/prompt-v3.js";

const melina: BirthInput = {
  utcDate: new Date(Date.UTC(1984, 11, 11, 11, 30, 0)),
  latitude: -(23 + 33 / 60 + 9 / 3600),
  longitude: -(46 + 37 / 60 + 29 / 3600),
};

const dados: DadosClienteV3 = {
  nomeCliente: "Melina",
  dataNascimentoFormatada: "11 de Dezembro de 1984",
  horaNascimentoFormatada: "08:30",
  localNascimento: "São Paulo, Brasil",
  residenciaActual: "São Paulo, Brasil",
  profissao: "Gestora",
  mainQuestion: "Devo mudar de carreira agora?",
  situacaoDeclarada: "Devo mudar de carreira agora?",
};

/**
 * Mock de chamarLLM para o dry-run — nunca chama uma API real. "Inteligente"
 * o suficiente para satisfazer os validadores de código puro de cada
 * secção (contagem de parágrafos, bloco "o que não fazer") lendo pistas
 * do próprio prompt — o mesmo texto que um LLM real leria — em vez de um
 * placeholder fixo que esgotaria sempre as tentativas.
 */
async function chamarLLMMock(prompt: string): Promise<string> {
  const nLinhasRetrato = (prompt.match(/### Linha \d+ de 9/g) ?? []).length;
  if (nLinhasRetrato > 0) {
    return Array.from({ length: nLinhasRetrato }, (_, i) => `Linha de teste número ${i + 1}, texto placeholder suficientemente longo.`).join("\n\n");
  }
  const nCandidatas = (prompt.match(/### Candidata a descoberta \d+/g) ?? []).length;
  if (nCandidatas > 0) {
    return Array.from({ length: nCandidatas }, (_, i) => `Descoberta de teste número ${i + 1}, texto placeholder suficientemente longo.`).join("\n\n");
  }
  if (prompt.includes('secção "O Plano"')) {
    return "Introdução de teste.\n\nTabela de teste.\n\nMenu de teste.\n\nO que não fazer: nada de especial neste dry-run.";
  }
  if (prompt.includes('secção "O Custo de Não Fazer Nada"')) {
    return "Primeiro parágrafo de teste sobre o custo de não fazer nada.\n\nSegundo parágrafo de teste, a fechar.";
  }
  return "Texto placeholder de teste, gerado pelo mock, para uma secção de prosa livre qualquer.";
}

describe("gerarRelatorioV3 — teste de integração, dry-run com a Melina (chamarLLM mockado, nunca a API real)", () => {
  it("gera um ResultadoMotorV3 com a estrutura correcta, sem erros de tipo, sem checkpointDir", async () => {
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMMock });

    expect(resultado.relatorio).toBeDefined();
    expect(Array.isArray(resultado.warnings)).toBe(true);
    expect(Array.isArray(resultado.guardIssues)).toBe(true);
    expect(typeof resultado.tempoGeracao).toBe("number");
    expect(resultado.tempoGeracao).toBeGreaterThanOrEqual(0);
  });

  it("a sequência de secções está correcta — todas as obrigatórias preenchidas, na forma esperada", async () => {
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMMock });
    const r = resultado.relatorio;

    expect(r.abertura.nomeCliente).toBe("Melina");
    expect(r.retrato60s.linhas).toHaveLength(9);
    expect(r.retrato60s.linhas.every((l) => l.texto.length > 0 && l.seccaoReferencia.length > 0)).toBe(true);
    expect(r.cincoDescobertas.length).toBeGreaterThan(0);
    expect(r.cincoDescobertas.every((d) => d.texto.length > 0)).toBe(true);
    expect(r.veredicto.resposta.length).toBeGreaterThan(0);
    expect(r.veredicto.razoes.length).toBeGreaterThanOrEqual(2);
    expect(r.quemEs.length).toBeGreaterThan(0);
    expect(r.formaDeVida.length).toBeGreaterThan(0);
    expect(r.dinheiro.length).toBeGreaterThan(0);
    expect(r.comoEsVista.length).toBeGreaterThan(0);
    expect(r.oRelogio.length).toBeGreaterThan(0);
    expect(r.oPlano).toMatch(/o que não fazer/i);
    expect(r.custoDeNaoFazerNada.split(/\n\s*\n/).filter((p) => p.trim())).toHaveLength(2);
    expect(r.anexoA?.length).toBeGreaterThan(0);
  });

  it("as secções condicionais são activadas correctamente para a Melina (pergunta de carreira, carta com trânsitos e figuras activas)", async () => {
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMMock });
    const r = resultado.relatorio;

    // Confirmado por dry-run directo às funções de prompt-v3.ts, antes de
    // escrever este ficheiro: para a Melina + esta pergunta, as 4 secções
    // condicionais (6, 7, 10, 14) estão todas activas.
    expect(r.oQueTeTemTravado).toBeDefined();
    expect(r.transitoActual).toBeDefined();
    expect(r.sobreOQueEEmQueForma).toBeDefined();
    expect(r.umaUltimaCoisa).toBeDefined();
    expect(r.seccoesCondicionaisActivas).toEqual(
      expect.arrayContaining(["Secção 6 — O Que Te Tem Travado", "Secção 7 — O Trânsito Actual", "Secção 10 — Sobre o Quê e Em Que Forma", "Secção 14 — Uma Última Coisa"])
    );
  });

  it("as secções condicionais são desactivadas correctamente quando a pergunta não sustenta a Secção 10", async () => {
    const dadosSemVocacao: DadosClienteV3 = { ...dados, mainQuestion: "Como está o meu ano?", situacaoDeclarada: "Como está o meu ano?" };
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados: dadosSemVocacao }, { chamarLLM: chamarLLMMock });
    const r = resultado.relatorio;

    expect(r.sobreOQueEEmQueForma).toBeUndefined();
    expect(r.seccoesCondicionaisActivas).not.toContain("Secção 10 — Sobre o Quê e Em Que Forma");
  });

  it("o Anexo B é construído deterministicamente (mesmos dados, mesmo Anexo B, sem chamar o LLM)", async () => {
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMMock });
    const anexoB = resultado.relatorio.anexoB!;
    expect(anexoB).toBeDefined();
    expect(anexoB.rodaCasas).toMatch(/^<svg/);
    expect(anexoB.sarvashtakavarga).toHaveLength(12);
    expect(anexoB.figurasFechadas.length).toBeGreaterThan(0);
  });

  it("sem chamarLLM nenhum, completa na mesma (nunca bloqueia) — todas as secções ficam vazias, registadas em warnings e guardIssues", async () => {
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados });
    expect(resultado.relatorio).toBeDefined();
    expect(resultado.warnings.length).toBeGreaterThan(0);
    expect(resultado.guardIssues.length).toBeGreaterThan(0);
    expect(resultado.warnings.some((w) => w.includes("sem chamarLLM disponível"))).toBe(true);
    expect(resultado.relatorio.quemEs).toBe("");
  });

  it("a verificação final regista críticas em warnings, nunca bloqueia a entrega (relatório sempre devolvido)", async () => {
    // O mock não escreve prosa Naveya-válida (não tem "termo — definição"),
    // por isso o Critério E/vocabularioProibido nem sequer dispara aqui
    // (não usa jargão nenhum) — mas outras verificações estruturais podem
    // reprovar; o ponto do teste é que a função NUNCA lança e SEMPRE
    // devolve um relatório completo, reprovações incluídas em warnings.
    const resultado = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMMock });
    expect(resultado.relatorio).toBeDefined();
    expect(Array.isArray(resultado.warnings)).toBe(true);
  });

  it("com checkpointDir, a segunda corrida reaproveita os checkpoints e não regenera (mock chamado menos vezes)", async () => {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "naveya-v3-checkpoint-"));
    let chamadas = 0;
    const chamarLLMContador = async (prompt: string): Promise<string> => {
      chamadas++;
      return chamarLLMMock(prompt);
    };

    await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMContador, checkpointDir: dir });
    const chamadasPrimeiraCorrida = chamadas;
    expect(chamadasPrimeiraCorrida).toBeGreaterThan(0);

    chamadas = 0;
    const resultado2 = await gerarRelatorioV3({ natal: melina, atDate: new Date(Date.UTC(2026, 7, 22)), dados }, { chamarLLM: chamarLLMContador, checkpointDir: dir });
    expect(chamadas).toBe(0); // tudo veio do checkpoint, nada foi regenerado
    expect(resultado2.relatorio.quemEs.length).toBeGreaterThan(0);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
