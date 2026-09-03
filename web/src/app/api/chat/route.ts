import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { registarMensagemChat } from "@/lib/chatStore";

// Réplica do ChatWidget/api/chat da Naveya, adaptada ao VocationIQ: mesmo
// modelo/tamanho, mas com um limite real de mensagens por utilizador
// anónimo (a Naveya não tem nenhum — pedido explícito aqui, por ser um
// endpoint público sem autenticação que chama a Anthropic a cada mensagem).

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = `És o assistente do VocationIQ. Respondes a perguntas sobre o produto de forma clara e directa.

O VocationIQ é uma análise personalizada que descobre os talentos naturais de uma pessoa, como aprende e as áreas onde pode crescer mais. €99, entrega em 48h.

Para quem é: adolescentes (9º-12º ano), jovens adultos (18-25) e adultos em transição de carreira.

Quando alguém quer fazer a análise: encaminha para vocationiq.app/intake

Nunca faças análise astrológica gratuita. Nunca reveles que usas astrologia a menos que perguntem directamente. Respostas curtas — máximo 3 frases. Tom: directo, amigável, sem emojis.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "chat not configured" }, { status: 502 });

  let body: { messages?: ChatMessage[]; uid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  if (!uid) return NextResponse.json({ error: "uid em falta" }, { status: 400 });

  const messages = (body.messages ?? []).filter((m) => m.content?.trim()).slice(-10);
  if (messages.length === 0) return NextResponse.json({ error: "empty conversation" }, { status: 400 });

  if (hasSupabaseAdmin) {
    try {
      const resultado = await registarMensagemChat(uid);
      if (!resultado.permitido) return NextResponse.json({ limitReached: true });
    } catch (err) {
      // Uma falha no contador nunca deve negar o serviço — melhor deixar
      // passar uma mensagem a mais do que bloquear o chat por um erro de infra.
      console.error("[chat] falha ao registar contagem:", err);
    }
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat] falha:", err);
    return NextResponse.json({ error: "chat failed" }, { status: 502 });
  }
}
