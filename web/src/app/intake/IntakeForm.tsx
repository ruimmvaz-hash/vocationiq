"use client";

import { useEffect, useState } from "react";
import { SITUACOES, CLAREZA_IDEIA, AREAS_CONSIDERADAS, SATISFACAO_CURSO, ANOS_EXPERIENCIA, type Situacao, type AreaConsiderada } from "@/lib/validation";
import { logFunnelEvent } from "@/lib/eventLog";

interface FormState {
  nome: string;
  dataNascimento: string;
  horaNascimento: string;
  localNascimento: string;

  situacao: Situacao | "";

  clarezaIdeia: string;
  areasConsideradas: AreaConsiderada[];
  areasConsideradasOutra: string;
  preferenciaFamilia: string;

  cursoActual: string;
  satisfacaoCurso: string;

  areaTrabalhoActual: string;
  anosExperiencia: string;
  oQueNaoFunciona: string;

  paraOndeQuerIr: string;
  descricaoSituacao: string;

  contextoAdicional: string;
  perguntaEspecifica: string;
}

const ESTADO_INICIAL: FormState = {
  nome: "",
  dataNascimento: "",
  horaNascimento: "",
  localNascimento: "",
  situacao: "",
  clarezaIdeia: "",
  areasConsideradas: [],
  areasConsideradasOutra: "",
  preferenciaFamilia: "",
  cursoActual: "",
  satisfacaoCurso: "",
  areaTrabalhoActual: "",
  anosExperiencia: "",
  oQueNaoFunciona: "",
  paraOndeQuerIr: "",
  descricaoSituacao: "",
  contextoAdicional: "",
  perguntaEspecifica: "",
};

function passo2Valido(f: FormState): boolean {
  if (!f.situacao) return false;
  if (f.situacao === "9-ou-menos" || f.situacao === "10-11-12") return !!f.clarezaIdeia;
  if (f.situacao === "universidade") return !!f.cursoActual.trim() && !!f.satisfacaoCurso;
  if (f.situacao === "trabalho-quero-mudar") return !!f.areaTrabalhoActual.trim() && !!f.anosExperiencia;
  if (f.situacao === "outra") return !!f.descricaoSituacao.trim();
  return false;
}

