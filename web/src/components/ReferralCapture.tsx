"use client";

import { useEffect } from "react";

const COOKIE_NAME = "viq_ref";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

/**
 * Captura ?ref=CODIGO da URL (link de um comercial) e guarda num cookie de
 * 30 dias — lido directamente pelo servidor em /api/checkout via
 * cookies(), sem precisar de o cliente o reenviar no corpo do pedido.
 * Adaptação deliberada do mecanismo da Naveya (sessionStorage, sem TTL,
 * preso ao wizard de intake) — o VocationIQ tem um formulário de página
 * única, não um wizard multi-passo, por isso um cookie é mais simples e
 * sobrevive a fechar/reabrir o separador.
 */
export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; max-age=${MAX_AGE_SECONDS}; path=/; samesite=lax`;
  }, []);

  return null;
}
