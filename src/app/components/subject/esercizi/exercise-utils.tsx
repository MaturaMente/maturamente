"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/types/exercisesTypes";

// Exercise Progress Component
interface ExerciseProgressProps {
  correctCount: number;
  totalExercises: number;
  label?: string;
  className?: string;
}

export function ExerciseProgress({
  correctCount,
  totalExercises,
  label = "Progresso",
  className,
}: ExerciseProgressProps) {
  const progressPercentage =
    totalExercises > 0 ? (correctCount / totalExercises) * 100 : 0;

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {correctCount}/{totalExercises} corretti
        </span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
}

// Exercise Filter Component
interface ExerciseFilterProps {
  filters: FilterState;
  onFilterChange: (
    type: "difficulty" | "completion",
    value: number | string
  ) => void;
  onClearFilters: () => void;
}

export function ExerciseFilter({
  filters,
  onFilterChange,
  onClearFilters,
}: ExerciseFilterProps) {
  const { difficultyFilter, completionFilter } = filters;

  const activeFilterCount =
    (difficultyFilter !== null ? 1 : 0) + (completionFilter !== null ? 1 : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filtri</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 px-1.5 py-0.5 h-5 rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filtri</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
            Difficoltà
          </DropdownMenuLabel>
          {[1, 2, 3].map((level) => (
            <DropdownMenuItem
              key={`difficulty-${level}`}
              onClick={() => onFilterChange("difficulty", level)}
              className={cn(
                "flex items-center gap-2",
                difficultyFilter === level && "bg-muted"
              )}
            >
              <div className="flex items-center gap-1">
                {[...Array(level)].map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      level === 1
                        ? "bg-green-500"
                        : level === 2
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                ))}
                {[...Array(3 - level)].map((_, i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                ))}
              </div>
              <span>
                {level === 1 ? "Base" : level === 2 ? "Media" : "Avanzata"}
              </span>
              {difficultyFilter === level && (
                <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pt-2">
            Stato
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onFilterChange("completion", "completed")}
            className={cn(completionFilter === "completed" && "bg-muted")}
          >
            Completati
            {completionFilter === "completed" && (
              <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange("completion", "not_completed")}
            className={cn(completionFilter === "not_completed" && "bg-muted")}
          >
            Da completare
            {completionFilter === "not_completed" && (
              <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onClearFilters}
            disabled={activeFilterCount === 0}
          >
            Rimuovi filtri
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Custom hook for exercise filters
export function useExerciseFilters() {
  const [filterState, setFilterState] = useState<FilterState>({
    difficultyFilter: null,
    completionFilter: null,
  });

  const handleFilterChange = (
    type: "difficulty" | "completion",
    value: number | string
  ) => {
    setFilterState((prev: FilterState) => {
      if (type === "difficulty") {
        const newDifficultyFilter =
          prev.difficultyFilter === value ? null : (value as number);
        return { ...prev, difficultyFilter: newDifficultyFilter };
      } else {
        const newCompletionFilter =
          prev.completionFilter === value ? null : (value as string);
        return { ...prev, completionFilter: newCompletionFilter };
      }
    });
  };

  const clearFilters = () => {
    setFilterState({
      difficultyFilter: null,
      completionFilter: null,
    });
  };

  const filterCard = (card: any) => {
    const { difficultyFilter, completionFilter } = filterState;

    if (difficultyFilter !== null && card.difficulty !== difficultyFilter) {
      return false;
    }

    if (completionFilter === "completed" && !card.is_completed) {
      return false;
    }

    if (completionFilter === "not_completed" && card.is_completed) {
      return false;
    }

    return true;
  };

  return {
    filterState,
    handleFilterChange,
    clearFilters,
    filterCard,
  };
}

// Custom hook for mobile detection
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    setMounted(true);

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return { isMobile, mounted };
}
