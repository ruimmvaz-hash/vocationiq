import { SITUACAO_TESTEMUNHO, type SituacaoTestemunho } from "./testemunhosStore";

export interface AvaliacaoPayload {
  intakeId: string;
  nota: number;
  texto?: string;
  nome: string;
  situacao: SituacaoTestemunho;
  autorizaPublicacao: boolean;
}

const TEXTO_MAX = 20000;

export function validarAvaliacao(body: unknown): { ok: true; dados: AvaliacaoPayload } | { ok: false; erro: string } {
  if (typeof body !== "object" || body === null) return { ok: false, erro: "Pedido inválido." };
  const b = body as Record<string, unknown>;

  const intakeId = typeof b.intakeId === "string" ? b.intakeId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(intakeId)) return { ok: false, erro: "Pedido inválido." };

  const nota = Number(b.nota);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { ok: false, erro: "Nota inválida." };

  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  if (!nome) return { ok: false, erro: "Falta o teu nome." };

  const situacao = typeof b.situacao === "string" ? b.situacao : "";
  if (!SITUACAO_TESTEMUNHO.some((s) => s.valor === situacao)) return { ok: false, erro: "Falta indicar a tua situação." };

  const autorizaPublicacao = b.autorizaPublicacao === true;
  if (!autorizaPublicacao) return { ok: false, erro: "É preciso autorizar a publicação para enviar a avaliação." };

  const textoBruto = typeof b.texto === "string" ? b.texto.trim() : "";

  return {
    ok: true,
    dados: {
      intakeId,
      nota,
      texto: textoBruto.slice(0, TEXTO_MAX) || undefined,
      nome: nome.slice(0, 200),
      situacao: situacao as SituacaoTestemunho,
      autorizaPublicacao,
    },
  };
}
