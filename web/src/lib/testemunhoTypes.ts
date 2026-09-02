// Taxonomia e tipos partilhados entre servidor e cliente. Ficam FORA de
// testemunhosStore.ts de propósito — esse ficheiro tem "import
// server-only" (acede à Supabase), e qualquer componente cliente que
// importe um VALOR de lá (não só um tipo) obriga o webpack a incluir o
// módulo inteiro no bundle do browser, o que rebenta o build. Ver nota
// de "Correcções críticas" no relatório de entrega.

export const SITUACAO_TESTEMUNHO = [
  { valor: "estudante", label: "Estudante (9º-12º ano)" },
  { valor: "jovem-adulto", label: "Jovem adulto" },
  { valor: "adulto-transicao", label: "Adulto em transição" },
  { valor: "prefiro-nao-dizer", label: "Prefiro não dizer" },
] as const;

export type SituacaoTestemunho = (typeof SITUACAO_TESTEMUNHO)[number]["valor"];

export interface Testemunho {
  id: string;
  created_at: string;
  intake_id: string | null;
  nome: string;
  situacao: SituacaoTestemunho;
  texto: string;
  nota: number | null;
  autoriza_publicacao: boolean;
  aprovado: boolean;
  publicavel: boolean;
}
