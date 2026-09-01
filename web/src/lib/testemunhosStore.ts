import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { Situacao } from "./validation";

export interface Testemunho {
  id: string;
  created_at: string;
  nome: string;
  situacao: Situacao;
  texto: string;
  aprovado: boolean;
}

export async function criarTestemunho(dados: { nome: string; situacao: Situacao; texto: string; aprovado: boolean }): Promise<Testemunho> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_testemunhos")
    .insert({ nome: dados.nome.trim() || "Anónimo", situacao: dados.situacao, texto: dados.texto.trim(), aprovado: dados.aprovado })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar testemunho: ${error.message}`);
  return data as Testemunho;
}

export async function listarTestemunhos(): Promise<Testemunho[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_testemunhos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar testemunhos: ${error.message}`);
  return (data ?? []) as Testemunho[];
}

/**
 * Usado pela homepage pública — nunca pode rebentar a página (nem em
 * build/prerender, nem em runtime): sem Supabase configurado ou com
 * qualquer erro, mostra zero testemunhos em vez de partir a página.
 */
export async function listarTestemunhosAprovados(): Promise<Testemunho[]> {
  try {
    const sb = await getSupabaseAdmin();
    const { data, error } = await sb.from("viq_testemunhos").select("*").eq("aprovado", true).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Testemunho[];
  } catch {
    return [];
  }
}

export async function definirAprovacaoTestemunho(id: string, aprovado: boolean): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_testemunhos").update({ aprovado }).eq("id", id);
  if (error) throw new Error(`Falha ao actualizar testemunho: ${error.message}`);
}

export async function apagarTestemunho(id: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_testemunhos").delete().eq("id", id);
  if (error) throw new Error(`Falha ao apagar testemunho: ${error.message}`);
}
