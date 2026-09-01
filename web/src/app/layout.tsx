import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VocationIQ — Descobre onde realmente rendes",
  description: "Uma análise personalizada que te ajuda a perceber os teus talentos naturais, a tua forma de aprender e as áreas onde podes crescer mais. €99 · Entrega em 48h.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
