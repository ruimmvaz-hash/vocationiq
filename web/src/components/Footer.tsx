import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-fog">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-navy">vocationiq.app</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/#faq" className="hover:text-navy">
            FAQ
          </Link>
          <a href="mailto:hello@vocationiq.app" className="hover:text-navy">
            Contacto
          </a>
          <Link href="/legal/terms" className="hover:text-navy">
            Termos
          </Link>
          <Link href="/legal/privacy" className="hover:text-navy">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
