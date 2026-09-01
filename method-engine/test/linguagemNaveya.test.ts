import { describe, expect, it } from "vitest";
import { traduzirSinal, formatarSinalParaPrompt, serializarSinal } from "../src/v3/linguagem-naveya.js";

describe("linguagem-naveya", () => {
  it("traduz um graha simples", () => {
    expect(traduzirSinal("Saturn", "posição natal")).toMatch(/estrutura|tempo|disciplina/);
  });

  it("compõe Atmakaraka em Saturno como no exemplo do pedido", () => {
    const texto = traduzirSinal("Saturn", "Atmakaraka");
    expect(texto).toMatch(/alma/);
    expect(texto).toMatch(/atalhos/);
  });

  it("traduz uma casa", () => {
    expect(traduzirSinal("casa-10", "casa")).toMatch(/carreira/);
  });

  it("traduz um grau de Panchadha Maitri", () => {
    expect(traduzirSinal("adhi-mitra", "dignidade")).toMatch(/aliado/);
  });

  it("devolve null para um termo não catalogado, nunca inventa", () => {
    expect(traduzirSinal("Neechabhanga", "yoga")).toBeNull();
  });

  it("traduz os 3 corpos ocidentais lentos (Urano/Neptuno/Plutão), usados só em trânsito — gap encontrado ao construir a Secção 11", () => {
    expect(traduzirSinal("Uranus", "trânsito lento")).toMatch(/ruptura|molde/);
    expect(traduzirSinal("Neptune", "trânsito lento")).toMatch(/dissolução|limites/);
    expect(traduzirSinal("Pluto", "trânsito lento")).toMatch(/transformação|morrer/);
  });

  it("aplica o papel de trânsito também aos corpos ocidentais, tal como aos grahas", () => {
    const texto = traduzirSinal("Pluto", "trânsito de era");
    expect(texto).toMatch(/o que está agora a activar-se é isto/);
  });

  it("formata o bloco de 3 partes exigido pela regra absoluta", () => {
    const sinal = formatarSinalParaPrompt("Saturn", "Atmakaraka");
    expect(sinal).not.toBeNull();
    const texto = serializarSinal(sinal!);
    expect(texto).toContain("SINAL:");
    expect(texto).toContain("DEFINIÇÃO NAVEYA:");
    expect(texto).toContain("INSTRUÇÃO:");
    expect(texto).not.toMatch(/nunca escrever "Saturno"/i); // a instrução é genérica, não hardcoded ao termo
  });

  // CORRECÇÃO GLOBAL, 23/08/2026 — a regra "zero termos técnicos" foi
  // revogada: termos astrológicos são permitidos no texto do cliente,
  // sempre acompanhados da definição Naveya, formato "termo — definição".

  it("um sinal de graha agora EXIGE mostrar o termo em português, seguido da definição", () => {
    const sinal = formatarSinalParaPrompt("Saturn", "posição natal")!;
    expect(sinal.termoParaTexto).toBe("Saturno"); // nome em português, não a chave inglesa "Saturn"
    expect(sinal.instrucao).toMatch(/Escrever sempre o termo técnico — «Saturno» — seguido de " — " e a definição Naveya/);
  });

  // BUG ENCONTRADO E CORRIGIDO 23/08/2026 ao construir verificacao.ts (Critério E):
  // Urano/Neptuno/Plutão não tinham entrada em `termoTecnicoEmPortugues`, e
  // `formatarSinalParaPrompt` devolvia o nome em INGLÊS ("Pluto") para
  // `termoParaTexto` — já usado nas Secções 11/12/13, aprovadas antes deste
  // bug ser encontrado (os dry-runs manuais não reproduziram o erro porque
  // seguem o SENTIDO da definição, nunca copiam o campo literalmente).
  it("um sinal de corpo ocidental lento (Urano/Neptuno/Plutão) mostra o nome em português, nunca em inglês", () => {
    expect(formatarSinalParaPrompt("Uranus", "trânsito lento")!.termoParaTexto).toBe("Urano");
    expect(formatarSinalParaPrompt("Neptune", "trânsito lento")!.termoParaTexto).toBe("Neptuno");
    expect(formatarSinalParaPrompt("Pluto", "trânsito lento")!.termoParaTexto).toBe("Plutão");
  });

  it("um sinal de casa mostra 'casa N', não a chave interna 'casa-N'", () => {
    const sinal = formatarSinalParaPrompt("casa-10", "casa")!;
    expect(sinal.termoParaTexto).toBe("casa 10");
  });

  it("uma dignidade clássica mostra a palavra acentuada correcta, não a chave ASCII ('exaltação', não 'exaltacao')", () => {
    const sinal = formatarSinalParaPrompt("exaltacao", "força do Atmakaraka")!;
    expect(sinal.termoParaTexto).toBe("exaltação");
  });

  it("EXCEPÇÃO mantida: um nível de confiança continua a não se nomear no texto — não é um sinal astrológico, é calibração interna (6ª regra que manda)", () => {
    const sinal = formatarSinalParaPrompt("sinal-forte", "nível de confiança")!;
    expect(sinal.termoParaTexto).toBeNull();
    expect(sinal.instrucao).toMatch(/nunca nomeie o termo técnico no texto/);
  });

  it("serializarSinal inclui a linha 'TERMO A ESCREVER NO TEXTO' para sinais astrológicos, e omite-a para níveis de confiança", () => {
    const sinalGraha = formatarSinalParaPrompt("Saturn", "Atmakaraka")!;
    expect(serializarSinal(sinalGraha)).toContain("TERMO A ESCREVER NO TEXTO: Saturno");
    const sinalConfianca = formatarSinalParaPrompt("leitura", "nível de confiança")!;
    expect(serializarSinal(sinalConfianca)).not.toContain("TERMO A ESCREVER NO TEXTO");
  });
});
