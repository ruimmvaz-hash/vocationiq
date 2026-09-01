"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITUACOES } from "@/lib/validation";
import type { Testemunho } from "@/lib/testemunhosStore";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

export function TestemunhosClient({ testemunhosIniciais }: { testemunhosIniciais: Testemunho[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");
  const [texto, setTexto] = useState("");
  const [aprovado, setAprovado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/admin/testemunhos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, situacao, texto, aprovado }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Falha ao adicionar.");
      return;
    }
    setNome("");
    setSituacao("");
    setTexto("");
    setAprovado(true);
    router.refresh();
  }

  async function toggleAprovado(id: string, novoValor: boolean) {
    await fetch(`/api/admin/testemunhos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: novoValor }),
    });
    router.refresh();
  }

  async function apagar(id: string) {
    if (!confirm("Apagar este testemunho?")) return;
    await fetch(`/api/admin/testemunhos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-6">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <p className="text-sm font-bold text-navy">Adicionar testemunho</p>
        <input
          type="text"
          placeholder="Nome (deixa em branco para 'Anónimo')"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
        />
        <select
          value={situacao}
          onChange={(e) => setSituacao(e.target.value)}
          required
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
        >
          <option value="" disabled>
            Situação
          </option>
          {SITUACOES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.label}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Texto do testemunho"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          rows={3}
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-ink/75">
          <input type="checkbox" checked={aprovado} onChange={(e) => setAprovado(e.target.checked)} />
          Aprovado (aparece já na homepage)
        </label>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:opacity-60"
        >
          {loading ? "A adicionar…" : "Adicionar testemunho"}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {testemunhosIniciais.length === 0 ? (
          <p className="text-sm text-ink/60">Ainda não há testemunhos.</p>
        ) : (
          testemunhosIniciais.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">{t.nome}</p>
                  <p className="text-xs text-ink/50">{SITUACAO_LABEL[t.situacao] ?? t.situacao}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.aprovado ? "bg-emerald-100 text-emerald-800" : "bg-fog text-ink/60"}`}>
                  {t.aprovado ? "Aprovado" : "Por aprovar"}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/80">{t.texto}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => toggleAprovado(t.id, !t.aprovado)}
                  className="rounded-md border border-navy px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white"
                >
                  {t.aprovado ? "Reprovar" : "Aprovar"}
                </button>
                <button onClick={() => apagar(t.id)} className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50">
                  Apagar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
