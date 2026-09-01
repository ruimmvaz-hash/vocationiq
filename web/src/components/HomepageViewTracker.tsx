"use client";

import { useEffect } from "react";
import { logFunnelEvent } from "@/lib/eventLog";

export function HomepageViewTracker() {
  useEffect(() => {
    logFunnelEvent("homepage_view");
  }, []);
  return null;
}
