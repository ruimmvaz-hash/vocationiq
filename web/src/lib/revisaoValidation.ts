export const SEGUIU_DIRECAO = [
  { valor: "sim-nesse-caminho", label: "Sim, estou nesse caminho" },
  { valor: "experimentei-mudei", label: "Experimentei mas mudei de ideias" },
  { valor: "ainda-nao-decidi", label: "Ainda não decidi" },
  { valor: "outro-lado", label: "Fui para outro lado" },
] as const;

export type SeguiuDirecao = (typeof SEGUIU_DIRECAO)[number]["valor"];

export const SITUACAO_MUDOU = [
  { valor: "continuo-igual", label: "Continuo igual" },
  { valor: "mudei-escola-curso-trabalho", label: "Mudei de escola/curso/trabalho" },
  { valor: "em-processo-mudanca", label: "Estou em processo de mudança" },
] as const;

export type SituacaoMudou = (typeof SITUACAO_MUDOU)[number]["valor"];

export const SENTIMENTO_LABELS: Record<number, string> = {
  1: "Completamente perdido",
  5: "Confiante e no caminho certo",
};

export interface RevisaoPayload {
  intakeIdOriginal: string;
  seguiuDirecao: SeguiuDirecao;
  oQueCorreuBem?: string;
  oQueNaoCorreu?: string;
  duvidaActual: string;
  sentimentoCaminho: number;
  questaoRelatorio?: string;
  situacaoMudou: SituacaoMudou;
  decisaoConcreta?: string;
}

const TEXTO_MAX = 20000;

function textoOpcional(valor: unknown): string | undefined {
  const s = typeof valor === "string" ? valor.trim().slice(0, TEXTO_MAX) : "";
  return s || undefined;
}

export function validarRevisao(body: unknown): { ok: true; dados: RevisaoPayload } | { ok: false; erro: string } {
  if (typeof body !== "object" || body === null) return { ok: false, erro: "Pedido inválido." };
  const b = body as Record<string, unknown>;

  const intakeIdOriginal = typeof b.intakeIdOriginal === "string" ? b.intakeIdOriginal.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(intakeIdOriginal)) return { ok: false, erro: "Pedido original inválido." };

  const seguiuDirecao = typeof b.seguiuDirecao === "string" ? b.seguiuDirecao : "";
  if (!SEGUIU_DIRECAO.some((s) => s.valor === seguiuDirecao)) return { ok: false, erro: "Falta responder se seguiste alguma das direcções do relatório." };

  const duvidaActual = typeof b.duvidaActual === "string" ? b.duvidaActual.trim() : "";
  if (!duvidaActual) return { ok: false, erro: "Falta a tua dúvida principal." };

  const sentimentoCaminho = Number(b.sentimentoCaminho);
  if (!Number.isInteger(sentimentoCaminho) || sentimentoCaminho < 1 || sentimentoCaminho > 5) {
    return { ok: false, erro: "Falta indicar como te sentes em relação ao teu caminho." };
  }

  const situacaoMudou = typeof b.situacaoMudou === "string" ? b.situacaoMudou : "";
  if (!SITUACAO_MUDOU.some((s) => s.valor === situacaoMudou)) return { ok: false, erro: "Falta responder se a tua situação mudou." };

  return {
    ok: true,
    dados: {
      intakeIdOriginal,
      seguiuDirecao: seguiuDirecao as SeguiuDirecao,
      oQueCorreuBem: textoOpcional(b.oQueCorreuBem),
      oQueNaoCorreu: textoOpcional(b.oQueNaoCorreu),
      duvidaActual: duvidaActual.slice(0, TEXTO_MAX),
      sentimentoCaminho,
      questaoRelatorio: textoOpcional(b.questaoRelatorio),
      situacaoMudou: situacaoMudou as SituacaoMudou,
      decisaoConcreta: textoOpcional(b.decisaoConcreta),
    },
  };
}
