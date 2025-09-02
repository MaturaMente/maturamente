import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SimulationsSkeleton } from "@/app/components/shared/loading/skeletons/simulations-skeleton";
import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import {
  getSimulationCardBySlug,
  getSimulationCardDataBySlug,
  getAllSimulationCards,
} from "@/utils/simulations-data";
import SimulationCardDetailPage from "@/app/components/subject/simulations/simulation-card-detail";
import { SimulationCardPageProps } from "@/types/simulationsTypes";

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Configure for ISR with revalidation
export const revalidate = 3600; // 1 hour revalidation for simulation cards

// Allow dynamic routes not captured by generateStaticParams
export const dynamicParams = true;

// Generate static params for all simulation cards at build time
export async function generateStaticParams() {
  try {
    const cards = await getAllSimulationCards();

    // Generate static params for all simulation cards
    return cards.map((card) => ({
      slug: card.slug,
    }));
  } catch (error) {
    console.error(
      "Error generating static params for simulation cards:",
      error
    );
    return [];
  }
}

// Generate dynamic metadata based on the simulation card
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string; slug: string }>;
}): Promise<Metadata> {
  try {
    const { "subject-slug": subjectSlug, slug } = await params;
    const cardData = await getSimulationCardBySlug(slug);

    if (!cardData) {
      return {
        title: "Carta Simulazione Non Trovata",
        description: "La carta simulazione richiesta non è stata trovata.",
      };
    }

    const cardTitle = cardData.title;
    const cardDescription =
      cardData.description ||
      `Carta interattiva per ${cardData.title}. Esercitati con la modalità carte per un apprendimento coinvolgente e gamificato.`;

    return {
      title: ` ${cardTitle}`,
      description: cardDescription,
      keywords: [
        "carta simulazione",
        "modalità carte",
        "esercizi interattivi",
        "gamificazione studio",
        "apprendimento coinvolgente",
        "quiz matematica",
        "carte studio",
      ],
      openGraph: {
        title: ` ${cardTitle} | MaturaMente`,
        description: cardDescription,
        url: `/${subjectSlug}/simulazioni/card/${slug}`,
        type: "article",
      },
      twitter: {
        title: ` ${cardTitle} | MaturaMente`,
        description: cardDescription,
      },
      alternates: {
        canonical: `/${subjectSlug}/simulazioni/card/${slug}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for simulation card:", error);
    return {
      title: "Carta Simulazione",
      description:
        "Esercitati con le carte simulazione di maturità su MaturaMente.",
    };
  }
}

export default async function SimulationCardPage({
  params,
}: SimulationCardPageProps) {
  const { "subject-slug": subjectSlug, slug } = await params;

  return (
    <Suspense fallback={<SimulationsSkeleton />}>
      <SimulationCardContent slug={slug} />
    </Suspense>
  );
}

async function SimulationCardContent({ slug }: { slug: string }) {
  // Check authentication and get user ID if available
  const authenticated = await isAuthenticated();
  const userId = authenticated ? await getCurrentUserIdOptional() : null;

  // Get card data with user-specific information (dynamic)
  const cardData = await getSimulationCardDataBySlug(slug, userId);

  if (!cardData) {
    notFound();
  }

  return (
    <SimulationCardDetailPage
      card={cardData}
      userId={userId}
      isAuthenticated={authenticated}
    />
  );
}
