// VocationIQ — TAREFA 5 original + TAREFAS 2/3 desta ronda (correcção do
// especialista): liga catalogo-destinos.json e catalogo-sistema-PT.json ao
// motor, para sugerir vias concretas de entrada por destino.
//
// DESVIO 1 — o ficheiro que o pedido original chamava "catalogo-cursos.json"
// existe na raiz do repositório, mas é um rascunho antigo (v1.0, "cnaef")
// já substituído por `catalogo-destinos.json` (v2.0, "isced_area" +
// "isced_nivel" + labels por país) — o mesmo ficheiro que
// `catalogoVocacional.ts` já usa. Este módulo lê `catalogo-destinos.json`
// (via `isced_nivel`), nunca o rascunho.
//
// REGRA DE NOMENCLATURA (TAREFA 2 desta ronda, escrita literalmente em
// catalogo-destinos.json.meta.regra_nomenclatura.instituicoes e em
// catalogo-sistema-PT.json.regras_de_escrita.instituicoes): "NUNCA nomear
// instituições de nenhum tipo — nem de ensino, nem ordens profissionais,
// nem certificações com nome próprio, nem formadores. Concreto na
// estrutura, genérico no nome da entidade." Nenhum nome próprio de
// entidade aparece neste ficheiro — só TIPOS ("a ordem profissional da
// sua área, no seu país", "os serviços públicos de emprego e formação do
// seu país", etc.).

import catalogoDestinosJson from "../data/vocacional/catalogo-destinos.json";
import catalogoSistemaPtJson from "../data/vocacional/catalogo-sistema-PT.json";
import mapeamentoOpcoesAdolescenteJson from "../data/vocacional/mapeamento-opcoes-adolescente.json";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";

interface DestinoComNivel {
  camada: "superior" | "tecnico" | "fora";
  isced_nivel: number[] | null;
  labels: { PT: string };
}
const catalogoDestinos = catalogoDestinosJson.destinos as unknown as Record<string, DestinoComNivel>;

interface NivelSistemaPT {
  local: string;
  qnq: number;
  duracao: string;
}
const NIVEIS_PT = catalogoSistemaPtJson.niveis as unknown as Record<string, NivelSistemaPT>;

export type NivelCurso = "mestrado" | "licenciatura" | "ctesp" | "profissional" | "fora_do_sistema";

const NIVEL_ISCED_PARA_NIVEL_CURSO: Record<number, NivelCurso> = {
  7: "mestrado",
  6: "licenciatura",
  5: "ctesp",
  4: "profissional",
  3: "profissional",
};

// "Universidade"/"Politécnico" são TIPOS de instituição (como "hospital"
// ou "escola"), nunca o nome de uma escola concreta — mantém-se. O que
// mudou (TAREFA 2): a entrada "profissional" nomeava literalmente "IEFP"
// (instituto público português com nome próprio) — substituído por uma
// descrição do tipo de entidade.
const TIPO_INSTITUICAO_POR_NIVEL: Record<NivelCurso, string> = {
  mestrado: "Universidade ou Politécnico",
  licenciatura: "Universidade ou Politécnico",
  ctesp: "Politécnico",
  profissional: "Escola com oferta de ensino profissional, ou serviço público de emprego e formação do seu país",
  fora_do_sistema: "Fora do sistema formal — sem instituição de ensino associada",
};

export interface CursoSugerido {
  /** Nome do curso concreto — vem sempre do label já curado do catálogo (verificado contra DGES), nunca inventado aqui. */
  nome: string;
  nivel: NivelCurso;
  /** Nível do Quadro Nacional de Qualificações — null só quando o destino é "fora do sistema formal" (sem QNQ associado). */
  qnq: number | null;
  duracao: string | null;
  /** TIPO de instituição, nunca o nome de uma escola concreta. */
  tipoInstituicao: string;
}

export interface CursosSugeridos {
  destinoId: string;
  cursos: CursoSugerido[];
  /**
   * Só para adultos — "entrada real no mercado" em vez de cursos. Nunca
   * nomeia uma entidade concreta (TAREFA 2) — só o TIPO de via/entidade.
   * Cobertura detalhada (4 sub-respostas — TAREFA 3) só para os destinos
   * em `ENTRADA_MERCADO_DETALHADA` abaixo (os 15 originais + os 5 mais
   * frequentes descobertos empiricamente nesta ronda, ver relatório).
   * Para os restantes ~163 destinos, fallback genérico e honesto — nunca
   * um nome fabricado.
   */
  entradaMercadoAdulto: string[];
}

