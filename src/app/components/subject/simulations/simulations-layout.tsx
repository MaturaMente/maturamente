"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  ClientSimulationsPageProps,
  SimulationCard,
} from "@/types/simulationsTypes";
import { Input } from "@/components/ui/input";
import { AuthPopup, useAuthPopup } from "@/app/components/auth/auth-popup";
import { SimulationCardComponent } from "./simulation-cards";

export default function SimulationsLayout({
  simulationCardsByYear,
  sortedYears,
  favoriteSimulationCards,
  subjectColor,
  isAuthenticated = false,
  isFreeTrial = false,
}: ClientSimulationsPageProps) {
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [localSimulationCards, setLocalSimulationCards] = useState(
    simulationCardsByYear
  );
  const [localFavoriteCards, setLocalFavoriteCards] = useState(
    favoriteSimulationCards
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SimulationCard[]>([]);

  // Auth popup hook
  const { isAuthPopupOpen, showAuthPopup, hideAuthPopup } = useAuthPopup();

  // Get unique subjects for filter dropdown
  const allCards = Object.values(simulationCardsByYear).flat();
  const subjects = Array.from(
    new Set(allCards.map((card) => card.subject_name).filter(Boolean))
  ).sort();

  // Filter simulation cards by subject if a filter is applied
  const filterSimulationCards = (cards: typeof allCards) => {
    if (subjectFilter === "all") return cards;
    return cards.filter((card) => card.subject_name === subjectFilter);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Search logic - this runs whenever searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Search both cards and simulations
    const searchInCards = () => {
      const query = searchQuery.toLowerCase();
      const results: SimulationCard[] = [];

      // Search through all cards and their simulations
      Object.values(simulationCardsByYear).forEach((cardsInYear) => {
        cardsInYear.forEach((card) => {
          // Check if query matches card title, subject, description
          const cardMatches =
            card.title.toLowerCase().includes(query) ||
            (card.subject_name &&
              card.subject_name.toLowerCase().includes(query)) ||
            (card.description &&
              card.description.toLowerCase().includes(query));

          // Check if query matches any simulation in this card
          const simulationMatches = card.simulations.some(
            (sim) =>
              sim.title.toLowerCase().includes(query) ||
              (sim.description && sim.description.toLowerCase().includes(query))
          );

          // If either card or any of its simulations match, add the card to results
          if (cardMatches || simulationMatches) {
            // Clone the card to avoid modifying the original data
            results.push({ ...card });
          }
        });
      });

      return results;
    };

    const results = searchInCards();
    setSearchResults(results);
  }, [searchQuery, simulationCardsByYear]);

  // Toggle simulation favorite status
  const toggleFavorite = async (simulationId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the star
    e.stopPropagation();

    // Check if user is authenticated
    if (!isAuthenticated) {
      showAuthPopup();
      return;
    }

    try {
      const response = await fetch("/api/simulations/flag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId,
        }),
      });

      if (response.ok) {
        // Update local state to reflect the change immediately
        setLocalSimulationCards((prev) => {
          const updated = { ...prev };

          // Update the simulation's is_flagged status in all years and cards
          Object.keys(updated).forEach((year) => {
            const yearNum = parseInt(year);
            updated[yearNum] = updated[yearNum].map((card) => {
              return {
                ...card,
                simulations: card.simulations.map((sim) => {
                  if (sim.id === simulationId) {
                    return { ...sim, is_flagged: !sim.is_flagged };
                  }
                  return sim;
                }),
              };
            });
          });

          return updated;
        });

        // Also update search results if we're searching
        if (isSearching) {
          setSearchResults((prev) =>
            prev.map((card) => ({
              ...card,
              simulations: card.simulations.map((sim) => {
                if (sim.id === simulationId) {
                  return { ...sim, is_flagged: !sim.is_flagged };
                }
                return sim;
              }),
            }))
          );
        }

        // Update favorites cards state
        setLocalFavoriteCards((prev) => {
          const updated = prev.map((card) => ({
            ...card,
            simulations: card.simulations.map((sim) => {
              if (sim.id === simulationId) {
                return { ...sim, is_flagged: !sim.is_flagged };
              }
              return sim;
            }),
          }));

          // Return all cards (filtering will be done in the render)
          return updated;
        });
      }
    } catch (error) {
      console.error("Error toggling simulation favorite:", error);
    }
  };

  return (
    <div className="">
      {/* Header section - responsive design */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-border my-4 sm:my-6 pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-0">
          Simulazioni
        </h1>

        {/* Search input - full width on mobile, normal width on desktop */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca simulazioni..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Search results section - only shown when searching */}
      {isSearching && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Risultati della ricerca
            {searchResults.length > 0 && <span> ({searchResults.length})</span>}
          </h2>

          {searchResults.length > 0 ? (
            <YearSection
              simulationCards={searchResults}
              onToggleFavorite={toggleFavorite}
              hideYearHeading={true}
              isFreeTrial={isFreeTrial}
            />
          ) : (
            <div className="text-center p-8 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">
                Nessun risultato trovato per "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Favorites section - only shown when not searching and user is authenticated */}
      {!isSearching && isAuthenticated && localFavoriteCards.length > 0 && (
        <div className="mb-8">
          <h2
            className="md:text-3xl text-2xl font-semibold mb-6 border-b border-muted pb-2"
            style={{ color: subjectColor }}
          >
            Simulazioni Preferite
          </h2>

          <YearSection
            simulationCards={localFavoriteCards.filter((card) =>
              card.simulations.some((sim) => sim.is_flagged)
            )}
            onToggleFavorite={toggleFavorite}
            hideYearHeading={true}
            isFreeTrial={isFreeTrial}
          />
        </div>
      )}

      {/* Regular year sections - only shown when not searching or search is empty */}
      {(!isSearching || !searchQuery.trim()) && sortedYears.length > 0
        ? sortedYears.map((year) => {
            const filteredCards = filterSimulationCards(
              localSimulationCards[year]
            );

            return (
              <YearSection
                key={year}
                year={year}
                simulationCards={filteredCards}
                onToggleFavorite={toggleFavorite}
                isFreeTrial={isFreeTrial}
              />
            );
          })
        : !isSearching &&
          sortedYears.length === 0 && (
            <div className="text-center p-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-lg">
                Non ci sono ancora simulazioni disponibili.
              </p>
            </div>
          )}

      {/* Auth popup for unauthenticated users */}
      <AuthPopup isOpen={isAuthPopupOpen} onClose={hideAuthPopup} />
    </div>
  );
}

// Inlined Year Section Component (from year-section.tsx)
interface YearSectionProps {
  year?: number;
  simulationCards: SimulationCard[];
  onToggleFavorite: (
    simulationId: string,
    e: React.MouseEvent
  ) => Promise<void>;
  hideYearHeading?: boolean;
  isFreeTrial?: boolean;
}

function YearSection({
  year,
  simulationCards,
  onToggleFavorite,
  hideYearHeading = false,
  isFreeTrial = false,
}: YearSectionProps) {
  if (simulationCards.length === 0) return null;

  return (
    <div className="mb-12">
      {!hideYearHeading && year && (
        <h2 className="md:text-3xl text-2xl font-semibold mb-6 text-foreground/95 border-b border-muted pb-2">
          Simulazioni {year}
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {simulationCards.map((card) => (
          <SimulationCardComponent
            key={card.id}
            card={card}
            onToggleFavorite={onToggleFavorite}
            isFreeTrial={isFreeTrial}
          />
        ))}
      </div>
    </div>
  );
}
