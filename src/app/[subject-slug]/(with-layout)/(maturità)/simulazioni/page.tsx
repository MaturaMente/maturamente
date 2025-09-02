import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import { Suspense } from "react";
import { SimulationsSkeleton } from "@/app/components/shared/loading";
import {
  getSimulationDataBySubjectId,
  getUserSimulationStatus,
  getFavoriteSimulationCards,
} from "@/utils/simulations-data";
import { getSubjectBySlug } from "@/utils/topics-subtopics-data";
import { getUserSubjectBySlug } from "@/utils/subjects-data";
import { UserSimulation, SimulationCard } from "@/types/simulationsTypes";
import SimulationsLayout from "@/app/components/subject/simulations/simulations-layout";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

// Generate dynamic metadata based on the subject
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}): Promise<Metadata> {
  const { "subject-slug": subjectSlug } = await params;

  return {
    title: "Simulazioni Maturità",
    description:
      "Simulazioni complete degli esami di maturità scientifica dal 2001 al 2024. Esercitati con tracce ufficiali, problemi e quesiti con soluzioni dettagliate per prepararti al meglio.",
    keywords: [
      "simulazioni maturità",
      "tracce maturità scientifica",
      "esami matematica",
      "problemi maturità",
      "quesiti matematica",
      "soluzioni maturità",
      "tracce svolte",
      "preparazione esame",
      "simulazioni online",
    ],
    openGraph: {
      title: "Simulazioni Maturità | MaturaMente",
      description:
        "Simulazioni complete degli esami di maturità scientifica dal 2001 al 2024. Esercitati con tracce ufficiali e soluzioni dettagliate.",
      url: `/${subjectSlug}/simulazioni`,
    },
    twitter: {
      title: "Simulazioni Maturità | MaturaMente",
      description:
        "Simulazioni complete degli esami di maturità scientifica dal 2001 al 2024. Esercitati con tracce ufficiali.",
    },
    alternates: {
      canonical: `/${subjectSlug}/simulazioni`,
    },
  };
}

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Configure for ISR with revalidation
export const revalidate = 3600; // 1 hour revalidation for simulation data