interface EntradaMercadoDetalhada {
  tipoFormacao: string;
  /** `null` quando não existe nenhuma certificação profissional obrigatória distinta da formação em si. */
  certificacaoProfissional: string | null;
  comoEntraNoMercado: string;
  /** `null` quando não há nenhum tipo de entidade certificadora/reguladora própria desta área. */
  tipoEntidadeCertificadora: string | null;
  /** TAREFA 3 (correcção do especialista, ronda seguinte) — tempo médio estimado desde o início da formação até à primeira actividade remunerada na área; inclui formação + estágio/internato quando aplicável. Estimativa honesta a partir da duração de formação já conhecida (catalogo-sistema-PT.json) — nunca inventada sem base. */
  tempoAteAtividade: string;
}

function formatarDetalhada(d: EntradaMercadoDetalhada): string[] {
  return [
    `Tipo de formação: ${d.tipoFormacao}`,
    `Certificação profissional: ${d.certificacaoProfissional ?? "não existe uma certificação profissional obrigatória distinta da formação em si"}`,
    `Como se entra: ${d.comoEntraNoMercado}`,
    `Tempo médio até trabalhar na área: ${d.tempoAteAtividade}`,
    `Tipo de entidade certificadora: ${d.tipoEntidadeCertificadora ?? "não aplicável — não há entidade reguladora própria desta área"}`,
  ];
}

/**
 * Cobertura detalhada (TAREFA 3) — os 15 destinos com ordem profissional
 * regulada e estável já cobertos numa ronda anterior (agora reescritos em
 * TIPO, nunca nome próprio — TAREFA 2), mais os 5 destinos mais frequentes
 * descobertos empiricamente nesta ronda (survey de 7 cartas: Nádia e
 * Melina reais + Rui/Porto, João e 3 perfis sintéticos variados — ver
 * relatório da ronda para a lista de frequência completa):
 * engenharia_minas, biblioteconomia, auditoria, gerontologia,
 * ciencias_educacao — mais design_grafico, acrescentado ao rever o caso
 * de teste do adolescente (TAREFA 4 — João declarou "design" como opção,
 * e o destino correspondente não tinha cobertura). Nenhuma entidade
 * nomeada — só tipos, com honestidade sobre onde NÃO há certificação/
 * ordem regulada.
 */
