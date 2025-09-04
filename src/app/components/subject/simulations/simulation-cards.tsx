"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserSimulation, SimulationCard } from "@/types/simulationsTypes";

// Individual Simulation Item Component (from card-item.tsx)
interface SimulationItemProps {
  simulation: UserSimulation;
  index: number;
  onToggleFavorite: (
    simulationId: string,
    e: React.MouseEvent
  ) => Promise<void>;
  formatTimeInHours: (minutes: number) => string;
}

export function SimulationItem({
  simulation,
  index,
  onToggleFavorite,
  formatTimeInHours,
}: SimulationItemProps) {
  let simulationType = "Simulazione Completa";
  const pathname = useParams();
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  // Determine the referrer based on the current path
  let referrer = "simulazioni";
  if (window?.location?.pathname?.includes("/statistiche")) {
    referrer = "statistiche";
  } else if (window?.location?.pathname?.includes("/preferiti")) {
    referrer = "preferiti";
  }

  if (simulation.title.toLowerCase().includes("problem")) {
    simulationType = "Solo Problemi";
  } else if (simulation.title.toLowerCase().includes("quesit")) {
    simulationType = "Solo Quesiti";
  }

  return (
    <div
      className="bg-muted/40 border border-border rounded-xl p-4 md:p-6 flex flex-col justify-between items-center gap-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-start justify-center gap-1 md:gap-2 w-full">
        <div className="text-base font-semibold">
          <span>{simulationType}</span>
        </div>
        <div className="flex flex-row justify-between w-full gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTimeInHours(simulation.time_in_min)}</span>
            </div>
            {simulation.is_completed && (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="md:block hidden">Completata</span>
              </div>
            )}
            {simulation.is_started && !simulation.is_completed && (
              <div className="flex items-center text-bg-primary dark:text-bg-primary">
                <Clock className="h-4 w-4 mr-1" />
                <span className="md:block hidden">In corso</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                simulation.is_flagged
                  ? "fill-yellow-400 text-yellow-400 cursor-pointer"
                  : "hover:text-yellow-400 hover:scale-110 transition-all cursor-pointer"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(simulation.slug, e);
              }}
            />
            <Link
              href={`/${subjectSlug}/simulazioni/${simulation.slug}?referrer=${referrer}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant={
                  simulation.is_completed || !simulation.is_started
                    ? "outline"
                    : "default"
                }
                size="sm"
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-md",
                  simulation.is_completed
                    ? "border-green-500/20 text-green-500 hover:bg-green-500/10 hover:text-green-500"
                    : simulation.is_started
                    ? "bg-bg-primary hover:bg-blue-700"
                    : ""
                )}
              >
                {simulation.is_completed
                  ? "Rivedi"
                  : simulation.is_started
                  ? "Continua"
                  : "Inizia"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Simulation Card Component (from simulation-card.tsx)
interface SimulationCardProps {
  card: SimulationCard;
  onToggleFavorite: (
    simulationId: string,
    e: React.MouseEvent
  ) => Promise<void>;
  isFreeTrial?: boolean;
}

export function SimulationCardComponent({
  card,
  onToggleFavorite,
  isFreeTrial = false,
}: SimulationCardProps) {
  const router = useRouter();
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  // Convert time in minutes to hours and minutes format
  const formatTimeInHours = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? "ora" : "ore"}`;
    }

    return `${hours} ${hours === 1 ? "ora" : "ore"} e ${remainingMinutes} min`;
  };

  // Check if all simulations in the card are completed
  const areAllSimulationsCompleted = () => {
    if (card.simulations.length === 0) return false;
    return card.simulations.every((simulation) => simulation.is_completed);
  };

  // Handle card click to navigate to card detail page
  const handleCardClick = () => {
    router.push(`/${subjectSlug}/simulazioni/card/${card.slug}`);
  };

  const allCompleted = areAllSimulationsCompleted();

  return (
    <div>
      <Card
        className="border border-border/80 hover:bg-muted/50 transition-all dark:border-border bg-background overflow-hidden h-full flex flex-col cursor-pointer"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex justify-between items-start sm:items-center">
            <CardTitle className="text-lg sm:text-xl">{card.title}</CardTitle>
            <div className="flex items-center gap-2 ml-2 sm:ml-0">
              {allCompleted && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label={isFreeTrial ? "Passa al Premium" : "Visualizza simulazioni"}
              >
                {isFreeTrial ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground mt-1 sm:mt-2">
            <div className="flex items-center">
              <span>{card.subject_name || "Materia"}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <div className="flex items-center">
              <span>{card.year}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2 sm:pb-3 flex-grow">
          <p className="text-sm text-muted-foreground">
            {card.description.length > 120
              ? `${card.description.substring(0, 120)}...`
              : card.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
