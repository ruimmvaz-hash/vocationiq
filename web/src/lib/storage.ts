import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

const BUCKET = "viq-relatorios";

export async function guardarRelatorioPdf(params: { intakeId: string; filename: string; bytes: Buffer; contentType: string }): Promise<{ id: string; path: string }> {
  const sb = await getSupabaseAdmin();
  const path = `${params.intakeId}/${Date.now()}-${params.filename}`;

  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, params.bytes, { contentType: params.contentType, upsert: false });
  if (uploadError) throw new Error(`Falha ao guardar o PDF: ${uploadError.message}`);

  const { data, error: insertError } = await sb
    .from("viq_relatorios")
    .insert({ intake_id: params.intakeId, pdf_path: path, pdf_filename: params.filename })
    .select("id")
    .single();
  if (insertError) throw new Error(`Falha ao registar o relatório: ${insertError.message}`);

  return { id: data.id as string, path };
}

export async function marcarRelatorioEnviado(relatorioId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").update({ enviado_em: new Date().toISOString() }).eq("id", relatorioId);
  if (error) throw new Error(`Falha ao marcar relatório como enviado: ${error.message}`);
}
