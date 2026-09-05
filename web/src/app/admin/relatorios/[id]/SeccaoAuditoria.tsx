"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Secção 4 — "Auditoria do LLM". Duas coisas distintas, mostradas juntas:
 * (1) a CRÍTICA automática (Parte 3 do redesenho) — já correu sozinha ao
 * gerar o rascunho (Passo 3), nunca por clique, sempre gravada; se algum
 * critério falhou, o rascunho já foi reescrito automaticamente e
 * `rascunho_texto` já É a versão reescrita — o que se mostra aqui é só o
 * REGISTO de como se chegou lá. (2) A auditoria de raciocínio MANUAL
 * ("Analisar raciocínio") — chamada extra à Anthropic, custo real
 * (~€0.08), sempre por clique explícito, nunca automática.
 */
export function SeccaoAuditoria({
  intakeId,
  auditoriaInicial,
  auditoriaCriadaEmInicial,
  criticaLlm,
  criticaCriadaEm,
  rascunhoReescrito,
  rascunhoVersao,
}: {
  intakeId: string;
  auditoriaInicial: string | null;
  auditoriaCriadaEmInicial: string | null;
  criticaLlm: string | null;
  criticaCriadaEm: string | null;
  rascunhoReescrito: string | null;
  rascunhoVersao: number;
}) {
  const [auditoria, setAuditoria] = useState(auditoriaInicial);
  const [criadaEm, setCriadaEm] = useState(auditoriaCriadaEmInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aVer, setAVer] = useState(Boolean(auditoriaInicial));
  const [aVerCritica, setAVerCritica] = useState(false);
  const [aVerReescrito, setAVerReescrito] = useState(false);
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
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Versão do rascunho: {rascunhoVersao}</p>
      </div>

      <div className="mt-4 rounded-md border border-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-navy">Crítica automática (gerada ao criar o rascunho)</p>
            <p className="mt-1 text-xs text-ink/60">Verifica 12 critérios contra o prompt técnico e o texto gerado — corre sempre, sem custo adicional nem clique extra.</p>
            {criticaCriadaEm && <p className="mt-1 text-xs text-ink/50">Gerada em {formatarDataHora(criticaCriadaEm)}</p>}
          </div>
          {criticaLlm && (
            <button
              type="button"
              onClick={() => setAVerCritica((v) => !v)}
              className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              {aVerCritica ? "Esconder" : "Ver crítica"}
            </button>
          )}
        </div>
        {!criticaLlm && <p className="mt-2 text-sm text-ink/60">Ainda sem crítica guardada — gera (ou regenera) o rascunho para a correr.</p>}
        {aVerCritica && criticaLlm && <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-4 font-mono text-sm leading-relaxed text-ink">{criticaLlm}</pre>}

        {rascunhoReescrito && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-amber-dark">A crítica encontrou falhas — o rascunho foi reescrito automaticamente</p>
              <button
                type="button"
                onClick={() => setAVerReescrito((v) => !v)}
                className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
              >
                {aVerReescrito ? "Esconder" : "Ver reescrita"}
              </button>
            </div>
            <p className="mt-1 text-xs text-ink/60">O rascunho actual (secção &quot;Rascunho&quot; acima) já É este texto reescrito — isto é só o registo de auditoria.</p>
            {aVerReescrito && <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-4 font-mono text-sm leading-relaxed text-ink">{rascunhoReescrito}</pre>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-sm text-ink/70">Analisar raciocínio: pede ao modelo para explicar, secção a secção, que dados usou, que conclusões tirou e que alternativas considerou. Uso interno — nunca mostrado ao cliente.</p>
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
