// VocationIQ Adolescente — TAREFA 2 (correcção do especialista, ronda de
// produção). Substitui o rascunho anterior (TAREFA 6, ronda anterior) por
// uma versão que espelha as regras do prompt adulto (mesma escala de
// confiança, mesma regra anti-repetição, mesmos planetas fracos/tensão
// interna/horizonte temporal, mesma regra absoluta da candidata fora da
// lista) mas com a "Quem é" e "O plano" reformulados para o contexto de
// quem ainda não trabalha — nunca "o que me define profissionalmente",
// sempre "o que me ajuda a prosperar na área que escolho".
//
// TAREFA 2C (correcção do especialista, ronda seguinte, aprovada) —
// granularidade por `anoEscolaridade` (migração 0020): quem está no
// 7º-9º ano ainda não escolhe curso — escolhe VIA do secundário
// (científico-humanística). Recomendar "Curso: Medicina, QNQ 7" a um
// aluno do 7º é prematuro e confunde o momento de decisão real. Quem
// está no 10º-12º mantém o formato anterior (curso concreto + via de
// acesso). "pos-12" não é tratado aqui — a rota decide encaminhar para
// `construirPromptAdulto` nesse caso (ver DESVIO em relatorioAdultoCompute.ts).
//
// REVERTIDO (correcção do especialista, ronda seguinte) — a distinção
// 7º-9º vs 10º-12º acima foi removida por inteiro deste ficheiro; os 7
// pontos de ramificação por `ehSeteANove` (candidatas por via vs
// catálogo completo, leitura por opção, instrução de candidata,
// "momento de decisão", rótulos de "via do secundário" vs "cursos
// concretos", tom do plano) foram unificados num único percurso — o que
// antes era só o ramo "10º-12º" (curso concreto + via de entrada).
// `ano_escolaridade` continua a existir no intake e a alimentar
// `ehPos12` fora deste ficheiro (relatorioAdultoCompute.ts/route.ts,
// intocado) — só a distinção 7-9/10-12 DENTRO do prompt adolescente foi
// revertida.
//
// AVISO DE MATURIDADE (honestidade obrigatória, ver relatório desta
// ronda): o prompt adulto (`promptAdulto.ts`) chegou a este ponto depois
// de MAIS DE 15 RONDAS de diagnóstico com dados reais, revisão do
// especialista, e correcções sucessivas ao longo de toda a sessão. Este
// ficheiro foi escrito numa ÚNICA ronda, sem esse historial de escrutínio
// — a astrologia por trás é a mesma (reaproveita os blocos de dados já
// testados do adulto), mas a PROSA INSTRUCIONAL em si (as regras da
// secção "Quem é", os exemplos de tom) é nova e não foi validada contra
// relatórios reais gerados por ela. Recomendação: gerar um lote de
// relatórios de teste com o Anthropic real e reve-los antes de expor isto
// a clientes pagantes.

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";
import type { D1TableResult } from "../lifeReport/d1Table";
import type { YogaHit } from "../lifeReport/yogas";
import {
  blocoEixoMissao,
  blocoModoDeGanho,
  blocoPesos,
  blocoDatas,
  blocoCatalogoVocacional,
  blocoElementosModalidades,
  blocoAspectosPessoais,
  blocoAvasthas,
  blocoConjuncoes,
  blocoYogas,
  blocoVargottama,
  blocoRodaDaVida,
  INSTRUCAO_AVASTHAS,
  INSTRUCAO_CONJUNCOES,
  INSTRUCAO_YOGAS,
  INSTRUCAO_VARGOTTAMA,
  INSTRUCAO_CONSISTENCIA_TECNICA,
  INSTRUCAO_SELECCAO_CANDIDATAS,
  INSTRUCAO_ABERTURA_CANDIDATAS,
  INSTRUCAO_NIVEL_CANDIDATAS,
  TERMOS_PROIBIDOS,
  SECCAO_TITULOS,
  MARCADORES,
  type DadosDatas,
} from "./promptAdulto";

export interface VocationiqIntakeAdolescente {
  nome: string;
  situacaoDeclarada: string;
  /** SPEC-vocacional.md — "opções em cima da mesa", 2-4 em texto livre. Pode vir vazio (nunca bloqueia o relatório). */
  opcoesAdolescente: string[];
  /** SPEC-vocacional.md — "qual delas te parece a mais provável hoje?". Não decide nada, é a hipótese em teste. */
  opcaoMaisProvavel?: string;
  preferenciaFamilia?: string;
  /** TAREFA 2 (correcção do especialista, aprovada) — migração 0020. `undefined`/`"pos-12"` nunca chegam a este prompt: `undefined` cai no formato "10-a-12" por omissão (formulário antigo, sem o campo preenchido); "pos-12" é decidido antes, na rota (ver DESVIO em relatorioAdultoCompute.ts). */
  anoEscolaridade?: "7-a-9" | "10-a-12" | "pos-12";
}

