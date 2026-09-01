import { describe, expect, it } from "vitest";
import { gerarCamadaA } from "../src/v3/camada-a.js";
import { derivarEspinha } from "../src/v3/espinha.js";
import type { DadosClienteV3 } from "../src/v3/prompt-v3.js";
import {
  verificarRelatorioV3,
  verificarJargaoComDefinicao,
  detectarRepeticaoEntreSeccoes,
  TERMOS_PROIBIDOS_V3,
  type ResultadoVerificacao,
} from "../src/v3/verificacao.js";
import type { RelatorioV3, CamadaA, DesfechoEspinha, Descoberta } from "../src/types-v3.js";
import type { BirthInput, ClassicalGraha } from "../src/lifeReport/types.js";

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
  profissao: "Gestora",
  mainQuestion: "Devo mudar de carreira agora?",
  situacaoDeclarada: "Devo mudar de carreira agora?",
};

// Camada com as 3 condições de activação (6/7/14) neutralizadas — SAV
// plano (banda "médio"), sem trânsitos lentos activos, sem figuras
// fechadas, dignidades/avasthas neutras. Confirmado por dry-run contra as
// funções reais de prompt-v3.ts (construirPromptSeccao6/7/14) antes de
// escrever este ficheiro: com esta camada, as 3 secções devolveriam null.
const avasthasNeutras = Object.fromEntries(Object.entries(camada.avasthas).map(([g]) => [g, "Bala"])) as typeof camada.avasthas;
const dignidadesNeutras = Object.fromEntries(
  Object.entries(camada.dignidades).map(([g, d]) => [g, { ...(d as object), classica: "Neutral", panchadha: "sama" }])
) as typeof camada.dignidades;
const camadaNeutralizada: CamadaA = {
  ...camada,
  slowTransits: [],
  figurasFechadas: [],
  avasthas: avasthasNeutras,
  dignidades: dignidadesNeutras,
  sav: { ...camada.sav, byHouse: camada.sav.byHouse.map((h) => ({ ...h, pontuacao: 28 })) },
};

const dadosSemVocacao: DadosClienteV3 = { ...dados, mainQuestion: "Como está o meu ano?", situacaoDeclarada: "Como está o meu ano?" };

function descoberta(texto: string): Descoberta {
  return { texto, confianca: "sinal-forte", camadas: ["Atmakaraka e a casa onde está", "Karakamsha"] };
}

