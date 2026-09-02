"use client";

import { useState } from "react";
import { SITUACAO_TESTEMUNHO } from "@/lib/testemunhoTypes";
import { Estrelas } from "@/components/Estrelas";

export function AvaliacaoForm({ intakeId, notaInicial }: { intakeId: string; notaInicial: number }) {
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!autoriza) {
      setErro("É preciso autorizar a publicação para enviar a avaliação.");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/avaliacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId, nota: notaInicial, texto, nome, situacao, autorizaPublicacao: autoriza }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível enviar a tua avaliação. Tenta novamente.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="text-center">
        <p className="text-2xl font-extrabold tracking-tight text-navy">A tua avaliação foi recebida.</p>
        <p className="mt-3 text-ink/70">Obrigado por ajudares outros a encontrar o seu caminho.</p>

        <div className="mt-10 rounded-lg border border-border bg-fog p-6">
          <p className="font-semibold text-navy">Conheces alguém que precisava disto?</p>
          <p className="mt-1 text-sm text-ink/70">Partilha o VocationIQ.</p>
          <a
            href="https://vocationiq.app"
            className="mt-4 inline-block rounded-md bg-navy px-6 py-3 text-sm font-bold text-white transition hover:bg-navy-dark"
          >
            vocationiq.app
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg font-extrabold tracking-tight text-navy">Obrigado pela tua avaliação!</p>
      <Estrelas nota={notaInicial} className="mt-3 block text-3xl" />

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Campo label="Queres partilhar a tua experiência?" hint="Opcional.">
          <textarea
            placeholder="O que sentiste, o que te surpreendeu, o que mudou depois de leres..."
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy">Como te podemos identificar?</p>
          <div className="space-y-4">
            <Campo label="Nome" required>
              <input type="text" placeholder="Primeiro nome" value={nome} onChange={(e) => setNome(e.target.value)} required className={inputClass} />
            </Campo>
            <Campo label="Situação" required>
              <select value={situacao} onChange={(e) => setSituacao(e.target.value)} required className={inputClass}>
                <option value="" disabled>
                  Escolhe uma opção
                </option>
                {SITUACAO_TESTEMUNHO.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-ink/80">
          <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} className="mt-0.5" required />
          Autorizo o VocationIQ a publicar a minha avaliação no site e nas redes sociais com o meu primeiro nome.
        </label>

        {erro && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber px-6 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "A enviar…" : "Enviar avaliação"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-paper px-4 py-2.5 text-ink placeholder:text-ink/40 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";

function Campo({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {!required && !hint && <span className="ml-1 font-normal text-ink/50">(opcional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/55">{hint}</span>}
    </label>
  );
}
