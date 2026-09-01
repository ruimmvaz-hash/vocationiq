// FASE 0 — motor novo (CODE-1 v2+v3), construído em paralelo ao motor
// actual (M-004/M-005/M-008/M-009/M-010 + SPEC-003/SPEC-004, ver
// lifeReport/types.ts e web/src/lib/report/types.ts). Este ficheiro NÃO
// substitui nada — o motor antigo continua a ler os seus próprios tipos,
// intacto. Ver docs/ANALISE-MOTOR-vs-v2v3-22Ago.md para o porquê da
// reescrita e o mapa do que é reaproveitável (karakas.ts, stellium.ts,
// avasthaBaladi.ts, drishti.ts) vs. o que falta construir de raiz
// (Sarvashtakavarga, figuras fechadas por varredura, as duas listas
// calculado/naoCalculado, a derivação formal da espinha).
//
// Fonte normativa de cada bloco abaixo: CODE-1-esqueleto-v2.md (regras que
// mandam, regras de escrita, abertura) + CODE-1-esqueleto-v3.md (as
// catorze secções + a escala de confiança) + SPEC-espinha.md (derivação da
// espinha por convergência de camadas independentes). Onde este ficheiro
// ainda diverge do que esses três documentos dizem, fica assinalado em
// comentário — ver também a lista de inconsistências reportada de volta no
// chat (ronda 1 e ronda 2, depois das correcções de 22/08).

// ── Escala de confiança (6ª regra que manda, CODE-1-esqueleto-v3.md) ────
// Corrigido na ronda 2 — os limiares abaixo agora batem certo com
// CODE-1-esqueleto-v3.md e SPEC-espinha.md.

export type NiveauConfianca =
  | "convergencia-forte" // 4+ camadas independentes a apontar ao mesmo — o mínimo que SPEC-espinha.md exige para uma espinha por convergência.
  | "sinal-forte" // 2-3 camadas independentes a apontar ao mesmo — confirmação real, mas abaixo do limiar de espinha.
  | "leitura" // 1 camada, ou interpretação sólida sem convergência mensurável por trás — nunca inventar camadas para subir de nível.
  | "em-aberto"; // qualitativo, não quantitativo: a carta não distingue — a decisão fica explicitamente com a pessoa, independentemente de quantas camadas foram olhadas.

/** Uma descoberta com escala de confiança (secção 2 do v3, e reaproveitada nas razões do veredicto — secção 3). */
export interface Descoberta {
  texto: string;
  confianca: NiveauConfianca;
  /** As camadas que convergem — ver SPEC-espinha.md para o que conta como camada distinta (D-1 sideral, tropical, cada varga, SAV, arudhas, regência funcional, karakas, períodos, figuras fechadas: máximo 14). */
  camadas: string[];
}

// ── Abertura do relatório (secção 0 do v3) ──────────────────────────────

/**
 * Abertura (secção 0, sempre, antes de tudo — CODE-1-esqueleto-v2.md).
 *
 * CORRIGIDO ao implementar prompt-v3.ts (23/08/2026) — `quadroDados`
 * não tinha `residenciaActual` nem `sistemasUsados`, que o v2 exige
 * explicitamente no quadro ("residência actual · os sistemas usados,
 * nomeados"). Adicionados aqui — não estava a bloquear nada até agora
 * porque a Abertura ainda não tinha sido construída.
 */
export interface AberturaV3 {
  nomeCliente: string;
  quadroDados: {
    dataNascimento: string;
    horaNascimento: string;
    localNascimento: string;
    residenciaActual: string;
    /** "Sideral Lahiri, casas de signo inteiro — o que é e quando; Tropical Placidus — como se sente." (texto fixo, v2). */
    sistemasUsados: string;
    profissao: string;
    perguntaDeclarada: string;
    situacaoDeclarada: string;
  };
  /** Reafirmação formal da pergunta declarada — regra 2 do v2 ("o relatório abre com veredicto sobre a pergunta declarada"). */
  perguntaEnquadrada: string;
  /** As 3 partes obrigatórias da nota de leitura no v2: o signo, a medida, onde parar. */
  notaLeitura: {
    oSigno: string;
    aMedida: string;
    ondeParar: string;
  };
}

// ── Anexo B — técnico, estruturado (corrigido na ronda 2) ───────────────

/** Uma casa lida pela Sarvashtakavarga (secção 5 e critério 9 — SAV(casa) < 25). */
export interface SavPorCasa {
  casa: number; // 1 a 12
  pontuacao: number; // 0 a 56
  interpretacao: string;
}

/** Uma linha da tabela de rastreio (CODE-4/CODE-6) — cada afirmação de peso do corpo tem de ter uma linha aqui. */
export interface EntradaRastreio {
  afirmacao: string;
  base: string; // a fonte técnica da afirmação
  seccao: string; // em que secção do relatório aparece
}