/** Relatório mínimo válido — passa todos os critérios de código puro. Cada teste parte daqui e muda só o que precisa para violar um critério específico. */
function relatorioValido(): RelatorioV3 {
  const desfecho: DesfechoEspinha = espinha.desfecho;
  return {
    abertura: {
      nomeCliente: "Melina",
      quadroDados: {
        dataNascimento: "11 de Dezembro de 1984",
        horaNascimento: "08:30",
        localNascimento: "São Paulo, Brasil",
        residenciaActual: "São Paulo, Brasil",
        sistemasUsados: "Sideral Lahiri, casas de signo inteiro — o que é e quando; Tropical Placidus — como se sente.",
        profissao: "Gestora",
        perguntaDeclarada: "Devo mudar de carreira agora?",
        situacaoDeclarada: "Devo mudar de carreira agora?",
      },
      perguntaEnquadrada: "A pergunta desta leitura é se este é o momento de mudar de carreira.",
      notaLeitura: { oSigno: "Continuas a ser de Sagitário.", aMedida: "Isto mede o mecanismo, não o destino.", ondeParar: "Onde a carta não distingue, a decisão fica contigo." },
    },
    retrato60s: {
      linhas: [
        { texto: "Uma pessoa que decide primeiro e explica depois.", seccaoReferencia: "Secção 4 — Quem És" },
        { texto: "O que a move é ver o esforço render.", seccaoReferencia: "Secção 5 — A Forma de Vida" },
        { texto: "O que a trava é esperar por uma garantia que não vem.", seccaoReferencia: "Secção 4 — Quem És" },
        { texto: "Rende mais quando lidera do que quando espera instrução.", seccaoReferencia: "Secção 9 — Como É Vista" },
        { texto: "Rende menos em tarefas repetitivas sem visibilidade.", seccaoReferencia: "Secção 8 — Dinheiro" },
        { texto: "O padrão central é construir estrutura onde havia dispersão.", seccaoReferencia: "Secção 3 — O Veredicto" },
        { texto: "A direcção aponta para mais responsabilidade, não menos.", seccaoReferencia: "Secção 11 — O Relógio" },
        { texto: "O próximo movimento é assumir o que já faz informalmente.", seccaoReferencia: "Secção 12 — O Plano" },
        { texto: "O que fica em aberto é o ritmo, não o destino.", seccaoReferencia: "Secção 13 — Custo de Não Fazer Nada" },
      ],
    },
    cincoDescobertas: [
      descoberta("Descoberta um, sobre o padrão de liderança."),
      descoberta("Descoberta dois, sobre o ritmo de decisão."),
      descoberta("Descoberta três, sobre onde o esforço rende mais."),
      descoberta("Descoberta quatro, sobre a relação com estrutura."),
      descoberta("Descoberta cinco, sobre o que ainda está por resolver."),
    ],
    veredicto: {
      resposta: "Sim — este é o momento de mudar de carreira, porque a estrutura actual já não deixa a capacidade render o que podia.",
      razoes: [descoberta("Razão um para a resposta."), descoberta("Razão dois para a resposta.")],
    },
    quemEs: "Uma pessoa que constrói estrutura onde antes havia dispersão, e que decide primeiro e explica depois.",
    formaDeVida: "A vida ganha forma através de responsabilidade assumida cedo e mantida por muito tempo.",
    dinheiro: "O sustento vem de assumir responsabilidade que outros evitam, de forma consistente ao longo do tempo.",
    comoEsVista: "É vista como alguém sólida, a quem se pode entregar algo difícil sem supervisão constante.",
    oRelogio: "O período actual pede consolidação antes de expansão; o horizonte de três anos favorece quem já assumiu mais responsabilidade.",
    oPlano: `Introdução: os próximos 90 dias pedem um passo concreto, não mais preparação.

QUANDO | O QUE | COM QUE DEPENDE
Semana 1-2 | Mapear as três áreas de maior responsabilidade já assumida | Nada
Semana 3-6 | Propor formalização de uma dessas áreas | Disponibilidade de quem decide
Semana 7-12 | Negociar os termos | Resposta da proposta anterior

Menu de propostas:
1. Formalizar a área que já lidera informalmente.
2. Propor um projecto-piloto com responsabilidade nova.
3. Pedir revisão de título e remuneração.

Teste de filtro: (1) isto usa a capacidade já demonstrada? (2) isto depende de terceiros decidirem por ti? (3) isto é reversível se não resultar?

O que não fazer: não vale a pena, agora, pedir uma mudança total de área — esta leitura não sustenta um recomeço do zero neste momento, só uma expansão do que já funciona.`,
    custoDeNaoFazerNada: `Se nada mudar, o padrão actual continua: a responsabilidade real cresce sem o reconhecimento formal a acompanhar, e a pessoa acumula capacidade sem retorno proporcional.

Isto não é uma sentença — é uma descrição do que já está em curso e vai continuar em curso, ao mesmo ritmo, enquanto a estrutura não for revista.`,
    espinha: desfecho,
    seccoesCondicionaisActivas: [],
    guardIssues: [],
  };
}

describe("verificarRelatorioV3 — o relatório mínimo válido passa todos os critérios de código puro", () => {
  it("passou é true e nenhum critério de código puro reprova, sem chamarLLM", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camada, dados);
    for (const [nome, c] of Object.entries(resultado.criterios)) {
      expect(c.passou, `critério ${nome}: ${c.motivo}`).toBe(true);
    }
    expect(resultado.passou).toBe(true);
  });
});

