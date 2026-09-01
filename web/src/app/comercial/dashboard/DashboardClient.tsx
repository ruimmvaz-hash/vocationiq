"use client";

import { useEffect, useState } from "react";

interface ComercialMe {
  name: string;
  code: string;
  link: string;
  status: string;
  total_sales: number;
  total_revenue_generated: number;
  commissionDue: number;
  total_commission_paid: number;
  payout_requested_at: string | null;
}

export function DashboardClient() {
  const [dados, setDados] = useState<ComercialMe | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/comercial/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setDados)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p className="text-sm text-ink/60">A carregar…</p>;
  if (!dados) return <p className="text-sm text-red-700">Não foi possível carregar o teu painel.</p>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Olá, {dados.name}</h1>

      {dados.status !== "active" && (
        <p className="mt-3 rounded-md bg-amber/20 px-4 py-3 text-sm text-amber-dark">
          O teu registo está <strong>{dados.status === "pending" ? "pendente de aprovação" : dados.status}</strong> — o teu link só gera comissão depois de activado.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-border p-5">
        <p className="text-sm font-semibold text-ink/60">O teu link</p>
        <p className="mt-1 break-all rounded bg-fog px-3 py-2 font-mono text-sm text-navy">{dados.link}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Vendas" valor={String(dados.total_sales)} />
        <Card label="Receita gerada" valor={`€${Number(dados.total_revenue_generated).toFixed(2)}`} />
        <Card label="Comissão por receber" valor={`€${dados.commissionDue.toFixed(2)}`} />
      </div>

      {dados.commissionDue > 0 && <PayoutRequest jaEmCurso={!!dados.payout_requested_at} />}
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-sm font-semibold text-ink/60">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-navy">{valor}</p>
    </div>
  );
}

function PayoutRequest({ jaEmCurso }: { jaEmCurso: boolean }) {
  const [taxId, setTaxId] = useState("");
  const [taxCountry, setTaxCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(jaEmCurso);

  if (ok) {
    return <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Pedido de pagamento em curso — o fundador vai processá-lo.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/comercial/payout-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxId, taxCountry }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível pedir o pagamento.");
      return;
    }
    setOk(true);
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3 rounded-lg border border-border p-5">
      <p className="text-sm font-semibold text-navy">Pedir pagamento</p>
      <input
        type="text"
        placeholder="Id. fiscal (NIF, CPF…)"
        value={taxId}
        onChange={(e) => setTaxId(e.target.value)}
        required
        className="rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />
      <input
        type="text"
        placeholder="País (código ISO, ex.: PT)"
        value={taxCountry}
        onChange={(e) => setTaxCountry(e.target.value.toUpperCase())}
        maxLength={2}
        required
        className="rounded-md border border-border px-3 py-2 text-sm uppercase focus:border-navy focus:outline-none"
      />
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-amber px-4 py-2 text-sm font-bold text-navy-dark transition hover:bg-amber-dark disabled:opacity-60"
      >
        {loading ? "A enviar…" : "Pedir pagamento"}
      </button>
    </form>
  );
}
