/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MessageSquareText, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import MathRenderer from "@/app/components/shared/renderer/math-renderer";

interface ExerciseProps {
  id: string;
  number: number;
  question: string;
  solution: string;
  onMarkCorrect: (
    exerciseId: string,
    isCorrect: boolean,
    attempt: number
  ) => Promise<void>;
  isCurrent: boolean;
  // Add the completed status from database
  isCompleted?: boolean;
  wasCorrect?: boolean;
  // New prop for current tutor interaction state
  tutorState?: "none" | "showOptions" | "showTutor";
  // New prop for flagged status
  isFlagged?: boolean;
}

export function Exercise({
  id,
  number,
  question,
  solution,
  onMarkCorrect,
  isCurrent,
  isCompleted = false,
  wasCorrect = false,
  tutorState = "none",
  isFlagged: initialIsFlagged = false,
}: ExerciseProps) {
  // State for this exercise
  const [isRevealed, setIsRevealed] = useState(isCompleted);
  const [isIncorrect, setIsIncorrect] = useState(isCompleted && !wasCorrect);
  const [showTutor, setShowTutor] = useState(tutorState === "showTutor");
  const [attemptCount, setAttemptCount] = useState(1);
  const [exerciseCompleted, setExerciseCompleted] = useState(isCompleted);
  const [isFlagged, setIsFlagged] = useState(initialIsFlagged);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize component state based on props
  useEffect(() => {
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
  }, [isCompleted, wasCorrect, tutorState]);

  // Toggle solution visibility
  const handleRevealSolution = () => {
    // Only toggle if the exercise is not completed yet
    if (!exerciseCompleted) {
      setIsRevealed((prev) => !prev);
    }
  };

  // Handle marking as correct
  const handleMarkCorrect = async () => {
    await onMarkCorrect(id, true, attemptCount);
    setExerciseCompleted(true);
    setIsIncorrect(false);
  };

  // Handle marking as incorrect
  const handleMarkIncorrect = () => {
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
  };

  // Handle retry after getting it wrong
  const handleRetry = () => {
    setIsRevealed(false);
    setIsIncorrect(false);
    setShowTutor(false);
    setExerciseCompleted(false); // Reset the completed state for retries
    setAttemptCount((prev) => prev + 1);
  };

  // Handle showing the tutor
  const handleShowTutor = () => {
    setShowTutor(true);
  };

  // Handle marking as understood after tutor help
  const handleUnderstoodAfterHelp = async () => {
    await onMarkCorrect(id, true, attemptCount);
    setExerciseCompleted(true);
    setIsIncorrect(false);
    setShowTutor(false);
  };

  // Handle still not understanding after tutor help
  const handleStillNotUnderstood = () => {
    setShowTutor(false); // Reset to show the tutor options again
  };

  // Toggle flag status
  const handleToggleFlag = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from being triggered
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

  return (
    <Card
      className={cn(
        "mb-6 transition-all duration-300",
        // Only apply hover effect if NOT the current card
        !isCurrent && "hover:ring-1 hover:ring-primary/50",
        isCurrent && !exerciseCompleted ? "ring-1 ring-primary/50" : "",
        exerciseCompleted ? "opacity-100" : ""
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="font-semibold">Es {number}.</div>
          <div className="flex items-center gap-2">
            {exerciseCompleted && wasCorrect && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Completato
              </div>
            )}
            <button
              onClick={handleToggleFlag}
              disabled={isLoading}
              className={cn(
                "transition-colors cursor-pointer hover:scale-110 transition-transform duration-200",
                isFlagged
                  ? "text-yellow-500"
                  : "text-muted-foreground hover:text-yellow-500"
              )}
            >
              <Star
                className="h-5 w-5"
                fill={isFlagged ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Question */}
        <div className="prose prose-sm dark:prose-invert mb-8">
          {question.split("\n").map((line, index) => (
            <div key={index} className="my-2 text-xl">
              <MathRenderer content={line} />
            </div>
          ))}
        </div>

        {/* Solution Box with Blur Effect */}
        <div className="relative">
          {/* Overlay text for current blurred exercise - desktop only */}
          {isCurrent && !isRevealed && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none hidden md:flex">
              <div className="px-4 py-2 rounded-md text-muted-foreground font-medium">
                Premi per rivelare la soluzione
              </div>
            </div>
          )}
          <div
            onClick={handleRevealSolution}
            className={cn(
              "bg-muted/30 border border-border rounded-md p-4 mb-4 transition-all duration-200 cursor-pointer",
              isRevealed ? "" : "blur-sm select-none"
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

        {/* Correct/incorrect buttons - Full width with text */}
        <AnimatePresence>
          {isRevealed && !exerciseCompleted && !isIncorrect && (
            <motion.div
              className="grid grid-cols-2 gap-3 mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="outline"
                className="border-red-600/50 text-red-600 hover:bg-red-600/10 hover:text-red-600 flex items-center justify-center"
                onClick={handleMarkIncorrect}
              >
                <XCircle className="h-5 w-5 mr-2" />
                <span>Errato</span>
              </Button>
              <Button
                variant="outline"
                className="border-green-600/50 text-green-600 hover:bg-green-600/10 hover:text-green-600 flex items-center justify-center"
                onClick={handleMarkCorrect}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>Corretto</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Tutor section that appears when marked as incorrect */}
        <AnimatePresence>
          {isIncorrect && !showTutor && (
            <motion.div
              className="mt-4 border-t pt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="font-medium mb-2">Tutor AI</div>
              <p className="text-sm text-muted-foreground mb-3">
                Vedo che stai avendo difficoltà con questo esercizio. Vuoi che:
              </p>
              <ul className="text-sm mb-4 list-disc pl-5 space-y-1">
                <li>Ti spieghi la soluzione passo dopo passo</li>
                <li>Ti dia un suggerimento per aiutarti</li>
                <li>Ti mostri un esempio simile</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={handleRetry}
                >
                  Riprova l'esercizio
                </Button>
                <Button
                  className="flex-1 text-white pointer cursor-pointer"
                  onClick={handleShowTutor}
                >
                  <MessageSquareText className="h-4 w-4 mr-2" />
                  Scrivi al Tutor
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Follow-up after AI Tutor help */}
        <AnimatePresence>
          {showTutor && (
            <motion.div
              className="mt-4 border-t pt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-center mb-3">
                Dopo l'aiuto del Tutor, hai capito l'esercizio?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-red-600/50 text-red-600 hover:bg-red-600/10 hover:text-red-600 flex items-center justify-center"
                  onClick={handleStillNotUnderstood}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  <span>Non ancora</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600/50 text-green-600 hover:bg-green-600/10 hover:text-green-600 flex items-center justify-center"
                  onClick={handleUnderstoodAfterHelp}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <span>Sì, ho capito</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground pt-0">
        {attemptCount > 1 && !exerciseCompleted && (
          <div>Tentativo {attemptCount}</div>
        )}
      </CardFooter>
    </Card>
  );
}
