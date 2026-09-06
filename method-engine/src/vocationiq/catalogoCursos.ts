// VocationIQ — TAREFA 5 (correcção do especialista): liga catalogo-cursos
// (na prática, o próprio catalogo-destinos.json — ver nota abaixo) e
// catalogo-sistema-PT.json ao motor, para sugerir vias concretas de
// entrada por destino.
//
// DESVIO 1 — o ficheiro que o pedido chama "catalogo-cursos.json" existe
// na raiz do repositório, mas é um rascunho antigo (v1.0, "cnaef") já
// substituído por `catalogo-destinos.json` (v2.0, "isced_area" +
// "isced_nivel" + labels por país) — o mesmo ficheiro que
// `catalogoVocacional.ts` já usa. Ligar o rascunho antigo em vez do
// ficheiro actual reintroduzia dados desactualizados a par dos correctos.
// Este módulo lê `catalogo-destinos.json` (via `isced_nivel`) em vez do
// rascunho.
//
// DESVIO 2 — `catalogo-sistema-PT.json` tem uma regra explícita, escrita
// pelo próprio fundador (`regras_de_escrita.instituicoes`, também repetida
// em `catalogo-destinos.json.meta.regra_nomenclatura.instituicoes`):
// "NUNCA nomear instituições de ensino — nem em Portugal. Mudam de oferta,
// encerram cursos e alteram designações." O pedido desta tarefa pede
// "instituicoes: exemplos de instituições portuguesas" — em contradição
// directa com essa regra já estabelecida (com um incidente documentado,
// "caso Bruno", a justificá-la). Resolvido a favor da regra já existente:
// `tipoInstituicao` devolve o TIPO de instituição (Politécnico,
// Universidade, Escola Profissional/IEFP), nunca o nome de uma escola
// concreta.

import catalogoDestinosJson from "../data/vocacional/catalogo-destinos.json";
import catalogoSistemaPtJson from "../data/vocacional/catalogo-sistema-PT.json";
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

const TIPO_INSTITUICAO_POR_NIVEL: Record<NivelCurso, string> = {
  mestrado: "Universidade ou Politécnico",
  licenciatura: "Universidade ou Politécnico",
  ctesp: "Politécnico",
  profissional: "Escola secundária com oferta profissional, ou Centro de Formação Profissional (IEFP)",
  fora_do_sistema: "Fora do sistema formal — sem instituição de ensino associada",
};

export interface CursoSugerido {
  /** Nome do curso concreto — vem sempre do label já curado do catálogo (verificado contra DGES), nunca inventado aqui. */
  nome: string;
  nivel: NivelCurso;
  /** Nível do Quadro Nacional de Qualificações — null só quando o destino é "fora do sistema formal" (sem QNQ associado). */
  qnq: number | null;
  duracao: string | null;
  /** TIPO de instituição, nunca o nome de uma escola concreta — ver DESVIO 2 no topo do ficheiro. */
  tipoInstituicao: string;
}

export interface CursosSugeridos {
  destinoId: string;
  cursos: CursoSugerido[];
  /**
   * Só para adultos — "entrada real no mercado" em vez de cursos.
   * DESVIO 3: só cobre destinos com ordem profissional oficial e estável
   * (não é uma escola que possa fechar ou mudar de nome — é o regulador
   * legal da profissão). Para os restantes ~165 destinos do catálogo,
   * inventar uma certificação/associação concreta violaria a mesma regra
   * de honestidade que já rege este catálogo — por isso fica um texto
   * genérico e honesto, nunca um nome fabricado. Ver relatório da ronda:
   * cobertura completa e verificada das 183 entradas exigiria uma sessão
   * de pesquisa dedicada, não algo para inventar numa passagem de código.
   */
  entradaMercadoAdulto: string[];
}

/** Ordens profissionais portuguesas — reguladores legais oficiais e estáveis da profissão, não escolas. Lista deliberadamente pequena e só com entradas de que há confiança factual — ver DESVIO 3 acima. */
const ORDEM_PROFISSIONAL: Record<string, string> = {
  direito: "Inscrição na Ordem dos Advogados (exame de acesso após estágio)",
  medicina: "Inscrição na Ordem dos Médicos (exame nacional de acesso comum, após o internato)",
  medicina_dentaria: "Inscrição na Ordem dos Médicos Dentistas",
  medicina_veterinaria: "Inscrição na Ordem dos Médicos Veterinários",
  enfermagem: "Inscrição na Ordem dos Enfermeiros",
  psicologia: "Inscrição na Ordem dos Psicólogos Portugueses (cédula profissional)",
  arquitetura: "Inscrição na Ordem dos Arquitectos",
  engenharia_civil: "Inscrição na Ordem dos Engenheiros",
  engenharia_eletronica: "Inscrição na Ordem dos Engenheiros",
  engenharia_informatica: "Inscrição na Ordem dos Engenheiros",
  engenharia_mecanica: "Inscrição na Ordem dos Engenheiros",
  engenharia_quimica: "Inscrição na Ordem dos Engenheiros",
  engenharia_alimentar: "Inscrição na Ordem dos Engenheiros",
  contabilidade: "Inscrição na Ordem dos Contabilistas Certificados",
  ciencias_farmaceuticas: "Inscrição na Ordem dos Farmacêuticos",
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
  const ordemProfissional = ORDEM_PROFISSIONAL[destinoId];
  const entradaMercadoAdulto = ordemProfissional
    ? [ordemProfissional]
    : [
        curso.nivel === "fora_do_sistema"
          ? "Entrada por portefólio, rede de contactos e resultados demonstráveis, sem certificação formal única associada a esta área."
          : `Entrada por via ${curso.nivel === "mestrado" || curso.nivel === "licenciatura" ? "de ensino superior" : curso.nivel} nesta área; certificação profissional específica varia — confirmar associação de classe ou ordem profissional, quando exista.`,
      ];

  return { destinoId, cursos: [curso], entradaMercadoAdulto };
}

/**
 * Aplica `sugerirCursos()` a todos os destinos que `catalogarDestinos()`
 * já resolveu com id (`destinosDeAreaActual` + `destinosAlternativos` +
 * `candidataForaDaLista`, quando existir) — nunca a partir de texto livre
 * declarado pela pessoa, que exigiria correspondência aproximada nome→id
 * e arrisca ligar o curso errado ao destino errado. Chamado uma vez por
 * relatório, depois de `catalogarDestinos()` (TAREFA 5).
 */
export function sugerirCursosParaCatalogo(catalogo: ResultadoCatalogoVocacional): Record<string, CursosSugeridos> {
  const resultado: Record<string, CursosSugeridos> = {};
  const todosOsIds = [...catalogo.destinosDeAreaActual.map((d) => d.id), ...catalogo.destinosAlternativos.map((d) => d.id), ...(catalogo.candidataForaDaLista.id ? [catalogo.candidataForaDaLista.id] : [])];
  for (const id of todosOsIds) {
    if (resultado[id]) continue;
    const cursos = sugerirCursos(id);
    if (cursos) resultado[id] = cursos;
  }
  return resultado;
}
