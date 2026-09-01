"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "erro de autenticação");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-xl font-extrabold text-navy">VocationIQ — painel</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="rounded-md border border-border px-4 py-2.5 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-navy px-4 py-2.5 font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
