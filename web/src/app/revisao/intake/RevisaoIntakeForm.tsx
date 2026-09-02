"use client";

import { useState } from "react";
import { SEGUIU_DIRECAO, SITUACAO_MUDOU, SENTIMENTO_LABELS } from "@/lib/revisaoValidation";

interface FormState {
  seguiuDirecao: string;
  oQueCorreuBem: string;
  oQueNaoCorreu: string;
  duvidaActual: string;
  sentimentoCaminho: number | null;
  questaoRelatorio: string;
  situacaoMudou: string;
  decisaoConcreta: string;
}

const ESTADO_INICIAL: FormState = {
  seguiuDirecao: "",
  oQueCorreuBem: "",
  oQueNaoCorreu: "",
  duvidaActual: "",
  sentimentoCaminho: null,
  questaoRelatorio: "",
  situacaoMudou: "",
  decisaoConcreta: "",
};

export function RevisaoIntakeForm({ intakeIdOriginal }: { intakeIdOriginal: string }) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState<FormState>(ESTADO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setF((prev) => ({ ...prev, [campo]: valor }));
  }

  function avancar() {
    setErro(null);
    if (passo === 1) {
      if (!f.seguiuDirecao) {
        setErro("Falta responder se seguiste alguma das direcções do relatório.");
        return;
      }
      setPasso(2);
      return;
    }
    if (passo === 2) {
      if (!f.duvidaActual.trim() || !f.sentimentoCaminho) {
        setErro("Falta a tua dúvida principal e como te sentes em relação ao teu caminho.");
        return;
      }
      setPasso(3);
    }
  }

  function voltar() {
    setErro(null);
    setPasso((p) => (p === 3 ? 2 : 1));
  }

  async function submeter() {
    setErro(null);
    if (!f.situacaoMudou) {
      setErro("Falta responder se a tua situação mudou.");
      return;
    }
    setLoading(true);

    const body = {
      intakeIdOriginal,
      seguiuDirecao: f.seguiuDirecao,
      oQueCorreuBem: f.oQueCorreuBem,
      oQueNaoCorreu: f.oQueNaoCorreu,
      duvidaActual: f.duvidaActual,
      sentimentoCaminho: f.sentimentoCaminho,
      questaoRelatorio: f.questaoRelatorio,
      situacaoMudou: f.situacaoMudou,
      decisaoConcreta: f.decisaoConcreta,
    };

    try {
      const res = await fetch("/api/revisao/checkout", {
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
      window.location.href = data.url;
    } catch {
      setErro("Não foi possível ligar ao servidor. Tenta novamente.");
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-ink/50">Passo {passo} de 3</p>

      {passo === 1 && (
        <div className="space-y-6">
          <Campo label="Seguiste alguma das direcções do teu relatório?" required>
            <select value={f.seguiuDirecao} onChange={(e) => set("seguiuDirecao", e.target.value)} className={inputClass}>
              <option value="" disabled>
                Escolhe uma opção
              </option>
              {SEGUIU_DIRECAO.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="O que está a correr bem?" hint="Opcional.">
            <textarea rows={3} value={f.oQueCorreuBem} onChange={(e) => set("oQueCorreuBem", e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="O que não está a correr como esperavas?" hint="Opcional.">
            <textarea rows={3} value={f.oQueNaoCorreu} onChange={(e) => set("oQueNaoCorreu", e.target.value)} className={inputClass} />
          </Campo>

          {erro && <ErroMsg>{erro}</ErroMsg>}
          <BotaoContinuar onClick={avancar} />
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-6">
          <Campo label="Qual é a tua dúvida principal agora?" required>
            <textarea rows={3} value={f.duvidaActual} onChange={(e) => set("duvidaActual", e.target.value)} className={inputClass} />
          </Campo>

          <Campo label="Como te sentes em relação ao teu caminho?" required>
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("sentimentoCaminho", n)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition ${
                    f.sentimentoCaminho === n ? "border-navy bg-navy text-white" : "border-border text-navy/70 hover:border-navy"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink/55">
              <span>{SENTIMENTO_LABELS[1]}</span>
              <span>{SENTIMENTO_LABELS[5]}</span>
            </div>
          </Campo>

          <Campo label="Há algo do relatório que não fez sentido ou que queres questionar?" hint="Opcional.">
            <textarea rows={3} value={f.questaoRelatorio} onChange={(e) => set("questaoRelatorio", e.target.value)} className={inputClass} />
          </Campo>

          {erro && <ErroMsg>{erro}</ErroMsg>}
          <div className="flex items-center gap-4">
            <button type="button" onClick={voltar} className="text-sm font-semibold text-ink/60 hover:text-navy">
              ← Voltar
            </button>
            <BotaoContinuar onClick={avancar} />
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-6">
          <Campo label="A tua situação mudou?" required>
            <select value={f.situacaoMudou} onChange={(e) => set("situacaoMudou", e.target.value)} className={inputClass}>
              <option value="" disabled>
                Escolhe uma opção
              </option>
              {SITUACAO_MUDOU.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tens uma decisão concreta para tomar agora?" hint="Opcional.">
            <textarea rows={3} value={f.decisaoConcreta} onChange={(e) => set("decisaoConcreta", e.target.value)} className={inputClass} />
          </Campo>

          {erro && <ErroMsg>{erro}</ErroMsg>}
          <div className="flex items-center gap-4">
            <button type="button" onClick={voltar} className="text-sm font-semibold text-ink/60 hover:text-navy">
              ← Voltar
            </button>
            <button
              type="button"
              onClick={submeter}
              disabled={loading}
              className="flex-1 rounded-md bg-amber px-6 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "A preparar o pagamento…" : "Continuar para o pagamento →"}
            </button>
          </div>
          <p className="text-center text-sm font-semibold text-ink/60">VocationIQ Revisão · €49 · 48h</p>
        </div>
      )}
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

function ErroMsg({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{children}</p>;
}

function BotaoContinuar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md bg-amber px-6 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
    >
      Continuar →
    </button>
  );
}
