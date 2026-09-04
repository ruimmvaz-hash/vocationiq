"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Envio {
  email: string;
  tipo: "inicial" | "reenvio";
  enviadoEm: string;
}

interface RascunhoNovo {
  texto: string;
  criadoEm: string;
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

const CONFIRMACAO_REGENERAR = "Isto vai substituir o rascunho actual. O relatório já entregue ao cliente não é alterado. Continuar?";

/** Painel "sempre visível" depois da entrega — Ver HTML/PDF/Word, rascunho em modo leitura, regenerar, reenviar, histórico de envios. */
export function RelatorioEntregue({
  intakeId,
  emailAtual,
  temHtml,
  podeRegenerar,
  rascunhoTexto,
  criadoEm,
  enviadoEm,
  envios,
  rascunhoNovo,
}: {
  intakeId: string;
  emailAtual: string | null;
  /** "Ver relatório em HTML" e "Ver Word" só fazem sentido nos pedidos com motor de geração (rascunho de texto disponível). */
  temHtml: boolean;
  /** "Regenerar rascunho" só existe nos pedidos com motor de geração (ramo trabalho-quero-mudar) — independente de já haver texto guardado. */
  podeRegenerar: boolean;
  rascunhoTexto: string | null;
  criadoEm: string | null;
  enviadoEm: string | null;
  envios: Envio[];
  /** Rascunho gerado depois da entrega (linha à parte, pdf_path ainda nulo) — ainda não enviado, para o admin rever. */
  rascunhoNovo: RascunhoNovo | null;
}) {
  const [reenviarAberto, setReenviarAberto] = useState(false);
  const [aprovarAberto, setAprovarAberto] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [erroRegenerar, setErroRegenerar] = useState<string | null>(null);
  const router = useRouter();

  async function regenerar() {
    if (!confirm(CONFIRMACAO_REGENERAR)) return;
    setRegenerando(true);
    setErroRegenerar(null);
    const res = await fetch("/api/relatorio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId }),
    });
    setRegenerando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroRegenerar(body.error ?? "Não foi possível regenerar o rascunho.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-lg border border-border p-5">
      <p className="text-sm font-bold text-navy">Relatório entregue</p>
      {(criadoEm || enviadoEm) && (
        <p className="mt-1 text-xs text-ink/50">
          {criadoEm && `Gerado em ${formatarDataHora(criadoEm)}`}
          {criadoEm && enviadoEm && " · "}
          {enviadoEm && `Enviado em ${formatarDataHora(enviadoEm)}`}
        </p>
      )}

      {rascunhoNovo && (
        <p className="mt-3 text-xs text-ink/50">&quot;Ver relatório em HTML&quot;/&quot;Ver PDF&quot;/&quot;Ver Word&quot; mostram já o rascunho novo abaixo — não o que foi realmente entregue ao cliente.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {temHtml && (
          <a
            href={`/admin/relatorios/${intakeId}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
          >
            Ver relatório em HTML
          </a>
        )}
        <a
          href={`/api/admin/intakes/${intakeId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white"
        >
          Ver PDF
        </a>
        {temHtml && (
          <a href={`/api/admin/intakes/${intakeId}/docx`} className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white">
            Ver Word
          </a>
        )}
        {podeRegenerar && (
          <button
            type="button"
            onClick={regenerar}
            disabled={regenerando}
            className="rounded-md border border-navy px-4 py-2 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {regenerando ? "A regenerar…" : "Regenerar rascunho"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setReenviarAberto(true)}
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
        >
          Reenviar relatório
        </button>
      </div>

      {erroRegenerar && <p className="mt-3 text-sm text-red-700">{erroRegenerar}</p>}

      {rascunhoNovo && (
        <div className="mt-4 rounded-md border-2 border-amber/50 bg-amber/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-dark">Novo rascunho — ainda não enviado, gerado em {formatarDataHora(rascunhoNovo.criadoEm)}</p>
          <p className="mt-1 text-xs text-ink/60">O relatório já entregue (abaixo) continua inalterado até aprovares este.</p>
          <button
            type="button"
            onClick={() => setAprovarAberto(true)}
            className="mt-3 rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
          >
            Aprovar e reenviar com este rascunho
          </button>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-white p-4 font-mono text-sm leading-relaxed text-ink">{rascunhoNovo.texto}</pre>
        </div>
      )}

      {rascunhoTexto && (
        <div className="mt-4">
          <p className="rotulo-pequeno mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">Rascunho entregue (modo leitura)</p>
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-4 font-mono text-sm leading-relaxed text-ink">{rascunhoTexto}</pre>
        </div>
      )}

      {envios.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">Histórico de envios</p>
          <ul className="space-y-1 text-sm text-ink/70">
            {envios.map((e, i) => (
              <li key={i}>
                {e.tipo === "inicial" ? "Enviado" : "Reenviado"} para {e.email} em {formatarDataHora(e.enviadoEm)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reenviarAberto && (
        <EnvioModal
          intakeId={intakeId}
          endpoint="reenviar"
          titulo="Reenviar relatório"
          descricao="Reenvia o PDF já gerado para o email indicado — não altera o estado de entrega do pedido."
          emailInicial={emailAtual}
          onClose={() => setReenviarAberto(false)}
          onEnviado={() => router.refresh()}
        />
      )}
      {aprovarAberto && (
        <EnvioModal
          intakeId={intakeId}
          endpoint="aprovar-rascunho"
          titulo="Aprovar e reenviar"
          descricao="Gera o PDF a partir do novo rascunho e envia-o para o email indicado — a entrega anterior fica no histórico, o estado do pedido não muda."
          emailInicial={emailAtual}
          onClose={() => setAprovarAberto(false)}
          onEnviado={() => router.refresh()}
        />
      )}
    </section>
  );
}

/** Modal partilhado por "Reenviar relatório" (PDF já guardado) e "Aprovar e reenviar" (gera PDF do novo rascunho primeiro) — só muda o endpoint e o texto. */
function EnvioModal({
  intakeId,
  endpoint,
  titulo,
  descricao,
  emailInicial,
  onClose,
  onEnviado,
}: {
  intakeId: string;
  endpoint: string;
  titulo: string;
  descricao: string;
  emailInicial: string | null;
  onClose: () => void;
  onEnviado: () => void;
}) {
  const [email, setEmail] = useState(emailInicial ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    const emailFinal = email.trim();
    if (!emailFinal || !emailFinal.includes("@")) {
      setErro("Introduz um email válido.");
      return;
    }
    setLoading(true);
    setErro(null);
    const res = await fetch(`/api/admin/intakes/${intakeId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailFinal }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Não foi possível enviar.");
      return;
    }
    setEnviado(true);
    onEnviado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-navy">{titulo}</h2>
        <p className="mt-1 text-sm text-ink/60">{descricao}</p>

        {enviado ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Enviado com sucesso.</p>
        ) : (
          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-navy">Email de envio</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </label>
        )}

        {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink/60 hover:bg-fog">
            {enviado ? "Fechar" : "Cancelar"}
          </button>
          {!enviado && (
            <button
              type="button"
              onClick={enviar}
              disabled={loading}
              className="rounded-md bg-navy px-4 py-1.5 text-sm font-bold text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "A enviar…" : "Enviar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
