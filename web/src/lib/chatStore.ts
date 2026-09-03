import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

const LIMITE_MENSAGENS = 5;
const JANELA_MS = 24 * 60 * 60 * 1000;

export interface ResultadoContagem {
  permitido: boolean;
  contagem: number;
}

/** Regista uma mensagem do chatbot público para este uid anónimo, com reset ao fim de 24h. */
export async function registarMensagemChat(uid: string): Promise<ResultadoContagem> {
  const sb = await getSupabaseAdmin();
  const { data } = await sb.from("viq_chat_sessions").select("message_count, window_started_at").eq("uid", uid).maybeSingle();

  const agora = new Date();
  let contagem = 0;
  let janelaInicio = agora;

  if (data) {
    const inicioJanela = new Date(data.window_started_at);
    const dentroDaJanela = agora.getTime() - inicioJanela.getTime() < JANELA_MS;
    contagem = dentroDaJanela ? data.message_count : 0;
    janelaInicio = dentroDaJanela ? inicioJanela : agora;
  }

  if (contagem >= LIMITE_MENSAGENS) return { permitido: false, contagem };

  const novaContagem = contagem + 1;
  const { error } = await sb.from("viq_chat_sessions").upsert({ uid, message_count: novaContagem, window_started_at: janelaInicio.toISOString() });
  if (error) throw new Error(`Falha ao registar mensagem do chat: ${error.message}`);
  return { permitido: true, contagem: novaContagem };
}
