"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Influencer, EstadoInfluencer } from "@/lib/influencersStore";

const ESTADOS: EstadoInfluencer[] = ["contactado", "respondeu", "activo", "inactivo"];

const ESTADO_LABEL: Record<EstadoInfluencer, { label: string; className: string }> = {
  contactado: { label: "Contactado", className: "bg-fog text-ink/60" },
  respondeu: { label: "Respondeu", className: "bg-amber/20 text-amber-dark" },
  activo: { label: "Activo", className: "bg-emerald-100 text-emerald-800" },
  inactivo: { label: "Inactivo", className: "bg-red-100 text-red-800" },
};

export function InfluencersClient({ influencersIniciais }: { influencersIniciais: Influencer[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [redeSocial, setRedeSocial] = useState("");
  const [seguidores, setSeguidores] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/admin/influencers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, redeSocial, seguidores: seguidores ? Number(seguidores) : undefined, notas }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Falha ao adicionar.");
      return;
    }
    setNome("");
    setRedeSocial("");
    setSeguidores("");
    setNotas("");
    setAberto(false);
    router.refresh();
  }

  async function mudarEstado(id: string, estado: EstadoInfluencer) {
    await fetch(`/api/admin/influencers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button onClick={() => setAberto((v) => !v)} className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark">
        {aberto ? "Cancelar" : "+ Novo influencer"}
      </button>

      {aberto && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-lg border border-border p-5">
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
          <input
            type="text"
            placeholder="Rede social (Instagram, TikTok…)"
            value={redeSocial}
            onChange={(e) => setRedeSocial(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
          <input
            type="number"
            min={0}
            placeholder="Número de seguidores"
            value={seguidores}
            onChange={(e) => setSeguidores(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
          <textarea
            placeholder="Notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <button
            type="submit"
            disabled={loading}
            className="self-start rounded-md bg-amber px-4 py-2 text-sm font-bold text-navy-dark transition hover:bg-amber-dark disabled:opacity-60"
          >
            {loading ? "A adicionar…" : "Adicionar"}
          </button>
        </form>
      )}

      {influencersIniciais.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Ainda não há influencers.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3">Rede social</th>
                <th className="px-3 py-3">Seguidores</th>
                <th className="px-3 py-3">Notas</th>
                <th className="px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {influencersIniciais.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-semibold text-navy">{i.nome}</td>
                  <td className="px-3 py-3 text-ink/75">{i.rede_social ?? "—"}</td>
                  <td className="px-3 py-3 text-ink/75">{i.seguidores?.toLocaleString("pt-PT") ?? "—"}</td>
                  <td className="px-3 py-3 max-w-[220px] truncate text-ink/60" title={i.notas ?? ""}>
                    {i.notas ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={i.estado}
                      onChange={(e) => mudarEstado(i.id, e.target.value as EstadoInfluencer)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${ESTADO_LABEL[i.estado].className}`}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_LABEL[e].label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
