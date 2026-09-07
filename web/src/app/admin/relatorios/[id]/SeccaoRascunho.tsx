"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Secção 3 — "Rascunho" — unifica o antigo RascunhoRelatorio.tsx (antes
 * da entrega) e a parte de regeneração do antigo RelatorioEntregue.tsx
 * (depois da entrega): a mesma caixa editável em qualquer estado do
 * pedido. `temDraftReal` distingue um rascunho de facto por aprovar
 * (pdf_path nulo) do texto do relatório já entregue mostrado aqui só
 * como ponto de partida — "Descartar" só aparece quando há mesmo uma
 * linha de rascunho para apagar (apagarRascunho() nunca toca na linha
 * entregue).
 */
export function SeccaoRascunho({
  intakeId,
  podeGerar,
  textoInicial,
  criadoEmInicial,
  rascunhoVersaoInicial = 1,
  criticaCriadaEmInicial = null,
  temDraftReal,
  apiBase = "/api/relatorio",
}: {
  intakeId: string;
  podeGerar: boolean;
  textoInicial: string | null;
  criadoEmInicial: string | null;
  /** FRENTE 1 (correcção do especialista, prova de geração real) — nº de vezes que este rascunho foi reescrito pela crítica automática (1 = original, nunca reescrito). */
  rascunhoVersaoInicial?: number;
  /** FRENTE 1 — quando a crítica automática correu pela última vez. "Guardar rascunho" (edição manual) nunca actualiza este campo — por isso, se `criticaCriadaEmInicial` for anterior a `criadoEmInicial`, o texto actual foi editado à mão DEPOIS da última geração real pela Anthropic. */
  criticaCriadaEmInicial?: string | null;
  temDraftReal: boolean;
  /** TAREFA 1D (correcção do especialista) — "/api/relatorio" (adulto) ou "/api/relatorio-adolescente" (ramo adolescente), decidido em page.tsx a partir de intake.situacao. */
  apiBase?: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [textoEditado, setTextoEditado] = useState(textoInicial ?? "");
  const [criadoEm, setCriadoEm] = useState(criadoEmInicial);
  const [rascunhoVersao, setRascunhoVersao] = useState(rascunhoVersaoInicial);
  const [criticaCriadaEm, setCriticaCriadaEm] = useState(criticaCriadaEmInicial);
  const [loading, setLoading] = useState<"gerar" | "guardar" | "apagar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  if (!podeGerar) {
    return <p className="text-sm text-ink/60">Este pedido não usa o motor de geração automática — a entrega é feita por upload manual do PDF (secção &quot;Entrega&quot;).</p>;
  }

  async function gerar() {
    if (texto && !confirm("Isto vai substituir o rascunho actual. O relatório já entregue ao cliente (se houver) não é alterado. Continuar?")) return;
    setLoading("gerar");
    setErro(null);
    setMensagem(null);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível gerar o rascunho.");
      return;
    }
    setTexto(data.texto);
    setTextoEditado(data.texto);
    // FRENTE 1 (correcção do especialista, prova de geração real) — "Gerar"
    // passa SEMPRE pela crítica automática (nunca opcional, ver route.ts),
    // por isso `criticaCriadaEm` fica sempre alinhado com `criadoEm` aqui —
    // ao contrário de "Guardar rascunho" (edição manual), que nunca toca
    // neste campo.
    const agora = new Date().toISOString();
    setCriadoEm(agora);
    setCriticaCriadaEm(agora);
    setRascunhoVersao((v) => (data.houveReescrita ? v + 1 : v));
    router.refresh();
  }

  async function guardar() {
    setLoading("guardar");
    setErro(null);
    setMensagem(null);
    const res = await fetch(apiBase, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId, texto: textoEditado }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível guardar o rascunho.");
      return;
    }
    setTexto(textoEditado);
    setCriadoEm(data.criadoEm ?? new Date().toISOString());
    setMensagem("Rascunho guardado.");
    router.refresh();
  }

  async function descartar() {
    if (!confirm("Apagar este rascunho? Esta acção não pode ser desfeita.")) return;
    setLoading("apagar");
    setErro(null);
    setMensagem(null);
    const res = await fetch(`${apiBase}?intakeId=${encodeURIComponent(intakeId)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível apagar o rascunho.");
      return;
    }
    setTexto(null);
    setTextoEditado("");
    setCriadoEm(null);
    router.refresh();
  }

  // FRENTE 1 (correcção do especialista, prova de geração real) —
  // `criticaCriadaEm` só é actualizado por "Gerar"/"Regenerar" (a crítica
  // corre sempre, nunca é opcional); "Guardar rascunho" (edição manual)
  // nunca lhe toca. Se `criticaCriadaEm` for anterior a `criadoEm` por mais
  // do que alguns segundos, o texto actual foi editado à mão DEPOIS da
  // última chamada real à Anthropic — sinal honesto, não uma prova de má fé.
  const editadoManualmenteDepoisDaGeracao =
    criadoEm !== null && (criticaCriadaEm === null || new Date(criticaCriadaEm).getTime() < new Date(criadoEm).getTime() - 5000);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {criadoEm ? (
          <div className="text-xs text-ink/50">
            <p>
              Rascunho gerado em {formatarDataHora(criadoEm)} (versão {rascunhoVersao})
            </p>
            {editadoManualmenteDepoisDaGeracao && (
              <p className="mt-1 font-semibold text-amber-700">⚠ sem crítica associada a este texto — pode ter sido editado manualmente (&quot;Guardar rascunho&quot;) depois da última geração real pela Anthropic.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink/50">Ainda sem rascunho gerado.</p>
        )}
        {!texto && (
          <button
            type="button"
            onClick={gerar}
            disabled={loading !== null}
            className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "gerar" ? "A gerar…" : "Gerar rascunho"}
          </button>
        )}
      </div>

      {erro && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="mt-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</p>}

      {texto && (
        <>
          <textarea
            value={textoEditado}
            onChange={(e) => {
              setTextoEditado(e.target.value);
              setMensagem(null);
            }}
            rows={18}
            className="mt-4 w-full rounded-md border border-border bg-white p-4 font-mono text-sm leading-relaxed text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={gerar}
              disabled={loading !== null}
              className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "gerar" ? "A gerar…" : "Regenerar"}
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={loading !== null}
              className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "guardar" ? "A guardar…" : "Guardar rascunho"}
            </button>
            {temDraftReal && (
              <button
                type="button"
                onClick={descartar}
                disabled={loading !== null}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "apagar" ? "A apagar…" : "Descartar"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
