"use client";

import { useState } from "react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ code: string; link: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/comercial/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível registar.");
      return;
    }
    setResultado({ code: data.code, link: data.link });
  }

  if (resultado) {
    return (
      <div className="rounded-lg border-2 border-amber bg-amber/10 p-6">
        <p className="font-bold text-navy">Registo feito.</p>
        <p className="mt-2 text-sm text-ink/75">O teu código é <span className="font-mono font-bold">{resultado.code}</span>. Enviámos-te um email com o link de acesso ao painel.</p>
        <p className="mt-3 text-sm text-ink/75">O teu link de partilha:</p>
        <p className="mt-1 break-all rounded bg-paper px-3 py-2 font-mono text-sm text-navy">{resultado.link}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border p-6">
      <p className="font-bold text-navy">Regista-te como comercial</p>
      <input
        type="text"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-amber px-4 py-2.5 text-sm font-bold text-navy-dark transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A registar…" : "Quero ser comercial"}
      </button>
    </form>
  );
}
