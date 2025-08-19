import { Suspense } from "react";
import UnsubscribePageClient from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disiscrizione Newsletter",
  description:
    "Disiscrizione dalla newsletter di MaturaMate. Gestisci le tue preferenze email e annulla l'iscrizione alle comunicazioni che non desideri più ricevere.",
  keywords: [
    "disiscrizione",
    "unsubscribe",
    "newsletter",
    "gestione email",
    "preferenze comunicazioni",
  ],
  openGraph: {
    title: "Disiscrizione Newsletter | MaturaMate",
    description:
      "Gestisci le tue preferenze email e disiscrizione dalla newsletter MaturaMate.",
    url: "/unsubscribe",
  },
  twitter: {
    title: "Disiscrizione Newsletter | MaturaMate",
    description:
      "Gestisci le preferenze email per le comunicazioni MaturaMate.",
  },
  alternates: {
    canonical: "/unsubscribe",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center text-center">
          <p className="text-gray-600">Caricamento in corso...</p>
        </main>
      }
    >
      <UnsubscribePageClient />
    </Suspense>
  );
}
