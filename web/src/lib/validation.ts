export const SITUACOES = [
  { valor: "9-ou-menos", label: "Estou no 9º ano ou menos" },
  { valor: "10-11-12", label: "Estou no 10º, 11º ou 12º ano" },
  { valor: "universidade", label: "Estou na universidade" },
  { valor: "trabalho-quero-mudar", label: "Já trabalho e quero mudar" },
  { valor: "outra", label: "Outra situação" },
] as const;

export type Situacao = (typeof SITUACOES)[number]["valor"];

export interface IntakePayload {
  nome: string;
  dataNascimento: string; // YYYY-MM-DD
  horaNascimento?: string; // HH:MM
  localNascimento: string;
  situacao: Situacao;
  contexto?: string;
}

// Limite defensivo de infra-estrutura — não é um limite anunciado ao
// utilizador (o formulário diz "sem limite de caracteres"), só evita que
// um payload absurdo (ou um bot) rebente o pedido a Stripe/Supabase/Claude.
const CONTEXTO_MAX = 20000;

export function validarIntake(body: unknown): { ok: true; dados: IntakePayload } | { ok: false; erro: string } {
  if (typeof body !== "object" || body === null) return { ok: false, erro: "Pedido inválido." };
  const b = body as Record<string, unknown>;

  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  if (!nome) return { ok: false, erro: "Falta o nome completo." };

  const dataNascimento = typeof b.dataNascimento === "string" ? b.dataNascimento.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return { ok: false, erro: "Data de nascimento inválida." };

  const horaNascimento = typeof b.horaNascimento === "string" ? b.horaNascimento.trim() : "";
  if (horaNascimento && !/^\d{2}:\d{2}$/.test(horaNascimento)) return { ok: false, erro: "Hora de nascimento inválida." };

  const localNascimento = typeof b.localNascimento === "string" ? b.localNascimento.trim() : "";
  if (!localNascimento) return { ok: false, erro: "Falta o local de nascimento." };

  const situacao = typeof b.situacao === "string" ? b.situacao : "";
  if (!SITUACOES.some((s) => s.valor === situacao)) return { ok: false, erro: "Situação actual inválida." };

  const contextoBruto = typeof b.contexto === "string" ? b.contexto.trim() : "";
  const contexto = contextoBruto.slice(0, CONTEXTO_MAX);

  return {
    ok: true,
    dados: {
      nome,
      dataNascimento,
      horaNascimento: horaNascimento || undefined,
      localNascimento,
      situacao: situacao as Situacao,
      contexto: contexto || undefined,
    },
  };
}