/**
 * Um ponto de uma figura fechada, já em linguagem Naveya — termo (nome em
 * português) + definição. Nunca o termo técnico cru sem definição (mesma
 * regra global de linguagem, 23/08/2026).
 */
export interface PontoFiguraNaveya {
  termo: string; // nome em português (ex. "Saturno", "casa 10", "Ascendente")
  definicao: string; // a definição Naveya correspondente
}

/**
 * Uma figura fechada, estruturada para o Anexo B (decisão 1B, 23/08/2026
 * — substitui a versão anterior `string[]`, que não conseguia guardar o
 * tipo, os planetas em linguagem Naveya e o orbe real como campos
 * separados e verificáveis por código puro).
 */
export interface EntradaFiguraFechada {
  tipo: string; // "Grande Trígono" | "T-Quadrado" | "Yod" | "Grande Cruz" | "Kite" | "Stellium"
  pontos: PontoFiguraNaveya[];
  detalhe: string; // a frase técnica original (ex. "Oposição Moon–Venus, com MC em quadratura a ambos")
  orbe: number; // o maior orbe entre os aspectos que compõem a figura (ver figurasFechadasV3.ts, `orbeMaximo`) — decisão 3A
}

/**
 * Anexo B — técnico, sempre, sem excepção (v3). Estruturado (não `string`
 * livre) precisamente para que um critério de código puro consiga
 * confirmar automaticamente coisas como "existe a lista de não-calculados"
 * ou "toda a afirmação de peso tem linha de rastreio" — o que uma prosa
 * livre não permite sem parsing frágil.
 *
 * ESTENDIDA 23/08/2026 (decisões 1B + 2A, depois de reportado o conflito
 * entre o pedido do Anexo B e esta interface "tal como estava"):
 *  · `figurasFechadas` deixou de ser `string[]` — passa a
 *    `EntradaFiguraFechada[]`, estruturada (decisão 1B).
 *  · `rodaCasas` e `convergenciaEspinha` são novos — os 2 diagramas SVG
 *    (diagramas.ts) não tinham nenhum campo aqui até agora (decisão 2A).
 *
 * NOTA — esta interface ainda não cobre tudo o que o v3 pede no Anexo B
 * (posições D-1/D-9, trikonas, arudhas, drishti, elementos, carta
 * ocidental, períodos, retornos solares). Cobre os blocos que CODE-6/
 * CASOS-VIOLADORES tornam verificáveis por código puro (Sarvashtakavarga,
 * as duas listas calculado/naoCalculado, o inventário de figuras
 * fechadas, a tabela de rastreio) mais os 2 diagramas — os restantes
 * dados técnicos ficam por modelar até essa camada de cálculo existir no
 * method-engine.
 */
export interface AnexoB {
  /** SVG da roda das 12 casas (diagramas.ts, `construirRodaCasas`) — sempre presente. */
  rodaCasas: string;
  /** SVG da convergência da espinha (diagramas.ts, `construirConvergenciaEspinha`) — só quando a espinha é do tipo "convergencia" (decisão 2A). */
  convergenciaEspinha?: string;
  sarvashtakavarga: SavPorCasa[];
  calculado: string[]; // o que foi calculado
  naoCalculado: string[]; // o que não foi calculado — a ausência tem de ser declarada, nunca silenciosa (CODE-6, Ordem 1)
  figurasFechadas: EntradaFiguraFechada[];
  tabelaRastreio: EntradaRastreio[];
}

// ── A espinha — 3 desfechos possíveis (SPEC-espinha.md, corrigido na ronda 2) ──

/**
 * SPEC-espinha.md prevê exactamente 3 desfechos para a derivação da
 * espinha — nunca se inventa uma quando nenhum candidato qualifica:
 *  1. `convergencia` — o caso normal, mínimo 4 camadas independentes.
 *  2. `padrao-estrutural` — quando nenhum candidato chega a 4: uma
 *     configuração que se conta de uma vez e se vê à primeira ("padrão
 *     estrutural obedece à mesma exigência: a contagem tem de estar feita
 *     e ir para o anexo").
 *  3. `ausencia-declarada` — quando não há nem convergência nem padrão: "o
 *     relatório abre sem espinha e diz porquê. Uma carta espalhada é
 *     informação sobre a pessoa — não é falha do motor."
 */
export type DesfechoEspinha =
  | {
      tipo: "convergencia";
      afirmacao: string;
      camadas: string[]; // mínimo 4 para convergência — SPEC-espinha.md
      nivel: NiveauConfianca;
    }
  | {
      tipo: "padrao-estrutural";
      afirmacao: string;
      justificacao: string; // porque nenhuma camada chega a 4
    }
  | {
      tipo: "ausencia-declarada";
      motivo: string; // porque a carta não distingue
    };

