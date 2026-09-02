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

/**
 * Guarda o rascunho gerado pelo motor (VOCATIONIQ-ADULTO-metodologia.md)
 * em viq_relatorios. Idempotente por intake — reaproveita a linha de
 * rascunho já existente (pdf_path ainda nulo) em vez de acumular uma
 * nova a cada "Gerar rascunho"; a linha final da entrega (com PDF, via
 * guardarRelatorioPdf) continua a ser sempre uma linha à parte.
 */
export async function guardarRascunho(intakeId: string, texto: string): Promise<{ id: string }> {
  const sb = await getSupabaseAdmin();
  const agora = new Date().toISOString();

  const { data: existente, error: buscaError } = await sb.from("viq_relatorios").select("id").eq("intake_id", intakeId).is("pdf_path", null).maybeSingle();
  if (buscaError) throw new Error(`Falha ao procurar rascunho existente: ${buscaError.message}`);

  if (existente) {
    const { error } = await sb.from("viq_relatorios").update({ rascunho_texto: texto, rascunho_criado_em: agora }).eq("id", existente.id);
    if (error) throw new Error(`Falha ao actualizar rascunho: ${error.message}`);
    return { id: existente.id as string };
  }

  const { data, error } = await sb.from("viq_relatorios").insert({ intake_id: intakeId, rascunho_texto: texto, rascunho_criado_em: agora }).select("id").single();
  if (error) throw new Error(`Falha ao guardar rascunho: ${error.message}`);
  return { id: data.id as string };
}

export interface RascunhoRelatorio {
  id: string;
  texto: string;
  criadoEm: string;
}

/** Último rascunho por gerar/aprovar (pdf_path ainda nulo) para este intake, se existir. */
export async function obterRascunho(intakeId: string): Promise<RascunhoRelatorio | null> {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from("viq_relatorios")
    .select("id, rascunho_texto, rascunho_criado_em")
    .eq("intake_id", intakeId)
    .is("pdf_path", null)
    .not("rascunho_texto", "is", null)
    .maybeSingle();
  if (error || !data || !data.rascunho_texto) return null;
  return { id: data.id as string, texto: data.rascunho_texto as string, criadoEm: data.rascunho_criado_em as string };
}

/** "Descartar" — apaga a linha de rascunho (pdf_path ainda nulo) deste intake. Nunca toca em linhas já entregues (com PDF). */
export async function apagarRascunho(intakeId: string): Promise<void> {
  const sb = await getSupabaseAdmin();
  const { error } = await sb.from("viq_relatorios").delete().eq("intake_id", intakeId).is("pdf_path", null);
  if (error) throw new Error(`Falha ao apagar rascunho: ${error.message}`);
}
