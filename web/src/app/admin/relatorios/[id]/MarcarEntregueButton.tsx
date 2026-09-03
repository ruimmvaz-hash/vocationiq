"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function MarcarEntregueButton({ intakeId, jaEntregue, label, emailAtual }: { intakeId: string; jaEntregue: boolean; label?: string; emailAtual?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  if (jaEntregue) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">Entregue</span>;
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
      >
        {label ?? "Marcar como entregue"}
      </button>
      {aberto && (
        <EntregarModal
          intakeId={intakeId}
          emailInicial={emailAtual ?? null}
          onClose={() => setAberto(false)}
          onDelivered={() => router.refresh()}
        />
      )}
    </>
  );
}

function EntregarModal({ intakeId, emailInicial, onClose, onDelivered }: { intakeId: string; emailInicial: string | null; onClose: () => void; onDelivered: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [nomeFicheiro, setNomeFicheiro] = useState<string | null>(null);
  const [email, setEmail] = useState(emailInicial ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const emailFinal = email.trim();
    if (!emailFinal || !emailFinal.includes("@")) {
      setErro("Introduz um email válido.");
      return;
    }
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErro("Anexa o PDF do relatório.");
      return;
    }
    setLoading(true);
    setErro(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", emailFinal);
    const res = await fetch(`/api/admin/intakes/${intakeId}/entregar`, { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Não foi possível entregar o relatório.");
      return;
    }
    onDelivered();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-navy">Marcar como entregue</h2>
        <p className="mt-1 text-sm text-ink/60">Anexa o PDF do relatório — enviamos o email de entrega ao cliente e marcamos o pedido como entregue.</p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">
            Email de envio <span className="text-red-600">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@exemplo.com"
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          {!emailInicial && <span className="mt-1 block text-xs text-amber-dark">Este pedido não tem email associado — introduz o email a que enviar.</span>}
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">
            PDF do relatório <span className="text-red-600">*</span>
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setNomeFicheiro(e.target.files?.[0]?.name ?? null)}
            className="w-full text-sm"
          />
          {nomeFicheiro && <span className="mt-1 block text-xs text-ink/55">{nomeFicheiro}</span>}
        </label>

        {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink/60 hover:bg-fog">
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={loading}
            className="rounded-md bg-navy px-4 py-1.5 text-sm font-bold text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "A enviar…" : "Enviar e marcar como entregue"}
          </button>
        </div>
      </div>
    </div>
  );
}
