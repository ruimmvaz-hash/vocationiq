export const SITUACOES = [
  { valor: "9-ou-menos", label: "Estou no 9º ano ou menos" },
  { valor: "10-11-12", label: "Estou no 10º, 11º ou 12º ano" },
  { valor: "universidade", label: "Estou na universidade" },
  { valor: "trabalho-quero-mudar", label: "Já trabalho e quero mudar" },
  { valor: "outra", label: "Outra situação" },
] as const;

export type Situacao = (typeof SITUACOES)[number]["valor"];

export const CLAREZA_IDEIA = [
  { valor: "clara", label: "Sim, tenho uma ideia clara" },
  { valor: "duas-tres-opcoes", label: "Tenho duas ou três opções" },
  { valor: "nao-faco-ideia", label: "Não faço mesmo ideia" },
] as const;

export type ClarezaIdeia = (typeof CLAREZA_IDEIA)[number]["valor"];

export const AREAS_CONSIDERADAS = [
  { valor: "medicina-saude", label: "Medicina / Saúde" },
  { valor: "engenharia-tecnologia", label: "Engenharia / Tecnologia" },
  { valor: "direito", label: "Direito" },
  { valor: "economia-gestao", label: "Economia / Gestão" },
  { valor: "artes-design-comunicacao", label: "Artes / Design / Comunicação" },
  { valor: "ciencias-investigacao", label: "Ciências / Investigação" },
  { valor: "educacao-ensino", label: "Educação / Ensino" },
  { valor: "desporto", label: "Desporto" },
  { valor: "outra", label: "Outra" },
] as const;

export type AreaConsiderada = (typeof AREAS_CONSIDERADAS)[number]["valor"];

export const SATISFACAO_CURSO = [
  { valor: "satisfeito-quer-perceber", label: "Estou satisfeito mas quero perceber melhor o meu caminho" },
  { valor: "duvidas-serias", label: "Tenho dúvidas sérias" },
  { valor: "quer-mudar", label: "Quero mudar de curso ou área" },
] as const;

export type SatisfacaoCurso = (typeof SATISFACAO_CURSO)[number]["valor"];

export const ANOS_EXPERIENCIA = [
  { valor: "menos-2", label: "Menos de 2 anos" },
  { valor: "2-a-5", label: "2 a 5 anos" },
  { valor: "5-a-10", label: "5 a 10 anos" },
  { valor: "mais-10", label: "Mais de 10 anos" },
] as const;

export type AnosExperiencia = (typeof ANOS_EXPERIENCIA)[number]["valor"];

export interface IntakePayload {
  // Passo 1 — todos os públicos
  nome: string;
  dataNascimento: string; // YYYY-MM-DD
  horaNascimento?: string; // HH:MM
  localNascimento: string;

  // Passo 2 — situação
  situacao: Situacao;

  // Ramo "9º ano ou menos" / "10º-12º ano"
  clarezaIdeia?: ClarezaIdeia;
  areasConsideradas?: AreaConsiderada[];
  areasConsideradasOutra?: string;
  preferenciaFamilia?: string;

  // Ramo "universidade"
  cursoActual?: string;
  satisfacaoCurso?: SatisfacaoCurso;

  // Ramo "já trabalho e quero mudar"
  areaTrabalhoActual?: string;
  anosExperiencia?: AnosExperiencia;
  oQueNaoFunciona?: string;

  // Partilhado entre "universidade" (se pensa mudar, para onde) e
  // "já trabalho" (para onde quer ir)
  paraOndeQuerIr?: string;

  // Ramo "outra situação"
  descricaoSituacao?: string;

  // Passo 3 — todos os públicos
  contextoAdicional?: string;
  perguntaEspecifica?: string;
}

// Limite defensivo de infra-estrutura em cada campo de texto livre — não é
// anunciado ao utilizador, só evita que um payload absurdo (ou um bot)
// rebente o pedido a Stripe/Supabase/Claude.
const TEXTO_MAX = 20000;

function textoOpcional(valor: unknown): string | undefined {
  const s = typeof valor === "string" ? valor.trim().slice(0, TEXTO_MAX) : "";
  return s || undefined;
}

