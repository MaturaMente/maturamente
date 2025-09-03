import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/shared/theme/themeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CookieConsent } from "./components/auth/cookie-consent";
import { AuthProvider } from "./components/auth/auth-provider";
import { Toaster } from "sonner";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://MaturaMente.it"),
  title: {
    template: "%s | MaturaMente",
    default: "MaturaMente - Preparazione Maturità Matematica Online",
  },
  description:
    "Piattaforma educativa completa per studenti di scuole superiori. Teoria, esercizi interattivi, simulazioni e AI tutor per tutte le materie scolastiche. Dalla prima alla quinta superiore, inclusa preparazione maturità.",
  keywords: [
    "scuole superiori",
    "liceo",
    "aiuto compiti",
    "matematica",
    "fisica",
    "italiano",
    "storia",
    "filosofia",
    "scienze",
    "chimica",
    "biologia",
    "inglese",
    "maturità",
    "preparazione esame",
    "simulazioni",
    "esercizi interattivi",
    "teoria scolastica",
    "tutor AI",
    "educazione online",
    "e-learning",
    "supporto scolastico",
    "ripetizioni online",
  ],
  authors: [{ name: "MaturaMente Team" }],
  creator: "MaturaMente",
  publisher: "MaturaMente",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://MaturaMente.it",
    siteName: "MaturaMente",
    title: "MaturaMente - Preparazione Maturità Matematica Online",
    description:
      "Piattaforma educativa completa per studenti di scuole superiori. Teoria, esercizi interattivi, simulazioni e AI tutor per tutte le materie scolastiche.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "MaturaMente - Preparazione Maturità Matematica Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MaturaMente - Preparazione Maturità Matematica Online",
    description:
      "Piattaforma educativa per studenti di scuole superiori. Teoria, esercizi interattivi, simulazioni e AI tutor per tutte le materie.",
    images: ["/opengraph-image.png"],
    creator: "@MaturaMente",
    site: "@MaturaMente",
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "education",
  classification: "Educational Platform",
  appleWebApp: {
    title: "MaturaMente",
    statusBarStyle: "default",
    capable: true,
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "https://MaturaMente.it",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical external origins */}
        <link
          rel="preconnect"
          href="https://pmnothvdbyxdqaiyugpg.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://pmnothvdbyxdqaiyugpg.supabase.co"
        />
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body className={`${funnelDisplay.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <CookieConsent />
          <Toaster richColors />
        </ThemeProvider>
        <SpeedInsights debug={process.env.NODE_ENV === "development"} />
        <Analytics />
      </body>
    </html>
  );
}
