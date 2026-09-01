"use client";

import { useEffect, useState } from "react";
import { SITUACOES } from "@/lib/validation";
import { logFunnelEvent } from "@/lib/eventLog";

export function IntakeForm() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    logFunnelEvent("intake_started");
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      nome: String(form.get("nome") || ""),
      dataNascimento: String(form.get("dataNascimento") || ""),
      horaNascimento: String(form.get("horaNascimento") || ""),
      localNascimento: String(form.get("localNascimento") || ""),
      situacao: String(form.get("situacao") || ""),
      contexto: String(form.get("contexto") || ""),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Algo correu mal. Tenta novamente.");
        setLoading(false);
        return;
      }
      logFunnelEvent("intake_completed");
      window.location.href = data.url;
    } catch {
      setErro("Não foi possível ligar ao servidor. Tenta novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Campo label="Nome completo" required>
        <input name="nome" type="text" required className={inputClass} />
      </Campo>

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo label="Data de nascimento" required>
          <input name="dataNascimento" type="date" required className={inputClass} />
        </Campo>
        <Campo label="Hora de nascimento" hint="Opcional — melhora a análise.">
          <input name="horaNascimento" type="time" className={inputClass} />
        </Campo>
      </div>

      <Campo label="Local de nascimento" required>
        <input name="localNascimento" type="text" placeholder="Cidade, país" required className={inputClass} />
      </Campo>

      <Campo label="A tua situação actual" required>
        <select name="situacao" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Escolhe uma opção
          </option>
          {SITUACOES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="O que te trouxe aqui" hint="Opcional, sem limite de caracteres. Quanto mais partilhares, mais personalizada fica a análise.">
        <textarea name="contexto" rows={5} className={inputClass} />
      </Campo>

      {erro && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-amber px-6 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A preparar o pagamento…" : "Continuar para o pagamento — €99"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-paper px-4 py-2.5 text-ink placeholder:text-ink/40 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";

function Campo({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {!required && <span className="ml-1 font-normal text-ink/50">(opcional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/55">{hint}</span>}
    </label>
  );
}
