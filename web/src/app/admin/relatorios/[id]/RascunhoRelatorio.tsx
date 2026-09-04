"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarcarEntregueButton } from "./MarcarEntregueButton";

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Passo 3 (VOCATIONIQ-ADULTO-metodologia.md) — gera/edita/guarda o rascunho antes de "Aprovar e enviar" (MarcarEntregueButton com autoGerarPdf: gera e envia o PDF automaticamente a partir do rascunho aprovado). "Ver relatório em HTML"/"Ver PDF"/"Ver Word" ficam disponíveis para o admin rever o conteúdo ANTES de aprovar — as três geram sempre na hora a partir do rascunho actual (ver obterTextoRelatorioActual em storage.ts), nunca esperam pelo envio. */
export function RascunhoRelatorio({ intakeId, rascunhoInicial, criadoEmInicial, emailAtual }: { intakeId: string; rascunhoInicial: string | null; criadoEmInicial: string | null; emailAtual: string | null }) {
  const [texto, setTexto] = useState(rascunhoInicial);
  const [textoEditado, setTextoEditado] = useState(rascunhoInicial ?? "");
  const [criadoEm, setCriadoEm] = useState(criadoEmInicial);
  const [loading, setLoading] = useState<"gerar" | "guardar" | "apagar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  async function gerar() {
    if (texto && !confirm("Isto vai substituir o rascunho actual. O relatório já entregue ao cliente não é alterado. Continuar?")) return;
    setLoading("gerar");
    setErro(null);
    setMensagem(null);
    const res = await fetch("/api/relatorio", {
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
    setCriadoEm(new Date().toISOString());
    router.refresh();
  }

  async function guardar() {
    setLoading("guardar");
    setErro(null);
    setMensagem(null);
    const res = await fetch("/api/relatorio", {
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
    const res = await fetch(`/api/relatorio?intakeId=${encodeURIComponent(intakeId)}`, { method: "DELETE" });
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

  return (
    <section className="mt-6 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-navy">Rascunho do relatório</p>
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

      {criadoEm && <p className="mt-1 text-xs text-ink/50">Guardado em {formatarDataHora(criadoEm)}</p>}
      {erro && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="mt-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</p>}

      {texto ? (
        <>
          <textarea
            value={textoEditado}
            onChange={(e) => {
              setTextoEditado(e.target.value);
              setMensagem(null);
            }}
            rows={18}
            className="mt-4 w-full rounded-md border border-border bg-paper p-4 font-mono text-sm leading-relaxed text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
            <a
              href={`/admin/relatorios/${intakeId}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              Ver relatório em HTML
            </a>
            <a
              href={`/api/admin/intakes/${intakeId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
            >
              Ver PDF
            </a>
            <a href={`/api/admin/intakes/${intakeId}/docx`} className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white">
              Ver Word
            </a>
            <MarcarEntregueButton intakeId={intakeId} jaEntregue={false} label="Aprovar e enviar" emailAtual={emailAtual} autoGerarPdf />
            <button
              type="button"
              onClick={descartar}
              disabled={loading !== null}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "apagar" ? "A apagar…" : "Descartar"}
            </button>
          </div>
        </>
      ) : (
        !loading && <p className="mt-3 text-sm text-ink/60">Ainda sem rascunho gerado — revê e edita o texto aqui antes de aprovar e enviar.</p>
      )}
    </section>
  );
}
