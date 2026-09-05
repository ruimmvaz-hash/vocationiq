"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarcarEntregueButton } from "./MarcarEntregueButton";

interface Envio {
  email: string;
  tipo: "inicial" | "reenvio";
  enviadoEm: string;
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Secção 6 — "Entrega". Três casos, cada um com uma rota diferente por
 * trás (nunca confundir): (1) ainda não entregue, com rascunho pronto →
 * "Aprovar e enviar" (entregar-automatico, gera o PDF do rascunho e
 * marca entregue); (2) ainda não entregue, sem rascunho (ramos sem motor
 * ou draft por gerar) → upload manual do PDF (entregar); (3) já
 * entregue → "Reenviar" (reenvia o PDF já enviado, /reenviar) e, se
 * houver um rascunho novo pós-entrega, também "Aprovar e reenviar com
 * este rascunho" (aprovar-rascunho, gera um PDF novo, NUNCA mexe em
 * report_status/delivered_at porque o pedido já estava entregue).
 */
export function SeccaoEntrega({
  intakeId,
  emailAtual,
  jaEntregue,
  podeGerarAutomatico,
  temRascunhoParaAprovar,
  temRascunhoNovoPosEntrega,
  enviadoEm,
  envios,
}: {
  intakeId: string;
  emailAtual: string | null;
  jaEntregue: boolean;
  podeGerarAutomatico: boolean;
  temRascunhoParaAprovar: boolean;
  temRascunhoNovoPosEntrega: boolean;
  enviadoEm: string | null;
  envios: Envio[];
}) {
  const [reenviarAberto, setReenviarAberto] = useState(false);
  const [aprovarAberto, setAprovarAberto] = useState(false);
  const router = useRouter();

  return (
    <div>
      {enviadoEm && <p className="text-xs text-ink/50">Enviado em {formatarDataHora(enviadoEm)}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {!jaEntregue &&
          (podeGerarAutomatico && temRascunhoParaAprovar ? (
            <MarcarEntregueButton intakeId={intakeId} jaEntregue={false} label="Aprovar e enviar" emailAtual={emailAtual} autoGerarPdf />
          ) : (
            <MarcarEntregueButton intakeId={intakeId} jaEntregue={false} emailAtual={emailAtual} />
          ))}

        {jaEntregue && (
          <button type="button" onClick={() => setReenviarAberto(true)} className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark">
            Reenviar relatório
          </button>
        )}
        {jaEntregue && temRascunhoNovoPosEntrega && (
          <button type="button" onClick={() => setAprovarAberto(true)} className="rounded-md border-2 border-amber bg-amber/10 px-4 py-2 text-sm font-bold text-navy transition hover:bg-amber/20">
            Aprovar e reenviar com este rascunho
          </button>
        )}
      </div>

      {envios.length > 0 && (
        <div className="mt-5">
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
    </div>
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
