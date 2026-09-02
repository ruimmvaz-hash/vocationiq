"use client";

import { useState } from "react";

export function LeadMagnetForm() {
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email }),
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
    <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
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
        disabled={loading}
        className="rounded-md bg-amber px-6 py-2.5 text-sm font-bold text-navy-dark transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A enviar…" : "Receber exemplo"}
      </button>
      {erro && <p className="text-sm text-red-700 sm:basis-full">{erro}</p>}
    </form>
  );
}