const ENTRADA_MERCADO_DETALHADA: Record<string, EntradaMercadoDetalhada> = {
  direito: {
    tipoFormacao: "licenciatura em Direito",
    certificacaoProfissional: "certificação profissional obrigatória para exercer advocacia, obtida por estágio supervisionado e exame de acesso",
    comoEntraNoMercado: "estágio profissional seguido de exame de acesso para advocacia; alternativa sem essa certificação: funções jurídicas internas em empresas (não são advocacia em nome próprio)",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (licenciatura + estágio de advocacia)",
  },
  medicina: {
    tipoFormacao: "mestrado integrado em Medicina",
    certificacaoProfissional: "exame nacional de acesso comum a todas as especialidades, depois de um ano de internato geral",
    comoEntraNoMercado: "colocação nacional por exame, seguida de concurso de especialidade",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "11-12 anos (mestrado integrado + ano de internato geral + especialidade)",
  },
  medicina_dentaria: {
    tipoFormacao: "mestrado integrado em Medicina Dentária",
    certificacaoProfissional: "inscrição profissional obrigatória para exercer",
    comoEntraNoMercado: "consultório próprio ou integração numa clínica já estabelecida",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (mestrado integrado)",
  },
  medicina_veterinaria: {
    tipoFormacao: "mestrado integrado em Medicina Veterinária",
    certificacaoProfissional: "inscrição profissional obrigatória para exercer",
    comoEntraNoMercado: "clínica veterinária, sector agropecuário, ou saúde pública veterinária",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (mestrado integrado)",
  },
  enfermagem: {
    tipoFormacao: "licenciatura em Enfermagem",
    certificacaoProfissional: "inscrição profissional obrigatória para exercer",
    comoEntraNoMercado: "concurso no sector público de saúde, ou sector privado",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-4 anos (licenciatura)",
  },
  psicologia: {
    tipoFormacao: "licenciatura + estágio profissionalizante em Psicologia",
    certificacaoProfissional: "cédula profissional obrigatória para exercer",
    comoEntraNoMercado: "consultório próprio, integração em clínica, ou funções institucionais (educação, saúde, organizações)",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (licenciatura + estágio profissionalizante)",
  },
  arquitetura: {
    tipoFormacao: "mestrado integrado em Arquitetura",
    certificacaoProfissional: "inscrição profissional obrigatória para assinar projectos em nome próprio",
    comoEntraNoMercado: "atelier próprio, ou integração num atelier/gabinete já estabelecido",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (mestrado integrado)",
  },
  engenharia_civil: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Civil",
    certificacaoProfissional: "inscrição profissional obrigatória para assinar projectos e actos de engenharia regulados; muitas funções técnicas em empresas não a exigem",
    comoEntraNoMercado: "empresas de construção, projecto, ou fiscalização de obra",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  engenharia_eletronica: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Eletrónica",
    certificacaoProfissional: "inscrição profissional obrigatória só para actos de engenharia regulados; a maioria das funções técnicas em empresas não a exige",
    comoEntraNoMercado: "empresas de tecnologia, indústria electrónica, ou telecomunicações",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  engenharia_informatica: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Informática",
    certificacaoProfissional: "sem certificação obrigatória para a generalidade das funções — a inscrição profissional só é exigida para actos de engenharia regulados",
    comoEntraNoMercado: "emprego directo em empresas de tecnologia, sector próprio, ou freelance — o portefólio pesa tanto ou mais do que o grau",
    tipoEntidadeCertificadora: "não aplicável para a maioria das funções — existe uma ordem profissional própria da área, mas a sua inscrição não é condição de entrada no mercado",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado) — entrada no mercado pode começar antes de terminar, por portefólio",
  },
  engenharia_mecanica: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Mecânica",
    certificacaoProfissional: "inscrição profissional obrigatória só para actos de engenharia regulados; a maioria das funções técnicas em empresas não a exige",
    comoEntraNoMercado: "indústria, projecto, ou manutenção industrial",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  engenharia_quimica: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Química",
    certificacaoProfissional: "inscrição profissional obrigatória só para actos de engenharia regulados; a maioria das funções técnicas em empresas não a exige",
    comoEntraNoMercado: "indústria química, farmacêutica, ou processual",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  engenharia_alimentar: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia Alimentar",
    certificacaoProfissional: "sem certificação obrigatória distinta para a maioria das funções — existe uma ordem profissional própria da área, de inscrição não sempre exigida",
    comoEntraNoMercado: "indústria alimentar, controlo de qualidade, ou segurança alimentar",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  engenharia_minas: {
    tipoFormacao: "licenciatura ou mestrado em Engenharia de Minas e Geoambiente (ou Geotécnica/Geológica)",
    certificacaoProfissional: "inscrição profissional obrigatória para assinar projectos regulados",
    comoEntraNoMercado: "empresas de exploração de recursos geológicos, geotecnia, ou consultoria ambiental",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "3-5 anos (licenciatura ou mestrado)",
  },
  contabilidade: {
    tipoFormacao: "licenciatura em Contabilidade e Fiscalidade (ou equivalente)",
    certificacaoProfissional: "certificação profissional obrigatória para poder assinar contas em nome próprio",
    comoEntraNoMercado: "emprego num gabinete de contabilidade ou empresa, com candidatura à certificação após um período de experiência supervisionada",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "4-6 anos (licenciatura + período de experiência antes da certificação)",
  },
  ciencias_farmaceuticas: {
    tipoFormacao: "mestrado integrado em Ciências Farmacêuticas",
    certificacaoProfissional: "inscrição profissional obrigatória para exercer",
    comoEntraNoMercado: "farmácia comunitária, farmácia hospitalar, ou indústria farmacêutica",
    tipoEntidadeCertificadora: "a ordem profissional da sua área, no seu país",
    tempoAteAtividade: "5-6 anos (mestrado integrado)",
  },
  biblioteconomia: {
    tipoFormacao: "licenciatura em Ciências da Informação e Documentação (ou Biblioteconomia, conforme a instituição)",
    certificacaoProfissional: null,
    comoEntraNoMercado: "concurso público (bibliotecas municipais ou universitárias, arquivos) ou candidatura directa a instituições privadas com arquivo/documentação próprios",
    tipoEntidadeCertificadora: "não aplicável — existe uma associação de classe, de inscrição voluntária, nunca obrigatória para exercer",
    tempoAteAtividade: "3-4 anos (licenciatura)",
  },
  auditoria: {
    tipoFormacao: "licenciatura em Auditoria e Controlo de Gestão, ou em Contabilidade/Gestão com especialização",
    certificacaoProfissional: "para revisão legal de contas existe uma certificação profissional obrigatória própria; para auditoria interna (a função mais comum) não há certificação legal obrigatória, só certificações internacionais de adesão voluntária",
    comoEntraNoMercado: "posição júnior numa equipa de auditoria (interna ou externa) e progressão por experiência",
    tipoEntidadeCertificadora: "para revisão legal de contas, a ordem profissional da sua área; para auditoria interna, entidades de certificação internacionais de adesão voluntária",
    tempoAteAtividade: "3-5 anos (licenciatura + experiência inicial numa equipa de auditoria)",
  },
  gerontologia: {
    tipoFormacao: "licenciatura em Gerontologia",
    certificacaoProfissional: null,
    comoEntraNoMercado: "instituições de apoio à terceira idade, sector da saúde, ou serviços sociais públicos",
    tipoEntidadeCertificadora: null,
    tempoAteAtividade: "3-4 anos (licenciatura)",
  },
  design_grafico: {
    tipoFormacao: "licenciatura em Design de Comunicação (ou Design Gráfico, conforme a instituição)",
    certificacaoProfissional: null,
    comoEntraNoMercado: "candidatura directa a agências/estúdios de design com portefólio, ou trabalho freelance directo com clientes",
    tipoEntidadeCertificadora: "não aplicável — existe uma associação de classe, de inscrição voluntária, nunca obrigatória para exercer",
    tempoAteAtividade: "3-4 anos (licenciatura) — entrada no mercado pode começar antes, por portefólio",
  },
  ciencias_educacao: {
    tipoFormacao: "licenciatura em Ciências da Educação",
    certificacaoProfissional: "para docência formal nas escolas, exige-se habilitação profissional própria para a docência, obtida por mestrado em ensino; para funções fora da sala de aula (formação, consultoria educativa, investigação) a licenciatura já habilita",
    comoEntraNoMercado: "concurso público de professores (com a habilitação para a docência), ou funções em formação/consultoria educativa sem essa via",
    tipoEntidadeCertificadora: "para docência, os serviços públicos de educação do seu país; não há entidade reguladora para as restantes funções",
    tempoAteAtividade: "3-4 anos para funções fora da sala de aula; 5-6 anos (licenciatura + mestrado em ensino) para docência",
  },
};

