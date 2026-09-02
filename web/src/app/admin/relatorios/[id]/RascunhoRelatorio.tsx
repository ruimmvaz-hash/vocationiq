"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Passo 3 (VOCATIONIQ-ADULTO-metodologia.md) — gera o rascunho via /api/relatorio e mostra-o para revisão humana antes de "Aprovar e enviar" (botão já existente, MarcarEntregueButton, reaproveitado sem alterações). */
export function RascunhoRelatorio({ intakeId, rascunhoInicial }: { intakeId: string; rascunhoInicial: string | null }) {
  const [texto, setTexto] = useState(rascunhoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function gerar() {
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/relatorio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível gerar o rascunho.");
      return;
    }
    setTexto(data.texto);
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-navy">Rascunho do relatório</p>
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "A gerar…" : texto ? "Gerar novo rascunho" : "Gerar rascunho"}
        </button>
      </div>

      {erro && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {texto ? (
        <div className="mt-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-fog p-4 text-sm leading-relaxed text-ink">{texto}</div>
      ) : (
        !loading && <p className="mt-3 text-sm text-ink/60">Ainda sem rascunho gerado — revê o texto aqui antes de aprovar e enviar.</p>
      )}
    </section>
  );
}