describe("Critério A — Abertura completa", () => {
  it("reprova quando um campo do quadroDados está vazio", async () => {
    const relatorio = relatorioValido();
    relatorio.abertura.quadroDados.residenciaActual = "";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.A.passou).toBe(false);
    expect(resultado.passou).toBe(false);
  });

  it("reprova quando a nota de leitura tem uma parte vazia", async () => {
    const relatorio = relatorioValido();
    relatorio.abertura.notaLeitura.ondeParar = "";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.A.passou).toBe(false);
  });
});

describe("Critério B — estrutura das secções", () => {
  it("reprova quando retrato60s não tem exactamente 9 linhas", async () => {
    const relatorio = relatorioValido();
    relatorio.retrato60s.linhas = relatorio.retrato60s.linhas.slice(0, 8);
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.B.passou).toBe(false);
  });

  it("reprova quando cincoDescobertas não tem exactamente 5", async () => {
    const relatorio = relatorioValido();
    relatorio.cincoDescobertas.push(descoberta("Sexta descoberta, a mais"));
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.B.passou).toBe(false);
  });

  it("reprova quando veredicto.razoes tem só 1 razão", async () => {
    const relatorio = relatorioValido();
    relatorio.veredicto.razoes = [descoberta("Só uma razão")];
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.B.passou).toBe(false);
  });

  it("reprova quando custoDeNaoFazerNada não tem exactamente 2 parágrafos", async () => {
    const relatorio = relatorioValido();
    relatorio.custoDeNaoFazerNada = "Só um parágrafo, sem quebra dupla de linha.";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.B.passou).toBe(false);
  });
});

describe("Critério C — escala de confiança", () => {
  it("reprova quando uma descoberta tem confiança inválida", async () => {
    const relatorio = relatorioValido();
    (relatorio.cincoDescobertas[0] as unknown as { confianca: string }).confianca = "muito-forte";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.C.passou).toBe(false);
  });
});

describe("Critério D (código) — abertura antes do conteúdo", () => {
  it("reprova pelo mesmo motivo que o Critério A quando a abertura está incompleta", async () => {
    const relatorio = relatorioValido();
    relatorio.abertura.nomeCliente = "";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.D_codigo.passou).toBe(false);
  });
});

