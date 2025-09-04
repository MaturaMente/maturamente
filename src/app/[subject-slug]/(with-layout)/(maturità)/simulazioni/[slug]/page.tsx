import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import { Suspense } from "react";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import {
  getSimulation,
  getCompletedSimulation,
} from "@/utils/simulations-data";
import { getAllSimulations } from "@/utils/statistics-data";
import { Simulation } from "@/types/simulationsTypes";
import SimulationExperience from "@/app/components/subject/simulations/simulation-experience";
import { isUserOnFreeTrial } from "@/utils/free-trial-check";
import { FreeTrialCTA } from "@/app/components/shared/free-trial-cta";

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Set revalidation period for ISR
export const revalidate = 3600; // 1 hour

// Generate static params for popular simulations
export async function generateStaticParams() {
  try {
    const simulations = await getAllSimulations();

    // Generate static params for all simulations (or limit to popular ones)
    return simulations.slice(0, 20).map((simulation: any) => ({
      slug: simulation.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Generate dynamic metadata based on the simulation
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string; slug: string }>;
}): Promise<Metadata> {
  try {
    const { "subject-slug": subjectSlug, slug } = await params;
    const simulationData = await getSimulation(slug);

    if (!simulationData) {
      return {
        title: "Simulazione Non Trovata",
        description:
          "La simulazione di maturità richiesta non è stata trovata.",
      };
    }

    const simulationTitle = simulationData.title;
    const simulationDescription =
      simulationData.description ||
      `Simulazione di maturità scientifica: ${simulationData.title}. Esercitati con questa traccia completa di matematica per la preparazione all'esame.`;

    // Extract year from title if available
    const yearMatch = simulationTitle.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "";

    return {
      title: simulationTitle,
      description: simulationDescription,
      keywords: [
        "simulazione maturità",
        "traccia maturità scientifica",
        "esame matematica",
        year && `maturità ${year}`,
        "problemi matematica",
        "quesiti maturità",
        "preparazione esame",
        "tracce svolte",
      ].filter(Boolean),
      openGraph: {
        title: `${simulationTitle} | Simulazioni | MaturaMente`,
        description: simulationDescription,
        url: `/${subjectSlug}/simulazioni/${slug}`,
        type: "article",
      },
      twitter: {
        title: `${simulationTitle} | Simulazioni | MaturaMente`,
        description: simulationDescription,
      },
      alternates: {
        canonical: `/${subjectSlug}/simulazioni/${slug}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for simulation:", error);
    return {
      title: "Simulazione Maturità",
      description:
        "Esercitati con le simulazioni di maturità scientifica su MaturaMente.",
    };
  }
}

interface PageProps {
  params: Promise<{ "subject-slug": string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SimulationPage({ params }: PageProps) {
  try {
    const { slug } = await params;

    // Check authentication and get user ID if available
    const authenticated = await isAuthenticated();
    const userId = authenticated ? await getCurrentUserIdOptional() : null;

    // Check if user is on free trial
    const isFreeTrial = userId ? await isUserOnFreeTrial(userId) : false;
    
    if (isFreeTrial) {
      return (
        <FreeTrialCTA 
          title="Simulazione Maturità - Premium"
          description="Le simulazioni complete sono disponibili solo con il piano Premium. Passa al piano completo per accedere a tutte le tracce di maturità."
        />
      );
    }

    const simulationData = await getSimulation(slug);

    if (!simulationData) {
      notFound();
    }

    // Adapt the data to match the Simulation interface
    const simulation: Simulation = {
      id: simulationData.id,
      slug: simulationData.slug,
      title: simulationData.title,
      description: simulationData.description,
      pdf_url: simulationData.pdf_url,
      time_in_min: simulationData.time_in_min,
      is_complete: simulationData.is_complete,
      card_id: simulationData.card_id,
    };

    // Get user's simulation status (default to false for unauthenticated users)
    let hasStarted = false;
    let isCompleted = false;
    let completedSimulationId = null;
    let startedAt = null;

    if (authenticated && userId) {
      const simulationStatus = await getCompletedSimulation(
        userId,
        simulationData.id
      );
      hasStarted = simulationStatus.hasStarted;
      isCompleted = simulationStatus.isCompleted;
      completedSimulationId = simulationStatus.completedSimulationId;
      startedAt = simulationStatus.startedAt;
    }

    return (
      <Suspense fallback={<LoadingSpinner text="Caricamento simulazione..." />}>
        <SimulationExperience
          simulation={simulation}
          userId={userId}
          hasStarted={hasStarted}
          isCompleted={isCompleted}
          completedSimulationId={completedSimulationId}
          startedAt={startedAt}
          isAuthenticated={authenticated}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading simulation:", error);
    notFound();
  }
}
