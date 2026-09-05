"use client";

import { useState, type ReactNode } from "react";

/** Secção expansível para /admin/relatorios/[id] — header navy/texto branco com chevron, conteúdo em cinza claro. `children` pode ser conteúdo server-rendered (RSC) passado através da fronteira de client component. */
export function AccordionSection({
  titulo,
  subtitulo,
  defaultOpen = false,
  badge,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(defaultOpen);

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-navy px-5 py-3.5 text-left transition hover:bg-navy-dark"
      >
        <span className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{titulo}</span>
          {subtitulo && <span className="text-xs text-white/60">{subtitulo}</span>}
          {badge}
        </span>
        <span className="text-white/80" aria-hidden>
          {aberto ? "▲" : "▼"}
        </span>
      </button>
      {aberto && <div className="bg-paper p-5">{children}</div>}
    </section>
  );
}
