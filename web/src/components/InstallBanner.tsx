"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Replica o padrão do PWAInstallBanner.tsx da Naveya (mobile, uma vez só via
// localStorage, 30s de atraso, escondido em /admin) — sem i18n (o VocationIQ
// é só PT) e com as cores da marca (navy/amber em vez de verde-tinta/cream).
// Acrescenta uma verificação que a Naveya não tem: só mostra se o site ainda
// não está a correr como PWA instalada (display-mode: standalone / iOS
// navigator.standalone), pedida explicitamente para este componente.
const NAVY = "#1B3A6B";
const AMBER = "#F5A623";
const STORAGE_KEY = "vocationiq_pwa_banner_dismissed";
const SHOW_DELAY_MS = 30_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Banner de instalação PWA — mobile, uma vez só (localStorage), 30s de atraso, só se ainda não instalado. */
export function InstallBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/admin")) return;
    if (!isMobileDevice()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    setIos(isIos());

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [pathname]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleInstalar() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      dismiss();
    }
    // iOS não tem beforeinstallprompt — a UI já mostra a instrução manual; não fecha sozinho.
  }

  if (!visible || pathname?.startsWith("/admin")) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: "#FFFFFF",
        borderTop: `2px solid ${NAVY}`,
        padding: "0.9rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: NAVY, fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>Instala o VocationIQ no teu telemóvel</p>
        <p style={{ color: "#1A1A1A99", fontSize: "0.75rem", margin: "2px 0 0" }}>
          {ios ? 'Toca em ↑ e depois em "Adicionar ao Ecrã Principal"' : "Acesso rápido, sem barra do browser."}
        </p>
      </div>
      {!ios && (
        <button
          onClick={handleInstalar}
          style={{ background: NAVY, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          Instalar
        </button>
      )}
      <button onClick={dismiss} style={{ background: "none", border: "none", color: AMBER, fontSize: "1.1rem", cursor: "pointer", flexShrink: 0, padding: "0.2rem 0.4rem" }}>
        ✕
      </button>
    </div>
  );
}
