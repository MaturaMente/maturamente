"use client";

import { ArrowLeft, Book, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExerciseHeaderProps {
  title: string;
  topicName?: string;
  subtopicName?: string;
  backHref?: string;
  backLabel?: string;
  isCardFlagged?: boolean;
  onToggleFlag?: () => void;
  isFlagging?: boolean;
  difficulty?: number;
  showTheoryButton?: boolean;
  theoryHref?: string;
  children?: React.ReactNode;
}

export default function ExerciseHeader({
  title,
  topicName,
  subtopicName,
  backHref,
  backLabel = "Torna agli esercizi",
  isCardFlagged = false,
  onToggleFlag,
  isFlagging = false,
  difficulty,
  showTheoryButton = false,
  theoryHref,
  children,
}: ExerciseHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link href={backHref}>
          <div className="text-muted-foreground items-center w-fit gap-1 mb-1 flex flex-row hover:text-foreground transition-all">
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </div>
        </Link>
      )}

      <div className="flex flex-col gap-2 mb-6 pb-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <h1 className="lg:text-4xl text-2xl font-bold">{title}</h1>

          <div className="flex items-center gap-3">
            {children}

            {showTheoryButton && theoryHref && (
              <Link href={theoryHref} className="hidden md:block">
                <Button
                  className="flex items-center gap-2 cursor-pointer"
                  variant="outline"
                >
                  <Book className="h-4 w-4" />
                  Studia la Teoria
                </Button>
              </Link>
            )}
          </div>
          {onToggleFlag && (
            <button
              onClick={onToggleFlag}
              className={cn(
                "p-2 hover:text-yellow-500 cursor-pointer hover:scale-105 transition-colors",
                isCardFlagged ? "text-yellow-500" : "text-muted-foreground"
              )}
              disabled={isFlagging}
            >
              <Star
                className="h-5 w-5"
                fill={isCardFlagged ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        {(topicName || subtopicName) && (
          <div className="text-sm text-muted-foreground">
            {topicName}
            {subtopicName && ` > ${subtopicName}`}
          </div>
        )}

        {difficulty && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
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
        )}
      </div>
    </div>
  );
}