// ── Secção 1 — o retrato em 60 segundos, rastreável (corrigido na ronda 2) ──

/** Uma das 9 linhas obrigatórias do retrato em 60 segundos. */
export interface LinhaRetrato {
  texto: string;
  /** A secção posterior que sustenta esta linha — critério F do v3: "cada afirmação nela tem rastreio para uma secção posterior". É compressão, nunca fonte nova. */
  seccaoReferencia: string;
}

/** Secção 1 — compressão de 9 linhas (quem és · o que te move · o que te trava · onde rendes mais · onde rendes menos · o padrão central · direcção · próximo movimento · o que fica em aberto). */
export interface Retrato60s {
  linhas: LinhaRetrato[]; // exactamente 9 linhas
}

// ── As 14 secções do v3 + 2 anexos ──────────────────────────────────────

export interface RelatorioV3 {
  // OBRIGATÓRIAS
  abertura: AberturaV3;
  retrato60s: Retrato60s; // secção 1
  /** Secção 2 — exactamente 5 (critério G do v3). Nenhuma pode repetir a espinha do veredicto. */
  cincoDescobertas: Descoberta[];
  /** Secção 3 — a pergunta declarada, cruzada com a espinha e o período em curso. */
  veredicto: {
    resposta: string;
    razoes: Descoberta[];
  };
  quemEs: string; // secção 4
  /** Secção 5 — a roda das 12 casas por inteiro (SAV). Sempre no v3, não condicional. Requer Sarvashtakavarga, que hoje não existe no method-engine (ver ANALISE-MOTOR-vs-v2v3-22Ago.md). */
  formaDeVida: string;
  /** Secção 8 — de onde vem o dinheiro. Sempre no v3, não condicional. */
  dinheiro: string;
  /** Secção 9 — como é vista e pelo que paga. Sempre no v3, não condicional. Critério K: tem de nomear explicitamente o que decide o preço, nunca ficar só em "como és vista". */
  comoEsVista: string;
  /** Secção 11 — o relógio. Única secção com regra de não-repetição invertida (pode reafirmar uma data já dada, remetendo para a secção dona). */
  oRelogio: string;
  /** Secção 12 — o plano. Critério H: termina obrigatoriamente com um bloco "o que não fazer". */
  oPlano: string;
  custoDeNaoFazerNada: string; // secção 13

  // CONDICIONAIS — só entram quando a carta e a pergunta as sustentam.
  // Regra do v3: "omitir uma secção condicional é sempre melhor do que
  // enchê-la de conteúdo nulo."
  // secção 6 — condicional:
  // tensão capacidade/retorno
  // OU dois canais de acção em conflito.
  // SAV < 25 é gatilho de conteúdo
  // interno à secção, não de existência.
  oQueTeTemTravado?: string;
  /** Secção 7 — só se houver trânsito lento dentro do orbe. Contexto → tema → tarefa → margem de escolha. Nunca "vai acontecer". */
  transitoActual?: string;
  /** Secção 10 — só quando a pergunta envolve escolha de sector ou profissão. Tabela ou gráfico comparativo obrigatório (critério I: nunca formular recomendação de sector como profissão inevitável quando é a função, não o sector, que a carta determina; critério J: se a pergunta envolver mudança de carreira, tem de existir pelo menos uma opção de transição/ponte). */
  sobreOQueEEmQueForma?: string;
  /** Secção 14 — sempre condicional, só se houver um dado de apoio externo identificável na carta. Uma só variante — nunca inventada para fechar bem. */
  umaUltimaCoisa?: string;

  // ANEXOS
  /** Anexo A — o que resta de personalidade depois do corpo. Regra do v3: NÃO repete a roda da secção 5; só acrescenta o que ela ainda não disse. Regra nova do v3 (depois da auditoria Melina): antes de fechar, confirmar contra a Camada A completa que nenhuma leitura de identidade forte ficou de fora dos dois anexos e do corpo. */
  anexoA?: string;
  /** Anexo B — técnico, sempre, sem excepção. Ver `AnexoB` — estruturado para permitir verificação automática (corrigido na ronda 2; ver nota na própria interface sobre o que ainda falta modelar). */
  anexoB?: AnexoB;

  // METADADOS
  /** A espinha — SPEC-espinha.md, 3 desfechos possíveis. Sempre presente (mesmo quando o desfecho é `ausencia-declarada` — a ausência de espinha é, ela própria, informação obrigatória, nunca um campo em falta). Nunca se repete no corpo (regra 1 do v2, critério 6). */
  espinha: DesfechoEspinha;
  seccoesCondicionaisActivas: string[];
  guardIssues: string[];
}

