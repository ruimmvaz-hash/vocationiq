import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-fog">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 text-sm sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold tracking-tight text-navy">
            Vocation<span className="text-amber-dark">IQ</span>
          </p>
          <p className="mt-2 text-ink/60">Descobre a tua área. Antes de escolheres.</p>
          {/* Instagram/TikTok: sem contas próprias ainda — ícones entram aqui
              assim que existirem. Um ícone sem link real fica pior do que
              nenhum ícone, por isso não se mostra nada por agora. */}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Links</p>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/" className="text-ink/70 hover:text-navy">
              Início
            </Link>
            <Link href="/#como-funciona" className="text-ink/70 hover:text-navy">
              Como funciona
            </Link>
            <Link href="/#faq" className="text-ink/70 hover:text-navy">
              FAQ
            </Link>
            <Link href="/exemplo" className="text-ink/70 hover:text-navy">
              Exemplo de relatório
            </Link>
            <a href="mailto:hello@vocationiq.app" className="text-ink/70 hover:text-navy">
              Contacto
            </a>
          </nav>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Legal</p>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/legal/terms" className="text-ink/70 hover:text-navy">
              Termos e Condições
            </Link>
            <Link href="/legal/privacy" className="text-ink/70 hover:text-navy">
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-6 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VocationIQ · Portugal</p>
          <a href="mailto:hello@vocationiq.app" className="hover:text-navy">
            hello@vocationiq.app
          </a>
        </div>
      </div>
    </footer>
  );
}
