"use client";

import { useState } from "react";
import Link from "next/link";

export function LeadMagnetForm() {
  const [email, setEmail] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consentimentoRgpd: consentimento }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível enviar. Tenta novamente.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return <p className="text-sm font-semibold text-navy">Enviámos o exemplo para o teu email.</p>;
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="O teu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-border bg-paper px-4 py-2.5 text-ink placeholder:text-ink/40 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <button
          type="submit"
          disabled={loading || !consentimento}
          className="rounded-md bg-amber px-6 py-2.5 text-sm font-bold text-navy-dark transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "A enviar…" : "Receber exemplo"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-left text-xs text-ink/70">
        <input
          type="checkbox"
          required
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-navy focus:ring-navy"
        />
        <span>
          Aceito receber comunicações da VocationIQ, incluindo newsletter e informações sobre o serviço. Podes cancelar a
          qualquer momento. Consulta a{" "}
          <Link href="/legal/privacy" className="font-semibold text-navy underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </form>
  );
}
