"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle2, BookOpen, Star } from "lucide-react";
import { useState } from "react";

interface ExerciseCardProps {
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
  disableHeader?: boolean;
  customLinkHref?: string;
  isFlagged?: boolean;
  onFlagChange?: (cardId: string, isFlagged: boolean) => void;
}

export default function ExerciseCard({
  id,
  topicName,
  topicOrder,
  subtopicName,
  subtopicOrder,
  description,
  difficulty,
  isCompleted,
  totalExercises = 0,
  completedExercises = 0,
  disableStar = false,
  disableHeader = false,
  customLinkHref,
  isFlagged: initialIsFlagged = false,
  onFlagChange,
}: ExerciseCardProps) {
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

  // Format the topic and subtopic with order numbers if available
  const formattedTopic =
    topicOrder !== null ? `${topicOrder}. ${topicName}` : topicName;
  const formattedSubtopic =
    subtopicOrder !== null ? `${subtopicOrder}. ${subtopicName}` : subtopicName;

  // Determine the link URL to use (using ID for dashboard, slug if provided via customLinkHref)
  const linkHref = customLinkHref || `/dashboard/esercizi/card/${id}`;

  return (
    <Link href={linkHref}>
      <Card className="h-full transition-all duration-300 hover:bg-muted/50 flex flex-col relative">
        <CardHeader className="pb-4">
          {!disableHeader && (
            <div>
              <CardTitle className="text-base">
                <div className="flex w-full justify-between items-start gap-4">
                  <span className="line-clamp-2 overflow-hidden">
                    {description}
                  </span>
                  <div className="flex gap-2">
                    {isFlagged && !disableStar && (
                      <div
                        className="text-yellow-500 cursor-pointer hover:scale-110 transition-transform duration-200"
                        onClick={handleToggleFlag}
                        title="Rimuovi dai preferiti"
                        data-star-icon="true"
                      >
                        <Star className="h-4 w-4" fill="currentColor" />
                      </div>
                    )}
                  </div>
                </div>
              </CardTitle>
            </div>
          )}
          {disableHeader && (
            <div className="flex items-center gap-2">
              <CardTitle className="text-base pr-6">
                <span className="line-clamp-2 overflow-hidden">
                  {description}
                </span>
              </CardTitle>
              {isFlagged && !disableStar && (
                <div
                  className="rounded-full text-yellow-500 cursor-pointer hover:scale-110 transition-transform duration-200"
                  onClick={handleToggleFlag}
                  title="Rimuovi dai preferiti"
                  data-star-icon="true"
                >
                  <Star className="h-4 w-4" fill="currentColor" />
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-grow pt-0 pb-0 mb-auto">
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
        </CardContent>

        <CardFooter className="pt-4 border-t text-xs text-muted-foreground flex justify-between">
          <div className="flex items-center gap-1">
            {isCompleted ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Completato</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Non completato</span>
              </div>
            )}
          </div>

          {/* Only show exercise counter if the card isn't fully completed and we have exercise data */}
          {totalExercises > 0 && !isCompleted && (
            <div className="text-xs font-medium">
              {completedExercises}/{totalExercises}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