export function validarIntake(body: unknown): { ok: true; dados: IntakePayload } | { ok: false; erro: string } {
  if (typeof body !== "object" || body === null) return { ok: false, erro: "Pedido inválido." };
  const b = body as Record<string, unknown>;

  // Passo 1
  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  if (!nome) return { ok: false, erro: "Falta o nome completo." };

  const dataNascimento = typeof b.dataNascimento === "string" ? b.dataNascimento.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return { ok: false, erro: "Data de nascimento inválida." };

  const horaNascimentoBruta = typeof b.horaNascimento === "string" ? b.horaNascimento.trim() : "";
  if (horaNascimentoBruta && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaNascimentoBruta)) return { ok: false, erro: "Hora de nascimento inválida." };

  const localNascimento = typeof b.localNascimento === "string" ? b.localNascimento.trim() : "";
  if (!localNascimento) return { ok: false, erro: "Falta o local de nascimento." };

  // Passo 2 — situação
  const situacao = typeof b.situacao === "string" ? b.situacao : "";
  if (!SITUACOES.some((s) => s.valor === situacao)) return { ok: false, erro: "Situação actual inválida." };

  const dados: IntakePayload = {
    nome,
    dataNascimento,
    horaNascimento: horaNascimentoBruta || undefined,
    localNascimento,
    situacao: situacao as Situacao,
  };

  if (situacao === "9-ou-menos" || situacao === "10-11-12") {
    const clarezaIdeia = typeof b.clarezaIdeia === "string" ? b.clarezaIdeia : "";
    if (!CLAREZA_IDEIA.some((c) => c.valor === clarezaIdeia)) return { ok: false, erro: "Falta responder se já tens ideia do que queres seguir." };
    dados.clarezaIdeia = clarezaIdeia as ClarezaIdeia;

    const areasBrutas = Array.isArray(b.areasConsideradas) ? b.areasConsideradas : [];
    const areasValidas = AREAS_CONSIDERADAS.map((a) => a.valor);
    const areasConsideradas = areasBrutas.filter((a): a is AreaConsiderada => typeof a === "string" && areasValidas.includes(a as AreaConsiderada));
    if (areasConsideradas.length > 0) dados.areasConsideradas = areasConsideradas;
    if (areasConsideradas.includes("outra")) dados.areasConsideradasOutra = textoOpcional(b.areasConsideradasOutra);

    dados.preferenciaFamilia = textoOpcional(b.preferenciaFamilia);
  } else if (situacao === "universidade") {
    const cursoActual = typeof b.cursoActual === "string" ? b.cursoActual.trim() : "";
    if (!cursoActual) return { ok: false, erro: "Falta indicar que curso estás a fazer." };
    dados.cursoActual = cursoActual.slice(0, TEXTO_MAX);

    const satisfacaoCurso = typeof b.satisfacaoCurso === "string" ? b.satisfacaoCurso : "";
    if (!SATISFACAO_CURSO.some((s) => s.valor === satisfacaoCurso)) return { ok: false, erro: "Falta responder como te sentes em relação ao teu curso." };
    dados.satisfacaoCurso = satisfacaoCurso as SatisfacaoCurso;

    dados.paraOndeQuerIr = textoOpcional(b.paraOndeQuerIr);
  } else if (situacao === "trabalho-quero-mudar") {
    const areaTrabalhoActual = typeof b.areaTrabalhoActual === "string" ? b.areaTrabalhoActual.trim() : "";
    if (!areaTrabalhoActual) return { ok: false, erro: "Falta indicar em que área trabalhas actualmente." };
    dados.areaTrabalhoActual = areaTrabalhoActual.slice(0, TEXTO_MAX);

    const anosExperiencia = typeof b.anosExperiencia === "string" ? b.anosExperiencia : "";
    if (!ANOS_EXPERIENCIA.some((a) => a.valor === anosExperiencia)) return { ok: false, erro: "Falta indicar há quanto tempo trabalhas nessa área." };
    dados.anosExperiencia = anosExperiencia as AnosExperiencia;

    dados.oQueNaoFunciona = textoOpcional(b.oQueNaoFunciona);
    dados.paraOndeQuerIr = textoOpcional(b.paraOndeQuerIr);
  } else if (situacao === "outra") {
    const descricaoSituacao = typeof b.descricaoSituacao === "string" ? b.descricaoSituacao.trim() : "";
    if (!descricaoSituacao) return { ok: false, erro: "Falta descrever a tua situação." };
    dados.descricaoSituacao = descricaoSituacao.slice(0, TEXTO_MAX);
  }

  // Passo 3
  dados.contextoAdicional = textoOpcional(b.contextoAdicional);
  dados.perguntaEspecifica = textoOpcional(b.perguntaEspecifica);

  return { ok: true, dados };
}
