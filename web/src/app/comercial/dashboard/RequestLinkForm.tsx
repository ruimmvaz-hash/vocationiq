"use client";

import { useState } from "react";

export function RequestLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/comercial/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setEnviado(true);
  }

  if (enviado) {
    return <p className="text-sm text-ink/75">Se esse email estiver registado, enviámos-te um novo link de acesso.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-ink/75">Já és comercial? Pede um novo link de acesso.</p>
      <input
        type="email"
        placeholder="O teu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:opacity-60"
      >
        {loading ? "A enviar…" : "Enviar link de acesso"}
      </button>
    </form>
  );
}