/** TAREFA 1C — formata os cursos concretos resolvidos para uma opção declarada (ver `sugerirCursosParaOpcoesAdolescente`), para quem está no 10º-12º ano. `[]` quando a opção não teve correspondência no mapeamento — o texto explica isso em vez de inventar. */
function formatarCursosDaOpcao(cursos: CursosSugeridos[]): string {
  if (!cursos.length) return "(esta opção não tem correspondência directa no catálogo de cursos — lê-a pelo Eixo da Missão e pelo Modo de Ganho acima, não por um curso específico.)";
  return cursos
    .map((c) => {
      const curso = c.cursos[0];
      return [
        `Curso: ${curso.nome} (${curso.nivel}, QNQ ${curso.qnq ?? "—"}, ${curso.duracao ?? "duração não aplicável"}, ${curso.tipoInstituicao})`,
        ...c.entradaMercadoAdulto.map((linha) => `  ${linha}`),
      ].join("\n");
    })
    .join("\n\n");
}

export function construirPromptAdolescente(
  intake: VocationiqIntakeAdolescente,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
  catalogo: ResultadoCatalogoVocacional,
  savPorCasa: SavPorCasa[],
  elementosModalidades: PerfilElementosModalidades,
  aspectosPessoais: AspectoPessoal[],
  cursosPorDestino: Record<string, CursosSugeridos>,
  cursosPorOpcaoDeclarada: Record<string, CursosSugeridos[]>,
  /** FALTA 2 (correcção do especialista) — mesmas 4 camadas técnicas do ramo adulto, mesmos blocos partilhados (blocoAvasthas/blocoConjuncoes/blocoYogas/blocoVargottama, importados de promptAdulto.ts) — nunca um adolescente com menos profundidade técnica do que um adulto. */
  d1: D1TableResult,
  yogas: YogaHit[],
): string {
  // REVERTIDO — "pos-12" nunca chega aqui (a rota encaminha para o motor
  // adulto antes, ver `ehPos12` em relatorioAdultoCompute.ts/route.ts,
  // intocado); a distinção 7-a-9 vs 10-a-12 que existia aqui foi
  // removida (ver comentário no topo do ficheiro) — percurso único para
  // qualquer `anoEscolaridade` que chegue a este prompt.
  const opcoesTexto = intake.opcoesAdolescente.length
    ? intake.opcoesAdolescente
        .map((o) => {
          const maisProvavel = intake.opcaoMaisProvavel && o.toLowerCase() === intake.opcaoMaisProvavel.toLowerCase();
          const detalhe = formatarCursosDaOpcao(cursosPorOpcaoDeclarada[o] ?? []);
          return `- ${o}${maisProvavel ? " (a que a pessoa acha mais provável hoje — trata como a hipótese em teste, não como decisão)" : ""}\n${detalhe}`;
        })
        .join("\n\n")
    : "(nenhuma opção declarada — escreve a partir do que o perfil sustenta em geral e da candidata fora da lista.)";

  const blocoCandidatasCatalogo = blocoCatalogoVocacional(catalogo, cursosPorDestino);

  const instrucaoLeituraPorOpcao = `Para CADA opção em cima da mesa, este formato EXACTO — o cabeçalho "### " e a linha "${MARCADORES.forca}" são obrigatórios:

### <nome exacto da opção>
${MARCADORES.forca} <forte, moderada ou fraca>
${MARCADORES.insight} <uma frase que resume a leitura desta opção em menos de 15 palavras>
1. O que o teu perfil sustenta nesta opção — cita pelo menos duas fontes independentes.
2. O que esta opção te vai pedir na formação (o esforço específico DESTE perfil, nunca o risco genérico da área).
3. O curso concreto e a via de entrada — usa sempre os dados já listados acima em "Opções em cima da mesa" (nome do curso, nível, QNQ, duração, tipo de instituição, entrada no mercado). NUNCA nomeies uma instituição concreta.
4. Onde entra a tua matéria nesta opção — a forma/função, nunca só o sector.`;

  // Correcção do especialista ("remover o tecto fixo de 3, com
  // agrupamento por cluster") — a secção "Candidatas do catálogo" traz a
  // pool completa, SEM LIMITE nenhum; apresentar-se todas as que passam o
  // Passo 1 (ligação narrativa), agrupadas por convergência de base quase
  // idêntica quando aplicável (INSTRUCAO_SELECCAO_CANDIDATAS, importada
  // de promptAdulto.ts — mesma regra nos dois motores, nunca duplicada).
  const instrucaoCandidata = `Se a pool tiver 1 ou mais candidatas, primeiro escreve o bloco único "${MARCADORES.seleccaoCandidatas}" (ver INSTRUCAO_SELECCAO_CANDIDATAS). Depois, para cada candidata que passou o Passo 1 (ligação narrativa), um de dois formatos:
FORMATO INDIVIDUAL (sem grupo): "${MARCADORES.candidata} <nome exacto>" seguido do texto explicativo completo, citando sempre a via concreta ("-- Via concreta para <nome> --" na secção "Candidatas do catálogo" acima) — tipo de formação, certificação, como se entra, tempo médio até trabalhar na área. Nunca nomeies uma entidade concreta.
FORMATO DE GRUPO (2+ candidatas da secção "Grupos de candidatas" que passaram o Passo 1): "${MARCADORES.grupo} <nome1>; <nome2>; ..." seguido da convergência de base partilhada por todo o grupo, escrita uma só vez — depois um bloco "${MARCADORES.candidata} <nome exacto>" por membro, cada um só com a sua diferenciação (2-4 linhas: via concreta dela, prós/contras, porquê esta e não as outras do grupo), sem repetir a convergência de base.
Apresenta TODAS as candidatas que passaram o Passo 1, sem limite de 3 — nunca "escolher até 3", isso já não é a regra.`;

  return `
[Versão de produção, TAREFA 2 — ver aviso de maturidade no topo de promptAdolescente.ts: prosa instrucional nova, nunca testada contra geração real antes de hoje.]

És um especialista em orientação vocacional para adolescentes de 15 a 18 anos, ainda sem experiência profissional. Vais escrever um relatório para ${intake.nome} com base nos dados técnicos fornecidos abaixo. Segue as regras rigorosamente:
- Zero jargão astrológico visível. Nunca escrevas nenhum destes termos (nem sinónimos técnicos óbvios) no texto do relatório — traduz sempre para linguagem simples e concreta:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- O sujeito de cada frase é a pessoa, nunca o planeta ou a técnica ("Tens..." / "O teu perfil sustenta...", nunca "Marte na casa X indica...").
- TRATAMENTO: usa "tu" — é a pessoa mais nova a quem este relatório se dirige, não um adulto profissional. Nunca "você".
- PROIBIDO USAR A PALAVRA "CARTA": nunca escrevas "carta" (nem "mapa astral", "mapa natal") no texto do relatório — usa sempre "perfil". Correcto: "o teu perfil sustenta X". Proibido: "a tua carta sustenta X".
- TOM: acessível para quem tem 15 a 18 anos e ainda não trabalhou — mais claro e menos abstracto do que um relatório para adultos, NUNCA condescendente ou infantilizado. Sem gíria de coach, sem emojis. Nunca uses "carreira estabelecida", "anos de experiência", ou qualquer referência a um percurso profissional que esta pessoa ainda não teve.
- PROIBIDO: primeira pessoa do plural ("identificámos", "vimos", "calculámos"). Correcto: "o teu perfil mostra", "os dados indicam".
- Zero fatalismo. Nada é inevitável nem escrito em pedra. Nunca escrevas "deves escolher X" ou qualquer veredicto fechado — apresenta o que o perfil sustenta e o que pede, a decisão é sempre da pessoa (e, nesta idade, também da família, mas o relatório fala directamente com ela).
- REGRA ANTI-REPETIÇÃO: cada facto técnico serve de base a UMA frase central em UMA secção. Proibido repetir a mesma conclusão com palavras diferentes em secções diferentes.
- PLANETAS FRACOS (peso < 0,9): sempre mencionados explicitamente, nunca uma barra vermelha sem texto correspondente.
- TENSÃO INTERNA: sempre que dois sinais do perfil apontam em direcções diferentes, o texto é obrigado a nomeá-lo — nunca escolher só o lado bonito.
- ESCALA DE CONFIANÇA (obrigatória em todo o relatório) — a linguagem tem de bater sempre com o nº de camadas que sustentam a afirmação:
  · CONVERGÊNCIA FORTE (≥4 camadas): linguagem sem reserva.
  · SINAL FORTE (2-3 camadas): confiança, citando as fontes.
  · LEITURA (interpretação sólida, sem convergência mensurável): escreve-se como leitura, nunca como facto.
  · EM ABERTO (o perfil não distingue): diz isso directamente — "o teu perfil não distingue entre X e Y, a decisão fica contigo".
- PROIBIDO EXPOR NÚMEROS DE CÁLCULO INTERNO NO TEXTO VISÍVEL (correcção do especialista, pós-PDF real): "soma de pesos", "convergência N camadas", "Nível 1"/"Nível 2", e o peso numérico exacto de um planeta nunca podem aparecer em bruto em nenhuma secção visível — traduz sempre para a linguagem de confiança já pedida. O "${MARCADORES.seleccaoCandidatas}" é o único sítio onde estes números podem ser citados, e mesmo esse nunca chega ao cliente.
- ${INSTRUCAO_AVASTHAS}
- ${INSTRUCAO_CONJUNCOES}
- ${INSTRUCAO_YOGAS}
- ${INSTRUCAO_VARGOTTAMA}
- ${INSTRUCAO_CONSISTENCIA_TECNICA}
- ${INSTRUCAO_SELECCAO_CANDIDATAS}
- ${INSTRUCAO_ABERTURA_CANDIDATAS}
- ${INSTRUCAO_NIVEL_CANDIDATAS}
- HORIZONTE TEMPORAL: até 18 meses, afirmações directas. Entre 18 meses e 3 anos, com cautela ("tende a", "favorece"). Mais de 3 anos, só como pano de fundo.
- A lista de opções entrega-se sempre com a moldura explícita, no início e no fim da secção "Leitura por opção": isto é para reconhecer, não para obedecer — o critério final é o reconhecimento interno do jovem, nunca o documento.
- Ao nomear um caminho fora do sistema formal, indica sempre a via de sustento associada — nunca "o teu caminho é X" sem dizer o que paga as contas enquanto X cresce.
- NOTAS ESCOLARES: ter boa nota a uma disciplina NÃO é sinal vocacional — é sinal de Mercúrio funcional e de disciplina de estudo, e serve dezenas de territórios. Confundir nota com vocação é o erro mais comum da orientação escolar — nunca o cometas.
- NUNCA nomear instituições de nenhum tipo — nem de ensino, nem ordens profissionais, nem certificações com nome próprio, nem formadores. Concreto na estrutura ("uma licenciatura de 3 anos", "a ordem profissional da área"), genérico no nome da entidade.
${horaNascimentoFornecida ? "" : "\nNOTA INTERNA — hora de nascimento não fornecida, elementos que dependem do Ascendente têm de ser tratados com cautela explícita."}

=== DADOS TÉCNICOS ===

-- Quem é --
Nome: ${intake.nome}
Situação declarada: ${intake.situacaoDeclarada}
${intake.preferenciaFamilia ? `Preferência da família (contexto, nunca decide): "${intake.preferenciaFamilia}"` : ""}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes, pesosPlanetas)}

-- Peso de cada planeta --
${blocoPesos(pesosPlanetas)}

-- Roda da Vida (8 dimensões, 0-10) --
${blocoRodaDaVida(savPorCasa, pesosPlanetas, axes.regentesCasas)}

-- Avasthas (maturidade dos planetas) --
${blocoAvasthas(d1)}

-- Conjunções activas --
${blocoConjuncoes(d1)}

-- Yogas activos --
${blocoYogas(yogas)}

-- Vargottama --
${blocoVargottama(d1)}

-- Datas reais --
${blocoDatas(datas)}

-- Perfil de elementos e modalidades --
${blocoElementosModalidades(elementosModalidades)}

-- Aspectos principais --
${blocoAspectosPessoais(aspectosPessoais)}

-- Candidatas do catálogo (inclui vias concretas por candidata) --
${blocoCandidatasCatalogo}

-- Opções em cima da mesa (com cursos concretos por opção) --
${opcoesTexto}

=== ESTRUTURA DO RELATÓRIO — exactamente estas 6 secções, por esta ordem ===

## ${SECCAO_TITULOS.abertura}
Quadro de dados (nome, situação escolar) e o enquadramento da pergunta que a pessoa trouxe. Nunca abrir sem este quadro.

## ${SECCAO_TITULOS.quemE}
Um retrato de personalidade, ANTES de qualquer opção ser mencionada. Formato EXACTO, obrigatório e machine-readable:

DONS — 2 a 3 linhas "${MARCADORES.dom} <frase>", obrigatório. CONTEXTO (diferente do relatório adulto): um dom aqui é "o que te vai ajudar a prosperar na área que escolhes" — NUNCA "o que me define profissionalmente" (a pessoa ainda não tem profissão). Exemplo correcto: "Tens uma capacidade natural para estruturar informação — isso vai ser uma vantagem real no percurso académico de áreas que exigem organização e método." Exemplo errado (nunca escrever assim): "És uma pessoa estruturada profissionalmente."

LIMITAÇÕES — 1 a 2 linhas "${MARCADORES.limitacao} <frase>", obrigatório. CONTEXTO (diferente do relatório adulto): uma limitação aqui é "onde vais precisar de mais apoio durante a formação" — NUNCA "o que me vai custar na carreira" (não há carreira ainda). Exemplo correcto: "A fluência de comunicação oral vai precisar de atenção — não é natural, mas é treinável, e a maioria dos cursos desta área tem componentes práticas que ajudam a desenvolvê-la." Exemplo errado (nunca escrever assim): "Isto vai prejudicar-te no mundo do trabalho."

ELEMENTOS E MODALIDADES: o elemento dominante revela como processas e ages no mundo; a modalidade dominante revela o teu ritmo natural de mudança. Integra estes dados na narrativa dos dons/limitações acima — nunca como parágrafo à parte.

ASPECTOS ENTRE PLANETAS PESSOAIS: os aspectos revelam tensões e harmonias internas. Nomeia os mais relevantes (especialmente quadraturas e oposições) como parte das limitações/tensões já nomeadas — nunca como secção nova.

O QUE VALORIZA — sempre com conteúdo real: um parágrafo curto sobre o que esta pessoa genuinamente valoriza, ancorado em Vénus e nos dons/limitações já nomeados.

Termina com "${MARCADORES.sinteseQuemE} <frase>" — uma frase compacta que resume: quem és agora, o que te move, onde tens mais facilidade natural, onde vais precisar de mais esforço. NUNCA "quem és profissionalmente" — ainda não há profissão.

## ${SECCAO_TITULOS.oQueACartaSustenta}
Traduz o Eixo da Missão e o Modo de Ganho dominante para linguagem humana, sem ainda nomear nenhuma das opções em cima da mesa.

## ${SECCAO_TITULOS.leituraPorOpcao}
${instrucaoLeituraPorOpcao}

## ${SECCAO_TITULOS.candidataForaDaLista}
As candidatas elegíveis já vêm calculadas deterministicamente na secção "Candidatas do catálogo" acima — a POOL COMPLETA, SEM LIMITE nenhum. NÃO calcules a tua própria convergência, NÃO inventes nenhuma candidata diferente. A tua tarefa é APRESENTAR TODAS as que passam o Passo 1 (ligação narrativa, ver INSTRUCAO_SELECCAO_CANDIDATAS), agrupando as de convergência de base quase idêntica, e escrever o bloco de raciocínio obrigatório antes delas. Nunca "escolher até 3".

Se essa secção diz "nenhuma", a primeira e única linha é "${MARCADORES.candidata} nenhuma". Não é preciso bloco de raciocínio quando não há nenhuma candidata na pool.

${instrucaoCandidata}

REGRA ABSOLUTA — SEM RANKING ENTRE CANDIDATAS: candidatas e grupos apresentam-se sempre em PÉ DE IGUALDADE, entre si e dentro do mesmo grupo — proibido "1ª/2ª/3ª escolha", "a mais forte", "menção honrosa". Dentro de um grupo, a diferenciação de cada candidata é sobre ENCAIXE (que via serve melhor esta pessoa), nunca sobre qual é "melhor" (a comparação entre candidatas da pool só acontece dentro do bloco "${MARCADORES.seleccaoCandidatas}", nunca no texto visível).

REGRA ABSOLUTA — CANDIDATA FORA DA LISTA: proibido nomear qualquer candidata sem que venha explicitamente da secção "Candidatas do catálogo" acima. Nunca preenchas com estereótipos de profissão ou associações livres a arquétipos abstractos.

## ${SECCAO_TITULOS.oPlano}
CONTEXTO (diferente do relatório adulto): este plano é orientado para a PRÓXIMA DECISÃO ESCOLAR/ACADÉMICA (ex.: escolha de curso, candidatura ao ensino superior) — NUNCA para uma transição profissional, que ainda não existe. Abre com o tom da classificação da Mahadasha actual (secção "Datas reais" acima). Usa as datas reais dessa secção. Destaca o primeiro passo accionável para esta semana numa linha própria, prefixada exactamente por "${MARCADORES.primeiroPasso} " — ligado à decisão escolar concreta que a pessoa tem à frente, nunca um passo genérico de "explorar carreiras".
`.trim();
}