function derivarCurso(id: string, destino: DestinoComNivel): CursoSugerido {
  if (!destino.isced_nivel || destino.isced_nivel.length === 0) {
    return { nome: destino.labels.PT, nivel: "fora_do_sistema", qnq: null, duracao: null, tipoInstituicao: TIPO_INSTITUICAO_POR_NIVEL.fora_do_sistema };
  }
  const nivelIsced = Math.max(...destino.isced_nivel);
  const nivel = NIVEL_ISCED_PARA_NIVEL_CURSO[nivelIsced] ?? "fora_do_sistema";
  const infoNivel = NIVEIS_PT[String(nivelIsced)];
  return {
    nome: destino.labels.PT,
    nivel,
    qnq: infoNivel?.qnq ?? null,
    duracao: infoNivel?.duracao ?? null,
    tipoInstituicao: TIPO_INSTITUICAO_POR_NIVEL[nivel],
  };
}

/**
 * Vias concretas de entrada para um destino do catálogo. `null` quando o
 * id não existe no catálogo (nunca deveria acontecer para um id que já
 * saiu de `catalogarDestinos`, mas protege contra chamadas directas com
 * um id inválido em vez de rebentar).
 */
export function sugerirCursos(destinoId: string): CursosSugeridos | null {
  const destino = catalogoDestinos[destinoId];
  if (!destino) return null;

  const curso = derivarCurso(destinoId, destino);
  const detalhada = ENTRADA_MERCADO_DETALHADA[destinoId];
  const entradaMercadoAdulto = detalhada
    ? formatarDetalhada(detalhada)
    : [
        curso.nivel === "fora_do_sistema"
          ? "Entrada por portefólio, rede de contactos e resultados demonstráveis, sem certificação formal única associada a esta área."
          : `Entrada por via ${curso.nivel === "mestrado" || curso.nivel === "licenciatura" ? "de ensino superior" : curso.nivel} nesta área; certificação profissional específica varia — confirmar se existe uma entidade reguladora própria da área no seu país.`,
      ];

  return { destinoId, cursos: [curso], entradaMercadoAdulto };
}

