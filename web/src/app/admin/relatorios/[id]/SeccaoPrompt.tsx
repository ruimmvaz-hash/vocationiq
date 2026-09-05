"use client";

import { useState } from "react";

/** Secção 5 — "Prompt completo": só debug interno, nunca mostrado ao cliente. */
export function SeccaoPrompt({ prompt }: { prompt: string | null }) {
  const [copiado, setCopiado] = useState(false);

  if (!prompt) {
    return <p className="text-sm text-ink/60">Ainda sem prompt guardado para este relatório — gera (ou regenera) o rascunho para o guardar.</p>;
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt ?? "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end">
        <button type="button" onClick={copiar} className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white">
          {copiado ? "Copiado!" : "Copiar prompt"}
        </button>
      </div>
      <pre className="mt-3 max-h-[36rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-white p-4 font-mono text-xs leading-relaxed text-ink">{prompt}</pre>
    </div>
  );
}
