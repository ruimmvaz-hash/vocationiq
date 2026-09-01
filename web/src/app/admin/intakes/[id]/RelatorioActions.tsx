"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RelatorioActions({ intakeId, temRelatorio, jaEnviado }: { intakeId: string; temRelatorio: boolean; jaEnviado: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();

  async function anexar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro(null);
    setOk(null);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/intakes/${intakeId}/upload-relatorio`, { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Não foi possível anexar o PDF.");
      return;
    }
    setOk("PDF anexado.");
    router.refresh();
  }

  async function enviar() {
    setSending(true);
    setErro(null);
    setOk(null);
    const res = await fetch(`/api/admin/intakes/${intakeId}/enviar-relatorio`, { method: "POST" });
    setSending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Não foi possível enviar o relatório.");
      return;
    }
    setOk("Relatório enviado por email.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-sm font-semibold text-navy">Relatório</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="application/pdf" className="text-sm" />
        <button
          onClick={anexar}
          disabled={uploading}
          className="rounded-md border border-navy px-3 py-1.5 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "A anexar…" : "Anexar PDF"}
        </button>
      </div>

      <div className="mt-4">
        <button
          onClick={enviar}
          disabled={sending || !temRelatorio}
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "A enviar…" : jaEnviado ? "Reenviar relatório por email" : "Enviar relatório por email"}
        </button>
        {!temRelatorio && <p className="mt-1.5 text-xs text-ink/50">Anexa um PDF primeiro.</p>}
      </div>

      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-emerald-700">{ok}</p>}
    </div>
  );
}
