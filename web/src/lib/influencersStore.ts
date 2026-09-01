import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type EstadoInfluencer = "contactado" | "respondeu" | "activo" | "inactivo";

export interface Influencer {
  id: string;
  created_at: string;
  nome: string;
  rede_social: string | null;
  seguidores: number | null;
  estado: EstadoInfluencer;
  notas: string | null;
}

export async function criarInfluencer(dados: { nome: string; redeSocial?: string; seguidores?: number; notas?: string }): Promise<Influencer> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_influencers")
    .insert({
      nome: dados.nome.trim(),
      rede_social: dados.redeSocial?.trim() || null,
      seguidores: dados.seguidores ?? null,
      notas: dados.notas?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar influencer: ${error.message}`);
  return data as Influencer;
}

export async function listarInfluencers(): Promise<Influencer[]> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.from("viq_influencers").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar influencers: ${error.message}`);
  return (data ?? []) as Influencer[];
}

export async function definirEstadoInfluencer(id: string, estado: EstadoInfluencer): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_influencers").update({ estado }).eq("id", id);
  if (error) throw new Error(`Falha ao mudar estado do influencer: ${error.message}`);
}
