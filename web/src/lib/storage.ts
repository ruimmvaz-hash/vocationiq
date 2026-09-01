import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

const BUCKET = "viq-relatorios";

export async function guardarRelatorioPdf(params: { intakeId: string; filename: string; bytes: Buffer; contentType: string }): Promise<{ path: string }> {
  const sb = await getSupabaseAdmin();
  const path = `${params.intakeId}/${Date.now()}-${params.filename}`;

  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, params.bytes, { contentType: params.contentType, upsert: false });
  if (uploadError) throw new Error(`Falha ao guardar o PDF: ${uploadError.message}`);

  const { error: insertError } = await sb.from("viq_relatorios").insert({ intake_id: params.intakeId, pdf_path: path, pdf_filename: params.filename });
  if (insertError) throw new Error(`Falha ao registar o relatório: ${insertError.message}`);

  return { path };
}

export interface RelatorioRow {
  id: string;
  created_at: string;
  intake_id: string;
  pdf_path: string;
  pdf_filename: string;
  enviado_em: string | null;
}

export async function obterUltimoRelatorio(intakeId: string): Promise<RelatorioRow | null> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_relatorios").select("*").eq("intake_id", intakeId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as RelatorioRow) ?? null;
}

export async function descarregarRelatorioPdf(path: string): Promise<Buffer> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Falha ao descarregar o PDF: ${error?.message ?? "desconhecido"}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function marcarRelatorioEnviado(relatorioId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").update({ enviado_em: new Date().toISOString() }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar relatório como enviado: ${error.message}`);
}
