import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ClarityInit } from "@/components/ClarityInit";
import { InstallBanner } from "@/components/InstallBanner";
import { ChatWidget } from "@/components/ChatWidget";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const TITULO_SITE = "VocationIQ — Descobre a tua área. Antes de escolheres.";
const DESCRICAO_SITE =
  "Uma análise personalizada que descobre os teus talentos naturais, como aprendes e as áreas onde podes crescer mais — para adolescentes, jovens e adultos em busca de nova carreira. €99 · Entrega em 72h.";

// SEO (22 Set, pedido do fundador) — Open Graph + Twitter Card, para os
// links partilhados (redes sociais, WhatsApp) mostrarem título/descrição/
// imagem em vez de um link nu. Sem imagem 1200x630 dedicada ainda — usa
// o icon-512.png como fallback (funcional, não ideal; substituir quando
// houver uma imagem OG própria).
export const metadata: Metadata = {
  title: TITULO_SITE,
  description: DESCRICAO_SITE,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app"),
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "VocationIQ" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // SEO (22 Set) — verificação de propriedade no Google Search Console
  // (método "HTML tag"). Nunca remover — perde-se a verificação.
  verification: { google: "umq3qaVWC4ifNI38yT1hgMb4Ijl1_07q00GvXk6XHXQ" },
  openGraph: {
    title: TITULO_SITE,
    description: DESCRICAO_SITE,
    url: "/",
    siteName: "VocationIQ",
    locale: "pt_PT",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "VocationIQ" }],
  },
  twitter: {
    card: "summary",
    title: TITULO_SITE,
    description: DESCRICAO_SITE,
    images: ["/icon-512.png"],
  },
};

// SEO (22 Set, pedido do fundador) — JSON-LD Organization, site-wide.
// Só factos reais (nome, url, logo, área de actuação) — nunca
// aggregateRating/review inventados, isso é penalizado pelo Google e
// contra a política de nunca fabricar dados.
const JSON_LD_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VocationIQ",
  url: "https://vocationiq.app",
  logo: "https://vocationiq.app/icon-512.png",
  description: DESCRICAO_SITE,
  areaServed: ["PT", "AO"],
};

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANIZATION) }}
        />
        <ReferralCapture />
        <ClarityInit />
        {children}
        <InstallBanner />
        <ChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
