import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-navy">
          Vocation<span className="text-amber-dark">IQ</span>
        </Link>
        <Link
          href="/intake"
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
        >
          Começar
        </Link>
      </div>
    </header>
  );
}
