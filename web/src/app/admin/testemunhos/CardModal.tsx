"use client";

import { useRef, useState } from "react";
import { SITUACAO_TESTEMUNHO, type Testemunho } from "@/lib/testemunhoTypes";

const SITUACAO_LABEL = Object.fromEntries(SITUACAO_TESTEMUNHO.map((s) => [s.valor, s.label]));

const TEXTO_MAX_CARD = 150;

function textoParaCard(texto: string): string {
  return texto.length > TEXTO_MAX_CARD ? `${texto.slice(0, TEXTO_MAX_CARD - 1)}…` : texto;
}

function textoParaPartilha(t: Testemunho): string {
  const estrelas = "⭐".repeat(t.nota ?? 0);
  return `${estrelas}\n"${t.texto}"\n— ${t.nome}, ${SITUACAO_LABEL[t.situacao] ?? t.situacao}\nvocationiq.app`;
}

export function CardModal({ testemunho, onClose }: { testemunho: Testemunho; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(textoParaPartilha(testemunho));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar — copia manualmente.");
    }
  }

  async function descarregarCard() {
    if (!cardRef.current) return;
    setGerando(true);
    setErro(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { width: 1080, height: 1080, pixelRatio: 1 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vocationiq-testemunho-${testemunho.id}.png`;
      a.click();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível gerar o card.");
    } finally {
      setGerando(false);
    }
  }

  const estrelas = "★".repeat(testemunho.nota ?? 0) + "☆".repeat(5 - (testemunho.nota ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-paper p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-navy">Card para redes sociais</h2>

        {/* Pré-visualização à escala — o node capturado (cardRef) está sempre a 1080x1080 reais, só a apresentação encolhe. */}
        <div className="mx-auto mt-4 overflow-hidden rounded-md" style={{ width: 320, height: 320 }}>
          <div style={{ width: 1080, height: 1080, transform: "scale(0.2963)", transformOrigin: "top left" }}>
            <div
              ref={cardRef}
              style={{
                width: 1080,
                height: 1080,
                background: "#1B3A6B",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "80px 90px",
                fontFamily: "Arial, Helvetica, sans-serif",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: 52, fontWeight: 700, color: "#FFFFFF" }}>
                Vocation<span style={{ color: "#F5A623" }}>IQ</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
                <div style={{ fontSize: 56, color: "#F5A623", letterSpacing: 8 }}>{estrelas}</div>
                <div style={{ fontSize: 44, lineHeight: 1.4, color: "#FFFFFF", textAlign: "center" }}>
                  &ldquo;{textoParaCard(testemunho.texto)}&rdquo;
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#F5A623", textAlign: "center" }}>
                  {testemunho.nome}, {SITUACAO_LABEL[testemunho.situacao] ?? testemunho.situacao}
                </div>
                <div style={{ fontSize: 28, color: "#FFFFFF" }}>vocationiq.app</div>
              </div>
            </div>
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={copiarTexto} className="rounded-md border border-navy px-3 py-1.5 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white">
            {copiado ? "Copiado!" : "Copiar texto"}
          </button>
          <button
            onClick={descarregarCard}
            disabled={gerando}
            className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {gerando ? "A gerar…" : "Download card"}
          </button>
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink/60 hover:bg-fog">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
