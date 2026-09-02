"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITUACAO_TESTEMUNHO, type Testemunho } from "@/lib/testemunhoTypes";
import { Estrelas } from "@/components/Estrelas";
import { CardModal } from "./CardModal";

const SITUACAO_LABEL = Object.fromEntries(SITUACAO_TESTEMUNHO.map((s) => [s.valor, s.label]));

export function TestemunhosClient({ testemunhosIniciais }: { testemunhosIniciais: Testemunho[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState(5);
  const [aprovado, setAprovado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cardAberto, setCardAberto] = useState<Testemunho | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/admin/testemunhos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, situacao, texto, nota, aprovado }),
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
    setNota(5);
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
          {SITUACAO_TESTEMUNHO.map((s) => (
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
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink/60">Nota</span>
          <select
            value={nota}
            onChange={(e) => setNota(Number(e.target.value))}
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrela{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
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
            <div key={t.id} id={t.id} className="scroll-mt-24 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">{t.nome}</p>
                  <p className="text-xs text-ink/50">{SITUACAO_LABEL[t.situacao] ?? t.situacao}</p>
                  <Estrelas nota={t.nota} className="mt-1 block text-sm" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.aprovado ? "bg-emerald-100 text-emerald-800" : "bg-fog text-ink/60"}`}>
                    {t.aprovado ? "Aprovado" : "Por aprovar"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.autoriza_publicacao ? "bg-emerald-100 text-emerald-800" : "bg-fog text-ink/50"}`}>
                    {t.autoriza_publicacao ? "Pode publicar" : "Não autorizado"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink/80">{t.texto}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => toggleAprovado(t.id, !t.aprovado)}
                  className="rounded-md border border-navy px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white"
                >
                  {t.aprovado ? "Reprovar" : "Aprovar para o site"}
                </button>
                <button
                  onClick={() => setCardAberto(t)}
                  className="rounded-md border border-amber px-2.5 py-1 text-xs font-semibold text-amber-dark transition hover:bg-amber hover:text-navy-dark"
                >
                  Gerar card para redes sociais
                </button>
                <button onClick={() => apagar(t.id)} className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50">
                  Apagar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cardAberto && <CardModal testemunho={cardAberto} onClose={() => setCardAberto(null)} />}
    </div>
  );
}
