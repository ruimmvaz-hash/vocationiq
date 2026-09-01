// FASE 1, Passo 4 — prompts das 14 secções do v3. Construído secção a
// secção, com aprovação entre cada uma (ver relatório desta sessão).
//
// FONTES NORMATIVAS (relidas por inteiro antes de escrever qualquer
// linha deste ficheiro): CODE-1-esqueleto-v2.md (as 5 regras que mandam +
// as 22 regras de escrita + a abertura/nota de leitura + a verificação) +
// CODE-1-esqueleto-v3.md (as 14 secções nomeadas + a escala de confiança)
// + CODE-4-melina-PASSA.md (alvo de qualidade — tom, densidade, nunca
// frases copiadas) + CODE-5-pares-traducao.md (o MOVIMENTO de tradução,
// nunca o fraseado) + CODE-2-mapa-de-entradas.md (princípios de
// atribuição de dados — está desactualizado na estrutura de secções, mas
// os princípios de atribuição, ex. "aspecto ocidental pertence ao planeta
// mais rápido", continuam válidos).
//
// SECÇÃO 0 — ABERTURA. Não é um prompt — é determinística, tal como o v2
// exige ("nunca se abre com uma frase solta... o relatório abre com o
// nome da pessoa e um quadro"). Nenhuma destas frases é decidida pelo
// LLM; isso é o ponto — a abertura nunca pode variar de corrida para
// corrida, nem "esquecer" um campo do quadro (foi exactamente essa falha,
// documentada no v2, que a régua de código deste ficheiro existe para
// impedir).

import type { CamadaA, AberturaV3, DesfechoEspinha, NiveauConfianca } from "../types-v3";
import { NOME_SIGNO_PT, formatarSinalParaPrompt, serializarSinal, termotecnicoDeDignidadeClassica, DEFINICOES_CASA, traduzirSinal } from "./linguagem-naveya";
import type { DerivacaoEspinha } from "./espinha";
import { gerarDescobertasCandidatas } from "./descobertas";
import type { TransitoLento, ContactoNatal, CorpoLento } from "./transitsV3";
import { bandaAbsolutaSav, ROTULO_CASA_NAVEYA, DEFINICOES_KARAKAMSHA_SIGNO, DEFINICAO_ARUDHA_LAGNA, instrucaoMostrarTermo } from "./linguagem-naveya";
import { CLASSICAL_GRAHAS } from "../lifeReport/types";
import { signOfHouse } from "../lifeReport/positions";

/**
 * Dados do cliente, forma local a method-engine — NUNCA importa
 * `ReportRequest` da camada web (dependência ao contrário: web depende de
 * method-engine, não o inverso). O `ReportRequest` resolve-se para isto
 * no mesmo sítio onde já resolve para `BirthInput` antes de chamar
 * `gerarCamadaA` (ver nota em camada-a.ts).
 *
 * `situacaoDeclarada` e `mainQuestion`: para relatórios 'individual' (ver
 * ANALISE-MOTOR-vs-v2v3-22Ago.md, achado do intake reformado) estes dois
 * campos são LITERALMENTE o mesmo texto — a "situação" escolhida pelo
 * cliente é guardada directamente como a pergunta principal. Passam-se
 * os dois na mesma interface para os tipos de relatório onde não
 * coincidem (o que o v2 previa originalmente), mas o chamador pode
 * repetir o mesmo valor nos dois campos sem problema.
 */
export interface DadosClienteV3 {
  nomeCliente: string;
  /** Já formatada para leitura humana — ex. "11 de Dezembro de 1984", não ISO. */
  dataNascimentoFormatada: string;
  /** Ex. "08:30". */
  horaNascimentoFormatada: string;
  localNascimento: string;
  residenciaActual: string;
  profissao: string;
  mainQuestion: string;
  situacaoDeclarada: string;
  /**
   * Texto livre opcional do formulário de intake ("additionalContext" do
   * lado web) — usado, por agora, só pela Secção 12 (o menu de propostas):
   * calibra as propostas pela situação real do cliente, em vez de as deixar
   * genéricas. Adicionado 23/08/2026, por pedido explícito desta sessão.
   */
  additionalContext?: string;
}

/**
 * CORRECÇÕES 25/08/2026 ("Correcções críticas ao motor v3", pontos 2 e
 * 3B) — duas instruções novas, partilhadas por TODOS os prompts de
 * secção, inseridas juntas porque as duas dependem da mesma afirmação da
 * espinha:
 *
 *  · Matéria vs. contexto (ponto 2) — os prompts já tinham a instrução
 *    geral de "termo — definição" para CASAS individuais, mas nada
 *    impedia o LLM de tratar o SIGNIFICADO GENÉRICO de uma casa (ex.:
 *    "casa 8 = heranças") como se fosse a matéria da secção, mesmo
 *    quando a matéria real desta carta é outra (a espinha). Esta
 *    instrução torna explícito que a espinha é sempre a matéria, e a
 *    casa é só o contexto onde ela aparece.
 *
 *  · Espinha não repetida (ponto 3B) — reforça em texto o que o
 *    Critério G (código, ver verificacao.ts) já verifica depois de
 *    escrito: a frase da espinha só pode ser usada, verbatim ou quase,
 *    na secção que a introduz — nas restantes, tem de ser um ângulo
 *    novo. As duas correcções ficam fundidas num único bloco de
 *    instrução porque APONTAM PARA O MESMO RISCO (repetir a espinha
 *    como fórmula, em vez de a usar como matéria a aprofundar).
 *
 * Sem afirmação (carta sem espinha — `ausencia-declarada`), devolve
 * string vazia: não há frase nenhuma para citar ou proteger.
 */
function instrucaoMateriaEEspinha(desfecho: DesfechoEspinha): string {
  const afirmacao = "afirmacao" in desfecho ? desfecho.afirmacao : null;
  if (!afirmacao) return "";
  return `## Regra crítica — matéria vs. contexto

A matéria deste relatório é a espinha: "${afirmacao}"

As casas são CONTEXTO — onde a espinha se manifesta — nunca a matéria em si.

PROIBIDO: "esta área da carta indica heranças"
CORRECTO: "é neste território que a tua necessidade de assinatura própria se manifesta com mais força"

A matéria é sempre a espinha. O contexto é sempre específico desta carta.

## Regra crítica — espinha não repetida

A espinha é: "${afirmacao}"

Esta frase ou versão muito próxima só pode aparecer UMA VEZ em todo o relatório — na secção onde é introduzida pela primeira vez.

Em todas as outras secções: NUNCA repetir a frase. Ilustrar um ângulo diferente. Aprofundar, nunca repetir.
`;
}

/**
 * CORRECÇÃO 25/08/2026 ("Correcções críticas ao motor v3", ponto 5) — o
 * Karakamsha (signo do Atmakaraka no D-9) estava calculado
 * (`karakas.atmakarakaD9Sign`) desde o início da sessão, mas nunca citado
 * em nenhum prompt. Construído manualmente no mesmo formato de
 * `serializarSinal` — não passa por `traduzirSinal`/`formatarSinalParaPrompt`
 * porque esses só sabem traduzir grahas/casas/dignidades, nunca um
 * SIGNO como termo próprio; introduzir um signo como categoria nova
 * nesse dispatcher genérico, só para este único uso, seria mais código
 * do que construir a string aqui directamente.
 */
function sinalKarakamsha(camada: CamadaA): string {
  const signo = camada.karakas.atmakarakaD9Sign;
  const termo = NOME_SIGNO_PT[signo];
  const definicao = DEFINICOES_KARAKAMSHA_SIGNO[signo];
  return `SINAL: Karakamsha (signo do Atmakaraka no D-9)\nTERMO A ESCREVER NO TEXTO: ${termo}\nDEFINIÇÃO NAVEYA: "${definicao}"\nINSTRUÇÃO: ${instrucaoMostrarTermo(termo)}`;
}

/** Mesma lógica de `sinalKarakamsha` — a Arudha Lagna é um conceito próprio (não um graha/casa/dignidade), construído manualmente. */
function sinalArudhaLagna(camada: CamadaA): string {
  return `SINAL: Arudha Lagna (AL) — imagem pública\nTERMO A ESCREVER NO TEXTO: Arudha Lagna\nDEFINIÇÃO NAVEYA: "${DEFINICAO_ARUDHA_LAGNA}"\nINSTRUÇÃO: ${instrucaoMostrarTermo("Arudha Lagna")}`;
}

const SISTEMAS_USADOS_TEXTO =
  "Sideral, ayanamsa Lahiri, casas de signo inteiro — o que é e quando. Tropical, Placidus — como se sente. Nunca misturados; quando divergem, o relatório diz.";

const MEDIDA_TEXTO =
  "Este relatório usa uma medida chamada apoio — quanto cada área da tua vida tem a favor dela, de 0 a 56, com uma média à volta de 28. Apoio alto: as coisas fluem com menos esforço. Apoio baixo: o mesmo esforço rende menos, e pede alavanca, não mais esforço.";

const ONDE_PARAR_TEXTO = "O plano está na secção «O Plano». Se só leres uma coisa deste relatório, lê essa.";

/**
 * Constrói a Abertura (secção 0). Determinística — sem chamada ao LLM.
 * Cumpre a Regra D da verificação do v2 ("a abertura tem o quadro: nome,
 * dados de nascimento, residência, sistemas usados e pergunta enquadrada,
 * antes da nota de leitura — ausência de qualquer um destes reprova a
 * abertura inteira") por construção: o tipo `AberturaV3` não permite
 * omitir nenhum destes campos.
 */
export function construirAbertura(camada: CamadaA, dados: DadosClienteV3): AberturaV3 {
  const nomeSigno = NOME_SIGNO_PT[camada.signoSolarTropical];

  // Nota de leitura, parte 1 — "o signo dela" (v2: "se o relatório usar
  // ascendentes, tem de dizer que são ascendentes e que são outra
  // coisa" — cumprido explicitamente na segunda frase).
  //
  // CORRIGIDO 23/08/2026 — a primeira versão abria com "Continuas a ser
  // de X", que pressupõe uma interacção anterior (uma conversa em que já
  // se tinha estabelecido o signo). Num relatório enviado pela primeira
  // vez isso não faz sentido — ninguém "continua a ser" nada em relação a
  // um documento que nunca leu. Reescrito para afirmar o signo
  // directamente (funciona para quem nunca ouviu falar da Naveya) sem
  // invalidar o que a pessoa já sabe de si, e sem pressupor conhecimento
  // de astrologia.
  // EXCEPÇÃO à correcção global de linguagem de 23/08/2026 (ver
  // linguagem-naveya.ts): o signo solar aqui nomeia-se UMA vez, sem
  // definição Naveya a seguir — não é um sinal a traduzir, é a âncora que
  // a pessoa já tem de si própria antes de abrir o relatório. Quando
  // `verificacao.ts` existir, o critério anti-jargão tem de excluir esta
  // linha em particular (é a única ocorrência de nome de signo permitida
  // sem o formato "termo — definição").
  const oSigno = `O teu signo solar é ${nomeSigno} — e continua a ser. Este relatório não o substitui: olha para outras partes da tua carta, que o signo solar sozinho não alcança. Onde vires um ascendente, ou uma posição que parece outro signo, é isso mesmo — outra camada de leitura, nunca uma contradição ao que já sabias de ti.`;

  return {
    nomeCliente: dados.nomeCliente,
    quadroDados: {
      dataNascimento: dados.dataNascimentoFormatada,
      horaNascimento: dados.horaNascimentoFormatada,
      localNascimento: dados.localNascimento,
      residenciaActual: dados.residenciaActual,
      sistemasUsados: SISTEMAS_USADOS_TEXTO,
      profissao: dados.profissao,
      perguntaDeclarada: dados.mainQuestion,
      situacaoDeclarada: dados.situacaoDeclarada,
    },
    // v2, regra 20a: nunca uma citação a solo — "a pergunta que nos
    // trouxeste a este relatório foi: «…»" é exactamente o enquadramento
    // que o v2 exige e cujo exemplo de falha (a mesma frase sem isto)
    // documenta.
    perguntaEnquadrada: `A pergunta que nos trouxeste a este relatório foi: «${dados.mainQuestion}»`,
    notaLeitura: {
      oSigno,
      aMedida: MEDIDA_TEXTO,
      ondeParar: ONDE_PARAR_TEXTO,
    },
  };
}

// ── SECÇÃO 3 — VEREDICTO ─────────────────────────────────────────────────
// Ao contrário da Abertura, esta secção É um prompt — o texto é escrito
// pelo LLM. `construirPromptSeccao3` devolve a STRING a enviar ao modelo,
// nunca o texto final do relatório (essa chamada é do orquestrador, ainda
// por construir).

/**
 * Descrição, em linguagem Naveya, do PAPEL que cada uma das 9 camadas de
 * espinha.ts desempenha — fixa, independente da carta (o que muda de
 * carta para carta é qual delas confirma, não o que cada uma significa).
 * Nunca nomeia o termo técnico (Karakamsha, Dasha, Sarvashtakavarga) — só
 * o que ele FAZ. Usada para dar ao LLM contexto seguro sobre as camadas
 * que não mapeiam directamente para um graha/casa (ver `sinaisDaEspinha`).
 */
export const PAPEL_CAMADA: Record<string, string> = {
  "Atmakaraka e a casa onde está": "a peça que representa o centro de tudo o resto na carta, e a área da vida onde essa peça se instalou.",
  Karakamsha: "o sítio onde aquilo em que a pessoa quer tornar-se amadurece.",
  "Regente do Ascendente e a sua posição": "quem comanda a forma como a pessoa se apresenta ao mundo, e onde essa força foi morar.",
  "Lua e nakshatra da Lua": "o que a pessoa sente antes de pensar, e a configuração que dá forma a esse sentir.",
  Stelliums: "uma concentração de força incomum, toda no mesmo sítio da vida.",
  "Sarvashtakavarga (apoio máximo)": "a área da vida com mais apoio de todas — onde o mesmo esforço rende mais.",
  "Figuras fechadas dominantes": "uma tensão estrutural que atravessa vários pontos da carta e se resolve precisamente nesta área.",
  "Dasha actual": "o período de vida que a pessoa está a atravessar agora, e o que ele activa.",
  "Força do Atmakaraka (dignidade / Panchadha Maitri)": "o estado em que essa peça central se encontra — instalada com força, ou a lutar contra o terreno.",
};

/**
 * Traduz a casa-seed e o Atmakaraka em blocos de sinal (técnico +
 * definição Naveya + instrução), e junta uma lista Naveya-segura das
 * restantes camadas confirmantes (via PAPEL_CAMADA, nunca o nome técnico
 * cru de espinha.ts).
 */
function sinaisDaEspinha(camada: CamadaA, espinha: DerivacaoEspinha): string {
  const ak = camada.karakas.atmakaraka;
  const blocos: string[] = [];

  const sinalAk = formatarSinalParaPrompt(ak, "Atmakaraka");
  if (sinalAk) blocos.push(serializarSinal(sinalAk));

  const sinalCasa = formatarSinalParaPrompt(`casa-${espinha.casaSeed}`, "a área de vida onde o Atmakaraka está instalado");
  if (sinalCasa) blocos.push(serializarSinal(sinalCasa));

  const dign = camada.dignidades[ak];
  const termotecnicoDignidade = dign.panchadha ?? termotecnicoDeDignidadeClassica(dign.classica);
  const sinalDignidade = termotecnicoDignidade ? formatarSinalParaPrompt(termotecnicoDignidade, "força do Atmakaraka no signo que ocupa") : null;
  if (sinalDignidade) blocos.push(serializarSinal(sinalDignidade));

  const outrasCamadas = espinha.camadasConfirmantes.filter((nome) => nome !== "Atmakaraka e a casa onde está" && !nome.startsWith("Força do Atmakaraka"));
  if (outrasCamadas.length > 0) {
    const linhas = outrasCamadas.map((nome) => `- ${PAPEL_CAMADA[nome] ?? nome}`).join("\n");
    blocos.push(`CONTEXTO ADICIONAL (camadas que confirmam o mesmo tema, já em linguagem segura — nunca nomear de onde vêm):\n${linhas}`);
  }

  return blocos.join("\n\n");
}