describe("Critério E / guarda de vocabulário — jargão sem definição (função verificarJargaoComDefinicao directamente, com os exemplos exactos do pedido)", () => {
  it('"Saturno está exaltado na casa 10." DEVE REPROVAR — termos sem definição', () => {
    const r = verificarJargaoComDefinicao("Saturno está exaltado na casa 10.");
    expect(r.passa).toBe(false);
    expect(r.violacoes.length).toBeGreaterThan(0);
  });

  it('"Saturno — o que exige tempo e estrutura — está no seu melhor estado possível — funciona com mais alcance do que o normal — na área da carreira e do nome." DEVE PASSAR', () => {
    const r = verificarJargaoComDefinicao(
      "Saturno — o que exige tempo e estrutura — está no seu melhor estado possível — funciona com mais alcance do que o normal — na área da carreira e do nome."
    );
    expect(r.passa).toBe(true);
    expect(r.violacoes).toEqual([]);
  });

  it("cobre as categorias novas da lista v3 — sânscrito, ocidental estrutural, casa N — sem definição reprova, com definição passa", () => {
    expect(verificarJargaoComDefinicao("O atmakaraka mostra isto.").passa).toBe(false);
    expect(verificarJargaoComDefinicao("O atmakaraka — a alma desta pessoa, o tema central — mostra isto.").passa).toBe(true);

    expect(verificarJargaoComDefinicao("Há um T-quadrado nesta leitura.").passa).toBe(false);
    expect(verificarJargaoComDefinicao("Há um T-quadrado — uma tensão estrutural entre três áreas — nesta leitura.").passa).toBe(true);

    expect(verificarJargaoComDefinicao("Isto está na casa 5.").passa).toBe(false);
    expect(verificarJargaoComDefinicao("Isto está na casa 5 — a área do que se cria e de quem depende de ti.").passa).toBe(true);
  });

  // CORRECÇÃO 23/08/2026 ("Correcção antes de orquestrador") — "Sol",
  // "Lua", "mapa" e "carta" deixaram de disparar por palavra solta; só
  // disparam em contexto astrológico delimitado. Testa os dois lados:
  // o contexto delimitado ainda reprova sem definição (e passa com), e as
  // frases do dia-a-dia deixam de ser falsos positivos.
  describe("Sol/Lua/mapa/carta — contexto delimitado, não palavra solta", () => {
    it('"Sol" só dispara em "o planeta Sol" ou "Sol em <signo/casa>"', () => {
      expect(verificarJargaoComDefinicao("O planeta Sol mostra isto.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("O planeta Sol — a necessidade de ser fonte — mostra isto.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("O Sol em Escorpião não tem meio-termo.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("O Sol em Escorpião — a necessidade de ser vista — não tem meio-termo.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("O Sol em casa 10 pede visibilidade.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("O Sol em casa 10 — a área da carreira e do nome — pede visibilidade.").passa).toBe(true);
    });

    it('"Sol" NUNCA dispara fora dessas duas construções — falsos positivos corrigidos', () => {
      expect(verificarJargaoComDefinicao("Foram todos tomar sol à tarde.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Ficou ao sol demasiado tempo.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Adora a luz do sol da manhã.").passa).toBe(true);
    });

    it('"Lua" só dispara em "o planeta Lua" ou "a Lua em <signo/casa>"', () => {
      expect(verificarJargaoComDefinicao("O planeta Lua mostra isto.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("O planeta Lua — o que sente antes de pensar — mostra isto.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("A Lua em Caranguejo sente tudo primeiro.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("A Lua em Caranguejo — a leitura mais rápida da situação — sente tudo primeiro.").passa).toBe(true);
    });

    it('"Lua" NUNCA dispara fora dessas duas construções — falsos positivos corrigidos', () => {
      expect(verificarJargaoComDefinicao("Era lua cheia naquela noite.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Ficaram a passear à luz da lua.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Foram para a lua de mel logo a seguir.").passa).toBe(true);
    });

    it('"mapa"/"carta" só disparam nas 3 frases fixas', () => {
      expect(verificarJargaoComDefinicao("A tua carta natal mostra isto.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("A tua carta natal — o desenho completo desta pessoa — mostra isto.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("O teu mapa natal mostra isto.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("A carta astral confirma isto.").passa).toBe(false);
      expect(verificarJargaoComDefinicao("A carta astral — o mesmo desenho, noutro nome — confirma isto.").passa).toBe(true);
    });

    it('"mapa"/"carta" NUNCA disparam fora dessas 3 frases — falsos positivos corrigidos', () => {
      expect(verificarJargaoComDefinicao("Escreveu uma carta de apresentação longa.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Recebeu uma carta do banco ontem.").passa).toBe(true);
      expect(verificarJargaoComDefinicao("Consultou o mapa da cidade antes de sair.").passa).toBe(true);
    });
  });

  it("nomes evocativos de nakshatra entram na lista — sem definição reprova, com definição passa", () => {
    expect(verificarJargaoComDefinicao("Ela é a que chega primeiro.").passa).toBe(false);
    expect(verificarJargaoComDefinicao("Ela é a que chega primeiro — a pressa boa, o impulso de agir antes de qualquer garantia.").passa).toBe(true);
  });

  // CORRIGIDO 23/08/2026 (primeiro relatório real, Alice Amorim) — a
  // definição só é exigida na PRIMEIRA menção de cada termo; da segunda
  // menção em diante, o termo pode aparecer sozinho. Antes desta
  // correcção, um texto bem escrito que definia "casa 10" uma vez e a
  // reutilizava depois reprovava — um falso positivo real, encontrado no
  // relatório da Alice.
  describe("primeira menção precisa de definição, segunda menção em diante não (correcção 23/08/2026)", () => {
    it("define na primeira menção, reutiliza sem definição na segunda — DEVE PASSAR", () => {
      const r = verificarJargaoComDefinicao("A casa 10 — o lugar público, a carreira e o nome pelo qual é conhecida — está forte. É por isso que a casa 10 pesa tanto nesta leitura.");
      expect(r.passa).toBe(true);
      expect(r.violacoes).toEqual([]);
    });

    it("nunca define nem na primeira menção — continua a REPROVAR, mesmo com uma segunda menção depois", () => {
      const r = verificarJargaoComDefinicao("A casa 10 está forte. É por isso que a casa 10 pesa tanto nesta leitura.");
      expect(r.passa).toBe(false);
      expect(r.violacoes).toHaveLength(1); // só a primeira ocorrência é examinada — nunca duas violações do mesmo termo
    });

    it("cada termo é rastreado à parte — definir 'Saturno' não isenta 'Rahu' de precisar da sua própria primeira definição", () => {
      const r = verificarJargaoComDefinicao("Saturno — o que exige tempo e estrutura — está forte. Rahu aparece sem ser dito o que é.");
      expect(r.passa).toBe(false);
      expect(r.violacoes.some((v) => v.includes('"Rahu"'))).toBe(true);
      expect(r.violacoes.some((v) => v.includes('"Saturno"'))).toBe(false);
    });
  });
});

describe("Critério E e vocabularioProibido — reprovam ao nível do RelatorioV3 inteiro", () => {
  it("reprova quando uma secção usa um planeta sem definição", async () => {
    const relatorio = relatorioValido();
    relatorio.quemEs = "Saturno mostra isto sobre ela.";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.E.passou).toBe(false);
    expect(resultado.criterios.vocabularioProibido.passou).toBe(false);
  });

  // CORRIGIDO 23/08/2026 — Anexo B é texto técnico gerado por código
  // (anexoB.ts), nunca prosa do cliente; nunca teve de seguir a regra
  // "termo — definição". No relatório real da Alice, `figurasFechadas.
  // detalhe` ("Sextil Mercury–Jupiter, com Rahu em quincúncio...") e
  // `tabelaRastreio` reprovavam o Critério E só por serem notação técnica
  // crua — um falso positivo de desenho, não um problema do relatório.
  it("NUNCA reprova por causa de jargão sem definição dentro do Anexo B (figurasFechadas.detalhe, tabelaRastreio)", async () => {
    const relatorio = relatorioValido();
    relatorio.anexoB = {
      rodaCasas: "<svg></svg>",
      sarvashtakavarga: [],
      calculado: ["x"],
      naoCalculado: [],
      figurasFechadas: [
        { tipo: "Yod", pontos: [{ termo: "Mercúrio", definicao: "..." }], detalhe: "Sextil Mercury–Jupiter, com Rahu em quincúncio a ambos (ápice).", orbe: 1.94 },
      ],
      tabelaRastreio: [{ afirmacao: "Atmakaraka na casa 8", base: "Sun (Atmakaraka) na casa 8; camadas confirmantes: Dasha actual", seccao: "Anexo B — Figuras Fechadas" }],
    };
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.E.passou).toBe(true);
    expect(resultado.criterios.vocabularioProibido.passou).toBe(true);
  });
});

describe("Critério F (código) — retrato rastreável", () => {
  it("reprova quando uma linha do retrato aponta para uma secção condicional AUSENTE (Secção 6, sem oQueTeTemTravado)", async () => {
    const relatorio = relatorioValido();
    relatorio.retrato60s.linhas[0] = { texto: "Uma linha qualquer.", seccaoReferencia: "Secção 6 — O Que Te Tem Travado" };
    // oQueTeTemTravado fica undefined — a secção 6 não existe neste relatório.
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.F_codigo.passou).toBe(false);
    expect(resultado.passou).toBe(false);
  });

  it("passa quando a mesma referência aponta para a Secção 6 e ela EXISTE no relatório", async () => {
    const relatorio = relatorioValido();
    relatorio.retrato60s.linhas[0] = { texto: "Uma linha qualquer.", seccaoReferencia: "Secção 6 — O Que Te Tem Travado" };
    relatorio.oQueTeTemTravado = "Texto da secção 6, presente.";
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.F_codigo.passou).toBe(true);
  });
});

describe("Critério G (código) — espinha não repetida literalmente", () => {
  it("reprova quando a afirmação da espinha aparece palavra-por-palavra em duas secções diferentes", async () => {
    const relatorio = relatorioValido();
    const afirmacao = "afirmacao" in relatorio.espinha ? relatorio.espinha.afirmacao : "";
    expect(afirmacao.length).toBeGreaterThan(0); // Melina tem convergência — tem de haver afirmação para este teste fazer sentido
    relatorio.quemEs = `${relatorio.quemEs} ${afirmacao}`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} ${afirmacao}`;
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.G_codigo.passou).toBe(false);
  });

  it("passa quando a espinha só aparece numa secção (nunca repetida)", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camada, dados);
    expect(resultado.criterios.G_codigo.passou).toBe(true);
  });

  // CORRIGIDO 25/08/2026 ("Correcções críticas ao motor v3", ponto 3A) —
  // o caso real da Alice: a frase inteira nunca se repetia (por isso a
  // verificação original passava), mas a frase-molde (primeiras 8
  // palavras) aparecia várias vezes espalhada por muitas secções curtas.
  it("reprova quando a frase-molde (primeiras 8 palavras) da espinha aparece mais de 3 vezes, mesmo sem a frase inteira nunca se repetir", async () => {
    const relatorio = relatorioValido();
    const afirmacao = "afirmacao" in relatorio.espinha ? relatorio.espinha.afirmacao : "";
    const molde = afirmacao.trim().split(/\s+/).slice(0, 8).join(" ");
    expect(molde.length).toBeGreaterThan(0);
    // 4 secções diferentes, cada uma com o molde seguido de uma continuação DIFERENTE — a frase inteira nunca se repete.
    relatorio.quemEs = `${relatorio.quemEs} ${molde} de um jeito.`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} ${molde} de outro jeito.`;
    relatorio.dinheiro = `${relatorio.dinheiro} ${molde} ainda de outro jeito.`;
    relatorio.comoEsVista = `${relatorio.comoEsVista} ${molde} de mais um jeito.`;
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.G_codigo.passou).toBe(false);
    expect(resultado.criterios.G_codigo.motivo).toMatch(/frase-molde/);
  });

  it("passa com a frase-molde a aparecer só 3 vezes (no limite, não acima dele)", async () => {
    const relatorio = relatorioValido();
    const afirmacao = "afirmacao" in relatorio.espinha ? relatorio.espinha.afirmacao : "";
    const molde = afirmacao.trim().split(/\s+/).slice(0, 8).join(" ");
    relatorio.quemEs = `${relatorio.quemEs} ${molde} de um jeito.`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} ${molde} de outro jeito.`;
    relatorio.dinheiro = `${relatorio.dinheiro} ${molde} ainda de outro jeito.`;
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.G_codigo.passou).toBe(true);
  });
});

describe("Critério H (código) — plano sem 'o que não fazer'", () => {
  it("reprova quando o bloco 'o que não fazer' está totalmente ausente", async () => {
    const relatorio = relatorioValido();
    relatorio.oPlano = relatorio.oPlano.replace(/O que não fazer:[\s\S]*$/i, "");
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.H_codigo.passou).toBe(false);
  });

  it("reprova quando o bloco existe mas fica vazio", async () => {
    const relatorio = relatorioValido();
    relatorio.oPlano = relatorio.oPlano.replace(/O que não fazer:[\s\S]*$/i, "O que não fazer:");
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.H_codigo.passou).toBe(false);
  });
});

describe("Critério I — só semântico, verifica a degradação graciosa e a resposta do LLM", () => {
  it("sem chamarLLM, fica 'não verificado' em warnings, nunca reprova a geração", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camada, dados);
    expect(resultado.criterios.I).toBeUndefined();
    expect(resultado.warnings.some((w) => w.includes("Critério I") && w.includes("não verificado"))).toBe(true);
  });

  it("com chamarLLM a reportar falha (veredicto responde a uma pergunta diferente da mainQuestion), reprova e propaga o motivo", async () => {
    const relatorio = relatorioValido();
    relatorio.veredicto.resposta = "O teu ano financeiro parece promissor."; // não responde a "Devo mudar de carreira agora?"
    const resultado = await verificarRelatorioV3(relatorio, camada, dados, {
      chamarLLM: async () => ({ passa: false, motivo: "o veredicto fala de dinheiro, a pergunta era sobre mudar de carreira" }),
    });
    expect(resultado.criterios.I.passou).toBe(false);
    expect(resultado.criterios.I.motivo).toMatch(/dinheiro/);
    expect(resultado.passou).toBe(false);
  });
});

describe("Critério J — secções condicionais só quando activas", () => {
  it("reprova quando a Secção 6 existe mas nenhuma condição de activação está satisfeita (camada neutralizada)", async () => {
    const relatorio = relatorioValido();
    relatorio.oQueTeTemTravado = "Texto da secção 6, indevidamente presente.";
    const resultado = await verificarRelatorioV3(relatorio, camadaNeutralizada, dados);
    expect(resultado.criterios.J.passou).toBe(false);
  });

  it("reprova quando a Secção 7 existe mas não há slowTransits activos (camada neutralizada)", async () => {
    const relatorio = relatorioValido();
    relatorio.transitoActual = "Texto da secção 7, indevidamente presente.";
    const resultado = await verificarRelatorioV3(relatorio, camadaNeutralizada, dados);
    expect(resultado.criterios.J.passou).toBe(false);
  });

  it("reprova quando a Secção 10 existe mas a pergunta não envolve vocação/carreira", async () => {
    const relatorio = relatorioValido();
    relatorio.sobreOQueEEmQueForma = "Texto da secção 10, indevidamente presente.";
    const resultado = await verificarRelatorioV3(relatorio, camada, dadosSemVocacao);
    expect(resultado.criterios.J.passou).toBe(false);
  });

  it("reprova quando a Secção 14 existe mas não há casa 9/12 forte, figura ou trânsito relevante (camada neutralizada)", async () => {
    const relatorio = relatorioValido();
    relatorio.umaUltimaCoisa = "Texto da secção 14, indevidamente presente.";
    const resultado = await verificarRelatorioV3(relatorio, camadaNeutralizada, dados);
    expect(resultado.criterios.J.passou).toBe(false);
  });

  it("passa quando nenhuma secção condicional existe, seja qual for o estado da camada", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camadaNeutralizada, dados);
    expect(resultado.criterios.J.passou).toBe(true);
  });
});

describe("Critério K (código) — custo de não fazer nada não é manipulador", () => {
  it.each(["Se não agires já, vai correr mal.", "Esta é a tua última oportunidade.", "Nunca mais vais ter esta hipótese."])("reprova com a frase de medo artificial: %s", async (frase) => {
    const relatorio = relatorioValido();
    relatorio.custoDeNaoFazerNada = `${frase}\n\nSegundo parágrafo qualquer.`;
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(resultado.criterios.K_codigo.passou).toBe(false);
  });
});

describe("Critérios semânticos (D_semantico, F_semantico, G_semantico, H_semantico, K_semantico) — degradação graciosa sem chamarLLM", () => {
  it("todos ficam ausentes de criterios e viram warning 'não verificado', sem afectar passou", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camada, dados);
    for (const nome of ["D_semantico", "F_semantico", "G_semantico", "H_semantico", "K_semantico"]) {
      expect(resultado.criterios[nome], nome).toBeUndefined();
      expect(resultado.warnings.some((w) => w.includes(nome) && w.includes("não verificado")), nome).toBe(true);
    }
    expect(resultado.passou).toBe(true);
  });

  it("com chamarLLM disponível, todos os critérios semânticos correm e entram em criterios", async () => {
    const resultado = await verificarRelatorioV3(relatorioValido(), camada, dados, { chamarLLM: async () => ({ passa: true, motivo: "ok" }) });
    for (const nome of ["D_semantico", "F_semantico", "G_semantico", "H_semantico", "I", "K_semantico"]) {
      expect(resultado.criterios[nome], nome).toBeDefined();
      expect(resultado.criterios[nome].passou).toBe(true);
    }
    expect(resultado.warnings.some((w) => w.includes("não verificado"))).toBe(false);
  });
});

describe("TERMOS_PROIBIDOS_V3 — lista exportada cobre as categorias do pedido", () => {
  it("inclui pelo menos um termo de cada categoria pedida", () => {
    const junto = TERMOS_PROIBIDOS_V3.join(" | ");
    expect(junto).toMatch(/Saturno/);
    expect(junto).toMatch(/exaltado/);
    expect(junto).toMatch(/atmakaraka/);
    expect(junto).toMatch(/T-quadrado/);
    expect(junto).toMatch(/mapa/);
    expect(junto).toMatch(/carta/);
    expect(junto).toMatch(/casa/);
  });
});

describe("detectarRepeticaoEntreSeccoes — warning, nunca reprova", () => {
  // LIMIAR SUBIDO DE 3 PARA 7 — 23/08/2026, depois do primeiro relatório
  // real (Alice Amorim): a limiar 3, a espinha a ecoar por design em
  // quase todas as secções (o próprio motivo de existir da espinha)
  // gerava ~90 warnings de "repetição" que eram coerência temática
  // intencional, não repetição real.
  it("NÃO sinaliza um par de secções com só 3-6 shingles partilhados (abaixo do novo limiar de 7)", () => {
    const relatorio = relatorioValido();
    const fraseCurta = "responsabilidade que outros ainda não assumiram";
    relatorio.quemEs = `${relatorio.quemEs} A ${fraseCurta} é o que a distingue.`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} A ${fraseCurta} é o que a distingue.`;
    const flags = detectarRepeticaoEntreSeccoes(relatorio);
    expect(flags.some((f) => [f.seccaoA, f.seccaoB].includes("quemEs") && [f.seccaoA, f.seccaoB].includes("formaDeVida"))).toBe(false);
  });

  it("sinaliza um par de secções com 7+ shingles de 5 palavras partilhados", () => {
    const relatorio = relatorioValido();
    const fraseRepetida = "responsabilidade que outros ainda não assumiram claramente, um padrão que se repete sempre que alguém precisa de decidir depressa";
    relatorio.quemEs = `${relatorio.quemEs} A ${fraseRepetida} é o que a distingue.`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} A ${fraseRepetida} é o que a distingue.`;
    const flags = detectarRepeticaoEntreSeccoes(relatorio);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some((f) => [f.seccaoA, f.seccaoB].includes("quemEs") && [f.seccaoA, f.seccaoB].includes("formaDeVida"))).toBe(true);
  });

  it("nunca aparece em criterios (nem faz passou ficar false) — só em warnings", async () => {
    const relatorio = relatorioValido();
    const fraseRepetida = "responsabilidade que outros ainda não assumiram claramente, um padrão que se repete sempre que alguém precisa de decidir depressa";
    relatorio.quemEs = `${relatorio.quemEs} A ${fraseRepetida} é o que a distingue.`;
    relatorio.formaDeVida = `${relatorio.formaDeVida} A ${fraseRepetida} é o que a distingue.`;
    const resultado = await verificarRelatorioV3(relatorio, camada, dados);
    expect(Object.keys(resultado.criterios)).not.toContain("repeticao");
    expect(resultado.warnings.some((w) => w.includes("Repetição candidata"))).toBe(true);
    expect(resultado.passou).toBe(true);
  });

  it("não sinaliza nada no relatório mínimo válido (sem repetição deliberada)", () => {
    expect(detectarRepeticaoEntreSeccoes(relatorioValido())).toEqual([]);
  });
});
