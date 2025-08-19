import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/shared/theme/themeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CookieConsent } from "./components/auth/cookie-consent";
import { AuthProvider } from "./components/auth/auth-provider";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://maturamate.it"),
  title: {
    template: "%s | MaturaMate",
    default: "MaturaMate - Preparazione Maturità Matematica Online",
  },
  description:
    "Piattaforma online per la preparazione alla maturità scientifica. Teoria completa, simulazioni d'esame, esercizi interattivi e tracce svolte per matematica e fisica.",
  keywords: [
    "maturità",
    "matematica",
    "fisica",
    "scientifico",
    "preparazione esame",
    "simulazioni maturità",
    "tracce svolte",
    "teoria matematica",
    "esercizi matematica",
    "analisi matematica",
    "limiti",
    "derivate",
    "integrali",
    "studio di funzione",
    "geometria analitica",
    "trigonometria",
    "educazione online",
    "e-learning",
    "ripetizioni matematica",
  ],
  authors: [{ name: "MaturaMate Team" }],
  creator: "MaturaMate",
  publisher: "MaturaMate",
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
    url: "https://maturamate.it",
    siteName: "MaturaMate",
    title: "MaturaMate - Preparazione Maturità Matematica Online",
    description:
      "Piattaforma online per la preparazione alla maturità scientifica. Teoria completa, simulazioni d'esame, esercizi interattivi e tracce svolte.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "MaturaMate - Preparazione Maturità Matematica Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MaturaMate - Preparazione Maturità Matematica Online",
    description:
      "Piattaforma online per la preparazione alla maturità scientifica. Teoria completa, simulazioni d'esame, esercizi interattivi.",
    images: ["/opengraph-image.png"],
    creator: "@maturamate",
    site: "@maturamate",
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "education",
  classification: "Educational Platform",
  appleWebApp: {
    title: "MaturaMate",
    statusBarStyle: "default",
    capable: true,
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "https://maturamate.it",
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
        </ThemeProvider>
        <SpeedInsights debug={process.env.NODE_ENV === "development"} />
        <Analytics />
      </body>
    </html>
  );
}
