"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Réplica do ChatWidget.tsx da Naveya, adaptada ao VocationIQ: sem i18n (o
// VocationIQ é só PT), cores da marca (navy/amber), e um limite real de 5
// mensagens/24h por utilizador anónimo — a Naveya não tem nenhum limite;
// ver api/chat/route.ts para o porquê.
const NAVY = "#1B3A6B";
const AMBER = "#F5A623";
const UID_STORAGE_KEY = "vocationiq_chat_uid";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function obterOuCriarUid(): string {
  let uid = localStorage.getItem(UID_STORAGE_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_STORAGE_KEY, uid);
  }
  return uid;
}

function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Olá! Pergunta-me o que quiseres sobre o VocationIQ." }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [email, setEmail] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailErro, setEmailErro] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    uidRef.current = obterOuCriarUid();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, limitReached]);

  async function send() {
    const text = input.trim();
    if (!text || sending || limitReached) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, uid: uidRef.current }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setLimitReached(true);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Ocorreu um erro — tenta novamente." }]);
    } finally {
      setSending(false);
    }
  }

  async function enviarEmail() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailErro("Introduz um email válido.");
      return;
    }
    setEmailSending(true);
    setEmailErro(null);
    try {
      const res = await fetch("/api/chat/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEmailErro(data.error ?? "Não foi possível guardar o teu email.");
        return;
      }
      setEmailEnviado(true);
    } catch {
      setEmailErro("Ocorreu um erro — tenta novamente.");
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div
      className="flex h-[460px] max-h-[calc(100dvh-140px)] w-[320px] max-w-[calc(100vw-40px)] flex-col rounded-lg border border-border bg-white shadow-2xl"
      style={{ minHeight: 0 }}
    >
      <div className="flex items-center gap-2 rounded-t-lg border-b border-border px-4 py-3" style={{ background: NAVY }}>
        <span className="text-sm font-bold text-white">
          Vocation<span style={{ color: AMBER }}>IQ</span> · Assistente
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed"
              style={m.role === "user" ? { background: NAVY, color: "#FFFFFF" } : { background: "#F5F5F5", color: "#1A1A1A" }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div className="text-xs text-ink/40">…</div>}

        {limitReached && (
          <div className="mt-2 rounded-lg border border-amber/50 bg-amber/10 p-3">
            {emailEnviado ? (
              <p className="text-sm text-navy">Obrigado! A equipa entra em contacto contigo em breve.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-navy">Para continuar a conversa, deixa o teu email:</p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviarEmail()}
                    placeholder="o-teu-email@exemplo.com"
                    className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-navy"
                  />
                  <button
                    onClick={enviarEmail}
                    disabled={emailSending}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold text-navy-dark disabled:opacity-50"
                    style={{ background: AMBER }}
                  >
                    {emailSending ? "…" : "Enviar"}
                  </button>
                </div>
                {emailErro && <p className="mt-1.5 text-xs text-red-700">{emailErro}</p>}
              </>
            )}
          </div>
        )}
      </div>
      {!limitReached && (
        <div className="flex gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escreve a tua mensagem…"
            className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-navy"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            style={{ background: NAVY }}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Botão flutuante do WhatsApp (pedido do Rui, 21 Set) — só
          mensagens (wa.me abre sempre a conversa de chat, nunca a
          chamada). Empilhado por cima do bot de chat, mesmo eixo. */}
      <a
        href="https://wa.me/351928376182"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        title="Fala connosco no WhatsApp"
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ background: "#25D366" }}
      >
        <IconWhatsApp className="h-7 w-7" />
      </a>
      <div className="fixed bottom-5 right-5 z-50">
        {open && <div className="mb-3">{<ChatPanel />}</div>}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Chat"
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-transform hover:scale-105"
          style={{ background: NAVY }}
        >
          {open ? "×" : "?"}
        </button>
      </div>
    </>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.86.505 3.641 1.459 5.19L2 22l4.943-1.436A9.94 9.94 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.111a8.09 8.09 0 0 1-4.13-1.132l-.296-.176-3.086.896.907-3.05-.192-.31a8.086 8.086 0 0 1-1.29-4.34c0-4.478 3.643-8.11 8.087-8.11 4.443 0 8.086 3.632 8.086 8.11 0 4.478-3.643 8.112-8.086 8.112z" />
    </svg>
  );
}