/**
 * Aplica `sugerirCursos()` a todos os destinos que `catalogarDestinos()`
 * já resolveu com id (`destinosDeAreaActual` + `destinosAlternativos` +
 * `candidatasForaDaLista`, até 3 — TAREFA 1) — nunca a partir de texto
 * livre declarado pela pessoa, que exigiria correspondência aproximada
 * nome→id e arrisca ligar o curso errado ao destino errado. Chamado uma
 * vez por relatório, depois de `catalogarDestinos()` (TAREFA 5).
 */
export function sugerirCursosParaCatalogo(catalogo: ResultadoCatalogoVocacional): Record<string, CursosSugeridos> {
  const resultado: Record<string, CursosSugeridos> = {};
  const todosOsIds = [...catalogo.destinosDeAreaActual.map((d) => d.id), ...catalogo.destinosAlternativos.map((d) => d.id), ...catalogo.candidatasForaDaLista.map((d) => d.id)];
  for (const id of todosOsIds) {
    if (resultado[id]) continue;
    const cursos = sugerirCursos(id);
    if (cursos) resultado[id] = cursos;
  }
  return resultado;
}

// ---------- TAREFA 1C (correcção do especialista) — opções do adolescente ----------

const MAPEAMENTO_OPCOES_ADOLESCENTE = mapeamentoOpcoesAdolescenteJson.mapeamento as unknown as Record<string, string | string[]>;

function normalizarChave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Resolve uma opção declarada em texto livre pelo adolescente (ex.:
 * "medicina", "engenharia") para os ids do catálogo correspondentes, via
 * o mapeamento manual e curado em mapeamento-opcoes-adolescente.json —
 * NUNCA fuzzy-matching automático (arrisca ligar o curso errado ao
 * destino errado). `[]` quando a opção não bate certo com nenhuma entrada
 * — o chamador usa então o catálogo por eixos (destinosAlternativos, já
 * derivado de Atmakaraka/Amatyakaraka/Modo de Ganho) como leitura de
 * fallback, nunca inventa uma correspondência.
 */
export function resolverOpcaoAdolescente(opcaoTexto: string): string[] {
  const chave = normalizarChave(opcaoTexto);
  const resultado = MAPEAMENTO_OPCOES_ADOLESCENTE[chave];
  if (!resultado) return [];
  return Array.isArray(resultado) ? resultado : [resultado];
}

/**
 * Cursos sugeridos para cada opção declarada pelo adolescente — chave é o
 * TEXTO EXACTO que a pessoa escreveu (não o id), para o prompt poder
 * juntar facilmente "a opção que declarou" com "os cursos que lhe
 * correspondem". Opções sem correspondência no mapeamento ficam de fora
 * do resultado (nunca uma entrada vazia/inventada).
 */
export function sugerirCursosParaOpcoesAdolescente(opcoes: string[]): Record<string, CursosSugeridos[]> {
  const resultado: Record<string, CursosSugeridos[]> = {};
  for (const opcao of opcoes) {
    const ids = resolverOpcaoAdolescente(opcao);
    const cursos = ids.map((id) => sugerirCursos(id)).filter((c): c is CursosSugeridos => c !== null);
    if (cursos.length) resultado[opcao] = cursos;
  }
  return resultado;
}
