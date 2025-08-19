"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Exercise } from "@/app/components/subject/esercizi/cards/single-exercise-page";
import {
  MobileExerciseViewProps,
  ExerciseCardClientProps,
  ContentType,
} from "@/types/exercisesTypes";
import { useIsMobile } from "./exercise-utils";
import ExerciseHeader from "./exercises-header";
import { ExerciseProgress } from "./exercise-utils";

const MobileExerciseView = dynamic<MobileExerciseViewProps>(
  () =>
    import(
      "@/app/components/subject/esercizi/cards/single-exercise-page-mobile"
    ).then((mod) => mod.default),
  { ssr: false }
);

// Helper function to render question data in appropriate format
const renderQuestionData = (data: ContentType): string => {
  if (typeof data === "string") {
    return data;
  }

  // Handle array of strings - join them with line breaks
  if (Array.isArray(data)) {
    return data.join("\n");
  }

  // Handle object with text property
  if (data && typeof data === "object" && "text" in data) {
    return data.text as string;
  }

  // Handle object with html property - extract text content
  if (data && typeof data === "object" && "html" in data) {
    return data.html as string;
  }

  // Fallback to JSON representation
  return JSON.stringify(data);
};

// Helper function to render solution data in appropriate format
const renderSolutionData = (data: ContentType): string => {
  if (typeof data === "string") {
    return data;
  }

  // Handle array of strings - join them with line breaks
  if (Array.isArray(data)) {
    return data.join("\n");
  }

  // Handle object with html property
  if (data && typeof data === "object" && "html" in data) {
    return data.html as string;
  }

  // Fallback to JSON representation
  return JSON.stringify(data);
};

// Update the prop interface to include flagged data
interface ExtendedExerciseCardClientProps extends ExerciseCardClientProps {
  flaggedExercises?: Set<string>;
  subjectSlug: string;
  topicSlug?: string;
}

