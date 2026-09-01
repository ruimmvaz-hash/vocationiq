// Wrappers finos sobre o SDK do Microsoft Clarity — nunca lançam, nunca
// bloqueiam a app se o projecto não estiver configurado. Mesmo padrão da
// Naveya (lib/clarity.ts).

export function clarityIdentify(email: string, name?: string): void {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) return;
  try {
    import("@microsoft/clarity").then((Clarity) => Clarity.default.identify(email, undefined, undefined, name));
  } catch {
    // silencioso — tracking nunca pode partir a app
  }
}

export function clarityTag(key: string, value: string): void {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) return;
  try {
    import("@microsoft/clarity").then((Clarity) => Clarity.default.setTag(key, value));
  } catch {
    // silencioso
  }
}
