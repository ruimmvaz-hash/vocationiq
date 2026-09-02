"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarcarEntregueButton({ revisaoId, jaEntregue }: { revisaoId: string; jaEntregue: boolean }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  if (jaEntregue) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">Entregue</span>;
  }

  async function marcar() {
    setLoading(true);
    setErro(null);
    const res = await fetch(`/api/admin/revisoes/${revisaoId}/deliver`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? "Não foi possível marcar como entregue.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={marcar}
        disabled={loading}
        className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A marcar…" : "Marcar como entregue"}
      </button>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
