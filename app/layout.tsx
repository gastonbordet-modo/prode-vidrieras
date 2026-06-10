import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { BackToTop } from "@/components/back-to-top";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const SITE_URL = "https://prode-vidrieras-reservas-m.vercel.app";
const SITE_NAME = "Prode Vidrieras";
const SITE_DESCRIPTION =
  "Prode interno del Mundial 2026 — equipo Vidrieras de Modo. Pronosticá los partidos y competí en el ranking.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Equipo Vidrieras · Modo" }],
  keywords: ["prode", "mundial 2026", "modo", "vidrieras"],
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#17002f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={hanken.variable}>
      <body>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
