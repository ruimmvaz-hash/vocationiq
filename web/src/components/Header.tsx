import Link from "next/link";
import { TrackedCtaLink } from "./TrackedCtaLink";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="leading-tight">
          <span className="block text-lg font-extrabold tracking-tight text-navy">
            Vocation<span className="text-amber-dark">IQ</span>
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.15em] text-amber">
            Descobre a tua área. Antes de escolheres.
          </span>
        </Link>
        <TrackedCtaLink
          href="/intake"
          location="header"
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
        >
          Começar
        </TrackedCtaLink>
      </div>
    </header>
  );
}
