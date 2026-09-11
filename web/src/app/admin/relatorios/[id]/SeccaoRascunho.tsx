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
 *
 * CORRECÇÃO 2 — edição manual preservada: antes, "Regenerar" substituía
 * sempre o texto actual (só um confirm() do browser protegia uma edição
 * manual). Agora, quando existe edição manual activa
 * (`editadoManualmente`), uma nova geração NUNCA sobrescreve `texto` em
 * silêncio — fica disponível ao lado, em `textoLlm`, e o fundador
 * escolhe conscientemente "Usar versão LLM" ou "Manter edição manual".
 */
export function SeccaoRascunho({
  intakeId,
  podeGerar,
  textoInicial,
  criadoEmInicial,
  rascunhoVersaoInicial = 1,
  temDraftReal,
  apiBase = "/api/relatorio",
  textoLlmInicial = null,
  editadoManualmenteInicial = false,
  editadoEmInicial = null,
  versaoAnteriorInicial = null,
}: {
  intakeId: string;
  podeGerar: boolean;
  textoInicial: string | null;
  criadoEmInicial: string | null;
  /** FRENTE 1 (correcção do especialista, prova de geração real) — nº de vezes que este rascunho foi reescrito pela crítica automática (1 = original, nunca reescrito). */
  rascunhoVersaoInicial?: number;
  temDraftReal: boolean;
  /** TAREFA 1D (correcção do especialista) — "/api/relatorio" (adulto) ou "/api/relatorio-adolescente" (ramo adolescente), decidido em page.tsx a partir de intake.situacao. */
  apiBase?: string;
  /** CORRECÇÃO 2 — texto bruto da última geração real pela Anthropic, guardado à parte da edição manual. */
  textoLlmInicial?: string | null;
  editadoManualmenteInicial?: boolean;
  editadoEmInicial?: string | null;
  /** CORRECÇÃO 2 — um único nível de undo; presente quando há uma versão anterior por restaurar. */
  versaoAnteriorInicial?: string | null;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [textoEditado, setTextoEditado] = useState(textoInicial ?? "");
  const [criadoEm, setCriadoEm] = useState(criadoEmInicial);
  const [rascunhoVersao, setRascunhoVersao] = useState(rascunhoVersaoInicial);
  const [textoLlm, setTextoLlm] = useState(textoLlmInicial);
  const [editadoManualmente, setEditadoManualmente] = useState(editadoManualmenteInicial);
  const [editadoEm, setEditadoEm] = useState(editadoEmInicial);
  const [versaoAnterior, setVersaoAnterior] = useState(versaoAnteriorInicial);
  const [painelLlmDispensado, setPainelLlmDispensado] = useState(false);
  const [loading, setLoading] = useState<"gerar" | "guardar" | "apagar" | "usar-llm" | "restaurar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  if (!podeGerar) {
    return <p className="text-sm text-ink/60">Este pedido não usa o motor de geração automática — a entrega é feita por upload manual do PDF (secção &quot;Entrega&quot;).</p>;
  }

  // Mostra o painel de comparação só quando há mesmo duas versões
  // diferentes por decidir — nunca enquanto a versão LLM é igual à
  // edição manual (nada para escolher) nem depois de "Manter edição
  // manual" (dispensado até à próxima geração real).
  const mostrarComparacao = editadoManualmente && textoLlm !== null && textoLlm !== texto && !painelLlmDispensado;

  async function gerar() {
    if (texto && !editadoManualmente && !confirm("Isto vai substituir o rascunho actual. O relatório já entregue ao cliente (se houver) não é alterado. Continuar?")) return;
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
    // FRENTE 1 (correcção do especialista, prova de geração real) — "Gerar"
    // passa SEMPRE pela crítica automática (nunca opcional, ver route.ts),
    // por isso `criticaCriadaEm` fica sempre alinhado com `criadoEm` aqui.
    const agora = new Date().toISOString();
    setCriadoEm(agora);
    setRascunhoVersao((v) => (data.houveReescrita ? v + 1 : v));
    setTextoLlm(data.texto);
    setPainelLlmDispensado(false);

    if (data.manualPreservada) {
      // CORRECÇÃO 2 — havia uma edição manual activa: `texto` (o que vai
      // para o PDF) NUNCA é tocado por uma geração — só `textoLlm` muda,
      // e o painel de comparação aparece para uma escolha consciente.
      setMensagem("Nova versão gerada pela Anthropic — a tua edição manual foi preservada. Compara as duas versões abaixo.");
    } else {
      setTexto(data.texto);
      setTextoEditado(data.texto);
      setEditadoManualmente(false);
    }
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
    const agora = data.criadoEm ?? new Date().toISOString();
    if (texto) setVersaoAnterior(texto); // a versão que estava em vigor até agora fica disponível para "Restaurar versão anterior".
    setTexto(textoEditado);
    setCriadoEm(agora);
    setEditadoManualmente(true);
    setEditadoEm(agora);
    setMensagem("Rascunho guardado.");
    router.refresh();
  }

  async function usarVersaoLlm() {
    if (!textoLlm) return;
    if (!confirm("Isto vai substituir a tua edição manual pela nova versão gerada pela Anthropic. A edição manual anterior fica guardada — podes restaurá-la depois. Continuar?")) return;
    setLoading("usar-llm");
    setErro(null);
    setMensagem(null);
    const res = await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId, acao: "usar-llm" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível usar a versão LLM.");
      return;
    }
    if (texto) setVersaoAnterior(texto);
    setTexto(textoLlm);
    setTextoEditado(textoLlm);
    setEditadoManualmente(false);
    setCriadoEm(data.criadoEm ?? new Date().toISOString());
    setMensagem("Versão LLM adoptada.");
    router.refresh();
  }

  function manterEdicaoManual() {
    setPainelLlmDispensado(true);
    setMensagem("Edição manual mantida — a nova versão LLM continua disponível se mudares de ideias (basta gerar de novo).");
  }

  async function restaurarAnterior() {
    if (!versaoAnterior) return;
    if (!confirm("Restaurar a versão anterior do rascunho? A versão actual é substituída.")) return;
    setLoading("restaurar");
    setErro(null);
    setMensagem(null);
    const res = await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId, acao: "restaurar-anterior" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível restaurar a versão anterior.");
      return;
    }
    const restaurado = versaoAnterior;
    setTexto(restaurado);
    setTextoEditado(restaurado);
    setVersaoAnterior(null);
    setEditadoManualmente(true);
    setEditadoEm(data.criadoEm ?? new Date().toISOString());
    setMensagem("Versão anterior restaurada.");
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
    setTextoLlm(null);
    setEditadoManualmente(false);
    setEditadoEm(null);
    setVersaoAnterior(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {criadoEm ? (
          <div className="text-xs text-ink/50">
            <p>
              Rascunho gerado em {formatarDataHora(criadoEm)} (versão {rascunhoVersao})
            </p>
            {editadoManualmente && editadoEm && (
              <p className="mt-1 font-semibold text-amber-700">⚠ Rascunho editado manualmente em {formatarDataHora(editadoEm)}.</p>
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
          {mostrarComparacao ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Versão editada (vai para o PDF)</p>
                <textarea
                  value={textoEditado}
                  onChange={(e) => {
                    setTextoEditado(e.target.value);
                    setMensagem(null);
                  }}
                  rows={18}
                  className="w-full rounded-md border border-border bg-white p-4 font-mono text-sm leading-relaxed text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">Nova versão LLM</p>
                <textarea readOnly value={textoLlm ?? ""} rows={18} className="w-full rounded-md border border-amber/50 bg-amber/5 p-4 font-mono text-sm leading-relaxed text-ink" />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={usarVersaoLlm}
                  disabled={loading !== null}
                  className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === "usar-llm" ? "A aplicar…" : "Usar versão LLM"}
                </button>
                <button
                  type="button"
                  onClick={manterEdicaoManual}
                  disabled={loading !== null}
                  className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Manter edição manual
                </button>
              </div>
            </div>
          ) : (
            <textarea
              value={textoEditado}
              onChange={(e) => {
                setTextoEditado(e.target.value);
                setMensagem(null);
              }}
              rows={18}
              className="mt-4 w-full rounded-md border border-border bg-white p-4 font-mono text-sm leading-relaxed text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          )}
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
            {versaoAnterior && (
              <button
                type="button"
                onClick={restaurarAnterior}
                disabled={loading !== null}
                className="rounded-md border border-amber-700 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "restaurar" ? "A restaurar…" : "Restaurar versão anterior"}
              </button>
            )}
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
