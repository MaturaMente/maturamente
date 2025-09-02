"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  MessageSquareText,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MathRenderer from "@/app/components/shared/renderer/math-renderer";
import { motion, AnimatePresence } from "framer-motion";

interface MobileExerciseViewProps {
  id: string;
  number: number;
  question: string;
  solution: string;
  onMarkCorrect: (
    exerciseId: string,
    isCorrect: boolean,
    attempt: number
  ) => Promise<void>;
  isCompleted?: boolean;
  wasCorrect?: boolean;
  tutorState?: "none" | "showOptions" | "showTutor";
  autoExpand?: boolean;
  onExerciseComplete?: (id: string, isCorrect: boolean) => void;
  inFavouritesPage?: boolean;
  isFlagged?: boolean;
}

export default function MobileExerciseView({
  id,
  number,
  question,
  solution,
  onMarkCorrect,
  isCompleted = false,
  wasCorrect = false,
  tutorState = "none",
  autoExpand = false,
  onExerciseComplete,
  inFavouritesPage = false,
  isFlagged: initialIsFlagged = false,
}: MobileExerciseViewProps) {
  // State for this exercise
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isRevealed, setIsRevealed] = useState(isCompleted || inFavouritesPage);
  const [isIncorrect, setIsIncorrect] = useState(isCompleted && !wasCorrect);
  const [showTutor, setShowTutor] = useState(tutorState === "showTutor");
  const [attemptCount, setAttemptCount] = useState(1);
  const [exerciseCompleted, setExerciseCompleted] = useState(isCompleted);
  const [isFlagged, setIsFlagged] = useState(initialIsFlagged);
  const [isLoading, setIsLoading] = useState(false);

  // Ref for scrolling to the expanded exercise
  const exerciseRef = useRef<HTMLDivElement>(null);

  // Auto-expand when autoExpand changes
  useEffect(() => {
    // If in favorites page, always expand
    setIsExpanded(autoExpand || false); // Don't auto-expand completed exercises

    // Scroll to this exercise if it's being auto-expanded
    if (autoExpand && exerciseRef.current) {
      setTimeout(() => {
        exerciseRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [autoExpand, isCompleted, inFavouritesPage]);

  // Initialize component state based on props
  useEffect(() => {
    // For favorites page, solution is always revealed
    if (inFavouritesPage) {
      setIsRevealed(true);
      return;
    }

    // If the exercise is completed, reveal the solution
    if (isCompleted) {
      setIsRevealed(true);
      setExerciseCompleted(true);

      // If it was incorrect, show the tutor options
      if (!wasCorrect) {
        setIsIncorrect(true);

        // If the tutor state is specified, set the appropriate UI state
        if (tutorState === "showTutor") {
          setShowTutor(true);
        }
      }
    }
  }, [isCompleted, wasCorrect, tutorState, inFavouritesPage]);

  // Toggle solution visibility
  const handleRevealSolution = () => {
    // In favorites page, solution is always revealed
    if (inFavouritesPage) return;

    // Only toggle if the exercise is not completed yet
    if (!exerciseCompleted) {
      setIsRevealed((prev) => !prev);
    }
  };

  // Handle marking as correct
  const handleMarkCorrect = async () => {
    if (inFavouritesPage) return; // No-op in favorites page

    await onMarkCorrect(id, true, attemptCount);
    setExerciseCompleted(true);
    setIsIncorrect(false);

    // Call the onExerciseComplete callback if provided
    if (onExerciseComplete) {
      onExerciseComplete(id, true);
    }
  };

  // Handle marking as incorrect
  const handleMarkIncorrect = () => {
    if (inFavouritesPage) return; // No-op in favorites page

    // First log the incorrect attempt in the database
    onMarkCorrect(id, false, attemptCount)
      .then(() => {
        console.log(
          `Exercise ${id} marked as incorrect, attempt: ${attemptCount}`
        );
      })
      .catch((error) => {
        console.error("Failed to record incorrect attempt:", error);
      });

    // Then show the tutor options
    setIsIncorrect(true);

    // Call the onExerciseComplete callback if provided
    if (onExerciseComplete) {
      onExerciseComplete(id, false);
    }
  };

  // Handle retry after getting it wrong
  const handleRetry = () => {
    if (inFavouritesPage) return; // No-op in favorites page

    setIsRevealed(false); // Blur the solution again
    setIsIncorrect(false);
    setShowTutor(false);
    setExerciseCompleted(false); // Reset the completed state for retries
    setAttemptCount((prev) => prev + 1);
  };

  // Handle showing the tutor
  const handleShowTutor = () => {
    if (inFavouritesPage) return; // No-op in favorites page

    setShowTutor(true);
  };

  // Handle marking as understood after tutor help
  const handleUnderstoodAfterHelp = async () => {
    if (inFavouritesPage) return; // No-op in favorites page

    await onMarkCorrect(id, true, attemptCount);
    setExerciseCompleted(true);
    setIsIncorrect(false);
    setShowTutor(false);

    // Call the onExerciseComplete callback if provided
    if (onExerciseComplete) {
      onExerciseComplete(id, true);
    }
  };

  // Handle still not understanding after tutor help
  const handleStillNotUnderstood = () => {
    if (inFavouritesPage) return; // No-op in favorites page

    setShowTutor(false); // Reset to show the tutor options again
  };

  // Toggle flag status
  const handleToggleFlag = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the accordion from toggling
    setIsLoading(true);

    try {
      const response = await fetch("/api/exercises/flag-exercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exerciseId: id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFlagged(data.flagged);
      }
    } catch (error) {
      console.error("Error toggling exercise flag:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <>
      <div
        ref={exerciseRef}
        data-exercise-id={id}
        className="border-b last:border-b-0 border-border overflow-hidden transition-colors"
      >
        {/* Exercise header - always visible */}
        <div
          onClick={toggleExpanded}
          className="flex items-center justify-between p-4 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Es {number}.</span>
              {exerciseCompleted && wasCorrect && !inFavouritesPage && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFlag}
              disabled={isLoading}
              className={cn(
                "p-1 transition-colors cursor-pointer hover:scale-110 transition-transform duration-200",
                isFlagged
                  ? "text-yellow-500"
                  : "text-muted-foreground hover:text-yellow-500"
              )}
            >
              <Star
                className="h-4 w-4"
                fill={isFlagged ? "currentColor" : "none"}
              />
            </button>

            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
                opacity: { duration: 0.2 },
              }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-4 py-4">
                {/* Question */}
                <div className="prose prose-sm dark:prose-invert mb-6">
                  {question.split("\n").map((line, index) => (
                    <div key={index} className="mb-2 text-xl">
                      <MathRenderer content={line} />
                    </div>
                  ))}
                </div>

                {/* Solution Box with Blur Effect - always visible in favorites */}
                <div className="relative">
                  {/* Overlay text for blurred solution */}
                  {!inFavouritesPage && !isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="px-4 py-2 rounded-md text-muted-foreground font-medium">
                        Premi per rivelare la soluzione
                      </div>
                    </div>
                  )}
                  <div
                    onClick={
                      inFavouritesPage ? undefined : handleRevealSolution
                    }
                    className={cn(
                      "bg-muted/30 border border-border rounded-md p-4 mb-4 transition-all duration-200",
                      inFavouritesPage ? "" : "cursor-pointer", // Remove pointer cursor in favorites
                      !inFavouritesPage && !isRevealed
                        ? "blur-sm select-none"
                        : ""
                    )}
                  >
                    <h4 className="text-sm font-semibold mb-3 text-primary">
                      Soluzione
                    </h4>
                    <div className="prose prose-sm dark:prose-invert">
                      {solution.split("\n").map((line, index) => (
                        <div key={index} className="mb-2 text-lg">
                          <MathRenderer content={line} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Only show interactive elements if not in favorites page */}
                {!inFavouritesPage && (
                  <>
                    {/* Correct/incorrect buttons */}
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-2 my-4 transition-all duration-200",
                        isRevealed && !exerciseCompleted && !isIncorrect
                          ? "opacity-100 max-h-24"
                          : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
                      )}
                    >
                      <Button
                        onClick={handleMarkIncorrect}
                        variant="outline"
                        className="flex items-center justify-center gap-2 border-red-600/50 text-red-600 hover:bg-red-600/30"
                      >
                        <XCircle className="h-4 w-4" />
                        Errato
                      </Button>
                      <Button
                        onClick={handleMarkCorrect}
                        variant="outline"
                        className="flex items-center justify-center gap-2 border-green-600/50 text-green-600 hover:bg-green-600/30"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Corretto
                      </Button>
                    </div>

                    {/* Tutor options when marked as incorrect */}
                    <div
                      className={cn(
                        "mt-4 space-y-3 transition-all duration-200",
                        isIncorrect && !showTutor
                          ? "opacity-100 max-h-60"
                          : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
                      )}
                    >
                      <p className="text-sm text-muted-foreground">
                        Ho visto che stai avendo difficoltà con questo
                        esercizio. Cosa vuoi fare adesso?
                      </p>
                      <div className="flex flex-row gap-2">
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          className="w-full"
                        >
                          Riprova
                        </Button>
                        <Button
                          onClick={handleShowTutor}
                          className="flex items-center justify-center gap-2 w-full"
                        >
                          <MessageSquareText className="h-4 w-4" />
                          Pit
                        </Button>
                      </div>
                    </div>

                    {/* Tutor explanation */}
                    <div
                      className={cn(
                        "mt-4 space-y-4 transition-all duration-200",
                        showTutor
                          ? "opacity-100 max-h-60"
                          : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
                      )}
                    >
                      <p className="text-sm">
                        Dopo l'aiuto di Pit hai capito l'esercizio?
                      </p>

                      <div className="flex flex-row gap-2">
                        <Button
                          onClick={handleStillNotUnderstood}
                          variant="outline"
                          className="flex items-center justify-center gap-2 border-red-600/50 text-red-600 hover:bg-red-600/30 w-1/2"
                        >
                          <XCircle className="h-4 w-4" />
                          Errato
                        </Button>
                        <Button
                          onClick={handleUnderstoodAfterHelp}
                          variant="outline"
                          className="flex items-center justify-center gap-2 border-green-600/50 text-green-600 hover:bg-green-600/30 w-1/2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Corretto
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
