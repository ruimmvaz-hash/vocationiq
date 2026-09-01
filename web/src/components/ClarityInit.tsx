"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ClarityInit() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (pathname?.startsWith("/admin")) return;
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) return;
    import("@microsoft/clarity").then((Clarity) => Clarity.default.init(projectId));
    initialized.current = true;
  }, [pathname]);

  return null;
}