const REGRAS_V2_VEREDICTO = `- Regra que manda 1 (v2): este relatório abre — nesta secção — respondendo à pergunta que a pessoa trouxe. Sem esquiva.
- Regra 2: nenhuma faculdade abstracta é sujeito de frase ("a tua força de acção decide..." está PROIBIDO). O sujeito é sempre a pessoa.
- Regra 9: os elos da razão dizem-se seguidos, na mesma secção — nunca espalhados, à espera que a leitora os junte sozinha.
- Regra 10: proibida a fórmula "Não é X. É Y." como molde repetido.
- Regra 13: o absoluto pode descrever o desenho ("é o único caminho que este desenho não abre"), nunca pode fechar a pessoa ("é o único caminho que funciona para ti").
- Regra 14: a pergunta manda sobre qualquer sector ou opção que a pessoa já tenha nomeado — nunca o contrário.
- Regra 18: cada razão dada tem de vir de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.
- Regra 19a: se citares tempo, só ao mês — nunca ao dia.
- Regra 20a: nenhuma frase (nem a pergunta, nem uma citação) aparece sem o contexto que a explica na mesma frase ou na anterior.`;

/**
 * Constrói o prompt da Secção 3 — Veredicto. Devolve a STRING a enviar ao
 * LLM (nunca o texto final). `dados.mainQuestion` é a pergunta declarada;
 * `espinha` é o resultado de `derivarEspinha` (não só o `DesfechoEspinha`
 * — precisa-se do detalhe de camadas para montar os sinais).
 */
