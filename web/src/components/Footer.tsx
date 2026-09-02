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
          {/* Sem contas Instagram/TikTok próprias ainda — por isso os
              ícones não têm link real (nenhum href), só o glifo com
              title="Em breve". Assim que as contas existirem, troca o
              <span> por <a href="https://instagram.com/..."> etc. */}
          <div className="mt-4 flex gap-3">
            <span title="Instagram — em breve" className="text-ink/30">
              <IconInstagram className="h-5 w-5" />
            </span>
            <span title="TikTok — em breve" className="text-ink/30">
              <IconTikTok className="h-5 w-5" />
            </span>
          </div>
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

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v10.5a3.2 3.2 0 1 1-3.2-3.2c.4 0 .8.06 1.2.18" />
      <path d="M14 3c.3 2.4 2 4.2 4.4 4.4" />
    </svg>
  );
}
