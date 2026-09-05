"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Secção 4 — "Auditoria do LLM": chama a Anthropic outra vez (custo real, ~€0.08/análise), sempre por clique explícito, nunca automática. */
export function SeccaoAuditoria({
  intakeId,
  auditoriaInicial,
  auditoriaCriadaEmInicial,
}: {
  intakeId: string;
  auditoriaInicial: string | null;
  auditoriaCriadaEmInicial: string | null;
}) {
  const [auditoria, setAuditoria] = useState(auditoriaInicial);
  const [criadaEm, setCriadaEm] = useState(auditoriaCriadaEmInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aVer, setAVer] = useState(Boolean(auditoriaInicial));
  const router = useRouter();

  async function analisar() {
    if (auditoria && !confirm("Isto substitui a auditoria já guardada e volta a chamar a Anthropic (~€0.08). Continuar?")) return;
    setLoading(true);
    setErro(null);
    const res = await fetch(`/api/admin/intakes/${intakeId}/auditoria-llm`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível analisar o raciocínio.");
      return;
    }
    setAuditoria(data.auditoriaLlm);
    setCriadaEm(data.auditoriaCriadaEm);
    setAVer(true);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink/70">Pede ao modelo para explicar, secção a secção, que dados usou, que conclusões tirou e que alternativas considerou. Uso interno — nunca mostrado ao cliente.</p>
          {criadaEm && <p className="mt-1 text-xs text-ink/50">Última análise: {formatarDataHora(criadaEm)}</p>}
        </div>
        <div className="flex gap-2">
          {auditoria && (
            <button
              type="button"
              onClick={() => setAVer((v) => !v)}
              className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              {aVer ? "Esconder auditoria" : "Ver auditoria"}
            </button>
          )}
          <button
            type="button"
            onClick={analisar}
            disabled={loading}
            className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "A analisar…" : auditoria ? "Regenerar (~€0.08)" : "Analisar raciocínio do LLM (~€0.08)"}
          </button>
        </div>
      </div>

      {erro && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {aVer && auditoria && (
        <pre className="mt-4 max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-white p-4 font-mono text-sm leading-relaxed text-ink">{auditoria}</pre>
      )}
    </div>
  );
}