export function IntakeForm() {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState<FormState>(ESTADO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    logFunnelEvent("intake_started");
  }, []);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setF((prev) => ({ ...prev, [campo]: valor }));
  }

  function toggleArea(area: AreaConsiderada) {
    setF((prev) => ({
      ...prev,
      areasConsideradas: prev.areasConsideradas.includes(area) ? prev.areasConsideradas.filter((a) => a !== area) : [...prev.areasConsideradas, area],
    }));
  }

  const passo1Valido = !!f.nome.trim() && !!f.dataNascimento && !!f.localNascimento.trim();

  function avancar() {
    setErro(null);
    if (passo === 1) {
      if (!passo1Valido) {
        setErro("Preenche o nome, a data e o local de nascimento.");
        return;
      }
      setPasso(2);
      return;
    }
    if (passo === 2) {
      if (!passo2Valido(f)) {
        setErro("Falta responder a alguma pergunta desta secção.");
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
    setLoading(true);

    const body = {
      nome: f.nome,
      dataNascimento: f.dataNascimento,
      horaNascimento: f.horaNascimento,
      localNascimento: f.localNascimento,
      situacao: f.situacao,
      clarezaIdeia: f.clarezaIdeia,
      areasConsideradas: f.areasConsideradas,
      areasConsideradasOutra: f.areasConsideradasOutra,
      preferenciaFamilia: f.preferenciaFamilia,
      cursoActual: f.cursoActual,
      satisfacaoCurso: f.satisfacaoCurso,
      areaTrabalhoActual: f.areaTrabalhoActual,
      anosExperiencia: f.anosExperiencia,
      oQueNaoFunciona: f.oQueNaoFunciona,
      paraOndeQuerIr: f.paraOndeQuerIr,
      descricaoSituacao: f.descricaoSituacao,
      contextoAdicional: f.contextoAdicional,
      perguntaEspecifica: f.perguntaEspecifica,
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
    <div>
      <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-ink/50">Passo {passo} de 3</p>

      {passo === 1 && (
        <div className="space-y-6">
          <Campo label="Nome completo" required>
            <input type="text" value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} />
          </Campo>
          <div className="grid gap-6 sm:grid-cols-2">
            <Campo label="Data de nascimento" required>
              <input type="date" value={f.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Hora de nascimento" hint="Se não sabes a hora exacta, deixa em branco. A análise fica mais precisa com a hora.">
              <input type="time" value={f.horaNascimento} onChange={(e) => set("horaNascimento", e.target.value)} className={inputClass} />
            </Campo>
          </div>
          <Campo label="Local de nascimento" required>
            <input type="text" placeholder="Cidade, país" value={f.localNascimento} onChange={(e) => set("localNascimento", e.target.value)} className={inputClass} />
          </Campo>

          {erro && <ErroMsg>{erro}</ErroMsg>}
          <BotaoContinuar onClick={avancar} texto="Continuar →" />
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-6">
          <Campo label="Qual é a tua situação?" required>
            <select value={f.situacao} onChange={(e) => set("situacao", e.target.value as Situacao)} className={inputClass}>
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

          {(f.situacao === "9-ou-menos" || f.situacao === "10-11-12") && (
            <>
              <Campo label="Já tens alguma ideia do que queres seguir?" required>
                <select value={f.clarezaIdeia} onChange={(e) => set("clarezaIdeia", e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Escolhe uma opção
                  </option>
                  {CLAREZA_IDEIA.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Que áreas estás a considerar?">
                <div className="grid gap-2 sm:grid-cols-2">
                  {AREAS_CONSIDERADAS.map((a) => (
                    <label key={a.valor} className="flex items-center gap-2 text-sm text-ink/85">
                      <input type="checkbox" checked={f.areasConsideradas.includes(a.valor)} onChange={() => toggleArea(a.valor)} />
                      {a.label}
                    </label>
                  ))}
                </div>
                {f.areasConsideradas.includes("outra") && (
                  <input
                    type="text"
                    placeholder="Qual?"
                    value={f.areasConsideradasOutra}
                    onChange={(e) => set("areasConsideradasOutra", e.target.value)}
                    className={`${inputClass} mt-2`}
                  />
                )}
              </Campo>

              <Campo label="Os teus pais ou família têm preferência por alguma área?" hint="Opcional.">
                <textarea
                  placeholder="Ex: a minha mãe quer que eu siga medicina mas eu não sei..."
                  rows={3}
                  value={f.preferenciaFamilia}
                  onChange={(e) => set("preferenciaFamilia", e.target.value)}
                  className={inputClass}
                />
              </Campo>
            </>
          )}

          {f.situacao === "universidade" && (
            <>
              <Campo label="Que curso estás a fazer?" required>
                <input type="text" value={f.cursoActual} onChange={(e) => set("cursoActual", e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Como te sentes em relação ao teu curso actual?" required>
                <select value={f.satisfacaoCurso} onChange={(e) => set("satisfacaoCurso", e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Escolhe uma opção
                  </option>
                  {SATISFACAO_CURSO.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Se estás a pensar mudar, para onde?" hint="Opcional.">
                <textarea
                  placeholder="Ex: estou em gestão mas estou a pensar mudar para psicologia..."
                  rows={3}
                  value={f.paraOndeQuerIr}
                  onChange={(e) => set("paraOndeQuerIr", e.target.value)}
                  className={inputClass}
                />
              </Campo>
            </>
          )}

          {f.situacao === "trabalho-quero-mudar" && (
            <>
              <Campo label="Em que área trabalhas actualmente?" required>
                <input type="text" value={f.areaTrabalhoActual} onChange={(e) => set("areaTrabalhoActual", e.target.value)} className={inputClass} />
              </Campo>
              <Campo label="Há quanto tempo?" required>
                <select value={f.anosExperiencia} onChange={(e) => set("anosExperiencia", e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Escolhe uma opção
                  </option>
                  {ANOS_EXPERIENCIA.map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="O que não está a funcionar?" hint="Opcional.">
                <textarea
                  placeholder="Ex: sinto que estou no sítio errado, não me realizo..."
                  rows={3}
                  value={f.oQueNaoFunciona}
                  onChange={(e) => set("oQueNaoFunciona", e.target.value)}
                  className={inputClass}
                />
              </Campo>
              <Campo label="Para onde queres ir?" hint="Opcional.">
                <textarea
                  placeholder="Ex: quero trabalhar com pessoas, ou mudar para tecnologia..."
                  rows={3}
                  value={f.paraOndeQuerIr}
                  onChange={(e) => set("paraOndeQuerIr", e.target.value)}
                  className={inputClass}
                />
              </Campo>
            </>
          )}

          {f.situacao === "outra" && (
            <Campo label="Descreve a tua situação" required>
              <textarea rows={3} value={f.descricaoSituacao} onChange={(e) => set("descricaoSituacao", e.target.value)} className={inputClass} />
            </Campo>
          )}

          {erro && <ErroMsg>{erro}</ErroMsg>}
          <div className="flex items-center gap-4">
            <button type="button" onClick={voltar} className="text-sm font-semibold text-ink/60 hover:text-navy">
              ← Voltar
            </button>
            <BotaoContinuar onClick={avancar} texto="Continuar →" />
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-6">
          <Campo label="O que te trouxe aqui?">
            <textarea
              placeholder="Escreve à vontade — não há respostas certas ou erradas. Quanto mais partilhares, mais personalizada fica a tua análise."
              rows={5}
              value={f.contextoAdicional}
              onChange={(e) => set("contextoAdicional", e.target.value)}
              className={inputClass}
            />
          </Campo>
          <Campo label="Há alguma pergunta específica que queres que o relatório responda?" hint="Opcional.">
            <textarea
              placeholder="Ex: devo escolher medicina ou engenharia? Tenho jeito para artes mas não sei se dá para viver disso..."
              rows={3}
              value={f.perguntaEspecifica}
              onChange={(e) => set("perguntaEspecifica", e.target.value)}
              className={inputClass}
            />
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
          <p className="text-center text-sm font-semibold text-ink/60">Análise VocationIQ · €99 · 48h</p>
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

function BotaoContinuar({ onClick, texto }: { onClick: () => void; texto: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md bg-amber px-6 py-3.5 text-base font-bold text-navy-dark shadow-sm transition hover:bg-amber-dark"
    >
      {texto}
    </button>
  );
}
