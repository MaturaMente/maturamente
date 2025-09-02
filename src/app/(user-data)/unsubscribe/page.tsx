import { Suspense } from "react";
import UnsubscribePageClient from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disiscrizione Newsletter",
  description:
    "Disiscrizione dalla newsletter di MaturaMente. Gestisci le tue preferenze email e annulla l'iscrizione alle comunicazioni che non desideri più ricevere.",
  keywords: [
    "disiscrizione",
    "unsubscribe",
    "newsletter",
    "gestione email",
    "preferenze comunicazioni",
  ],
  openGraph: {
    title: "Disiscrizione Newsletter | MaturaMente",
    description:
      "Gestisci le tue preferenze email e disiscrizione dalla newsletter MaturaMente.",
    url: "/unsubscribe",
  },
  twitter: {
    title: "Disiscrizione Newsletter | MaturaMente",
    description:
      "Gestisci le preferenze email per le comunicazioni MaturaMente.",
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