export function construirPromptSeccao3Veredicto(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string {
  const desfecho: DesfechoEspinha = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;
  const nivelEspinha = desfecho.tipo === "convergencia" ? desfecho.nivel : desfecho.tipo === "padrao-estrutural" ? "leitura" : "em-aberto";

  return `Tu és o redactor do Naveya Method, secção "O Veredicto" (secção 3 de 14 do relatório).

## O que esta secção tem de fazer

Responder DIRECTAMENTE à pergunta que a pessoa trouxe. Não esquive — "depende" ou "há várias hipóteses" reprova esta secção. Dê uma resposta concreta, depois as razões.

Máximo 3 parágrafos. O primeiro parágrafo É a resposta — não uma introdução ao que vem a seguir.

## A pergunta declarada (regra 20a — cite-a enquadrada, nunca a solo)

«${dados.mainQuestion}»

Comece por algo como "A pergunta que nos trouxeste a este relatório foi: «${dados.mainQuestion}»" — ou equivalente, no seu próprio tom — antes de responder.

## A espinha deste relatório — NUNCA repetir literalmente, NUNCA contradizer

${afirmacaoEspinha ?? "Esta carta não tem uma espinha clara (ver metadados) — responda apoiando-se directamente nos sinais abaixo, sem inventar uma convergência que não existe."}

Esta é a afirmação central do relatório inteiro — já foi dita (ou será dita) noutra secção. AQUI, nunca a repita com as mesmas palavras. Ilustre-a pelo ângulo específico da pergunta desta pessoa. O veredicto tem de ser CONSISTENTE com ela — nunca pode dizer o oposto.

## Escala de confiança — obrigatória nas razões, o nível vem daqui, nunca invente

Nível geral desta espinha: **${nivelEspinha}**.
${formatarSinalParaPrompt(nivelEspinha, "nível de confiança das razões do veredicto") ? serializarSinal(formatarSinalParaPrompt(nivelEspinha, "nível de confiança das razões do veredicto")!) : ""}

Cada razão que der para o veredicto usa este MESMO nível (não invente um nível diferente por razão — todas as razões vêm da mesma convergência). Na prosa, isto significa: se o nível for "convergência forte", escreva com a firmeza que isso merece; se for "leitura" ou "em aberto", não finja mais certeza do que a carta dá.

## Os sinais — a matéria-prima das suas razões

${sinaisDaEspinha(camada, espinha)}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_VEREDICTO}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número, termos sânscritos (Atmakaraka, Karakamsha, dasha, dignidade, Panchadha Maitri) e termos de astrologia ocidental (T-Quadrado, Yod, aspecto) — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, inteligente. Emocional mas concreto — nunca místico, nunca promessa exagerada, nunca linguagem de coaching ("liberta o teu potencial", "abraça a jornada"). Escreva como quem já decidiu o que vai dizer, não como quem está a pensar em voz alta.

## Formato de saída

Prosa corrida, sem títulos, sem lista com marcadores. Máximo 3 parágrafos. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 2 — CINCO DESCOBERTAS ─────────────────────────────────────────
// Critério G do v3: exactamente 5, cada uma com base identificável na
// Camada A e etiqueta de confiança. Critério do próprio pedido: a
// primeira é sempre a espinha ou a sua consequência mais directa; nenhuma
// contradiz a espinha; cada uma é distinta. Os candidatos e os níveis
// vêm de `descobertas.ts` — o LLM nunca inventa nem o quê, nem o nível.

const REGRAS_V2_DESCOBERTAS = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 3 (uma coisa acontece uma vez): a mesma descoberta não pode reaparecer, reformulada, noutra das cinco.
- Regra 4: nenhum número muda — se disser "duas leituras confirmam", diga duas em toda a descoberta.
- Regra 7: sempre que a descoberta falar de uma área com pouco apoio, diga primeiro que a capacidade está intacta e só depois que falta alavanca — nunca sugira que a pessoa não serve.
- Regra 8: uma colocação tem sempre as duas faces — nunca só o lado que dói, nem só o lado que agrada.
- Regra 12: sem superlativo sem contagem feita, e no máximo um "a mais forte de todas" no conjunto das cinco.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 16: qualquer referência ao passado da pessoa vai em condicional ("provavelmente já reparaste", nunca uma afirmação directa sobre o que ela viveu).
- Regra 18: cada descoberta tem de vir de um facto identificado — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 2 — Cinco Descobertas. Devolve a string a
 * enviar ao LLM. Internamente chama `gerarDescobertasCandidatas` — se a
 * carta não sustentar 5 candidatas distintas, o prompt reflecte isso
 * explicitamente (nunca instrui o LLM a inventar uma sexta para
 * completar).
 */
export function construirPromptSeccao2CincoDescobertas(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string {
  const { candidatas, avisos } = gerarDescobertasCandidatas(camada, espinha);
  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  const blocosDescoberta = candidatas
    .map((c, i) => {
      const sinaisTexto = c.sinais.map(serializarSinal).join("\n\n");
      return `### Candidata a descoberta ${i + 1}${i === 0 ? " (esta é sempre a primeira — a espinha em acção)" : ""}
Nível de confiança OBRIGATÓRIO para esta descoberta: **${c.nivel}** — não mude este nível.
Ângulo: ${c.angulo}

${sinaisTexto || "(sem sinal técnico formal — escreva só a partir do ângulo acima, sem inventar um facto novo)"}`;
    })
    .join("\n\n---\n\n");

  const avisoTexto =
    candidatas.length < 5
      ? `\n\nAVISO — esta carta só sustenta ${candidatas.length} descobertas distintas, não 5. Escreva só estas ${candidatas.length}, na ordem dada. NUNCA invente uma descoberta extra para chegar a 5 — omitir é sempre melhor do que encher com conteúdo nulo (regra 0 das que mandam, v2).`
      : "";

  return `Tu és o redactor do Naveya Method, secção "As Cinco Descobertas" (secção 2 de 14 do relatório).

## O que esta secção tem de fazer

Escrever ${candidatas.length === 5 ? "exactamente cinco" : candidatas.length} descoberta(s) — cada uma uma revelação concreta e reconhecível, nunca uma descrição vaga de potencial. Cada pessoa lê a sua descoberta e pensa "isto é sobre mim", não "isto podia ser sobre qualquer pessoa".

Ordene-as da mais forte para a menos forte — a ordem abaixo já está nessa sequência, mantenha-a.

## A espinha — referência, nunca repetição

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — escreva as descobertas directamente a partir dos sinais abaixo."}

Nenhuma das cinco descobertas pode CONTRADIZER esta afirmação. A primeira descoberta é a sua consequência mais directa (ver candidata 1, abaixo) — as restantes são outras facetas, nunca repetições dela.

## As descobertas candidatas — o quê e o nível de confiança já vêm decididos

Cada bloco abaixo é uma descoberta. O nível de confiança JÁ FOI CALCULADO a partir dos dados da carta — nunca o mude, nunca invente um nível diferente, nunca escreva um nível para uma descoberta que não seja o indicado.
${avisoTexto}

${blocosDescoberta}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_DESCOBERTAS}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número, termos sânscritos (Atmakaraka, Karakamsha, dasha, Vargottama, Panchadha Maitri) e termos de astrologia ocidental (T-Quadrado, Yod, Grande Cruz, Kite, aspecto) — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, inteligente. Cada descoberta é uma frase de abertura forte e específica, seguida do que isso significa na prática — nunca um título seguido de explicação genérica.

## Formato de saída

${candidatas.length} parágrafos, um por descoberta, cada um começando por uma frase que funciona como título implícito (sem ser literalmente um título). Sem lista com marcadores, sem numeração visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 1 — O RETRATO EM 60 SEGUNDOS ──────────────────────────────────
//
// NOTA — divergência entre o v3 e o pedido desta sessão, reportada, não
// resolvida em silêncio: CODE-1-esqueleto-v3.md define as 9 linhas como
// "quem és · o que te move · o que te trava · onde rendes mais · onde
// rendes menos · o padrão central · direcção · próximo movimento · o que
// fica em aberto" — um conjunto ABSTRACTO, sem ligação explícita a
// secções concretas. O pedido desta sessão dá 9 ângulos DIFERENTES
// ("identidade, forma de decidir, bloqueio principal, dinheiro, como é
// vista, o momento actual, o que fazer, o custo de não fazer, e uma
// última coisa"), cada um já amarrado a uma secção concreta — o que serve
// melhor o critério F do v3 ("cada afirmação nela tem rastreio para uma
// secção posterior"), mas não é literalmente o texto do v3. Implementado
// aqui o conjunto do pedido (mais fácil de rastrear), com a divergência
// registada — decisão a confirmar antes de produção.
//
// Três das 9 linhas apontam para secções CONDICIONAIS do v3 (6, 7, 14),
// que podem não existir em todas as cartas. Esta implementação confirma
// se cada uma está activa nesta CamadaA (via os mesmos sinais que
// `descobertas.ts` usa) e ajusta a referência quando não estiver —
// nunca aponta para uma secção que a carta não sustenta.

/**
 * Exportada 23/08/2026 (construção de orquestrador.ts) — o orquestrador
 * precisa da MESMA lista de `seccaoReferencia` por linha, na mesma ordem,
 * para reconstruir `LinhaRetrato[]` a partir das 9 linhas de prosa que o
 * LLM devolve (o prompt não pede numeração nem JSON — ver "Formato de
 * saída" abaixo). Sem isto, não há forma de saber, depois da chamada,
 * qual das 9 linhas aponta para qual secção.
 */
export interface LinhaRetratoSpec {
  angulo: string;
  seccaoReferencia: string;
  sinais: string; // já serializado (SINAL/DEFINIÇÃO/INSTRUÇÃO), ou texto simples quando não há sinal formal
}

export function construirLinhasRetrato(camada: CamadaA, espinha: DerivacaoEspinha): LinhaRetratoSpec[] {
  const ak = camada.karakas.atmakaraka;
  const savBaixo = camada.sav.fiavel ? camada.sav.byHouse.find((h) => h.pontuacao < 25) : undefined;
  const temTransitoActivo = camada.slowTransits.some((t) => t.contactosNatal.length > 0);
  const s = (tecnico: string, contexto: string) => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  return [
    {
      angulo: "Identidade — quem esta pessoa é, por dentro. Reformule a espinha em MENOS palavras — nunca a copie.",
      seccaoReferencia: "Secção 4 — Quem és",
      sinais: [s(ak, "Atmakaraka"), s(`casa-${espinha.casaSeed}`, "onde essa identidade se instala")].filter(Boolean).join("\n\n"),
    },
    {
      angulo: "Forma de decidir — como esta pessoa toma decisões e age, ou hesita.",
      seccaoReferencia: "Secção 4 — Quem és",
      sinais: s("Mars", "como a pessoa decide e age"),
    },
    {
      angulo: savBaixo ? "O bloqueio principal — o que trava esta pessoa de usar o que tem. Separe capacidade de retorno (regra 7 do v2)." : "O bloqueio principal — se não houver um bloqueio concreto nesta carta, esta linha descreve o canal de acção mais fraco, sem inventar uma tensão que não existe.",
      seccaoReferencia: savBaixo ? "Secção 6 — O que te tem travado" : "Secção 8 — De onde vem o dinheiro (sem secção 6 activa nesta carta)",
      sinais: savBaixo ? s(`casa-${savBaixo.casa}`, "uma área de apoio baixo — capacidade intacta, falta alavanca") : "",
    },
    {
      angulo: "Dinheiro — de onde vem, ou devia vir, o que esta pessoa ganha.",
      seccaoReferencia: "Secção 8 — De onde vem o dinheiro",
      sinais: [s("casa-2", "o que possui e como fala do seu valor"), s("casa-11", "os ganhos e a rede")].filter(Boolean).join("\n\n"),
    },
    {
      angulo: "Como é vista — a distância entre como se vê e como o mercado a vê.",
      seccaoReferencia: "Secção 9 — Como és vista e pelo que pagam",
      sinais: [s("casa-10", "o lugar público e o nome"), s("casa-7", "os acordos e quem está do outro lado")].filter(Boolean).join("\n\n"),
    },
    {
      angulo: temTransitoActivo ? "O momento actual — o que está activo agora, e porquê agora." : "O momento actual — sem trânsito lento em contacto activo nesta carta, descreva o período pela dasha em curso, nunca invente um trânsito.",
      seccaoReferencia: temTransitoActivo ? "Secção 7 — O trânsito actual" : "Secção 11 — O relógio (sem secção 7 activa nesta carta)",
      sinais: s(camada.dashaAtual.mahadasha.lord, "o período de vida que está a decorrer agora"),
    },
    {
      angulo: "O que fazer — a direcção prática que a carta sustenta.",
      seccaoReferencia: "Secção 12 — O Plano",
      sinais: s("Jupiter", "a direcção onde o esforço rende mais do que o investido"),
    },
    {
      angulo: "O custo de não fazer nada — o que continua, sem dramatizar, se nada mudar.",
      seccaoReferencia: "Secção 13 — O que te custa não fazer nada",
      sinais: s(ak, "a mesma força central, se ninguém lhe der uso"),
    },
    {
      angulo: "Uma última coisa específica desta carta — algo que só esta pessoa tem, não um fecho genérico.",
      // CORRIGIDO 23/08/2026 — esta nota vivia dentro do próprio texto de
      // `seccaoReferencia`, um campo que chega ao relatório final
      // (`RelatorioV3.retrato60s.linhas[8].seccaoReferencia`), não um
      // comentário de código. Detector mecânico de apoio externo ainda
      // não construído — esta linha usa a casa 11 (ganhos/rede) como
      // aproximação a "apoio externo"; rever quando existir um detector
      // próprio, mas o TEXTO do campo fica limpo, como as outras 8.
      seccaoReferencia: "Secção 14 — Uma última coisa",
      sinais: s("casa-11", "onde a rede e o apoio de outros entram"),
    },
  ];
}

const REGRAS_V2_RETRATO = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 3 (uma coisa acontece uma vez): nenhuma das 9 linhas repete o que outra já disse.
- Regra 7: a linha do bloqueio separa sempre capacidade de retorno.
- Regra 12: no máximo um superlativo em todo o conjunto de 9.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 16: qualquer referência ao passado vai em condicional.
- Regra 18: cada linha vem de um facto identificado — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 1 — Retrato em 60 segundos. `descobertasResumo`
 * é um resumo curto (não o texto completo) das 5 descobertas já escritas
 * (secção 2) — para o LLM saber o que NÃO repetir; passar aqui o que o
 * orquestrador já gerou, quando existir.
 */
export function construirPromptSeccao1Retrato60s(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3, descobertasResumo?: string): string {
  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara.";
  const linhas = construirLinhasRetrato(camada, espinha);

  const blocosLinhas = linhas
    .map(
      (l, i) => `### Linha ${i + 1} de 9 — aponta para: ${l.seccaoReferencia}
${l.angulo}
${l.sinais || "(sem sinal técnico formal — escreva só a partir do ângulo, sem inventar um facto novo)"}`,
    )
    .join("\n\n---\n\n");

  return `Tu és o redactor do Naveya Method, secção "O Retrato em 60 Segundos" (secção 1 de 14 do relatório).

## O que esta secção tem de fazer

Escrever EXACTAMENTE 9 linhas — cada uma uma faceta distinta desta pessoa, nunca variações do mesmo ponto. Compressão máxima: cada linha é uma revelação já feita, não uma introdução ao que vem depois. Máximo 2 linhas de texto por facto — se precisar de mais espaço para o dizer, está a tentar dizer coisa a mais numa só linha.

Nenhuma das 9 linhas começa por "és" ou "tens" — varie a estrutura de abertura de frase entre as 9.

Zero generalidades: cada linha tem de ser específica a ESTA carta — se pudesse ser copiada para o relatório de outra pessoa sem se notar, reescreva-a a partir do sinal dado.

## A espinha — a primeira linha reformula-a, nunca a copia

${afirmacaoEspinha}

A LINHA 1 é uma reformulação desta afirmação, em MENOS palavras — nunca as mesmas palavras, nunca uma cópia parcial. As outras 8 linhas nunca podem contradizê-la.

${descobertasResumo ? `## O que a secção 2 (Cinco Descobertas) já disse — não repetir\n\n${descobertasResumo}\n` : "## Nota\n\nO texto da secção 2 (Cinco Descobertas) ainda não foi gerado nesta chamada — garanta apenas que as 9 linhas são distintas ENTRE SI.\n"}

## As 9 linhas — ângulo, secção de destino, e sinais de cada uma

${blocosLinhas}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_RETRATO}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número, termos sânscritos (Atmakaraka, Karakamsha, dasha, Vargottama) e termos de astrologia ocidental — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo. Cada linha é uma frase que pára a leitora — nunca uma frase de transição.

## Formato de saída

9 linhas, uma por facto, cada uma um parágrafo curto e independente (não uma lista com marcadores, não numeradas no texto visível). Não use tool-use, não produza JSON — só as 9 linhas.`;
}

// ── SECÇÃO 4 — QUEM ÉS ────────────────────────────────────────────────────
//
// GAP REPORTADO, NÃO ESCONDIDO — o pedido pede "Lua e nakshatra em
// linguagem Naveya", mas `linguagem-naveya.ts` ainda não tem uma tabela de
// definições por nakshatra (27 mansões, cada uma com significado
// clássico próprio) — só grahas, casas, dignidades, Panchadha Maitri,
// avasthas e níveis de confiança. Sem essa tabela, a nakshatra da Lua é
// traduzida aqui por PROXIMIDADE: o regente clássico dessa nakshatra
// (NAKSHATRA_LORDS), usando a definição Naveya desse regente como o
// "sabor" da nakshatra. É uma aproximação razoável (o regente é a
// classificação clássica mais próxima que já temos traduzida), não uma
// tradução própria da nakshatra — construir DEFINICOES_NAKSHATRA é
// trabalho futuro, fora do âmbito desta secção (ver recomendação 5.4,
// docs/ANALISE-COMPARATIVA-RUI-vs-v2v3-23Ago.md).
//
// FORMATO A SEGUIR quando DEFINICOES_NAKSHATRA for construída (correcção
// global de linguagem, 23/08/2026): nome da nakshatra + definição Naveya,
// no mesmo formato "termo — definição" das outras tabelas — ex. "Rohini —
// a que faz crescer o que toca, a que transforma pelo cuidado." Nunca
// escondida (como o proxy actual obriga, por não ter nome próprio de
// nakshatra nenhum disponível).

import { getNakshatra } from "../astrology/nakshatra";
import { NAKSHATRA_LORDS } from "../lifeReport/nakshatraLords";
import { SIGN_RULERS } from "../lifeReport/signRulers";

const REGRAS_V2_QUEM_ES = `- Regra 1: se um conceito não tiver tradução honesta, nomeie-o uma vez e explique — nunca invente um nome próprio novo tipo "a tua força de acção".
- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 3 (uma coisa acontece uma vez): não repita, com outras palavras, o que o Retrato 60s já disse.
- Regra 8: uma colocação tem sempre as duas faces — nunca só o lado que agrada, nem só o que dói.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 16: qualquer referência ao passado vai em condicional ("provavelmente já reparou").
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 4 — Quem és. `retrato60sResumo` é um
 * resumo curto das 9 linhas já escritas (secção 1), para esta secção
 * APROFUNDAR em vez de repetir — passar o texto real quando o
 * orquestrador o tiver gerado.
 */
export function construirPromptSeccao4QuemEs(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3, retrato60sResumo?: string): string {
  const ak = camada.karakas.atmakaraka;
  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara.";

  const regenteAsc = SIGN_RULERS[camada.ascendente.sign];
  const posRegenteAsc = camada.posicoesPlanetarias[regenteAsc];

  const nakLua = getNakshatra(camada.posicoesPlanetarias.Moon.siderealLongitude);
  const regenteNakLua = NAKSHATRA_LORDS[nakLua.name];

  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const bloco1Sinais = [s(ak, "Atmakaraka — o ponto de entrada natural desta identidade"), s("casa-1", "o Ascendente — a porta de entrada no mundo"), sinalKarakamsha(camada)].filter(Boolean).join("\n\n");

  const bloco2Sinais = [
    s("Moon", "o que a pessoa sente antes de pensar"),
    s(regenteNakLua, "o sabor da configuração emocional de base (aproximação pelo regente clássico da nakshatra — ver nota no código)"),
    regenteAsc === ak ? "" : s(regenteAsc, "quem comanda a forma como a pessoa se apresenta"),
    regenteAsc === ak ? "" : s(`casa-${posRegenteAsc.house}`, "onde essa força de apresentação foi morar"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `Tu és o redactor do Naveya Method, secção "Quem És" (secção 4 de 14 do relatório).

## O que esta secção tem de fazer

Descrever a IDENTIDADE PROFUNDA desta pessoa — o que ELA É, não o que faz nem o que os outros vêem primeiro (isso é a secção 9, "Como és vista" — não a antecipe aqui). Fala sempre de DENTRO PARA FORA.

Nunca abra com "és uma pessoa que..." — é genérico e podia ser escrito para qualquer um. Comece pelo facto mais específico que tem.

Máximo 6 parágrafos, em 3 blocos:

### Bloco 1 — O núcleo (2 a 3 parágrafos)
O que esta pessoa é por dentro — a identidade, não o carácter (o que NÃO muda com o contexto). Comece pelo Atmakaraka (o ponto de entrada natural desta carta) e pelo Ascendente. O Karakamsha (abaixo) mostra o propósito de alma — para que serve essa identidade, não só o que ela é.

${bloco1Sinais}

### Bloco 2 — Como isso se manifesta (2 parágrafos)
Como esta identidade aparece nas escolhas, nas relações, no trabalho — concreto, com exemplos de como age no mundo. Vem do que a pessoa sente (Lua e a configuração emocional de base) e de quem comanda a forma como se apresenta.

${bloco2Sinais}

### Bloco 3 — O que isto significa (1 parágrafo)
Uma consequência concreta desta identidade para a vida desta pessoa AGORA. Liga-se à espinha (abaixo) — não é conselho, é uma observação que decorre directamente do que os blocos 1 e 2 já mostraram.

## A espinha — aprofundar pelo ângulo da identidade, nunca repetir

${afirmacaoEspinha}

Não repita esta frase. O Bloco 3 mostra-a a funcionar especificamente ao nível da identidade — quem esta pessoa é por dentro explica por que este tema central é inevitável para ela.

${retrato60sResumo ? `## O que o Retrato em 60 Segundos já disse — aprofundar, nunca repetir\n\n${retrato60sResumo}\n` : "## Nota\n\nO texto da secção 1 (Retrato 60s) ainda não foi gerado nesta chamada — escreva com naturalidade, sem repetir a espinha.\n"}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_QUEM_ES}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número, termos sânscritos (Atmakaraka, Karakamsha, dasha, Vargottama, nakshatra) e termos de astrologia ocidental — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, íntimo sem ser confessional. Escreva como quem já entendeu esta pessoa, não como quem está a descrevê-la a partir de fora.

## Formato de saída

Prosa corrida, 3 blocos sem títulos visíveis (a estrutura é para si organizar o conteúdo, não para o leitor ver). Máximo 6 parágrafos no total. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 11 — O RELÓGIO ────────────────────────────────────────────────
// Quatro camadas de tempo, sempre do horizonte mais longo para o mais
// curto (era → trânsitos lentos → trânsito anual → dasha actual),
// CODE-1-esqueleto-v3.md. Cada camada tem o seu próprio nível de
// confiança — nunca um nível único para a secção inteira.
//
// NÍVEIS DE CONFIANÇA — três das quatro camadas vêm fixas pelo pedido
// desta sessão (era: sempre "leitura" · trânsito anual: sempre "leitura" ·
// dasha: sempre "sinal-forte", porque dashas têm timing mais preciso do
// que trânsitos). A camada 2 (trânsitos lentos) pede "nível por trânsito,
// vem da CamadaA" — mas `TransitoLento` (transitsV3.ts) não tem hoje um
// campo de confiança próprio. Derivado aqui por uma regra mecânica e
// documentada, não inventada à solta: contacto exacto (≤3°, o mesmo orbe
// que `transitsV3.ts` já usa para `contactosNatal`) a um ponto natal ⇒
// "sinal-forte" (o trânsito está a tocar algo específico desta carta);
// sem contacto exacto ⇒ "leitura" (o trânsito está no signo/casa, sem um
// gatilho preciso agora). Divergência relatada, não decidida em silêncio.
//
// GAP DE TRADUÇÃO ENCONTRADO E CORRIGIDO ao construir esta secção: metade
// dos `slowTransits` (Urano, Neptuno, Plutão) não tinha definição Naveya —
// `Graha`/`DEFINICOES_GRAHA` cobre só os 9 grahas védicos, nunca os 3
// corpos ocidentais lentos. Adicionada `DEFINICOES_CORPO_OCIDENTAL` em
// linguagem-naveya.ts (ver comentário lá) antes de escrever o resto desta
// secção — sem isso, `formatarSinalParaPrompt` devolvia `null` para
// Urano/Neptuno/Plutão em todas as camadas que os usam.

const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Regra 19a (v2): no corpo, uma data é só o mês e o ano — nunca o dia. */
function formatarMesAno(d: Date): string {
  return `${MESES_PT[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function confiancaTransitoLento(t: TransitoLento): NiveauConfianca {
  return t.contactosNatal.length > 0 ? "sinal-forte" : "leitura";
}

/**
 * Identifica o trânsito de "era" activo, pela prioridade clássica pedida
 * nesta sessão: retorno de Saturno > retorno do Nodo > Plutão > Neptuno em
 * posição crítica. Cada um só qualifica com um contacto EXACTO (≤3°) ao
 * ponto natal que o define — nunca só por estar no signo/casa "certo".
 * Devolve `null` quando nenhum dos quatro está em contacto agora: a
 * secção declara isso com honestidade em vez de forçar um foco (mesmo
 * princípio de "ausência declarada" já usado em espinha.ts).
 */
function identificarTransitoDeEra(slowTransits: TransitoLento[]): { transito: TransitoLento; motivo: string; contacto: ContactoNatal } | null {
  const porCorpo = (c: CorpoLento) => slowTransits.find((t) => t.corpo === c);

  const saturno = porCorpo("Saturn");
  const contactoSaturno = saturno?.contactosNatal.find((c) => c.ponto === "Saturn");
  if (saturno && contactoSaturno) return { transito: saturno, motivo: "retorno de Saturno", contacto: contactoSaturno };

  const rahu = porCorpo("Rahu");
  const contactoRahu = rahu?.contactosNatal.find((c) => c.ponto === "Rahu" || c.ponto === "Ketu");
  if (rahu && contactoRahu) return { transito: rahu, motivo: "retorno do Nodo", contacto: contactoRahu };

  const ketu = porCorpo("Ketu");
  const contactoKetu = ketu?.contactosNatal.find((c) => c.ponto === "Rahu" || c.ponto === "Ketu");
  if (ketu && contactoKetu) return { transito: ketu, motivo: "retorno do Nodo", contacto: contactoKetu };

  const pluto = porCorpo("Pluto");
  if (pluto && pluto.contactosNatal.length > 0) return { transito: pluto, motivo: "Plutão em posição crítica", contacto: pluto.contactosNatal[0] };

  const neptuno = porCorpo("Neptune");
  if (neptuno && neptuno.contactosNatal.length > 0) return { transito: neptuno, motivo: "Neptuno em posição crítica", contacto: neptuno.contactosNatal[0] };

  return null;
}

const REGRAS_V2_RELOGIO = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 6: uma data no futuro nunca é a chave — se disser o que vem a seguir, tem de dizer, no mesmo bloco, o que já vale AGORA.
- Regra 13: o absoluto pode descrever o desenho ("este período pede X"), nunca pode fechar a pessoa ("vais viver X").
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.
- Regra 19a: uma data escreve-se só ao mês e ao ano — nunca ao dia.`;

/**
 * Constrói o prompt da Secção 11 — O Relógio. Quatro camadas de tempo, do
 * mais longo ao mais curto, cada uma com o seu nível de confiança próprio.
 * `espinha` é o resultado de `derivarEspinha` — usa-se só para citar a
 * afirmação (nunca repetir) e para verificar se "Dasha actual" é uma das
 * camadas que já confirmam a espinha nesta carta.
 */
export function construirPromptSeccao11Relogio(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara — ligue cada camada apenas ao que ela concretamente pede, sem forçar um tema central.";

  // ── Camada 1 — Era ──
  const era = identificarTransitoDeEra(camada.slowTransits);
  const blocoEra = era
    ? `${s(era.transito.corpo, `trânsito de era — ${era.motivo}`)}

${s(`casa-${era.transito.casaAPartirDoAscendente}`, "a área de vida atravessada por este trânsito de era")}

${s(era.contacto.ponto, "o ponto da tua carta que este momento activa")}

Contexto mecânico (não traduzir, só para orientar a escrita — nunca citar graus ou orbes no texto final): ${era.motivo}, contacto a ${era.contacto.orbe.toFixed(1)}° de órbe, activo pelo menos até ${formatarMesAno(era.transito.saidaDesteSigno)} (fronteira de signo — indicativa, não é o fim exacto do contacto, que pede efeméride de estação ainda não calculada por este motor).`
    : `Nenhum dos quatro trânsitos de era clássicos (retorno de Saturno, retorno do Nodo, Plutão, Neptuno) está em contacto exacto com um ponto natal neste momento. Escreva isto com honestidade — descreva os grandes trânsitos de fundo em traços largos, sem apontar um foco único e sem inventar um contacto que não existe:

${camada.slowTransits
  .map((t) => s(t.corpo, "um dos grandes trânsitos de fundo, sem foco único activo agora"))
  .filter(Boolean)
  .join("\n\n")}`;

  // ── Camada 2 — Trânsitos lentos ──
  const blocoLentos = camada.slowTransits
    .map((t) => {
      const conf = confiancaTransitoLento(t);
      return `Nível de confiança desta linha: **${conf}**.
${s(t.corpo, "trânsito lento — o que este período de anos pede")}

${s(`casa-${t.casaAPartirDoAscendente}`, "a área de vida que este trânsito atravessa")}

Horizonte: activo pelo menos até ${formatarMesAno(t.saidaDesteSigno)} (fronteira de signo, indicativa — não a data exacta de saída do orbe de contacto).${t.contactosNatal.length > 0 ? " Tem um contacto exacto a um ponto natal — é por isso que o nível de confiança desta linha é sinal-forte, e não leitura." : ""}`;
    })
    .join("\n\n---\n\n");

  // ── Camada 3 — Trânsito anual ──
  const anual = camada.annualTransit;
  const blocoAnual = `${s(anual.corpo, "trânsito anual — o tema dominante deste ano")}

${s(`casa-${anual.casaAPartirDoAscendente}`, "a área de vida que este ano activa")}

Horizonte: este signo, até ${formatarMesAno(anual.saidaDesteSigno)} (fronteira de signo, indicativa — não o dia exacto).`;

  // ── Camada 4 — Dasha actual ──
  const mahaLord = camada.dashaAtual.mahadasha.lord;
  const antarLord = camada.dashaAtual.antardasha.lord;
  const antarActualIdx = camada.dashaAtual.allAntardashas.findIndex((a) => a.start.getTime() === camada.dashaAtual.antardasha.start.getTime());
  const proximaAntardasha = antarActualIdx >= 0 ? camada.dashaAtual.allAntardashas[antarActualIdx + 1] : undefined;
  const dashaConfirmaEspinha = espinha.camadasConfirmantes.includes("Dasha actual");

  const blocoDasha = `${s(mahaLord, "o período pessoal de fundo (mahadasha) — o que esta década pede")}

${s(antarLord, "o período pessoal mais próximo (antardasha) — o que pede AGORA")}

Este período pessoal mais próximo vai até ${formatarMesAno(camada.dashaAtual.antardasha.end)}.${
    proximaAntardasha
      ? ` Regra 6 — o que vem a seguir NUNCA substitui o que já vale agora: diga sempre primeiro o que este período actual pede, e só depois mencione que, a partir de ${formatarMesAno(proximaAntardasha.start)}, começa um novo capítulo pessoal — ${s(proximaAntardasha.lord, "o que vem a seguir neste percurso pessoal")}`
      : ""
  }${dashaConfirmaEspinha ? "\n\nEsta camada é, também, uma das medições que já confirmam a espinha deste relatório (abaixo) — pode dizê-lo, sem repetir a frase da espinha." : ""}`;

  return `Tu és o redactor do Naveya Method, secção "O Relógio" (secção 11 de 14 do relatório).

## O que esta secção tem de fazer

Descrever QUATRO camadas de tempo separadas, sempre por esta ordem — do horizonte mais longo para o mais curto. Nunca as misture na mesma frase sem dizer qual é qual. Nunca prometa um acontecimento — "este período pode trazer mais foco para..." é o registo certo; "vai acontecer" está proibido. O Relógio diz o que o momento PEDE, nunca o que fazer com isso (isso é a secção seguinte, "O Plano" — não a antecipe aqui).

### Camada 1 — Era (o pano de fundo de décadas)
Nível de confiança: **leitura** (períodos longos têm menos precisão de timing — não escreva com mais certeza do que isto).

${blocoEra}

### Camada 2 — Trânsitos lentos (o horizonte de alguns anos)
Cada trânsito tem o seu PRÓPRIO nível de confiança, já indicado a seguir — nunca generalize um nível único para todos.

${blocoLentos}

### Camada 3 — Trânsito anual (este ano)
Nível de confiança: **leitura**.

${blocoAnual}

### Camada 4 — Dasha actual (o período pessoal)
Nível de confiança: **sinal-forte** (dashas têm timing mais preciso do que trânsitos).

${blocoDasha}

## A espinha — mostrar como o momento actual se relaciona com ela, nunca repetir

${afirmacaoEspinha}

Pelo menos uma das quatro camadas acima deve ligar-se explicitamente a este tema central, mostrando-o a funcionar AGORA — nunca descrevendo-o outra vez com as mesmas palavras.

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_RELOGIO}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número e termos sânscritos ou técnicos (mahadasha, antardasha, retorno de Saturno, Nodo) — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. Continuam proibidos: graus e órbes exactos (nunca cite números de grau), e "o teu mapa"/"a tua carta" como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

## Datas — regra absoluta (Regra 19a)

Nunca escreva um dia do mês. Escreva sempre só o mês e o ano ("até Setembro de 2026", nunca "até 12 de Setembro de 2026"). As datas acima são fronteiras de signo, indicativas — não o cálculo exacto do início/fim do efeito (isso pede efeméride de estação, que este motor ainda não calcula). Se mencionar uma data, deixe claro que é aproximada.

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, sem fatalismo e sem promessa. Escreva como contexto para reflexão, nunca como profecia.

## Formato de saída

Quatro blocos de prosa corrida, um por camada, cada um claramente distinto do anterior (pode usar uma frase de transição a assinalar a mudança de horizonte, nunca um título visível tipo "Camada 1"). Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 12 — O PLANO ──────────────────────────────────────────────────
// RECONSTRUÍDA 23/08/2026 — a versão anterior (aprovada, depois revista)
// pedia "cinco blocos de prosa corrida" no "Formato de saída" enquanto
// citava a Regra 20 ("um plano é uma tabela") nas regras de escrita — uma
// contradição interna encontrada em docs/ANALISE-COMPARATIVA-RUI-vs-v2v3-
// 23Ago.md (recomendação 5.2), ao comparar contra os relatórios do Rui:
// RUI-VAZ-ULTIMO-nova-estrutura.html cumpre a Regra 20 à letra (tabela
// quando/o quê), e o v7-MELHORADO-com-roda + o PRIMEIRO mostram dois
// dispositivos que a Secção 12 antiga não tinha — um MENU de propostas
// concretas (cruzando talentos com áreas) e um TESTE DE FILTRO reutilizável
// (perguntas fixas para reaplicar a qualquer oportunidade futura). Esta
// versão incorpora as três correcções, por pedido explícito: tabela real,
// menu de 8-10 propostas, teste de filtro — mantendo "o que não fazer".
//
// GROUNDING MECÂNICO — nenhum destes dispositivos inventa conteúdo: cada
// um recebe sinais concretos da Camada A.
//  · TABELA (Regra 20): as mesmas âncoras de tempo já usadas na versão
//    anterior — período pessoal e trânsito de era mais imediatos
//    (reaproveita `identificarTransitoDeEra`, definida para a Secção 11;
//    "próxima antardasha" fica duplicada aqui de propósito, para não
//    tocar na Secção 11 já aprovada) — e a(s) casa(s) de maior apoio (SAV).
//  · MENU: cruza os DOIS talentos da carta (Atmakaraka + Amatyakaraka —
//    `camada.karakas`, já computados) com as áreas de dinheiro/carreira/
//    parcerias mais relevantes (casas 2, 7, 10, 11) e a(s) casa(s) de
//    maior apoio. O LLM escreve os NOMES concretos das propostas — isso é
//    composição interpretativa (nomear uma profissão/formato), não um
//    cálculo astrológico; o motor só garante que cada proposta tem, por
//    trás, um sinal real, nunca inventado. ADICIONADO 23/08/2026, por
//    pedido explícito depois da aprovação inicial: o menu recebe também o
//    contexto profissional real do cliente (`dados.profissao`,
//    `dados.situacaoDeclarada`, `dados.additionalContext`) — sem isto, as
//    propostas ficavam genéricas ao ofício da pessoa (ex.: "assina o teu
//    trabalho com o teu nome" não é a mesma proposta concreta para uma
//    esteticista e para um consultor financeiro).
//  · TESTE DE FILTRO: 3 perguntas fixas, sempre nesta ordem e categoria
//    (motor / território / operação), cada uma ancorada num sinal
//    diferente: o Atmakaraka (motor — a mesma força da espinha), a casa
//    de maior apoio (território), e o regente do Ascendente (operação —
//    quem comanda a forma como a pessoa se apresenta e executa).
//  · "O QUE NÃO FAZER": inalterado da versão anterior — a(s) casa(s) de
//    SAV mais baixo (Regra 7: nunca "falta capacidade", só "falta
//    alavanca").
//
// `veredicto` e `relogio` continuam a ser o TEXTO JÁ ESCRITO das secções 3
// e 11 — o Plano nunca recalcula timing, só aplica o que o Relógio já
// decidiu, e nunca contradiz o que o Veredicto já respondeu.

const REGRAS_V2_PLANO = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 5: se uma proposta implicar mudança de vida (mudar de sector, parar algo), diga de que se vive entretanto — quanto custa entrar, quanto tempo até render, e de que rendimento se abdica.
- Regra 6: uma data no futuro nunca é a chave — diga sempre, na mesma linha da tabela ou no mesmo bloco, o que já vale AGORA, antes de apontar para o que vem a seguir.
- Regra 7: quando uma área tem pouco apoio, diga primeiro que a capacidade está intacta e só depois que falta alavanca — nunca diga que a pessoa não serve.
- Regra 18: cada linha da tabela e cada proposta do menu vêm de um facto identificado (os sinais abaixo) — nunca uma acção sem lastro.
- Regra 19a: uma data de calendário escreve-se só ao mês e ao ano — nunca ao dia.
- Regra 20: um plano é uma tabela — todas as acções num só sítio, por ordem, com prazo e com o que depende de quê. Nunca disperso em generalidades soltas.`;

const CLICHES_PROIBIDOS_PLANO = ["trabalha o teu potencial", "investe em ti", "sai da zona de conforto", "liberta o teu potencial", "abraça a jornada", "confia no processo", "foca-te no que importa"];

/**
 * Constrói o prompt da Secção 12 — O Plano. `veredicto` e `relogio` são o
 * texto já escrito das secções 3 e 11 — usados aqui como contexto de
 * calibração, nunca recalculados nem contraditos. Estrutura (23/08/2026):
 * introdução → tabela de 90 dias (Regra 20) → menu de 8-10 propostas →
 * teste de filtro de 3 perguntas → o que não fazer.
 */
export function construirPromptSeccao12Plano(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3, veredicto: string, relogio: string): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara — calibre a tabela, o menu e o teste de filtro directamente pelos sinais abaixo, sem forçar um tema central.";

  // ── Apoio (SAV) — onde o esforço rende mais / onde rende menos ──
  const scores = camada.sav.byHouse.map((h) => h.pontuacao);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const casasMaisApoio = camada.sav.fiavel ? camada.sav.byHouse.filter((h) => h.pontuacao === maxScore).map((h) => h.casa) : [];
  const casasMenosApoio = camada.sav.fiavel ? camada.sav.byHouse.filter((h) => h.pontuacao === minScore).map((h) => h.casa) : [];

  const sinaisApoioMaximo = casasMaisApoio
    .map((c) => s(`casa-${c}`, "a área de vida com mais apoio agora — onde o mesmo esforço rende mais"))
    .filter(Boolean)
    .join("\n\n");
  const sinaisApoioMinimo = casasMenosApoio
    .map((c) => s(`casa-${c}`, "a área de vida com menos apoio agora — onde o mesmo esforço rende menos, nunca onde falta capacidade"))
    .filter(Boolean)
    .join("\n\n");

  // ── Tempo mais imediato — reaproveita `identificarTransitoDeEra` (Secção 11); "próxima antardasha" duplicada de propósito, ver nota acima ──
  const era = identificarTransitoDeEra(camada.slowTransits);
  const antarLord = camada.dashaAtual.antardasha.lord;
  const antarActualIdx = camada.dashaAtual.allAntardashas.findIndex((a) => a.start.getTime() === camada.dashaAtual.antardasha.start.getTime());
  const proximaAntardasha = antarActualIdx >= 0 ? camada.dashaAtual.allAntardashas[antarActualIdx + 1] : undefined;

  const sinalPeriodoActual = s(antarLord, "o período pessoal em curso — o que pede agora, tal como o Relógio já disse");
  const sinalProximo = proximaAntardasha ? s(proximaAntardasha.lord, "o que vem a seguir no percurso pessoal, tal como o Relógio já disse") : "";
  const sinalTransitoActivo = era ? s(era.transito.corpo, `o trânsito de era em curso (${era.motivo}), tal como o Relógio já disse`) : "";

  // ── Talentos (para o menu) — os dois karakas já computados na Camada A ──
  const ak = camada.karakas.atmakaraka;
  const amk = camada.karakas.amatyakaraka;
  const sinalTalento1 = s(ak, "o primeiro talento — o motor central desta pessoa (o mesmo da espinha)");
  const sinalTalento2 = s(amk, "o segundo talento — o que mais mobiliza para a carreira, depois do primeiro");

  // ── Áreas (para o menu) — dinheiro, ganhos/rede, carreira, parcerias ──
  const sinaisAreas = [
    s("casa-2", "uma área possível para o menu — o que possui e como fala do seu valor"),
    s("casa-11", "uma área possível para o menu — os ganhos e a rede"),
    s("casa-10", "uma área possível para o menu — o lugar público e a carreira"),
    s("casa-7", "uma área possível para o menu — os acordos e as parcerias"),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Teste de filtro — 3 perguntas fixas, cada uma ancorada num sinal diferente ──
  const regenteAsc = SIGN_RULERS[camada.ascendente.sign];
  const sinalFiltroMotor = s(ak, "PERGUNTA 1 do teste de filtro — o motor: isto usa, ou não usa, esta força central?");
  const sinalFiltroTerritorio =
    casasMaisApoio.length > 0
      ? s(`casa-${casasMaisApoio[0]}`, "PERGUNTA 2 do teste de filtro — o território: isto vive, ou não vive, na área de maior apoio desta carta?")
      : "";
  const sinalFiltroOperacao = s(regenteAsc, "PERGUNTA 3 do teste de filtro — a operação: isto pede que esta pessoa apareça sozinha a executar, ou pode ser através de outro/de uma estrutura?");

  return `Tu és o redactor do Naveya Method, secção "O Plano" (secção 12 de 14 do relatório).

## O que esta secção tem de fazer

Não é uma receita genérica — é o que ESTA carta, neste momento, concretamente pede. Calibrado pela espinha (o tema central) e pelo Relógio (o que o momento já disse que está a pedir): nunca inventa um timing novo, nunca contradiz o que o Relógio já estabeleceu.

Estrutura obrigatória, sempre por esta ordem:

1. **Introdução** (1-2 frases) — o que este plano faz e não faz.
2. **A tabela de 90 dias** (Regra 20 — "um plano é uma tabela"): uma tabela real, 3 colunas — QUANDO | O QUE FAZER | COM QUE DEPENDE —, 5 a 7 linhas cobrindo desde "esta semana" até "dias 61-90". Nunca prosa a fingir de tabela — linhas curtas, uma acção concreta por linha.
3. **O menu de propostas** (8 a 10 propostas concretas e NOMEADAS — profissões, formatos ou modelos de actividade, nunca direcções abstractas): cruze os dois talentos (sinais abaixo) com as áreas de dinheiro/carreira/parcerias (sinais abaixo) — e calibre cada proposta pelo contexto profissional real do cliente (abaixo). Cada proposta: um nome + 1-2 frases de porquê encaixa nesta carta E nesta profissão. Feche o menu com uma nota que as ordena (quais rendem mais depressa, quais são mais estáveis, quais constroem autoridade a prazo) e a instrução explícita: "não são para fazer todas — é o menu de onde a escolha sai."
4. **O teste de filtro** (exactamente 3 perguntas fixas, sempre pela mesma ordem — motor, território, operação — reutilizáveis para qualquer oportunidade futura, não só as do menu): cada pergunta usa o sinal correspondente abaixo. Termine com o padrão de resposta-alvo que mantém a pessoa alinhada com a espinha (ex.: "só avança o que responder sim/sim/sim" ou equivalente adaptado a esta carta).
5. **O QUE NÃO FAZER** — bloco SEMPRE presente, nunca omitido, tão importante como os outros quatro. 2 a 3 coisas que esta carta não sustenta agora.

## O veredicto já dado (secção 3) — não contradizer, não repetir, calibrar por ele

${veredicto}

## O que o Relógio já disse sobre este momento (secção 11) — não recalcular o timing, só aplicá-lo

${relogio}

## A espinha — a tabela, o menu e o teste de filtro têm de servir este tema central, nunca contradizê-lo

${afirmacaoEspinha}

## Sinais — a matéria-prima concreta de cada bloco (nunca invente uma linha, proposta ou pergunta sem um destes por trás)

### Para a tabela — onde o esforço já rende mais, e o período/trânsito mais imediatos

${sinaisApoioMaximo || "Esta corrida não tem SAV fiável — calibre a tabela pela espinha e pelos sinais de tempo abaixo, não por apoio de casa."}

${[sinalPeriodoActual, sinalProximo, sinalTransitoActivo].filter(Boolean).join("\n\n")}

### Para o menu — os dois talentos desta carta

${[sinalTalento1, sinalTalento2].filter(Boolean).join("\n\n")}

### Para o menu — as áreas onde esses talentos podem render

${sinaisAreas}

### Para o menu — contexto profissional real do cliente (adicionado 23/08/2026 — as propostas têm de ser calibradas por isto, nunca genéricas)

CONTEXTO PROFISSIONAL DO CLIENTE:
Profissão: ${dados.profissao}
Situação actual: ${dados.situacaoDeclarada}
Contexto adicional: ${dados.additionalContext ?? "(não fornecido)"}

INSTRUÇÃO: as propostas do menu devem ser calibradas pela profissão e situação reais do cliente — não genéricas. Para uma esteticista, "assinar o trabalho com o teu nome" é diferente do que seria para um consultor financeiro: nomeie a proposta na linguagem e no contexto concreto desta profissão, nunca numa versão abstracta que serviria para qualquer ofício.

### Para o teste de filtro — um sinal por pergunta, sempre pela mesma ordem

${[sinalFiltroMotor, sinalFiltroTerritorio, sinalFiltroOperacao].filter(Boolean).join("\n\n")}

### Para "O QUE NÃO FAZER" — onde o esforço rende menos agora (nunca onde falta capacidade — Regra 7)

${sinaisApoioMinimo || "Esta corrida não tem SAV fiável — para este bloco, derive o que não fazer do contraste entre a espinha e o período pessoal actual, nunca de uma casa de apoio mínimo que não existe nesta corrida."}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_PLANO}

## Clichés proibidos — se aparecerem, é falha de geração

${CLICHES_PROIBIDOS_PLANO.map((c) => `"${c}"`).join(" · ")} — e qualquer variante da mesma família (linguagem de coaching genérico, escrita para qualquer pessoa, não para esta).

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número e termos sânscritos ou técnicos (mahadasha, antardasha, Sarvashtakavarga) — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. Continua proibido citar o apoio numérico em bruto (ex. "SAV 36") sem o traduzir — e "o teu mapa"/"a tua carta" como sujeito de frase; o sujeito é sempre a pessoa (Regra 2).

## Datas — regra absoluta (Regra 19a)

Nunca escreva um dia do mês. Prazos como "esta semana", "este mês", "dias 31-60" não são datas de calendário — use-os tal como estão. Qualquer data de calendário que mencionar escreve-se só ao mês e ao ano.

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, concreto. Cada linha da tabela e cada proposta do menu são algo que a pessoa reconhece ou pode literalmente fazer — nunca uma intenção vaga. "O que não fazer" não é um aviso moralista — é o que custa mais do que rende neste momento, dito com a mesma franqueza do resto.

## Formato de saída

Nesta ordem: (1) introdução curta em prosa; (2) a tabela de 90 dias, em formato de tabela real (Markdown ou linhas "QUANDO | O QUE | COM QUE DEPENDE"); (3) o menu de 8-10 propostas, em lista numerada; (4) o teste de filtro, 3 perguntas numeradas com o padrão de resposta-alvo; (5) "o que não fazer", em prosa ou lista curta, claramente distinto do resto. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 13 — O CUSTO DE NÃO FAZER NADA ────────────────────────────────
// A secção mais curta do relatório (máximo 2 parágrafos) e a mais fácil de
// escorregar para o fatalismo — por isso é a única, além d'O Plano, com
// uma lista explícita de frases proibidas. O "bloqueio principal" (§1)
// reaproveita EXACTAMENTE o mesmo gatilho que a Secção 1 (Retrato 60s) já
// usa — `camada.sav.byHouse.find(h => h.pontuacao < 25)`, o mesmo limiar
// de SAV<25 que `types-v3.ts` documenta como gatilho da Secção 6
// condicional — em vez de inventar um segundo critério de "bloqueio" só
// para esta secção. A "janela" (§2) é a antardasha actual — o mesmo dado
// que a Secção 11/12 já usam para "o que pede agora e quando muda".

const FATALISMOS_PROIBIDOS = ["vai correr mal", "vai falhar", "não há outra hipótese", "é agora ou nunca", "vais perder tudo", "última oportunidade", "se não fizeres isto"];

const REGRAS_V2_CUSTO = `- Regra 6: nenhum negativo sem a sua reparação no mesmo bloco — e uma data no futuro nunca é a chave: se disser o que se perde, tem de apontar, no mesmo bloco, para a acção que já está disponível agora.
- Regra 7: o bloqueio separa sempre capacidade de retorno — nunca diga que falta capacidade, só que falta alavanca.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa — descreva o padrão, nunca uma sentença.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.
- Regra 19a: uma data de calendário escreve-se só ao mês e ao ano — nunca ao dia.`;

/**
 * Constrói o prompt da Secção 13 — O Custo de Não Fazer Nada. `veredicto`
 * e `plano` são o texto já escrito das secções 3 e 12 (mesma convenção
 * de `construirPromptSeccao12Plano`) — contexto de calibração, nunca
 * recalculados nem contraditos.
 */
export function construirPromptSeccao13Custo(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3, veredicto: string, plano: string): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara — descreva o custo directamente a partir do bloqueio e do timing abaixo, sem forçar um tema central.";

  // ── §1 — o bloqueio principal, mesmo gatilho da Secção 1 (SAV < 25) ──
  const savBaixo = camada.sav.fiavel ? camada.sav.byHouse.find((h) => h.pontuacao < 25) : undefined;
  const sinalBloqueio = savBaixo
    ? s(`casa-${savBaixo.casa}`, "o bloqueio principal — capacidade intacta, falta alavanca")
    : "";

  // ── §2 — a janela, a antardasha actual (mesmo dado da Secção 11/12) ──
  const antarLord = camada.dashaAtual.antardasha.lord;
  const antarActualIdx = camada.dashaAtual.allAntardashas.findIndex((a) => a.start.getTime() === camada.dashaAtual.antardasha.start.getTime());
  const proximaAntardasha = antarActualIdx >= 0 ? camada.dashaAtual.allAntardashas[antarActualIdx + 1] : undefined;
  const sinalJanelaActual = s(antarLord, "a janela deste período pessoal — o que ela pede enquanto está aberta");
  const sinalProximo = proximaAntardasha ? s(proximaAntardasha.lord, "o que substitui esta janela quando ela fechar") : "";

  return `Tu és o redactor do Naveya Method, secção "O Custo de Não Fazer Nada" (secção 13 de 14 do relatório).

## O que esta secção tem de fazer

Descrever o que acontece SE a pessoa não agir com o que este relatório já revelou. Concreto, específico desta carta — nunca uma ameaça genérica. Não é fatalista: é a descrição honesta de um padrão que continua, não a previsão do pior cenário imaginável.

Exactamente 2 parágrafos. Nem mais, nem menos.

**Parágrafo 1 — o padrão que continua.** O que se repete se nada mudar, derivado do bloqueio principal (abaixo) e da espinha. Não é catastrófico — é o custo real de continuar como até agora, não o pior cenário.

**Parágrafo 2 — o momento que passa.** Este momento específico tem uma janela (o timing já dado pelo Relógio) — o que se perde se ela fechar sem uso. Não é "agora ou nunca": é "este momento em concreto não volta a repetir-se da mesma forma". TERMINA com uma frase que aponta para a acção — nunca deixe a pessoa num estado de ansiedade.

## O veredicto já dado (secção 3) — calibrar por ele, não repetir

${veredicto}

## O Plano já dado (secção 12) — o custo é o espelho do que lá se propôs, não uma lista nova de acções

${plano}

## A espinha — o padrão que continua é, precisamente, esta força sem uso

${afirmacaoEspinha}

## O bloqueio principal — a matéria-prima do parágrafo 1

${sinalBloqueio || "Esta carta não tem uma casa de apoio abaixo do limiar (SAV < 25) — não invente um bloqueio. Descreva o parágrafo 1 directamente a partir da espinha: o que continua é a força central (acima) a ficar sem uso, não um bloqueio técnico específico."}

## A janela deste momento — a matéria-prima do parágrafo 2

${[sinalJanelaActual, sinalProximo].filter(Boolean).join("\n\n")}

Esta janela vai até ${formatarMesAno(camada.dashaAtual.antardasha.end)} (Regra 19a — só mês e ano). Não escreva isto como "agora ou nunca": depois desta janela vem outra fase, com outra qualidade — a pessoa não perde a oportunidade de agir, perde é ESTA versão específica dela.

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_CUSTO}

## Frases fatalistas ou manipuladoras proibidas — se aparecerem, é falha de geração

${FATALISMOS_PROIBIDOS.map((f) => `"${f}"`).join(" · ")} — e qualquer variante que crie medo artificial em vez de descrever um padrão real.

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, signos, "casa" seguido de número e termos sânscritos ou técnicos (mahadasha, antardasha, Sarvashtakavarga) — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir, nunca a definição sem nomear o termo antes. Continua proibido citar o apoio numérico em bruto (ex. "SAV 36") sem o traduzir — e "o teu mapa"/"a tua carta" como sujeito de frase; o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, honesto — nunca assustador. Fala como quem respeita a pessoa o suficiente para lhe dizer a verdade sem a manipular com medo.

## Formato de saída

Exactamente 2 parágrafos de prosa corrida, sem títulos. A última frase do parágrafo 2 aponta para a acção. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 5 — A FORMA DE VIDA ───────────────────────────────────────────
// A ÚNICA secção do v3, até agora, que é CONDICIONAL à fiabilidade de um
// dado de cálculo (SAV), não a um critério de conteúdo (como as secções
// 6/7/10/14, ainda por construir). Por isso devolve `string | null` —
// as outras secções deste ficheiro devolvem sempre `string`. `null`
// significa "não gerar esta secção nesta corrida"; o motivo já está
// registado em `camada.naoCalculado` (ver camada-a.ts, linha ~99 — a
// auto-verificação da tabela SAV escreve lá quando falha), por isso esta
// função não duplica esse registo — só devolve `null` e deixa o
// orquestrador (ainda por construir) decidir como marcar a ausência ao
// nível do relatório.
//
// Texto e diagrama (diagramas.ts, `construirRodaCasas`) partilham a MESMA
// tradução das 12 casas (`ROTULO_CASA_NAVEYA`) e a MESMA banda absoluta de
// SAV (`bandaAbsolutaSav`) — por pedido explícito, para o texto nunca
// contradizer o que a roda mostra.
//
// REGRA ESPECÍFICA DESTA SECÇÃO, mais restrita do que a regra geral de
// linguagem: "casa N" nunca aparece, nem mesmo acompanhada de definição.
// A tradução Naveya (`ROTULO_CASA_NAVEYA`) SUBSTITUI o termo por inteiro
// — ao contrário de um graha ou de uma dasha, aqui não há valor em
// mostrar o termo técnico ao lado da tradução, porque o termo técnico
// (um número de casa) não acrescenta nada que a tradução não dê sozinha.

const REGRAS_V2_FORMA_VIDA = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 7: separe sempre capacidade de retorno — no grupo fraco, diga primeiro que a capacidade está intacta e só depois que falta alavanca; nunca diga que a pessoa não serve.
- Regra 12: sem superlativo sem contagem feita — "a área com mais apoio" só se for literalmente a mais alta, e só uma vez no conjunto todo.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 5 — A Forma de Vida. Devolve `null` quando
 * `!camada.sav.fiavel` (ver nota acima) — o chamador NUNCA deve tratar
 * `null` como erro; é a secção a declarar, ela própria, que não se gera
 * nesta corrida.
 */
export function construirPromptSeccao5FormaDeVida(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string | null {
  if (!camada.sav.fiavel) return null;

  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  const porBanda: Record<"forte" | "medio" | "fraco", number[]> = { forte: [], medio: [], fraco: [] };
  for (const h of camada.sav.byHouse) porBanda[bandaAbsolutaSav(h.pontuacao)].push(h.casa);
  for (const banda of Object.keys(porBanda) as (keyof typeof porBanda)[]) porBanda[banda].sort((a, b) => a - b);

  const rotulosDoGrupo = (casas: number[]): string => casas.map((c) => `- ${ROTULO_CASA_NAVEYA[c]} (${DEFINICOES_CASA[c]})`).join("\n");

  const ligacaoEspinhaPorGrupo: Record<"forte" | "medio" | "fraco", string> = { forte: "", medio: "", fraco: "" };
  if (afirmacaoEspinha) {
    for (const banda of Object.keys(porBanda) as (keyof typeof porBanda)[]) {
      if (porBanda[banda].includes(espinha.casaSeed)) {
        ligacaoEspinhaPorGrupo[banda] = `\n\nESTA ÁREA (${ROTULO_CASA_NAVEYA[espinha.casaSeed]}) é também a espinha deste relatório: "${afirmacaoEspinha}" — não repita esta frase, só mostre que o apoio desta área confirma, mais uma vez, o mesmo tema central.`;
      }
    }
  }

  const nivelForte = s("sinal-forte", "nível de confiança do grupo forte");
  const nivelMedio = s("leitura", "nível de confiança do grupo médio");
  const nivelFraco = s("sinal-forte", "nível de confiança do grupo fraco");

  return `Tu és o redactor do Naveya Method, secção "A Forma de Vida" (secção 5 de 14 do relatório).

## O que esta secção tem de fazer

Explicar o que a roda das 12 áreas (o diagrama que acompanha esta secção) mostra, e como se lê. Regra de leitura, sempre: apoio alto numa área significa que o MESMO esforço aí rende mais do que noutro sítio; apoio baixo significa que o mesmo esforço aí rende menos, e pede alavanca — nunca mais esforço a direito. Isto não é destino: é um aviso sobre onde o esforço já tem vento a favor, e onde não tem.

Estrutura obrigatória, sempre por esta ordem:
1. **Introdução** (1 parágrafo) — o que a roda mostra e como ler; apoio alto = o mesmo esforço rende mais aqui; apoio baixo = esta área exige mais pelo mesmo resultado; não é destino, é aviso.
2. **Grupo 1 — onde fluir** (as áreas de apoio mais alto): o que já flui nestas áreas, em linguagem Naveya. Ligue à espinha quando a nota abaixo o disser.
3. **Grupo 2 — onde equilibrar** (as áreas de apoio médio): o que funciona, mas pede atenção — nem fácil, nem difícil.
4. **Grupo 3 — onde o esforço custa mais** (as áreas de apoio mais baixo): nunca fatalista. Diga primeiro que a capacidade está intacta, só depois que falta alavanca (Regra 7). O que fazer nestas áreas, dado o momento actual.
5. **Fecho** (1 parágrafo) — como usar esta informação no dia a dia, como ferramenta de decisão (onde investir esforço primeiro, onde não insistir sozinha).

## A espinha — nunca repetir literalmente, só confirmar quando aparecer ligada a um grupo

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — descreva os 3 grupos directamente a partir dos sinais abaixo, sem forçar uma ligação a um tema central que não existe."}

## Grupo 1 — apoio mais alto (SAV ≥ 32)

Nível de confiança deste grupo:
${nivelForte}

Áreas neste grupo:
${rotulosDoGrupo(porBanda.forte) || "(nenhuma área caiu neste grupo nesta carta — declare isso, não invente uma.)"}${ligacaoEspinhaPorGrupo.forte}

## Grupo 2 — apoio médio (SAV 25-31)

Nível de confiança deste grupo:
${nivelMedio}

Áreas neste grupo:
${rotulosDoGrupo(porBanda.medio) || "(nenhuma área caiu neste grupo nesta carta — declare isso, não invente uma.)"}${ligacaoEspinhaPorGrupo.medio}

## Grupo 3 — apoio mais baixo (SAV < 25)

Nível de confiança deste grupo:
${nivelFraco}

Áreas neste grupo:
${rotulosDoGrupo(porBanda.fraco) || "(nenhuma área caiu neste grupo nesta carta — declare isso, não invente uma.)"}${ligacaoEspinhaPorGrupo.fraco}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_FORMA_VIDA}

## Linguagem — regra ESPECÍFICA desta secção, mais restrita do que a regra geral

Nunca escreva "casa" seguido de número, em nenhuma frase — nem mesmo acompanhado de definição. Use SEMPRE a tradução Naveya dada acima para cada área (ex. "a carreira e o nome", nunca "a casa 10 — a carreira e o nome"). Para outros termos técnicos que mencionar (planetas, dashas, se for relevante), a regra geral continua a aplicar-se: nomeie-os sempre seguidos de " — " e a definição Naveya. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, prático. Esta secção é uma ferramenta de leitura, não um veredicto de vida — escreva para que a pessoa saiba, ao fechar o relatório, onde gastar esforço primeiro.

## Formato de saída

Prosa corrida, cinco blocos (introdução, grupo 1, grupo 2, grupo 3, fecho) — cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 8 — DE ONDE VEM O DINHEIRO ────────────────────────────────────
// 3 blocos + fecho: o dom natural (o que já rende, ligado à espinha) → o
// contexto de mercado (onde esse dom vale mais) → o que trava a conversão
// (nunca fatalista — o que trabalhar, não o que evitar). "Casas
// financeiras" = 2 (o que possui/vale), 6 (trabalho diário), 7 (acordos/
// clientes), 10 (carreira/nome), 11 (ganhos/rede) — o conjunto dado
// explicitamente no pedido.

const CASAS_FINANCEIRAS = [2, 6, 7, 10, 11] as const;

const PROIBIDO_PROMESSA_DINHEIRO = ["tens dinheiro", "vais ganhar bem", "vais ganhar muito", "isto vai render", "garantidamente vais", "com certeza vais ganhar"];

const REGRAS_V2_DINHEIRO = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 7: no bloco 3, separe sempre capacidade de retorno — o que trava não é falta de capacidade, é falta de alavanca ou de contexto certo.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa nem prometer um resultado.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 8 — De Onde Vem o Dinheiro. `dados` fornece
 * o contexto profissional real (profissão + situação declarada), na
 * mesma lógica já usada no menu da Secção 12 — para o Bloco 2 (contexto
 * de mercado) não ficar genérico.
 */
export function construirPromptSeccao8Dinheiro(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara — ligue o Bloco 1 directamente aos sinais abaixo, sem forçar um tema central.";

  const ocupantesPorCasa = new Map<number, string[]>();
  for (const [graha, pos] of Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]) {
    const lista = ocupantesPorCasa.get(pos.house) ?? [];
    lista.push(graha);
    ocupantesPorCasa.set(pos.house, lista);
  }

  const savPorCasa = new Map(camada.sav.byHouse.map((h) => [h.casa, h.pontuacao]));
  const ak = camada.karakas.atmakaraka;
  const amk = camada.karakas.amatyakaraka;

  // ── Bloco 1 — o dom natural: casas 2/10/11 + Atmakaraka + dignidade relevante ──
  const sinaisBloco1 = [
    s(ak, "o dom natural — o motor central desta pessoa (o mesmo da espinha)"),
    s("casa-2", "uma das áreas de dinheiro — o que possui e como fala do seu valor"),
    s("casa-10", "uma das áreas de dinheiro — o lugar público e a carreira"),
    s("casa-11", "uma das áreas de dinheiro — os ganhos e a rede"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const dignAk = camada.dignidades[ak as keyof typeof camada.dignidades];
  const termotecnicoDignAk = dignAk?.panchadha ?? (dignAk ? termotecnicoDeDignidadeClassica(dignAk.classica) : null);
  const sinalDignidadeAk = termotecnicoDignAk ? s(termotecnicoDignAk, "a força do dom natural no signo que ocupa") : "";

  // ── Bloco 2 — contexto de mercado: casas 7/10 + figuras fechadas relevantes ──
  const sinaisBloco2 = [s("casa-7", "onde este dom se vende — os acordos e quem está do outro lado"), s("casa-10", "onde este dom se vende — o lugar público e a carreira")].filter(Boolean).join("\n\n");

  const pontosRelevantesMercado = new Set<string>([ak, amk, ...(ocupantesPorCasa.get(7) ?? []), ...(ocupantesPorCasa.get(10) ?? [])]);
  const figurasMercado = camada.figurasFechadas.filter((f) => f.pontos.some((p) => pontosRelevantesMercado.has(p)));
  const sinaisFigurasMercado = figurasMercado
    .map((f) => `CONTEXTO ADICIONAL (tensão ou fluxo estrutural que atravessa o dom natural ou a área de mercado, já em linguagem segura — nunca nomear "${f.tipo}" cru): ${f.detalhe}`)
    .join("\n\n");

  // ── Bloco 3 — o que trava a conversão: casas financeiras em banda fraca ──
  const casasFracasFinanceiras = CASAS_FINANCEIRAS.filter((c) => bandaAbsolutaSav(savPorCasa.get(c) ?? 28) === "fraco");
  const sinaisBloco3 = casasFracasFinanceiras.map((c) => s(`casa-${c}`, "o que trava a conversão — apoio baixo aqui, capacidade intacta, falta alavanca")).filter(Boolean);

  const amkFraco = camada.dignidades[amk as keyof typeof camada.dignidades];
  if (amkFraco && (amkFraco.classica === "Debilitated" || amkFraco.panchadha === "shatru" || amkFraco.panchadha === "adhi-shatru")) {
    const termoAmkFraco = amkFraco.panchadha ?? termotecnicoDeDignidadeClassica(amkFraco.classica);
    if (termoAmkFraco) sinaisBloco3.push(s(termoAmkFraco, "o que trava a conversão — o segundo talento em terreno que resiste"));
  }

  return `Tu és o redactor do Naveya Method, secção "De Onde Vem o Dinheiro" (secção 8 de 14 do relatório).

## O que esta secção tem de fazer

Descrever, de forma concreta e específica desta carta, de onde vem (ou devia vir) o dinheiro desta pessoa. Nunca "tens talento" — sempre "o que tens rende mais quando...". Nunca promete resultado.

Estrutura obrigatória, sempre por esta ordem, máximo 5 parágrafos no total:

1. **O dom natural** (1-2 parágrafos) — o que esta pessoa tem para oferecer que o mercado paga bem. Liga-se à espinha OBRIGATORIAMENTE.
2. **O contexto de mercado** (1-2 parágrafos) — onde este dom vale mais: que tipo de cliente, contexto ou estrutura paga melhor por isto. Específico desta carta, nunca genérico.
3. **O que pode travar a conversão** (1 parágrafo) — o que impede este dom de ser pago ao seu valor real. Nunca fatalista: é o que trabalhar, não o que evitar.
4. **Fecho** (1 frase) — o que muda, em concreto, quando os três blocos se alinham.

## A espinha — o Bloco 1 tem de se ligar a isto, nunca repetir literalmente

${afirmacaoEspinha}

## O contexto profissional real do cliente — o Bloco 2 tem de o usar, nunca ficar genérico

Profissão: ${dados.profissao}
Situação actual: ${dados.situacaoDeclarada}

## Sinais para o Bloco 1 — o dom natural

${sinaisBloco1}
${sinalDignidadeAk ? `\n${sinalDignidadeAk}` : ""}

## Sinais para o Bloco 2 — o contexto de mercado

${sinaisBloco2}
${sinaisFigurasMercado ? `\n${sinaisFigurasMercado}` : "\n(Nenhuma figura fechada relevante liga o dom natural à área de mercado nesta carta — não invente uma.)"}

## Sinais para o Bloco 3 — o que trava a conversão

${sinaisBloco3.length > 0 ? sinaisBloco3.join("\n\n") : "Nenhuma das áreas financeiras (o que possui, o trabalho diário, os acordos, a carreira, os ganhos) está em apoio baixo nesta carta. Descreva o Bloco 3 a partir de qualquer tensão estrutural já dada acima (figuras fechadas), sem inventar um bloqueio que os dados não sustentam — ou diga honestamente que esta carta não aponta um travão claro à conversão."}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_DINHEIRO}

## Frases proibidas — promessa de resultado

${PROIBIDO_PROMESSA_DINHEIRO.map((f) => `"${f}"`).join(" · ")} — e qualquer variante que garanta um resultado financeiro em vez de descrever um padrão.

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, "casa" seguido de número, dignidades e termos sânscritos — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, concreto. Fala de dinheiro sem eufemismo e sem exagero — descreve o mecanismo, nunca promete o valor.

## Formato de saída

Máximo 5 parágrafos de prosa corrida — 3 blocos + fecho, cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. O fecho é uma frase só, claramente reconhecível como fecho. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 9 — COMO ÉS VISTA E PELO QUE PAGAM ────────────────────────────
// Critério K do v3 (ANALISE-MOTOR-vs-v2v3): esta secção tem de nomear
// EXPLICITAMENTE o que decide o preço — nunca ficar só em "como és vista".
// Por isso o Bloco 2 tem uma regra própria, mais rígida do que as
// restantes secções: o que decide o preço não pode ser vago, e a espinha
// tem de estar ligada a ele, sempre.

const CLICHES_PROIBIDOS_VISTA = ["és especial", "és única", "és diferente de todos", "tens um brilho próprio", "és autêntica"];

const REGRAS_V2_COMO_ES_VISTA = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 12: sem superlativo sem contagem feita — nunca "a mais especial", nunca "única".
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 9 — Como és Vista e Pelo Que Pagam. O
 * Bloco 3 (bloqueios) reaproveita `bandaAbsolutaSav` (linguagem-naveya.ts,
 * partilhada com a Secção 5 e a roda) sobre as casas 1, 7 e 10 — nunca
 * "falta de capacidade", sempre "falta de alavanca" (Regra 7).
 */
export function construirPromptSeccao9ComoEsVista(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : "Esta carta não tem espinha clara — ligue o Bloco 2 directamente aos sinais abaixo, sem forçar um tema central.";

  const ocupantesPorCasa = new Map<number, string[]>();
  for (const [graha, pos] of Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]) {
    const lista = ocupantesPorCasa.get(pos.house) ?? [];
    lista.push(graha);
    ocupantesPorCasa.set(pos.house, lista);
  }

  const ak = camada.karakas.atmakaraka;
  const regenteAsc = SIGN_RULERS[camada.ascendente.sign];
  const posRegenteAsc = camada.posicoesPlanetarias[regenteAsc];

  // ── Bloco 1 — o que os outros percebem: casa 1, Ascendente, regente do Ascendente, Arudha Lagna ──
  const sinaisBloco1 = [
    s("casa-1", "a primeira impressão — o que chega antes da conversa"),
    regenteAsc === ak ? "" : s(regenteAsc, "quem comanda essa primeira impressão"),
    regenteAsc === ak ? "" : s(`casa-${posRegenteAsc.house}`, "onde essa força de apresentação foi morar"),
    sinalArudhaLagna(camada),
    camada.arudhaLagna === 1 ? "" : s(`casa-${camada.arudhaLagna}`, "a área de vida onde a Arudha Lagna está instalada — o que os outros associam a esta pessoa, à primeira vista"),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Bloco 2 — o que decide o preço: Atmakaraka + casa 10 + figuras fechadas relevantes ──
  const sinaisBloco2 = [s(ak, "o que decide o preço — o motor central desta pessoa (o mesmo da espinha)"), s("casa-10", "o que decide o preço — o lugar público e a carreira")].filter(Boolean).join("\n\n");

  const pontosRelevantesPreco = new Set<string>([ak, ...(ocupantesPorCasa.get(10) ?? [])]);
  const figurasPreco = camada.figurasFechadas.filter((f) => f.pontos.some((p) => pontosRelevantesPreco.has(p)));
  const sinaisFigurasPreco = figurasPreco
    .map((f) => `CONTEXTO ADICIONAL (tensão ou fluxo estrutural que atravessa o que decide o preço, já em linguagem segura — nunca nomear "${f.tipo}" cru): ${f.detalhe}`)
    .join("\n\n");

  // ── Bloco 3 — o que pode trabalhar: casas 1, 7, 10 em banda fraca ──
  const savPorCasa = new Map(camada.sav.byHouse.map((h) => [h.casa, h.pontuacao]));
  const casasFracasVista = [1, 7, 10].filter((c) => bandaAbsolutaSav(savPorCasa.get(c) ?? 28) === "fraco");
  const sinaisBloco3 = casasFracasVista.map((c) => s(`casa-${c}`, "o que ainda pode trabalhar — apoio baixo aqui, capacidade intacta, falta alavanca"));

  return `Tu és o redactor do Naveya Method, secção "Como és Vista e Pelo Que Pagam" (secção 9 de 14 do relatório).

## O que esta secção tem de fazer

Descrever a distância entre o que esta pessoa É (secção 4, não repetir) e o que os OUTROS percebem primeiro — e nomear, sem vaguidade, o que decide efectivamente o preço que lhe pagam. Critério que manda nesta secção: "como és vista" sozinho reprova — tem de haver uma resposta explícita a "e é por isso que pagam X, não Y".

Estrutura obrigatória, sempre por esta ordem, máximo 4 parágrafos no total:

1. **O que os outros percebem** (1 parágrafo) — o que esta pessoa transmite antes de falar, a impressão imediata, o que chega antes da conversa.
2. **O que decide o preço** (1-2 parágrafos) — nomeado EXPLICITAMENTE, nunca vago: o que esta pessoa tem que o mercado genérico não tem facilmente, e porque vale mais por causa disso. Liga-se à espinha OBRIGATORIAMENTE.
3. **O que ainda pode trabalhar** (1 parágrafo) — uma ou duas coisas concretas e específicas que, mostradas, aumentariam o que recebe. Nunca "trabalha a tua confiança" — sempre algo nomeável e accionável.

## A espinha — o Bloco 2 tem de se ligar a isto, nunca repetir literalmente

${afirmacaoEspinha}

## Sinais para o Bloco 1 — o que os outros percebem

${sinaisBloco1}

## Sinais para o Bloco 2 — o que decide o preço (nomeie concretamente, nunca fique vago)

${sinaisBloco2}
${sinaisFigurasPreco ? `\n${sinaisFigurasPreco}` : "\n(Nenhuma figura fechada relevante liga o que decide o preço a uma tensão estrutural nesta carta — não invente uma.)"}

## Sinais para o Bloco 3 — o que ainda pode trabalhar

${sinaisBloco3.length > 0 ? sinaisBloco3.join("\n\n") : "Nenhuma das casas 1, 7 ou 10 está em apoio baixo nesta carta. Descreva o Bloco 3 a partir de uma tensão estrutural já dada acima (figuras fechadas), ou diga honestamente que esta carta não aponta um bloqueio claro nesta frente — nunca invente um."}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_COMO_ES_VISTA}

## Clichés proibidos — se aparecerem, é falha de geração

${CLICHES_PROIBIDOS_VISTA.map((c) => `"${c}"`).join(" · ")} — e qualquer variante da mesma família (elogio genérico, sem facto nenhum por trás).

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, "casa" seguido de número e termos sânscritos — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo. Fala de dinheiro e de imagem sem embaraço e sem vaidade — nomeia o que decide o preço com a mesma franqueza com que descreveria um mecanismo.

## Formato de saída

Máximo 4 parágrafos de prosa corrida — 3 blocos, cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 6 — O QUE TE TEM TRAVADO (CONDICIONAL) ────────────────────────
// Primeira secção condicional a CONTEÚDO (não a fiabilidade de um dado,
// como a Secção 5): só existe quando a carta sustenta um bloqueio real.
// Devolve `string | null`, como a Secção 5 — `null` quando nenhuma das
// condições de activação se verifica; o motivo NÃO é escrito em
// `camada.naoCalculado` por esta função (esse array é da Camada A, sobre
// CÁLCULO; a ausência desta secção é uma decisão de CONTEÚDO do
// relatório) — fica documentado aqui, para o orquestrador (ainda por
// construir) decidir como registar a omissão ao nível do relatório
// (`RelatorioV3.guardIssues` ou `seccoesCondicionaisActivas`, ambos já
// modelados em types-v3.ts para este fim).
//
// CONDIÇÕES DE ACTIVAÇÃO (basta uma):
//  1. SAV < 25 nas "casas relevantes para a pergunta declarada". Como o
//     motor não tem (ainda) um classificador de tema da pergunta,
//     implementado aqui por uma heurística DOCUMENTADA, não escondida:
//     se a pergunta/situação declarada contém vocabulário de dinheiro,
//     as casas relevantes são as 5 casas financeiras (2/6/7/10/11, o
//     mesmo conjunto da Secção 8); caso contrário, por não termos uma
//     classificação melhor, todas as 12 entram em jogo. Gap assinalado
//     — um classificador de tema por LLM substituiria isto no futuro.
//  2. Um planeta clássico com dignidade forte (Exaltado/Domicílio/
//     Moolatrikona, ou Panchadha Maitri adhi-mitra/mitra) numa casa em
//     banda fraca — força que não encontra terreno.
//  3. O Atmakaraka é vértice de pelo menos uma figura fechada (mesmo
//     critério mecânico já usado em espinha.ts, `akEmFigura`).

const CLICHES_PROIBIDOS_TRAVADO = ["trabalha a tua confiança", "confia mais em ti", "acredita em ti própria", "supera os teus bloqueios"];

const PALAVRAS_DINHEIRO = ["dinheiro", "ganhar", "ganho", "rendimento", "rendiment", "sustento", "financeir", "pagar", "pagamento", "cobrar", "preço", "salário", "receita"];

/** Heurística documentada (ver nota acima) para decidir se a pergunta declarada é sobre dinheiro — decide quais casas contam como "relevantes" para a condição de activação 1. */
function perguntaEnvolveDinheiro(dados: DadosClienteV3): boolean {
  const texto = `${dados.mainQuestion} ${dados.situacaoDeclarada}`.toLowerCase();
  return PALAVRAS_DINHEIRO.some((p) => texto.includes(p));
}

const REGRAS_V2_TRAVADO = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 6: uma data no futuro nunca é a chave — o primeiro passo diz sempre o que já vale AGORA, antes de apontar para o que vem a seguir.
- Regra 7: nunca "falta de capacidade" — sempre "falta de alavanca" ou "tensão estrutural". A capacidade está sempre intacta.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 18: cada elemento vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 6 — O Que Te Tem Travado. Devolve `null`
 * quando nenhuma das 3 condições de activação se verifica (ver nota
 * acima) — o chamador NUNCA deve tratar `null` como erro.
 */
export function construirPromptSeccao6OQueTeTemTravado(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string | null {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const savPorCasa = new Map(camada.sav.byHouse.map((h) => [h.casa, h.pontuacao]));
  const ak = camada.karakas.atmakaraka;

  // ── Condição 1 — SAV < 25 nas casas relevantes para a pergunta ──
  const casasRelevantesPergunta = perguntaEnvolveDinheiro(dados) ? [2, 6, 7, 10, 11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const casasFracasRelevantes = casasRelevantesPergunta.filter((c) => bandaAbsolutaSav(savPorCasa.get(c) ?? 28) === "fraco");

  // ── Condição 2 — planeta forte em casa fraca ──
  const FORTE_CLASSICA = new Set(["Exalted", "Own", "Moolatrikona"]);
  const FORTE_MAITRI = new Set(["adhi-mitra", "mitra"]);
  const planetasFortesEmCasaFraca = CLASSICAL_GRAHAS.filter((g) => {
    const dign = camada.dignidades[g];
    const forte = FORTE_CLASSICA.has(dign.classica) || (dign.panchadha != null && FORTE_MAITRI.has(dign.panchadha));
    const casa = camada.posicoesPlanetarias[g].house;
    return forte && bandaAbsolutaSav(savPorCasa.get(casa) ?? 28) === "fraco";
  });

  // ── Condição 3 — Atmakaraka é vértice de uma figura fechada ──
  const figurasComAk = camada.figurasFechadas.filter((f) => f.pontos.includes(ak));

  const activo = casasFracasRelevantes.length > 0 || planetasFortesEmCasaFraca.length > 0 || figurasComAk.length > 0;
  if (!activo) return null;

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  // ── Elemento 1 — o dom que existe: Atmakaraka + casas fortes ──
  const casasFortesTodas = camada.sav.byHouse.filter((h) => bandaAbsolutaSav(h.pontuacao) === "forte").map((h) => h.casa);
  const sinaisElemento1 = [s(ak, "o dom que existe — o motor central desta pessoa, um facto da carta, nunca condescendência"), ...casasFortesTodas.map((c) => s(`casa-${c}`, "uma área onde esse dom já encontra terreno"))]
    .filter(Boolean)
    .join("\n\n");

  // ── Elemento 2 — o bloqueio concreto ──
  const sinaisElemento2 = [
    ...casasFracasRelevantes.map((c) => s(`casa-${c}`, "o bloqueio — apoio baixo aqui, capacidade intacta, falta alavanca")),
    ...planetasFortesEmCasaFraca.map((g) => s(g, "o bloqueio — força que não encontra terreno na casa onde está instalada")),
  ].filter(Boolean);
  const sinaisFigurasElemento2 = figurasComAk
    .map((f) => `CONTEXTO ADICIONAL (tensão estrutural que atravessa o motor central, já em linguagem segura — nunca nomear "${f.tipo}" cru): ${f.detalhe}`)
    .join("\n\n");

  // ── Elemento 3 — o que muda quando cede: a espinha + casas fortes ──
  const sinalElemento3 = afirmacaoEspinha ? `A espinha deste relatório: "${afirmacaoEspinha}" — não repita esta frase; mostre-a a florescer sem o peso do bloqueio.` : "Esta carta não tem espinha clara — descreva a consequência directamente a partir das casas fortes do Elemento 1.";

  // ── Elemento 4 — o primeiro passo: momento actual (reaproveita a mesma lógica da Secção 11/12, duplicada de propósito) ──
  const antarLord = camada.dashaAtual.antardasha.lord;
  const sinalMomentoActual = s(antarLord, "o primeiro passo apoia-se no período pessoal em curso — o que ele pede agora");

  return `Tu és o redactor do Naveya Method, secção "O Que Te Tem Travado" (secção 6 de 14 do relatório — CONDICIONAL, activa nesta carta).

## O que esta secção tem de fazer

Descrever um bloqueio real desta carta, numa estrutura de SANDUÍCHE de 4 elementos — nunca fatalista, o bloqueio é uma tensão estrutural a resolver, nunca uma sentença.

Estrutura obrigatória, sempre por esta ordem, máximo 4 parágrafos no total (um por elemento):

1. **O dom que existe** — reconhecimento explícito da capacidade real. Nunca condescendente — é um facto da carta.
2. **O que está a travar** — o bloqueio concreto, nomeado com precisão. Nunca "falta de capacidade" — sempre "falta de alavanca" ou "tensão estrutural" (Regra 7).
3. **O que muda quando o bloqueio cede** — o resultado concreto e específico depois da tensão resolvida.
4. **O primeiro passo** — uma acção concreta e imediata, rastreável à carta. Não é motivação ("trabalha a tua confiança") — é instrução específica.

## Elemento 1 — sinais do dom que existe

${sinaisElemento1}

## Elemento 2 — sinais do bloqueio

${sinaisElemento2.length > 0 ? sinaisElemento2.join("\n\n") : "(Nenhuma casa fraca directa — o bloqueio vem só da tensão estrutural abaixo.)"}
${sinaisFigurasElemento2 ? `\n${sinaisFigurasElemento2}` : ""}

## Elemento 3 — o que muda quando cede

${sinalElemento3}

## Elemento 4 — o primeiro passo (momento actual)

${sinalMomentoActual}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_TRAVADO}

## Clichés proibidos — se aparecerem, é falha de geração

${CLICHES_PROIBIDOS_TRAVADO.map((c) => `"${c}"`).join(" · ")} — motivação genérica não é instrução.

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, "casa" seguido de número e termos sânscritos — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, sem pena e sem drama. O bloqueio é descrito com a mesma franqueza que o dom — nenhum dos dois é mais confortável de dizer do que o outro.

## Formato de saída

Máximo 4 parágrafos de prosa corrida, um por elemento da sanduíche — cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 7 — O TRÂNSITO ACTUAL (CONDICIONAL) ───────────────────────────
// DISTINÇÃO CRÍTICA vs. Secção 11 (O Relógio), por pedido explícito: o
// Relógio é EXAUSTIVO (as 4 camadas de tempo, sempre, horizonte de 3
// anos); a Secção 7 é SELECTIVA e IMEDIATA (só os trânsitos lentos com
// contacto EXACTO ao natal — os mesmos que `identificarTransitoDeEra` e
// `confiancaTransitoLento` já tratam como "activos" na Secção 11 — e o
// foco é 3-6 meses, não 3 anos). A selectividade É o mecanismo que evita
// repetir o Relógio: o Relógio descreve os 6 trânsitos lentos sempre; a
// Secção 7 só fala dos que têm contacto agora, e só disso.
//
// Devolve `string | null` — `null` quando NENHUM slowTransit tem contacto
// exacto (mesmo padrão das Secções 5/6: a ausência é uma decisão de
// conteúdo do relatório, não um erro; o motivo fica documentado aqui, não
// escrito em `camada.naoCalculado`, que é sobre CÁLCULO).
//
// REGRA PRÓPRIA, mais restrita do que a regra geral de linguagem
// corrigida em 23/08/2026: esta secção NUNCA nomeia o planeta em trânsito
// (nem mesmo acompanhado de definição) — só a definição Naveya. Por isso
// usa `sinalOcultarTermo` (abaixo), não `formatarSinalParaPrompt`/
// `serializarSinal`. A casa afectada continua a poder ser nomeada com
// definição, como em qualquer outra secção — só o PLANETA fica de fora.

/** Sinal de 2 partes (sem "TERMO A ESCREVER NO TEXTO") — usado só nesta secção, onde o planeta em trânsito nunca pode ser nomeado, nem com definição. */
function sinalOcultarTermo(termotecnico: string, contexto: string): string {
  const def = traduzirSinal(termotecnico, contexto);
  if (!def) return "";
  return `SINAL: ${contexto}: ${termotecnico}\nDEFINIÇÃO NAVEYA: "${def}"\nINSTRUÇÃO: Regra específica desta secção — NUNCA nomeies o planeta em trânsito no texto final, nem mesmo acompanhado de definição. Usa só a definição Naveya acima para descrever o que este período pede. O termo técnico acima é só para tu entenderes o que estás a traduzir.`;
}

const REGRAS_V2_TRANSITO_ACTUAL = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa nem prometer um acontecimento.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.
- Regra 19a: uma data de calendário escreve-se só ao mês e ao ano — nunca ao dia.`;

/**
 * Constrói o prompt da Secção 7 — O Trânsito Actual. Devolve `null`
 * quando nenhum `slowTransit` tem contacto natal exacto (ver nota acima)
 * — o chamador NUNCA deve tratar `null` como erro.
 */
export function construirPromptSeccao7TransitoActual(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string | null {
  const transitosActivos = camada.slowTransits.filter((t) => t.contactosNatal.length > 0);
  if (transitosActivos.length === 0) return null;

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  const blocosTransito = transitosActivos
    .map((t) => {
      const confianca = confiancaTransitoLento(t);
      const sinalPeriodo = sinalOcultarTermo(t.corpo, "trânsito activo agora — o que este período pede");
      const sinalCasa = formatarSinalParaPrompt(`casa-${t.casaAPartirDoAscendente}`, "a área de vida atravessada por este trânsito");
      const sinalCasaTexto = sinalCasa ? serializarSinal(sinalCasa) : "";
      return `Nível de confiança deste trânsito: **${confianca}** (contacto natal a ${t.contactosNatal[0].orbe.toFixed(1)}° de órbe — dentro dos 3° que definem "activo agora").

${sinalPeriodo}

${sinalCasaTexto}

Horizonte: activo pelo menos até ${formatarMesAno(t.saidaDesteSigno)} (fronteira de signo, indicativa — não a data exacta de saída do contacto, que pede efeméride de estação ainda não calculada por este motor). Para o foco desta secção, pense nos próximos 3 a 6 meses, não no horizonte inteiro.`;
    })
    .join("\n\n---\n\n");

  return `Tu és o redactor do Naveya Method, secção "O Trânsito Actual" (secção 7 de 14 do relatório — CONDICIONAL, activa nesta carta).

## O que esta secção tem de fazer

Descrever o que está activo AGORA, especificamente — os próximos 3 a 6 meses, nunca o horizonte completo. Esta secção NÃO é o Relógio (secção 11, que já cobre as 4 camadas de tempo e um horizonte de 3 anos) — é mais curta, mais imediata, e só fala dos trânsitos que têm um contacto EXACTO ao natal agora. Nunca repita o que o Relógio já disse com as mesmas palavras — esta secção é um zoom no presente, não um resumo do Relógio.

Estrutura obrigatória, sempre por esta ordem, máximo 3 parágrafos no total:

1. **Introdução** (1 frase) — o que está a acontecer agora, no contexto desta pessoa.
2. **Por cada trânsito activo** (1 parágrafo cada, mas comprima em conjunto se houver mais do que um) — o que este período pede, o que favorece, o que evitar, e o horizonte de quando muda.
3. **Fecho** (1 parágrafo) — o que fazer com esta informação nos próximos 3 a 6 meses. Ligação à espinha.

## A espinha — o fecho liga-se a isto, nunca repete literalmente

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — feche a secção directamente a partir do que os trânsitos activos pedem, sem forçar um tema central."}

## Trânsitos activos agora (contacto exacto ao natal, ≤3° de órbe)

${blocosTransito}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_TRANSITO_ACTUAL}

## Nunca prometer acontecimentos

"Este período pode trazer mais foco para..." é o registo certo. "Vai acontecer", "vais viver...", ou qualquer formulação que garanta um evento específico está proibida — descreva o CONTEXTO e o que pode ganhar relevância, nunca o desfecho.

## Linguagem — regra ESPECÍFICA desta secção, mais restrita do que a regra geral

O planeta em trânsito NUNCA se nomeia, nem mesmo com definição a seguir — use só a definição Naveya (ver instrução em cada sinal acima). A casa afectada pode ser nomeada com definição, como em qualquer outra secção (regra geral: termo + " — " + definição). "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, sem fatalismo e sem promessa. Contexto para reflexão, nunca profecia — e mais compacto do que o Relógio, porque o foco aqui é só o que já está a tocar a pessoa agora.

## Formato de saída

Máximo 3 parágrafos de prosa corrida — introdução, trânsito(s) activo(s), fecho — cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 10 — SOBRE O QUÊ E EM QUE FORMA (CONDICIONAL) ─────────────────
// Condicional a CONTEÚDO da pergunta declarada (mesma família da Secção
// 6/7), detectada por `seccao10Activa` — exportada em separado do
// construtor do prompt, porque o pedido pede-a como função própria,
// testável isoladamente e reutilizável por um futuro orquestrador sem
// precisar de construir o prompt inteiro só para decidir se a secção
// existe.
//
// HEURÍSTICA DE DETECÇÃO — documentada, não escondida: como o motor não
// tem (ainda) um classificador de tema por LLM, a detecção é por
// palavras-chave (incluindo conjugações comuns de "fazer": "faço",
// "fazes", "fazem" — a irregularidade do verbo em português faz com que
// "fazer" sozinho não bata com "faço"). Por pedido explícito, em caso de
// dúvida o resultado é `true` — mais barato incluir uma secção que a
// carta sustenta do que omiti-la.

const PALAVRAS_VOCACAO = [
  "fazer",
  "faço",
  "fazes",
  "faz ",
  "fazemos",
  "fazem",
  "fazendo",
  "trabalh",
  "carreira",
  "vocaç",
  "vocac",
  "área",
  "area",
  "profiss",
  "caminho",
  "missão",
  "missao",
  "propósit",
  "proposit",
  "sou boa",
  "onde rendo",
  "onde rende",
];

/**
 * Detecta se a Secção 10 se sustenta nesta pergunta declarada — heurística
 * por palavras-chave (ver nota acima), não um classificador de tema real.
 * Exportada em separado de `construirPromptSeccao10SobreOQue` para poder
 * ser chamada isoladamente (ex.: por um futuro orquestrador, antes de
 * decidir se vale a pena construir o prompt completo).
 */
export function seccao10Activa(dados: DadosClienteV3): boolean {
  const texto = `${dados.mainQuestion} ${dados.situacaoDeclarada}`.toLowerCase();
  return PALAVRAS_VOCACAO.some((p) => texto.includes(p));
}

const REGRAS_V2_SOBRE_O_QUE = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa — nunca "o teu destino é", sempre "este desenho aponta para".
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

const PROIBIDO_DESTINO = ["o teu destino é", "nasceste para", "és feita para", "a tua vocação é"];

/**
 * Constrói o prompt da Secção 10 — Sobre o Quê e Em Que Forma. Devolve
 * `null` quando `seccao10Activa(dados)` for `false` (ver nota acima) — o
 * chamador NUNCA deve tratar `null` como erro.
 */
export function construirPromptSeccao10SobreOQue(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string | null {
  if (!seccao10Activa(dados)) return null;

  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  const ak = camada.karakas.atmakaraka;
  const signoCasa10 = signOfHouse(10, camada.ascendente.sign);
  const regenteCasa10 = SIGN_RULERS[signoCasa10];

  // ── Bloco A — sobre o quê: Atmakaraka + casas 5/9/10 + regente da casa 10 ──
  const sinaisBlocoA = [
    s(ak, "o território de actuação — o motor central desta pessoa (o mesmo da espinha)"),
    sinalKarakamsha(camada),
    s("casa-5", "um território possível — o que cria por gosto próprio"),
    s("casa-9", "um território possível — o sentido e aquilo em que acredita"),
    s("casa-10", "um território possível — o lugar público e a carreira"),
    regenteCasa10 === ak ? "" : s(regenteCasa10, "quem comanda o território da carreira"),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Bloco B — em que forma: casa 6 + Mercúrio + figuras fechadas relevantes ──
  const ocupantesCasa6 = (Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]).filter(([, pos]) => pos.house === 6).map(([g]) => g);
  const sinaisBlocoB = [s("casa-6", "o formato de trabalho diário que a carta sustenta"), s("Mercury", "como esta pessoa processa e negoceia o mundo — sozinha ou por acordo, estruturado ou livre")].filter(Boolean).join("\n\n");

  const pontosRelevantesFormato = new Set<string>(["Mercury", ...ocupantesCasa6]);
  const figurasFormato = camada.figurasFechadas.filter((f) => f.pontos.some((p) => pontosRelevantesFormato.has(p)));
  const sinaisFigurasFormato = figurasFormato
    .map((f) => `CONTEXTO ADICIONAL (tensão ou fluxo estrutural que atravessa o formato de trabalho, já em linguagem segura — nunca nomear "${f.tipo}" cru): ${f.detalhe}`)
    .join("\n\n");

  return `Tu és o redactor do Naveya Method, secção "Sobre o Quê e Em Que Forma" (secção 10 de 14 do relatório — CONDICIONAL, activa nesta carta).

## O que esta secção tem de fazer

Descrever um TERRITÓRIO de actuação (Bloco A) e um FORMATO de trabalho (Bloco B) — nunca uma profissão concreta, nunca um destino. Tem de ser específico desta carta ao ponto de não poder ter sido escrito para outra pessoa.

Estrutura obrigatória, sempre por esta ordem, máximo 4 parágrafos no total:

1. **Sobre o quê** (1-2 parágrafos) — o tema ou área central onde esta carta rende mais. Não é uma profissão — é um território de actuação (ex.: "estruturar o que já existe", nunca "sê consultora de gestão").
2. **Em que forma** (1-2 parágrafos) — o formato de trabalho que esta carta sustenta melhor: sozinha ou em equipa, com estrutura ou com autonomia, físico ou conceptual. Não é preferência pessoal — é o que a carta mostra que rende mais.
3. **Fecho** (1 frase) — o que acontece quando o território e o formato se alinham.

## A espinha — contexto para os dois blocos, nunca repetir literalmente

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — descreva os 2 blocos directamente a partir dos sinais abaixo, sem forçar um tema central."}

## Sinais para o Bloco A — sobre o quê

${sinaisBlocoA}

## Sinais para o Bloco B — em que forma

${sinaisBlocoB}
${sinaisFigurasFormato ? `\n${sinaisFigurasFormato}` : "\n(Nenhuma figura fechada relevante liga o formato de trabalho a uma tensão estrutural nesta carta — não invente uma.)"}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_SOBRE_O_QUE}

## Frases proibidas — nunca um destino, nunca uma profissão concreta

${PROIBIDO_DESTINO.map((f) => `"${f}"`).join(" · ")} — e qualquer nome de profissão concreto (ex. "sê advogada", "torna-te consultora"). Descreva o território e o formato; a escolha da profissão exacta é sempre da pessoa.

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, "casa" seguido de número e termos sânscritos — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Adulto, directo, concreto. Fala de território e formato com a mesma precisão com que descreveria um mecanismo — nunca com a vaguidade de um horóscopo genérico.

## Formato de saída

Máximo 4 parágrafos de prosa corrida — Bloco A, Bloco B, fecho — cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── SECÇÃO 14 — UMA ÚLTIMA COISA (CONDICIONAL) ───────────────────────────
// A secção mais curta do relatório (1 parágrafo, máximo) e a última das
// condicionais por conteúdo. Duas "flavors" distintas, por pedido
// explícito — não é o mesmo apoio consoante a casa que activa a secção:
//  · casa 12 ocupada por planeta forte → o trabalho INTERIOR tem suporte
//    (retiro, prática silenciosa, um espaço privado de processamento).
//  · casa 9 ocupada por planeta forte → um MENTOR ou guia externo é útil
//    (alguém mais experiente a orientar, não um par).
// Quando ambas ou nenhuma das duas condições "planeta forte numa das
// casas" se verifica mas há uma figura fechada ou um trânsito activo a
// tocar casa 9/12, a secção ainda activa mas com um "sabor" mais genérico
// ("apoio externo"), sem forçar a flavor de mentor/interior que os dados
// não sustentam directamente.

const FORTE_CLASSICA_14 = new Set(["Exalted", "Own", "Moolatrikona"]);
const FORTE_MAITRI_14 = new Set(["adhi-mitra", "mitra"]);

function planetaForte(camada: CamadaA, g: (typeof CLASSICAL_GRAHAS)[number]): boolean {
  const dign = camada.dignidades[g];
  const forteClassica = FORTE_CLASSICA_14.has(dign.classica);
  const forteMaitri = dign.panchadha != null && FORTE_MAITRI_14.has(dign.panchadha);
  const avasthaFavoravel = camada.avasthas[g] === "Yuva";
  return forteClassica || forteMaitri || avasthaFavoravel;
}

const PROIBIDO_PROFISSIONAL_14 = ["psicólogo", "psicóloga", "médico", "médica", "coach", "terapeuta", "psiquiatra", "consultor", "conselheiro profissional"];

const REGRAS_V2_ULTIMA_COISA = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa — sugestão, nunca prescrição.
- Regra 18: a afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt da Secção 14 — Uma Última Coisa. Devolve `null`
 * quando nenhuma das 4 condições de activação se verifica — o chamador
 * NUNCA deve tratar `null` como erro.
 */
export function construirPromptSeccao14UltimaCoisa(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3): string | null {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const ocupantesCasa = (casa: number): string[] => (Object.entries(camada.posicoesPlanetarias) as [string, { house: number }][]).filter(([, pos]) => pos.house === casa).map(([g]) => g);
  const ocupantesCasa12 = ocupantesCasa(12).filter((g): g is (typeof CLASSICAL_GRAHAS)[number] => (CLASSICAL_GRAHAS as readonly string[]).includes(g));
  const ocupantesCasa9 = ocupantesCasa(9).filter((g): g is (typeof CLASSICAL_GRAHAS)[number] => (CLASSICAL_GRAHAS as readonly string[]).includes(g));

  const fortesCasa12 = ocupantesCasa12.filter((g) => planetaForte(camada, g));
  const fortesCasa9 = ocupantesCasa9.filter((g) => planetaForte(camada, g));

  const pontosCasa9e12 = new Set<string>([...ocupantesCasa12, ...ocupantesCasa9]);
  const figuraRelevante = camada.figurasFechadas.find((f) => f.pontos.some((p) => pontosCasa9e12.has(p)));

  const transitoRelevante = camada.slowTransits.find((t) => t.contactosNatal.length > 0 && (t.casaAPartirDoAscendente === 9 || t.casaAPartirDoAscendente === 12));

  const activo = fortesCasa12.length > 0 || fortesCasa9.length > 0 || figuraRelevante != null || transitoRelevante != null;
  if (!activo) return null;

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  // ── Escolha do "sabor": casa 12 (trabalho interior) tem prioridade sobre casa 9 (mentor), que tem prioridade sobre figura/trânsito genérico ──
  let sabor: string;
  let sinalPrincipal: string;
  let sinalCasa: string;

  if (fortesCasa12.length > 0) {
    sabor = "o trabalho interior tem suporte — um espaço privado de processamento (retiro, prática silenciosa, um diário, um ritual só seu), nunca uma relação social";
    sinalPrincipal = s(fortesCasa12[0], "o apoio externo — força instalada no que fica escondido, o trabalho invisível e o descanso");
    sinalCasa = s("casa-12", "a área que sustenta este apoio — o que fica escondido, o trabalho invisível, o descanso");
  } else if (fortesCasa9.length > 0) {
    sabor = "um mentor ou guia externo é útil — alguém mais experiente a orientar, não um par nem alguém do mesmo nível";
    sinalPrincipal = s(fortesCasa9[0], "o apoio externo — força instalada no sentido, no estudo e naquilo em que acredita sem precisar de prova");
    sinalCasa = s("casa-9", "a área que sustenta este apoio — o sentido, o estudo e aquilo em que acredita sem precisar de prova");
  } else {
    const casaGenerica = figuraRelevante && ocupantesCasa12.some((g) => figuraRelevante.pontos.includes(g)) ? 12 : transitoRelevante?.casaAPartirDoAscendente === 9 ? 9 : 12;
    sabor = "há apoio externo disponível, de um tipo ainda por definir — a carta aponta a área, não a forma exacta";
    sinalPrincipal = "";
    sinalCasa = s(`casa-${casaGenerica}`, "a área que sustenta este apoio");
  }

  const sinalFigura = figuraRelevante ? `\n\nCONTEXTO ADICIONAL (tensão ou fluxo estrutural que liga esta área ao resto da carta, já em linguagem segura — nunca nomear "${figuraRelevante.tipo}" cru): ${figuraRelevante.detalhe}` : "";

  return `Tu és o redactor do Naveya Method, secção "Uma Última Coisa" (secção 14 de 14 do relatório — CONDICIONAL, activa nesta carta).

## O que esta secção tem de fazer

Identificar o TIPO de apoio externo que esta carta beneficia — nunca "vai a um psicólogo", nunca o nome de uma profissão. Descreva o tipo de relação ou recurso específico que esta carta pede: ${sabor}.

Uma sugestão concreta e rastreável aos sinais abaixo — nunca genérica, nunca a mesma frase que serviria para qualquer carta.

## A espinha — ligação subtil quando possível, nunca forçada

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — descreva o apoio directamente a partir dos sinais abaixo, sem forçar uma ligação a um tema central."}

## Sinais

${[sinalPrincipal, sinalCasa].filter(Boolean).join("\n\n")}${sinalFigura}

## Regras de escrita aplicáveis a esta secção (CODE-1-esqueleto-v2.md)

${REGRAS_V2_ULTIMA_COISA}

## Proibido — nunca prescrever um profissional específico

${PROIBIDO_PROFISSIONAL_14.map((p) => `"${p}"`).join(" · ")} — descreva o TIPO de relação ou contexto (ex. "alguém que já atravessou o mesmo", "um espaço sem julgamento, sem agenda própria"), nunca o título profissional.

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas e "casa" seguido de número — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Íntimo, não prescritivo — uma sugestão feita por alguém que já viu o padrão, não uma instrução clínica. Uma frase que soa a "repara nisto", nunca a "devias fazer isto".

## Formato de saída

Exactamente 1 parágrafo de prosa corrida — nunca mais. Não use tool-use, não produza JSON — só o texto da secção.`;
}

// ── ANEXO A — RETRATO DE PERSONALIDADE ───────────────────────────────────
// Última peça gerada por LLM antes do Anexo B (determinístico). Aprofunda
// a Secção 4 (Quem és) pelo ângulo psicológico — cognição (Mercúrio),
// emoção (Lua), acção (Marte + Ascendente) — sem repetir nenhuma frase já
// coberta lá. As nakshatras usam agora `DEFINICOES_NAKSHATRA` (construída
// nesta sessão) directamente — nome evocativo + definição —, já não o
// proxy pelo regente clássico que a Secção 4 ainda usa (gap documentado
// lá, por ter sido escrita antes de `DEFINICOES_NAKSHATRA` existir).

const REGRAS_V2_ANEXO_A = `- Regra 2: nenhuma faculdade abstracta é sujeito de frase. O sujeito é sempre a pessoa.
- Regra 3 (uma coisa acontece uma vez): não repita nenhuma frase ou observação já feita na Secção 4 — aprofunde pelo ângulo psicológico, nunca reafirme o mesmo facto.
- Regra 13: o absoluto pode descrever o desenho, nunca pode fechar a pessoa.
- Regra 18: cada afirmação vem de um facto identificado (os sinais abaixo) — nunca uma afirmação sem lastro.`;

/**
 * Constrói o prompt do Anexo A — Retrato de Personalidade. Gerado por
 * LLM (ao contrário do Anexo B, determinístico). `retratoSeccao4Resumo`
 * é opcional, na mesma convenção de `retrato60sResumo`/`descobertasResumo`
 * — um resumo curto do que a Secção 4 já disse, para este anexo aprofundar
 * sem repetir.
 */
export function construirPromptAnexoA(camada: CamadaA, espinha: DerivacaoEspinha, dados: DadosClienteV3, retratoSeccao4Resumo?: string): string {
  const s = (tecnico: string, contexto: string): string => {
    const sinal = formatarSinalParaPrompt(tecnico, contexto);
    return sinal ? serializarSinal(sinal) : "";
  };

  const desfecho = espinha.desfecho;
  const afirmacaoEspinha = "afirmacao" in desfecho ? desfecho.afirmacao : null;

  const nakMercurio = getNakshatra(camada.posicoesPlanetarias.Mercury.siderealLongitude);
  const nakLua = getNakshatra(camada.posicoesPlanetarias.Moon.siderealLongitude);

  // ── Bloco 1 — como pensa e processa: Mercúrio + nakshatra + casa ──
  const sinaisBloco1 = [
    s("Mercury", "o estilo cognitivo — como esta pessoa processa e organiza o pensamento"),
    s(nakMercurio.name, "o sabor de como esta pessoa pensa e aprende"),
    s(`casa-${camada.posicoesPlanetarias.Mercury.house}`, "a área de vida onde este estilo cognitivo se aplica primeiro"),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Bloco 2 — como sente e reage: Lua + nakshatra + casa ──
  const sinaisBloco2 = [
    s("Moon", "o padrão emocional — como reage ao stress, ao conflito, ao que não controla"),
    s(nakLua.name, "o sabor de como esta pessoa sente e do que precisa para se sentir segura"),
    s(`casa-${camada.posicoesPlanetarias.Moon.house}`, "a área de vida onde este padrão emocional se instala"),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Bloco 3 — como age no mundo: Marte + Ascendente + avastha ──
  const avasthaMarte = camada.avasthas.Mars;
  const sinaisBloco3 = [
    s("Mars", "o padrão de acção — como inicia, como persiste, como desiste"),
    s("casa-1", "o Ascendente — a porta de entrada no mundo, onde este padrão de acção se mostra primeiro"),
    avasthaMarte ? s(avasthaMarte, "a maturidade deste padrão de acção neste momento da vida") : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Figuras fechadas que envolvem Mercúrio, Lua, Marte ou o Ascendente ──
  const pontosRelevantesAnexoA = new Set<string>(["Mercury", "Moon", "Mars", "Ascendente"]);
  const figurasRelevantes = camada.figurasFechadas.filter((f) => f.pontos.some((p) => pontosRelevantesAnexoA.has(p)));
  const sinaisFigurasRelevantes = figurasRelevantes
    .map((f) => `CONTEXTO ADICIONAL (tensão ou fluxo estrutural entre cognição/emoção/acção, já em linguagem segura — nunca nomear "${f.tipo}" cru): ${f.detalhe}`)
    .join("\n\n");

  return `Tu és o redactor do Naveya Method, Anexo A — Retrato de Personalidade (aprofunda a Secção 4, "Quem és").

## O que este anexo tem de fazer

Aprofundar, pelo ângulo psicológico, o que a Secção 4 já descreveu — NUNCA repetir a mesma frase ou observação. É descrição de padrão, nunca diagnóstico: nunca use linguagem clínica (nomes de condições, termos de diagnóstico) — descreva o padrão como um desenho de comportamento reconhecível, nunca como uma categoria médica ou psicológica formal.

Estrutura obrigatória, sempre por esta ordem, máximo 6 parágrafos no total:

1. **Como pensa e processa** (1-2 parágrafos) — o estilo cognitivo: como aprende, como decide, como organiza o pensamento.
2. **Como sente e reage** (1-2 parágrafos) — o padrão emocional: como reage ao stress, ao conflito, ao que não controla; o que precisa para se sentir segura.
3. **Como age no mundo** (1-2 parágrafos) — o padrão de acção: como inicia, como persiste, como desiste.
4. **Fecho** (1 parágrafo) — como estes 3 padrões se relacionam entre si: onde se reforçam, onde criam tensão.

Nunca abra com "és uma pessoa que..." — é o mesmo clichê já proibido na Secção 4.

${retratoSeccao4Resumo ? `## O que a Secção 4 (Quem és) já disse — aprofundar, nunca repetir\n\n${retratoSeccao4Resumo}\n` : "## Nota\n\nO texto da Secção 4 (Quem és) ainda não foi gerado nesta chamada — escreva com naturalidade, evitando de qualquer forma repetir os factos mais óbvios (Atmakaraka, Ascendente) que essa secção certamente já cobre.\n"}

## A espinha — nunca repetir literalmente, só um pano de fundo se ajudar

${afirmacaoEspinha ?? "Esta carta não tem espinha clara — descreva os 3 blocos directamente a partir dos sinais abaixo, sem forçar um tema central."}

## Sinais para o Bloco 1 — como pensa e processa

${sinaisBloco1}

## Sinais para o Bloco 2 — como sente e reage

${sinaisBloco2}

## Sinais para o Bloco 3 — como age no mundo

${sinaisBloco3}
${sinaisFigurasRelevantes ? `\n${sinaisFigurasRelevantes}` : ""}

## Regras de escrita aplicáveis a este anexo (CODE-1-esqueleto-v2.md)

${REGRAS_V2_ANEXO_A}

## Linguagem — termos técnicos são permitidos, sempre com definição (correcção 23/08/2026)

Pode nomear planetas, "casa" seguido de número e nakshatras — mas todo termo que nomear tem de vir imediatamente seguido de " — " e a definição Naveya correspondente (ver os sinais acima), no formato «termo — definição — resto da frase». As nakshatras usam o NOME EVOCATIVO dado no sinal (nunca a transliteração em sânscrito). Nunca o termo sozinho sem definição a seguir. "O teu mapa"/"a tua carta" continuam proibidos como sujeito de frase — o sujeito é sempre a pessoa (Regra 2).

${instrucaoMateriaEEspinha(espinha.desfecho)}
## Pronome

Usa sempre "tu" e nunca "você". O relatório inteiro usa "tu". Esta regra não tem excepções.

## Tom (calibrado por CODE-4-melina-PASSA.md)

Mais descritivo do que analítico — como um retrato bem observado, não um relatório clínico. Adulto, específico, sem jargão de auto-ajuda.

## Formato de saída

Máximo 6 parágrafos de prosa corrida — 3 blocos + fecho, cada um distinto do anterior por uma frase de transição, nunca por um título Markdown visível. Não use tool-use, não produza JSON — só o texto do anexo.`;
}