// Cached static data fetching function by subject
const getCachedSimulationDataBySubject = (subjectId: string) => {
  return unstable_cache(
    async () => {
      // Fetch simulations and cards filtered by subject (static data)
      const { cards, simulations } = await getSimulationDataBySubjectId(
        subjectId
      );

      // Convert cards to SimulationCard format with empty simulations array
      const simulationCards = cards.map((card) => ({
        ...card,
        simulations: [], // Initialize with empty array, will be populated with user data later
      })) as SimulationCard[];

      // Group simulation cards by year (static processing)
      const simulationCardsByYear = simulationCards.reduce((acc, card) => {
        if (card.year) {
          if (!acc[card.year]) {
            acc[card.year] = [];
          }
          acc[card.year].push(card);
        }
        return acc;
      }, {} as Record<number, SimulationCard[]>);

      // Sort cards within each year by order_index
      Object.keys(simulationCardsByYear).forEach((yearKey) => {
        const year = Number(yearKey);
        simulationCardsByYear[year].sort((a, b) => {
          // If order_index is null, place at the end
          if (a.order_index === null && b.order_index === null) return 0;
          if (a.order_index === null) return 1;
          if (b.order_index === null) return -1;
          return a.order_index - b.order_index;
        });
      });

      // Sort years in descending order (most recent first)
      const sortedYears = Object.keys(simulationCardsByYear)
        .map(Number)
        .sort((a, b) => b - a);

      return {
        cards: simulationCards,
        simulations,
        simulationCardsByYear,
        sortedYears,
      };
    },
    [`simulations-data-${subjectId}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: ["simulations", `subject-${subjectId}`],
    }
  );
};

// Cached user-specific data fetching function
const getCachedUserSimulationData = (userId: string) => {
  return unstable_cache(
    async () => {
      // Get user's simulation status (completed, started, flagged)
      const {
        completedSimulationMap,
        startedSimulationMap,
        flaggedSimulationMap,
      } = await getUserSimulationStatus(userId);

      return {
        completedSimulationMap,
        startedSimulationMap,
        flaggedSimulationMap,
      };
    },
    [`user-simulations-${userId}`],
    {
      revalidate: 300, // 5 minutes for user-specific data
      tags: [`user-${userId}`, "simulations"],
    }
  )();
};

interface PageProps {
  params: Promise<{ "subject-slug": string }>;
}

export default function SimulationsWrapper({ params }: PageProps) {
  return (
    <Suspense fallback={<SimulationsSkeleton />}>
      <Simulations params={params} />
    </Suspense>
  );
}

async function Simulations({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}) {
  // Get subject slug from params
  const { "subject-slug": subjectSlug } = await params;

  // Check if user is authenticated
  const authenticated = await isAuthenticated();

  // Get subject data - try authenticated version first, then fallback to public
  let subject;
  if (authenticated) {
    const userId = await getCurrentUserIdOptional();
    if (userId) {
      subject = await getUserSubjectBySlug(userId, subjectSlug);
    }
  }

  // If no subject found via user route, try public route
  if (!subject) {
    subject = await getSubjectBySlug(subjectSlug);
  }

  if (!subject) {
    // If subject doesn't exist, redirect to dashboard
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Simulazioni</h1>
        <p className="text-muted-foreground">Materia non trovata.</p>
      </div>
    );
  }

  // Fetch cached static data for this subject
  const getCachedSimulationData = getCachedSimulationDataBySubject(subject.id);
  const { cards, simulations, simulationCardsByYear, sortedYears } =
    await getCachedSimulationData();

  let userId: string | null = null;
  let simulationsWithStatus: UserSimulation[] = [];

  if (authenticated) {
    // Get user from headers (set by middleware) - only for authenticated users
    userId = await getCurrentUserIdOptional();

    if (userId) {
      // Fetch cached user-specific data
      const {
        completedSimulationMap,
        startedSimulationMap,
        flaggedSimulationMap,
      } = await getCachedUserSimulationData(userId);

      // Add completion status to simulations
      simulationsWithStatus = simulations.map((sim) => ({
        ...sim,
        is_completed: sim.id ? completedSimulationMap[sim.id] || false : false,
        is_started: sim.id ? startedSimulationMap[sim.id] || false : false,
        is_flagged: sim.id ? flaggedSimulationMap[sim.id] || false : false,
      })) as UserSimulation[];
    }
  } else {
    // For unauthenticated users, create simulations without status
    simulationsWithStatus = simulations.map((sim) => ({
      ...sim,
      is_completed: false,
      is_started: false,
      is_flagged: false,
    })) as UserSimulation[];
  }

  // Create a map of simulationsWithStatus by card_id for efficient lookup
  const simulationsByCardId = simulationsWithStatus.reduce((map, sim) => {
    if (sim.card_id) {
      if (!map[sim.card_id]) {
        map[sim.card_id] = [];
      }
      map[sim.card_id].push(sim);
    }
    return map;
  }, {} as Record<string, UserSimulation[]>);

  // Construct simulation cards with associated simulations
  const simulationCards = cards.map((card) => ({
    ...card,
    simulations:
      card.id && simulationsByCardId[card.id]
        ? simulationsByCardId[card.id]
        : [],
  })) as SimulationCard[];

  // Update the simulationCardsByYear with the user-specific simulation data
  const updatedSimulationCardsByYear = Object.keys(
    simulationCardsByYear
  ).reduce((acc, yearKey) => {
    const year = Number(yearKey);
    acc[year] = simulationCardsByYear[year].map((card) => {
      const updatedCard = simulationCards.find((sc) => sc.id === card.id);
      return updatedCard || card;
    });
    return acc;
  }, {} as Record<number, SimulationCard[]>);

  // Get favorite simulation cards if user is authenticated
  let favoriteSimulationCards: SimulationCard[] = [];
  if (userId) {
    favoriteSimulationCards = await getFavoriteSimulationCards(
      userId,
      subject.id
    );
  }

  return (
    <Suspense fallback={<SimulationsSkeleton />}>
      <SimulationsLayout
        simulationCardsByYear={updatedSimulationCardsByYear}
        sortedYears={sortedYears}
        favoriteSimulationCards={favoriteSimulationCards}
        subjectColor={subject.color}
        userId={userId}
        isAuthenticated={authenticated}
      />
    </Suspense>
  );
}