export default function ExerciseCardDetail({
  id,
  description,
  difficulty,
  topicName,
  subtopicName,
  exercises,
  completedExercises,
  flaggedExercises = new Set(),
  card,
  topicId,
  topicSlug,
  subjectSlug,
}: ExtendedExerciseCardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromFavorites = searchParams.get("from") === "preferiti";

  // Create a simplified map of just exercise ID to correctness for easier state tracking
  const initialCompletionState = Object.entries(completedExercises).reduce(
    (acc, [exerciseId, data]) => {
      acc[exerciseId] = data.isCorrect;
      return acc;
    },
    {} as Record<string, boolean>
  );

  const [localCompletedExercises, setLocalCompletedExercises] = useState<
    Record<string, boolean>
  >(initialCompletionState);

  // Track tutor interaction state for each exercise
  const [exerciseTutorState, setExerciseTutorState] = useState<
    Record<string, "none" | "showOptions" | "showTutor">
  >(
    Object.entries(completedExercises).reduce((acc, [exerciseId, data]) => {
      // If the exercise was completed but incorrect, assume it's in 'showOptions' state
      acc[exerciseId] = !data.isCorrect ? "showOptions" : "none";
      return acc;
    }, {} as Record<string, "none" | "showOptions" | "showTutor">)
  );

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Get card flagged state from props
  const [isCardFlagged, setIsCardFlagged] = useState(card?.is_flagged || false);
  const [isFlagging, setIsFlagging] = useState(false);

  const { isMobile, mounted } = useIsMobile();

  // NEW: Track which exercise IDs should be expanded in mobile view
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<string[]>([]);

  // Update the current exercise index when a card is clicked
  const handleExerciseClick = (index: number) => {
    setCurrentExerciseIndex(index);
  };

  // Calculate progress - only count CORRECTLY completed exercises
  const totalExercises = exercises.length;
  const correctCount = Object.values(localCompletedExercises).filter(
    Boolean
  ).length;

  const allCorrect = useMemo(() => {
    return (
      Object.keys(localCompletedExercises).length === exercises.length &&
      Object.values(localCompletedExercises).every((value) => value === true)
    );
  }, [localCompletedExercises, exercises.length]);

  // Sort exercises by order_index if available
  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.order_index === null || a.order_index === undefined) return 1;
    if (b.order_index === null || b.order_index === undefined) return -1;
    return a.order_index - b.order_index;
  });

  // Find the first incomplete exercise
  const findFirstIncompleteExerciseIndex = () => {
    // Find the first exercise that's not completed correctly
    for (let i = 0; i < sortedExercises.length; i++) {
      const exerciseId = sortedExercises[i].id;
      // Not in the completedExercises map or not correct
      if (
        !(exerciseId in localCompletedExercises) ||
        localCompletedExercises[exerciseId] === false
      ) {
        return i;
      }
    }

    // If all exercises are completed correctly, return the first one
    return 0;
  };

  // Get the index of the first incomplete exercise
  const firstIncompleteIndex = findFirstIncompleteExerciseIndex();

  // Set up initial expanded exercise when component mounts
  useEffect(() => {
    if (isMobile && sortedExercises.length > 0) {
      // If all exercises are already correctly completed, don't auto-expand any
      if (allCorrect) {
        setExpandedExerciseIds([]);
      }
      // Otherwise set the first incomplete exercise as expanded
      else if (
        firstIncompleteIndex >= 0 &&
        firstIncompleteIndex < sortedExercises.length
      ) {
        setExpandedExerciseIds([sortedExercises[firstIncompleteIndex].id]);
      }
    }
    // This effect should only run once when component mounts or when major props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, sortedExercises.length, allCorrect]);

  // Scroll to current exercise when it changes
  useEffect(() => {
    const currentRef = exerciseRefs.current[currentExerciseIndex];
    if (currentRef) {
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        // Use scrollIntoView with better options for more reliable scrolling
        const headerOffset = isMobile ? 80 : 120; // Responsive offset
        const elementPosition = currentRef.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;

        // Use a more controlled scroll behavior
        window.scrollTo({
          top: Math.max(0, offsetPosition), // Ensure we don't scroll to negative position
          behavior: "smooth",
        });
      }, 100); // Slightly longer delay for better reliability
    }
  }, [currentExerciseIndex, isMobile]);

  // Handle exercise completion and expand next incomplete exercise
  const handleExerciseComplete = (exerciseId: string, isCorrect: boolean) => {
    if (isCorrect && isMobile) {
      // Create a local updated completed exercises map to check if all exercises are now complete
      const updatedCompletedExercises = {
        ...localCompletedExercises,
        [exerciseId]: isCorrect,
      };

      // Check if all exercises are now correctly completed
      const allExercisesCorrect = sortedExercises.every(
        (ex) =>
          ex.id in updatedCompletedExercises && updatedCompletedExercises[ex.id]
      );

      // If all exercises are now complete, don't expand any
      if (allExercisesCorrect) {
        setTimeout(() => {
          setExpandedExerciseIds([]);
        }, 500);
        return;
      }

      // Find current exercise index
      const currentIndex = sortedExercises.findIndex(
        (ex) => ex.id === exerciseId
      );

      // Find the next incomplete exercise to auto-expand
      let nextIncompleteIndex = -1;
      for (let i = currentIndex + 1; i < sortedExercises.length; i++) {
        const nextExId = sortedExercises[i].id;
        if (
          !(nextExId in updatedCompletedExercises) ||
          !updatedCompletedExercises[nextExId]
        ) {
          nextIncompleteIndex = i;
          break;
        }
      }

      // Expand next incomplete exercise and scroll to it (with a delay) if found
      if (nextIncompleteIndex !== -1) {
        setTimeout(() => {
          setExpandedExerciseIds([sortedExercises[nextIncompleteIndex].id]);

          // Scroll to the next exercise on mobile
          const nextExerciseId = sortedExercises[nextIncompleteIndex].id;
          const nextElement = document.querySelector(
            `[data-exercise-id="${nextExerciseId}"]`
          );
          if (nextElement) {
            const headerOffset = 100; // Mobile header offset
            const elementPosition = nextElement.getBoundingClientRect().top;
            const offsetPosition =
              elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: "smooth",
            });
          }
        }, 500); // Consistent timing with desktop
      } else if (currentIndex === sortedExercises.length - 1) {
        // This was the last exercise, keep it expanded for a moment then collapse
        setTimeout(() => {
          setExpandedExerciseIds([]);
        }, 500);
      } else {
        // If no next incomplete exercise, collapse all after delay
        setTimeout(() => {
          setExpandedExerciseIds([]);
        }, 500);
      }
    }
  };

  // Function to mark an exercise as complete (correct or incorrect)
  const handleCompleteExercise = async (
    exerciseId: string,
    isCorrect: boolean,
    attempt: number
  ) => {
    try {
      console.log(
        `Recording exercise ${exerciseId} as ${
          isCorrect ? "correct" : "incorrect"
        }, attempt: ${attempt}`
      );

      // Create a new updated state to check if all exercises are now completed correctly
      const updatedCompletedExercises = {
        ...localCompletedExercises,
        [exerciseId]: isCorrect,
      };

      // Update local state first to avoid UI lag
      setLocalCompletedExercises(updatedCompletedExercises);

      // Update tutor state if needed
      if (!isCorrect) {
        setExerciseTutorState(
          (prev: Record<string, "none" | "showOptions" | "showTutor">) => ({
            ...prev,
            [exerciseId]: "showOptions",
          })
        );
      }

      // Make API call to update the exercise completion status
      const response = await fetch("/api/exercises/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exerciseId,
          isCorrect,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API response error:", errorData);
      }

      // Check if this was the last exercise needed to complete the card
      // We need all exercises to be in the state AND all to be correct
      const allExercisesInState = exercises.every(
        (ex) => ex.id === exerciseId || ex.id in updatedCompletedExercises
      );
      const allExercisesCorrect = exercises.every(
        (ex) =>
          (ex.id === exerciseId && isCorrect) ||
          (ex.id in updatedCompletedExercises &&
            updatedCompletedExercises[ex.id] === true)
      );

      // If this completes the card and all are correct, automatically mark the card as complete
      if (isCorrect && allExercisesInState && allExercisesCorrect) {
        console.log("Automatically marking card as complete");
        try {
          const cardResponse = await fetch("/api/exercises/complete-card", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cardId: id,
            }),
          });

          if (!cardResponse.ok) {
            console.error("Failed to complete card", await cardResponse.json());
          }
        } catch (cardError) {
          console.error("Error completing card:", cardError);
        }
      }

      // Consolidated timing for next exercise navigation - only on desktop
      if (
        isCorrect &&
        currentExerciseIndex < sortedExercises.length - 1 &&
        !isMobile
      ) {
        setTimeout(() => {
          setCurrentExerciseIndex((prev) => prev + 1);
        }, 500); // Longer delay to ensure smooth transition
      }

      // Refresh the UI if all exercises are completed
      if (Object.keys(updatedCompletedExercises).length >= exercises.length) {
        router.refresh();
      }

      return Promise.resolve();
    } catch (error) {
      console.error("Error completing exercise:", error);
      return Promise.reject(error);
    }
  };

  // Toggle flag status for the entire card
  const handleToggleCardFlag = async () => {
    setIsFlagging(true);

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
        setIsCardFlagged(data.flagged);
      }
    } catch (error) {
      console.error("Error toggling card flag:", error);
    } finally {
      setIsFlagging(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="lg:w-[67%] md:mx-auto">
      <ExerciseHeader
        title={description}
        topicName={topicName}
        subtopicName={subtopicName}
        backHref={
          fromFavorites
            ? "/dashboard/preferiti"
            : `/${subjectSlug}/esercizi/${topicSlug}`
        }
        backLabel={fromFavorites ? "Torna ai preferiti" : "Torna agli esercizi"}
        isCardFlagged={isCardFlagged}
        onToggleFlag={handleToggleCardFlag}
        isFlagging={isFlagging}
        difficulty={difficulty}
      />

      <ExerciseProgress
        correctCount={correctCount}
        totalExercises={totalExercises}
        className="mb-6"
      />

      {/* Main content - exercises */}
      <div className="mt-8">
        {isMobile ? (
          // Mobile view with collapsible accordion-style exercises
          <div className="space-y-0 divide-y divide-border overflow-hidden">
            {sortedExercises.map((exercise, index) => {
              // Helper functions for exercise state
              const isExerciseCompleted = (exerciseId: string): boolean =>
                exerciseId in localCompletedExercises;

              const wasExerciseCorrect = (exerciseId: string): boolean =>
                localCompletedExercises[exerciseId] === true;

              const currentTutorState = (
                exerciseId: string
              ): "none" | "showOptions" | "showTutor" =>
                exerciseTutorState[exerciseId] || "none";

              // Check if this exercise should be expanded
              const shouldAutoExpand = expandedExerciseIds.includes(
                exercise.id
              );

              // Check if this exercise is flagged from the server data
              const isExerciseFlagged = flaggedExercises.has(exercise.id);

              return (
                <MobileExerciseView
                  key={exercise.id}
                  id={exercise.id}
                  number={index + 1}
                  question={renderQuestionData(exercise.question_data)}
                  solution={renderSolutionData(exercise.solution_data)}
                  onMarkCorrect={handleCompleteExercise}
                  isCompleted={isExerciseCompleted(exercise.id)}
                  wasCorrect={wasExerciseCorrect(exercise.id)}
                  tutorState={currentTutorState(exercise.id)}
                  autoExpand={shouldAutoExpand}
                  onExerciseComplete={handleExerciseComplete}
                  isFlagged={isExerciseFlagged}
                />
              );
            })}
          </div>
        ) : (
          // Desktop view with larger cards
          <div>
            {sortedExercises.map((exercise, index) => {
              // Check if this exercise is flagged from the server data
              const isExerciseFlagged = flaggedExercises.has(exercise.id);

              return (
                <div
                  key={exercise.id}
                  ref={(el) => {
                    exerciseRefs.current[index] = el;
                  }}
                  id={`exercise-${index}`}
                >
                  <Exercise
                    id={exercise.id}
                    number={index + 1}
                    question={renderQuestionData(exercise.question_data)}
                    solution={renderSolutionData(exercise.solution_data)}
                    onMarkCorrect={handleCompleteExercise}
                    isCurrent={index === currentExerciseIndex}
                    isCompleted={exercise.id in localCompletedExercises}
                    wasCorrect={
                      exercise.id in localCompletedExercises
                        ? localCompletedExercises[exercise.id]
                        : false
                    }
                    tutorState={
                      exercise.id in exerciseTutorState
                        ? exerciseTutorState[exercise.id]
                        : "none"
                    }
                    isFlagged={isExerciseFlagged}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion feedback when all exercises are done */}
      {allCorrect && (
        <Card className="mt-10 bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Ottimo lavoro!</h3>
            <p className="text-muted-foreground mb-6">
              Hai completato correttamente tutti gli esercizi in questa scheda.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link
                  href={
                    fromFavorites
                      ? "/dashboard/preferiti"
                      : `/${subjectSlug}/esercizi/${topicSlug}`
                  }
                >
                  Torna agli esercizi
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
