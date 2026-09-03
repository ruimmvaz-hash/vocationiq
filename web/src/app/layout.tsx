import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ClarityInit } from "@/components/ClarityInit";
import { InstallBanner } from "@/components/InstallBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VocationIQ — Descobre a tua área. Antes de escolheres.",
  description: "Uma análise personalizada que descobre os teus talentos naturais, como aprendes e as áreas onde podes crescer mais — para adolescentes, jovens e adultos em transição de carreira. €99 · Entrega em 48h.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app"),
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "VocationIQ" },
};

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} antialiased`}>
        <ReferralCapture />
        <ClarityInit />
        {children}
        <InstallBanner />
        <Analytics />
      </body>
    </html>
  );
}
