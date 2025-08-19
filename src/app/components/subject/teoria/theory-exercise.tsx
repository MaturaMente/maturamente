"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExerciseCard from "@/app/components/subject/esercizi/cards/exercise-card";
import {
  SubtopicWithTheoryType,
  TopicType,
  ExerciseCardType,
} from "@/types/theoryTypes";

interface TheoryExerciseCardsProps {
  topic: TopicType;
  subtopic: SubtopicWithTheoryType;
}

export default function TheoryExerciseCards({
  topic,
  subtopic,
}: TheoryExerciseCardsProps) {
  if (subtopic.exercise_cards.length === 0) {
    return null;
  }

  // Ensure we have proper typing, treating exercise_cards as ExerciseCardType[]
  const exerciseCards = subtopic.exercise_cards as ExerciseCardType[];

  return (
    <div className="mt-8 w-full">
      <h3 className="text-xl font-semibold mb-4">Esercizi correlati</h3>
      <div className="relative w-full">
        {" "}
        {/* Position context for the overlay */}
        <div className="flex gap-4">
          {/* First card: always visible */}
          <div className="w-full sm:flex-1">
            <ExerciseCard
              id={exerciseCards[0].id}
              topicName={topic.name}
              topicOrder={topic.order_index}
              subtopicName={subtopic.name}
              subtopicOrder={subtopic.order_index}
              description={exerciseCards[0].description}
              difficulty={exerciseCards[0].difficulty}
              isCompleted={exerciseCards[0].is_completed}
              totalExercises={exerciseCards[0].total_exercises}
              completedExercises={exerciseCards[0].completed_exercises}
              isFlagged={exerciseCards[0].is_flagged}
            />
          </div>

          {/* Second card: hidden on mobile, visible on sm+ */}
          {exerciseCards.length > 1 && (
            <div className="hidden sm:block sm:flex-1">
              <ExerciseCard
                id={exerciseCards[1].id}
                topicName={topic.name}
                topicOrder={topic.order_index}
                subtopicName={subtopic.name}
                subtopicOrder={subtopic.order_index}
                description={exerciseCards[1].description}
                difficulty={exerciseCards[1].difficulty}
                isCompleted={exerciseCards[1].is_completed}
                totalExercises={exerciseCards[1].total_exercises}
                completedExercises={exerciseCards[1].completed_exercises}
                isFlagged={exerciseCards[1].is_flagged}
              />
            </div>
          )}

          {/* Third card: hidden on sm, visible on md+ */}
          {exerciseCards.length > 2 && (
            <div className="hidden md:block md:flex-1">
              <ExerciseCard
                id={exerciseCards[2].id}
                topicName={topic.name}
                topicOrder={topic.order_index}
                subtopicName={subtopic.name}
                subtopicOrder={subtopic.order_index}
                description={exerciseCards[2].description}
                difficulty={exerciseCards[2].difficulty}
                isCompleted={exerciseCards[2].is_completed}
                totalExercises={exerciseCards[2].total_exercises}
                completedExercises={exerciseCards[2].completed_exercises}
                isFlagged={exerciseCards[2].is_flagged}
              />
            </div>
          )}
        </div>
        {/* Gradient overlay and "+n altri" button */}
        {exerciseCards.length > 1 && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pointer-events-none">
            {/* Gradient */}
            <div className="absolute inset-y-0 right-0 w-[80px] sm:w-[100px] md:w-[120px] lg:w-[160px]">
              {/* Light mode gradient */}
              <div
                className="absolute inset-0 dark:hidden"
                style={{
                  background: `linear-gradient(90deg,
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 255, 255, 0.7) 50%,
                    rgba(255, 255, 255, 0.95) 100%)`,
                }}
              />
              {/* Dark mode gradient */}
              <div
                className="absolute inset-0 hidden dark:block"
                style={{
                  background: `linear-gradient(90deg,
                    rgba(27, 27, 27, 0) 0%,
                    rgba(27, 27, 27, 0.7) 50%,
                    rgba(27, 27, 27, 0.95) 100%)`,
                }}
              />
            </div>

            {/* "+n altri" Button Link */}
            <Link
              href={`/dashboard/esercizi?subtopic=${subtopic.id}`}
              className="relative z-10 mr-4 sm:mr-5 md:mr-6 lg:mr-8 bg-muted/80 hover:bg-muted rounded-full py-2 px-4 backdrop-blur-sm border border-border cursor-pointer transition-colors duration-200 pointer-events-auto"
            >
              <span className="text-xs md:text-sm font-medium flex items-center">
                {/* --- Mobile View --- */}
                <span className="inline sm:hidden">
                  {(() => {
                    const hidden = exerciseCards.length - 1; // Mobile shows 1 card
                    // Button is visible only if exerciseCards.length > 1, so hidden is always > 0 for mobile.
                    return (
                      <>
                        <span>+{hidden}</span>
                        <span className="ml-1">altri</span>
                      </>
                    );
                  })()}
                </span>

                {/* --- Tablet View (sm) --- */}
                <span className="hidden sm:inline md:hidden">
                  {(() => {
                    const hidden =
                      exerciseCards.length - Math.min(exerciseCards.length, 2); // Tablet shows up to 2 cards
                    if (hidden > 0) {
                      return (
                        <>
                          <span>+{hidden}</span>
                          <span className="ml-1">altri</span>
                        </>
                      );
                    } else {
                      return <span>Vedi tutti</span>;
                    }
                  })()}
                </span>

                {/* --- Desktop View (md+) --- */}
                <span className="hidden md:inline">
                  {(() => {
                    const hidden =
                      exerciseCards.length - Math.min(exerciseCards.length, 3); // Desktop shows up to 3 cards
                    if (hidden > 0) {
                      return (
                        <>
                          <span>+{hidden}</span>
                          <span className="ml-1">altri</span>
                        </>
                      );
                    } else {
                      return <span>Vedi tutti</span>;
                    }
                  })()}
                </span>
                <ChevronRight className="ml-1 h-3 w-3 opacity-70" />
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Main "Esercitati su questo argomento" Button */}
      <div className="flex justify-center sm:justify-start mt-4 lg:mt-8 p-1 w-full">
        <Link
          href={`/dashboard/esercizi?subtopic=${subtopic.id}`}
          className="w-full sm:w-auto"
        >
          <Button
            className="group px-4 sm:px-8 text-white cursor-pointer w-full sm:w-auto"
            variant="default"
            size="lg"
          >
            <span>Esercitati su questo argomento</span>
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
