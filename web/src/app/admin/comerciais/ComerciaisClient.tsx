"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Comercial } from "@/lib/comercialStore";

const STATUS_LABEL: Record<Comercial["status"], { label: string; className: string }> = {
  invited: { label: "Convidado", className: "bg-fog text-ink/60" },
  pending: { label: "Pendente", className: "bg-amber/20 text-amber-dark" },
  active: { label: "Activo", className: "bg-emerald-100 text-emerald-800" },
  suspended: { label: "Suspenso", className: "bg-red-100 text-red-800" },
};

export function ComerciaisClient({ comerciaisIniciais }: { comerciaisIniciais: Comercial[] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const router = useRouter();

  async function accao(id: string, path: string, body?: Record<string, unknown>) {
    const res = await fetch(`/api/admin/comerciais/${id}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Falha na acção.");
    }
  }

  return (
    <div className="mt-6">
      <button onClick={() => setModalAberto(true)} className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark">
        Convidar novo comercial
      </button>

      {comerciaisIniciais.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Ainda não há comerciais.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-3 py-3">Nome / email</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Vendas</th>
                <th className="px-3 py-3">Receita gerada</th>
                <th className="px-3 py-3">Taxa</th>
                <th className="px-3 py-3">Comissão devida</th>
                <th className="px-3 py-3">Comissão paga</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {comerciaisIniciais.map((c) => (
                <LinhaComercial key={c.id} comercial={c} onAccao={accao} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && <InviteModal onClose={() => setModalAberto(false)} onInvited={() => router.refresh()} />}
    </div>
  );
}

function LinhaComercial({ comercial: c, onAccao }: { comercial: Comercial; onAccao: (id: string, path: string, body?: Record<string, unknown>) => Promise<void> }) {
  const [editandoTaxa, setEditandoTaxa] = useState(false);
  const [taxa, setTaxa] = useState(String(Math.round(c.commission_rate * 1000) / 10));
  const owed = Number(c.total_commission_owed ?? 0) - Number(c.total_commission_paid ?? 0);
  const pedidoPagamento = !!c.payout_requested_at;

  return (
    <tr className={`border-b border-border last:border-0 ${pedidoPagamento ? "border-l-4 border-l-emerald-500 bg-emerald-50/50" : ""}`}>
      <td className="px-3 py-3">
        <p className="font-semibold text-navy">{c.name}</p>
        <p className="text-xs text-ink/60">{c.email}</p>
        {pedidoPagamento && <p className="mt-0.5 text-xs font-semibold text-emerald-700">Payout pendente</p>}
      </td>
      <td className="px-3 py-3 font-mono text-xs">{c.code}</td>
      <td className="px-3 py-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_LABEL[c.status].className}`}>{STATUS_LABEL[c.status].label}</span>
      </td>
      <td className="px-3 py-3 text-ink/75">{c.total_sales}</td>
      <td className="px-3 py-3 text-ink/75">€{Number(c.total_revenue_generated ?? 0).toFixed(2)}</td>
      <td className="px-3 py-3">
        {editandoTaxa ? (
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              className="w-16 rounded border border-border px-1.5 py-0.5 text-xs"
            />
            <button
              onClick={async () => {
                await onAccao(c.id, "commission-rate", { ratePct: Number(taxa) });
                setEditandoTaxa(false);
              }}
              className="text-xs font-semibold text-navy underline"
            >
              Guardar
            </button>
          </span>
        ) : (
          <button onClick={() => setEditandoTaxa(true)} className="text-ink/75 underline decoration-dotted">
            {(c.commission_rate * 100).toFixed(1)}% {c.commission_rate_manual && "🔒"}
          </button>
        )}
      </td>
      <td className="px-3 py-3 text-ink/75">€{owed.toFixed(2)}</td>
      <td className="px-3 py-3 text-ink/75">€{Number(c.total_commission_paid ?? 0).toFixed(2)}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {c.status === "pending" && (
            <AccaoBotao onClick={() => onAccao(c.id, "approve")} label="Aprovar" />
          )}
          {c.status === "active" && <AccaoBotao onClick={() => onAccao(c.id, "suspend")} label="Suspender" />}
          {c.status === "suspended" && <AccaoBotao onClick={() => onAccao(c.id, "reactivate")} label="Reactivar" />}
          {owed > 0.001 && <AccaoBotao onClick={() => onAccao(c.id, "mark-paid")} label="Marcar pago" />}
        </div>
      </td>
    </tr>
  );
}

function AccaoBotao({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="rounded-md border border-navy px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white">
      {label}
    </button>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/admin/comerciais/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Falha ao convidar.");
      return;
    }
    onInvited();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-navy">Convidar comercial</h2>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
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
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink/60 hover:bg-fog">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="rounded-md bg-navy px-4 py-1.5 text-sm font-bold text-white hover:bg-navy-dark disabled:opacity-60">
              {loading ? "A convidar…" : "Convidar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
