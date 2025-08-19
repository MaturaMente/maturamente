import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Generate dynamic metadata based on the subject
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}): Promise<Metadata> {
  const { "subject-slug": subjectSlug } = await params;

  return {
    title: "Modalità Carte - Simulazioni",
    description:
      "Simulazioni maturità in modalità carte interattive. Un modo innovativo e coinvolgente per esercitarti con le tracce di matematica e fisica per la maturità scientifica.",
    keywords: [
      "modalità carte",
      "simulazioni interattive",
      "carte studio",
      "esercizi gamificati",
      "apprendimento interattivo",
      "quiz matematica",
    ],
    openGraph: {
      title: "Modalità Carte - Simulazioni | MaturaMate",
      description:
        "Simulazioni maturità in modalità carte interattive. Un modo innovativo per esercitarti con le tracce di matematica.",
      url: `/${subjectSlug}/simulazioni/card`,
    },
    twitter: {
      title: "Modalità Carte - Simulazioni | MaturaMate",
      description:
        "Simulazioni maturità in modalità carte interattive per un apprendimento coinvolgente.",
    },
    alternates: {
      canonical: `/${subjectSlug}/simulazioni/card`,
    },
  };
}

interface PageProps {
  params: Promise<{ "subject-slug": string }>;
}

export default async function SimulationCardRedirect({ params }: PageProps) {
  const { "subject-slug": subjectSlug } = await params;
  redirect(`/${subjectSlug}/simulazioni`);
}
