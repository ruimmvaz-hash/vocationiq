export type FunnelEvent = "homepage_view" | "cta_click" | "intake_started" | "intake_completed" | "payment_completed" | "report_delivered";

export const FUNNEL_STEPS: FunnelEvent[] = ["homepage_view", "cta_click", "intake_started", "intake_completed", "payment_completed", "report_delivered"];

/** Emissor do lado do browser — fetch solto, nunca bloqueia navegação. */
export function logFunnelEvent(event: FunnelEvent, metadata?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  }).catch(() => {});
}
