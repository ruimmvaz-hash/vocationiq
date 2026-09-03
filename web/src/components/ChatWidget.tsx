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
  );
}