// ── Camada A — recolha e organização de todos os sinais (Fase 1, Passo 1) ──
// Fonte: karakas.ts/stellium.ts/avasthaBaladi.ts reaproveitados sem
// alteração; sarvashtakavarga.ts, drishtiNodal.ts, dignidadeV3.ts,
// figurasFechadasV3.ts e transitsV3.ts construídos e verificados nesta
// sessão (ver docs/AUDITORIA-CALCULOS-23Ago.md).

import type { Graha, ClassicalGraha, BirthInput } from "./lifeReport/types";
import type { ZodiacSign } from "./data/tables";
import type { GrahaPosition } from "./lifeReport/positions";
import type { KarakaResult } from "./lifeReport/karakas";
import type { CurrentDasha, MahadashaPeriod } from "./lifeReport/dasha";
import type { Avastha } from "./lifeReport/avasthaBaladi";
import type { StelliumHit } from "./lifeReport/stellium";
import type { DignidadeCompleta } from "./v3/dignidadeV3";
import type { DrishtiHitV3 } from "./v3/drishtiNodal";
import type { SarvashtakavargaResult } from "./v3/sarvashtakavarga";
import type { FiguraFechada } from "./v3/figurasFechadasV3";
import type { TransitoLento, TransitoAnual } from "./v3/transitsV3";

export type { BirthInput };

export interface NakshatraComPada {
  nome: string;
  pada: number; // 1-4
}

/**
 * Sarvashtakavarga com bandeira de fiabilidade — `fiavel` fica `false`
 * quando a auto-verificação de arranque das 7 tabelas clássicas
 * (`assertTableIntegrity` em sarvashtakavarga.ts) alguma vez falhar; hoje
 * está sempre `true` (tabelas verificadas contra o Prokerala, 56/56
 * células — ver AUDITORIA-CALCULOS-23Ago.md), mas o campo existe para o
 * agregador poder declarar SAV em `naoCalculado` sem quebrar o contrato se
 * isso alguma vez deixar de ser verdade.
 */
export interface SavComFiabilidade extends SarvashtakavargaResult {
  fiavel: boolean;
}

export interface CamadaA {
  ascendente: { sign: ZodiacSign; degreeInSign: number; siderealLongitude: number };
  /** O signo solar tropical (o que a pessoa já conhece de si) — só para a nota de leitura da Abertura ("Continuas a ser de X"), nunca usado no corpo do relatório. */
  signoSolarTropical: ZodiacSign;
  posicoesPlanetarias: Record<Graha, GrahaPosition>;
  nakshatras: Record<Graha, NakshatraComPada>;
  ascendenteNakshatra: NakshatraComPada;
  karakas: KarakaResult;
  /**
   * Arudha Lagna (AL) — a casa (1-12, a partir do Ascendente) que
   * representa a imagem pública real: como os outros veem esta pessoa,
   * independentemente de quem ela é por dentro. Método clássico
   * (contagem dupla a partir do regente do Ascendente, com a excepção
   * de nunca cair na 1ª/7ª — ver `calcularArudhaLagna`, camada-a.ts).
   * Acrescentado 25/08/2026 ("Correcções críticas ao motor v3", ponto 5).
   */
  arudhaLagna: number;
  dashaAtual: CurrentDasha;
  mahadashas: MahadashaPeriod[];
  /** Clássica (exaltação/queda/domicílio/Moolatrikona) + Panchadha Maitri quando aplicável — ver dignidadeV3.ts. Só os 7 grahas clássicos (Rahu/Ketu usam convenção de dispositor, não modelada aqui como tipo próprio — ver `dignidadeNodo`). */
  dignidades: Record<ClassicalGraha, DignidadeCompleta>;
  avasthas: Record<ClassicalGraha, Avastha>;
  drishtiHits: DrishtiHitV3[];
  sav: SavComFiabilidade;
  /** Âmbito: só os 7 grahas clássicos, D-1/D-10 (stellium.ts) — nunca usado directamente pelo Life Report adulto (ver nota no próprio módulo); aqui por completude do inventário, secção 5/Anexo B decide se usa. */
  stelliumsVedicos: StelliumHit[];
  /** Âmbito alargado (7 clássicos + Rahu + Ascendente/MC, sobre a carta ocidental tropical) — ver figurasFechadasV3.ts. */
  figurasFechadas: FiguraFechada[];
  slowTransits: TransitoLento[];
  annualTransit: TransitoAnual;
  /** O que foi calculado com sucesso — CODE-6, Ordem 1: a Camada A declara, nunca deixa a ausência silenciosa. */
  calculado: string[];
  /** O que NÃO foi calculado, e porquê — nunca omitido em silêncio. */
  naoCalculado: string[];
}

// ── Resultado do motor v3 ────────────────────────────────────────────────

export interface ResultadoMotorV3 {
  relatorio: RelatorioV3;
  warnings: string[];
  guardIssues: string[];
  tempoGeracao: number;
}
