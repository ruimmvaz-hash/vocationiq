"use client";

import Link from "next/link";
import { logFunnelEvent } from "@/lib/eventLog";

export function TrackedCtaLink({ href, location, className, children }: { href: string; location: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => logFunnelEvent("cta_click", { location })}>
      {children}
    </Link>
  );
}
