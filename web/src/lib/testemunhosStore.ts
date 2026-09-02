import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SITUACAO_TESTEMUNHO, type SituacaoTestemunho, type Testemunho } from "./testemunhoTypes";

// Re-exportados para não obrigar todo o código de servidor já existente
// a mudar de import — só componentes cliente têm de importar
// directamente de testemunhoTypes.ts (ver nota nesse ficheiro).
export { SITUACAO_TESTEMUNHO, type SituacaoTestemunho, type Testemunho };

/** Adicionado à mão pelo fundador em /admin/testemunhos — sem ligação a um pedido, sem fluxo de consentimento do cliente. */
export async function criarTestemunho(dados: { nome: string; situacao: SituacaoTestemunho; texto: string; nota?: number; aprovado: boolean }): Promise<Testemunho> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_testemunhos")
    .insert({
      nome: dados.nome.trim() || "Anónimo",
      situacao: dados.situacao,
      texto: dados.texto.trim(),
      nota: dados.nota ?? null,
      autoriza_publicacao: true,
      aprovado: dados.aprovado,
      publicavel: dados.aprovado, // autoriza_publicacao é sempre true aqui, por isso publicavel = aprovado
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar testemunho: ${error.message}`);
  return data as Testemunho;
}

/** Submetido pelo próprio cliente em /avaliacao — fica sempre por aprovar (aprovado=false), mesmo com autorização dada. */
export async function criarAvaliacao(dados: {
  intakeId: string;
  nome: string;
  situacao: SituacaoTestemunho;
  texto?: string;
  nota: number;
  autorizaPublicacao: boolean;
}): Promise<Testemunho> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_testemunhos")
    .insert({
      intake_id: dados.intakeId,
      nome: dados.nome.trim() || "Anónimo",
      situacao: dados.situacao,
      texto: dados.texto?.trim() || "",
      nota: dados.nota,
      autoriza_publicacao: dados.autorizaPublicacao,
      aprovado: false,
      publicavel: false,
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao guardar a avaliação: ${error.message}`);
  return data as Testemunho;
}

export async function listarTestemunhos(): Promise<Testemunho[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_testemunhos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar testemunhos: ${error.message}`);
  return (data ?? []) as Testemunho[];
}

/** Últimas N avaliações submetidas por clientes (intake_id preenchido) ainda por aprovar — para o alerta do dashboard. */
export async function listarAvaliacoesPendentes(limite: number): Promise<Testemunho[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_testemunhos")
    .select("*")
    .not("intake_id", "is", null)
    .eq("aprovado", false)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Falha ao listar avaliações pendentes: ${error.message}`);
  return (data ?? []) as Testemunho[];
}

/**
 * Usado pela homepage pública — nunca pode rebentar a página (nem em
 * build/prerender, nem em runtime): sem Supabase configurado ou com
 * qualquer erro, mostra zero testemunhos em vez de partir a página.
 */
export async function listarTestemunhosPublicaveis(): Promise<Testemunho[]> {
  try {
    const sb = await getSupabaseAdmin();
    const { data, error } = await sb.from("viq_testemunhos").select("*").eq("publicavel", true).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Testemunho[];
  } catch {
    return [];
  }
}

/** Aprovar/reprovar recalcula sempre "publicavel" (= autoriza_publicacao AND aprovado). */
export async function definirAprovacaoTestemunho(id: string, aprovado: boolean): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { data: actual, error: getError } = await sb.from("viq_testemunhos").select("autoriza_publicacao").eq("id", id).single();
  if (getError) throw new Error(`Falha ao actualizar testemunho: ${getError.message}`);

  const { error } = await sb
    .from("viq_testemunhos")
    .update({ aprovado, publicavel: aprovado && actual.autoriza_publicacao })
    .eq("id", id);
  if (error) throw new Error(`Falha ao actualizar testemunho: ${error.message}`);
}

export async function apagarTestemunho(id: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_testemunhos").delete().eq("id", id);
  if (error) throw new Error(`Falha ao apagar testemunho: ${error.message}`);
}

export async function obterTestemunho(id: string): Promise<Testemunho | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_testemunhos").select("*").eq("id", id).single();
  if (error) return null;
  return data as Testemunho;
}
