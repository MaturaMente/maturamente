"use client";

import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { useState } from "react";

interface MobileExerciseItemProps {
  id: string;
  topicName: string;
  topicOrder: number | null;
  subtopicName: string;
  subtopicOrder: number | null;
  description: string;
  difficulty: number;
  isCompleted: boolean;
  totalExercises?: number;
  completedExercises?: number;
  disableStar?: boolean;
  customLinkHref?: string;
  isFlagged?: boolean;
  onFlagChange?: (cardId: string, isFlagged: boolean) => void;
}

export default function MobileExerciseItem({
  id,
  description,
  difficulty,
  isCompleted,
  totalExercises = 0,
  completedExercises = 0,
  disableStar = false,
  customLinkHref,
  isFlagged: initialIsFlagged = false,
  onFlagChange,
}: MobileExerciseItemProps) {
  const [isFlagged, setIsFlagged] = useState(initialIsFlagged);

  // Handle toggling the flag status
  const handleToggleFlag = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the link from being followed
    e.stopPropagation(); // Prevent event bubbling

    try {
      const response = await fetch("/api/exercises/flag-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFlagged(data.flagged);
        // Notify parent component about flag change
        onFlagChange?.(id, data.flagged);
      }
    } catch (error) {
      console.error("Error toggling card flag:", error);
    }
  };

  // Determine the link URL to use
  const linkHref = customLinkHref || `/dashboard/esercizi/card/${id}`;

  // Calculate completion percentage
  const completionPercentage = totalExercises
    ? Math.round((completedExercises / totalExercises) * 100)
    : 0;

  return (
    <Link href={linkHref}>
      <div className="py-4 border-b last:border-b-0 border-border flex flex-col gap-3 relative hover:bg-muted/30 transition-colors px-2 rounded-md">
        {/* Title and Star */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-base pr-10">{description}</h3>
          {isFlagged && !disableStar && (
            <div
              className="absolute right-2 top-4 p-1 rounded-full cursor-pointer hover:bg-muted/50 transition-colors text-yellow-500"
              onClick={handleToggleFlag}
            >
              <Star className="h-4 w-4" fill="currentColor" />
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between">
          {/* Difficulty indicators */}
          <div className="flex gap-1 items-center">
            {[...Array(difficulty)].map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  difficulty === 1
                    ? "bg-green-500 dark:bg-green-400"
                    : difficulty === 2
                    ? "bg-yellow-500 dark:bg-yellow-400"
                    : "bg-red-500 dark:bg-red-400"
                }`}
              />
            ))}
            {[...Array(3 - difficulty)].map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-muted" />
            ))}
          </div>
        </div>

        {/* Progress bar and icon row */}
        {totalExercises > 0 && (
          <div className="pt-1 flex items-center justify-between">
            <div className="flex-1 flex flex-row gap-2 items-center">
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isCompleted
                      ? "bg-green-500"
                      : completionPercentage > 0
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="mr-2">
                  {completedExercises}/{totalExercises}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
