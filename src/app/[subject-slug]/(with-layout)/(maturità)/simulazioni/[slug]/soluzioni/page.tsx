import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import {
  getSimulation,
  getSolutions,
  getCompletedSimulation,
} from "@/utils/simulations-data";
import { getAllSimulations } from "@/utils/statistics-data";
import { Simulation } from "@/types/simulationsTypes";
import SimulationSolutions from "@/app/components/subject/simulations/simulation-solutions";
import { unstable_cache } from "next/cache";

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Configure for ISR with revalidation
export const revalidate = 3600; // 1 hour revalidation for solutions

// Allow dynamic routes not captured by generateStaticParams
export const dynamicParams = true;

// Generate static params for all simulations at build time
export async function generateStaticParams() {
  try {
    const simulations = await getAllSimulations();

    // Generate static params for all simulations
    return simulations.map((simulation: any) => ({
      slug: simulation.slug,
    }));
  } catch (error) {
    console.error("Error generating static params for solutions:", error);
    return [];
  }
}

// Cached static data fetching function
const getCachedSolutionData = unstable_cache(
  async (slug: string) => {
    try {
      const simulationData = await getSimulation(slug);

      if (!simulationData) {
        return null;
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

      // Get solutions for this simulation (static content)
      const solutions = await getSolutions(simulationData.id);

      return {
        simulation,
        solutions,
        simulationId: simulationData.id,
      };
    } catch (error) {
      console.error("Error fetching cached solution data:", error);
      return null;
    }
  },
  ["simulation-solutions"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["simulations", "solutions"],
  }
);

interface PageProps {
  params: Promise<{ "subject-slug": string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SimulationSolutionsPage({ params }: PageProps) {
  const { "subject-slug": subjectSlug, slug } = await params;

  // Check authentication and get user ID if available
  const authenticated = await isAuthenticated();
  const userId = authenticated ? await getCurrentUserIdOptional() : null;

  // Fetch cached static data
  const data = await getCachedSolutionData(slug);

  if (!data) {
    notFound();
  }

  const { simulation, solutions, simulationId } = data;

  // For unauthenticated users, redirect to the simulation page
  if (!authenticated || !userId) {
    redirect(`/${subjectSlug}/simulazioni/${slug}`);
  }

  // Check if user has completed this simulation (dynamic user data)
  const { isCompleted } = await getCompletedSimulation(userId, simulationId);

  // If the user hasn't completed the simulation, redirect to the simulation page
  if (!isCompleted) {
    redirect(`/${subjectSlug}/simulazioni/${slug}`);
  }

  return (
    <Suspense fallback={<LoadingSpinner text="Caricamento soluzioni..." />}>
      <SimulationSolutions simulation={simulation} solutions={solutions} />
    </Suspense>
  );
}

// Generate dynamic metadata based on the simulation solutions
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
        title: "Soluzioni Non Trovate",
        description:
          "Le soluzioni della simulazione richiesta non sono state trovate.",
      };
    }

    const simulationTitle = simulationData.title;
    const solutionsTitle = `Soluzioni ${simulationTitle}`;
    const solutionsDescription = `Soluzioni complete e dettagliate per ${simulationData.title}. Scopri il procedimento step-by-step per risolvere tutti i problemi e quesiti della traccia di maturità.`;

    // Extract year from title if available
    const yearMatch = simulationTitle.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "";

    return {
      title: solutionsTitle,
      description: solutionsDescription,
      keywords: [
        "soluzioni maturità",
        "tracce svolte",
        "soluzioni matematica",
        year && `soluzioni ${year}`,
        "procedimento dettagliato",
        "step by step",
        "risoluzione problemi",
        "spiegazione quesiti",
      ].filter(Boolean),
      openGraph: {
        title: `${solutionsTitle} | MaturaMente`,
        description: solutionsDescription,
        url: `/${subjectSlug}/simulazioni/${slug}/soluzioni`,
        type: "article",
      },
      twitter: {
        title: `${solutionsTitle} | MaturaMente`,
        description: solutionsDescription,
      },
      alternates: {
        canonical: `/${subjectSlug}/simulazioni/${slug}/soluzioni`,
      },
      robots: {
        index: false, // Solutions should not be indexed to prevent cheating
        follow: true,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for simulation solutions:", error);
    return {
      title: "Soluzioni Simulazione",
      description:
        "Soluzioni dettagliate per le simulazioni di maturità scientifica.",
    };
  }
}
