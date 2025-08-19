"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Solution } from "@/types/simulationsTypes";

interface SolutionCategoriesProps {
  solutions: Solution[];
  selectedSolution: Solution | null;
  onSelectSolution: (solution: Solution) => void;
}

export default function SolutionCategories({
  solutions,
  selectedSolution,
  onSelectSolution,
}: SolutionCategoriesProps) {
  // State for collapsible sections
  const [problemiExpanded, setProblemiExpanded] = useState(true);
  const [quesitiExpanded, setQuesitiExpanded] = useState(true);

  // Separate solutions into Problemi and Quesiti
  const problemiSolutions = solutions.filter(
    (sol) =>
      sol.title.toLowerCase().includes("problema") ||
      sol.title.toLowerCase().includes("problem")
  );

  const quesitiSolutions = solutions.filter(
    (sol) =>
      sol.title.toLowerCase().includes("quesito") ||
      sol.title.toLowerCase().includes("quesit")
  );

  // Other solutions that don't match either category
  const otherSolutions = solutions.filter(
    (sol) => !problemiSolutions.includes(sol) && !quesitiSolutions.includes(sol)
  );

  return (
    <div className="md:col-span-1 space-y-4">
      {/* Problemi Section */}
      {problemiSolutions.length > 0 && (
        <Card className="py-4 md:py-6">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setProblemiExpanded(!problemiExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Problemi ({problemiSolutions.length})
              </CardTitle>
              <div
                className={`transition-transform duration-200 ${
                  problemiExpanded ? "rotate-180" : "rotate-0"
                }`}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          {problemiExpanded && (
            <div className="overflow-hidden">
              <CardContent className="pt-2 space-y-2 dark:text-white">
                {problemiSolutions.map((solution) => (
                  <Button
                    key={solution.id}
                    variant={
                      selectedSolution?.id === solution.id
                        ? "default"
                        : "outline"
                    }
                    className="w-full justify-start dark:text-white"
                    onClick={() => onSelectSolution(solution)}
                  >
                    {solution.title}
                  </Button>
                ))}
              </CardContent>
            </div>
          )}
        </Card>
      )}

      {/* Quesiti Section */}
      {quesitiSolutions.length > 0 && (
        <Card className="py-4 md:py-6">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setQuesitiExpanded(!quesitiExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Quesiti ({quesitiSolutions.length})
              </CardTitle>
              <div
                className={`transition-transform duration-200 ${
                  quesitiExpanded ? "rotate-180" : "rotate-0"
                }`}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          {quesitiExpanded && (
            <div className="overflow-hidden">
              <CardContent className="pt-2 space-y-2 dark:text-white">
                {quesitiSolutions.map((solution) => (
                  <Button
                    key={solution.id}
                    variant={
                      selectedSolution?.id === solution.id
                        ? "default"
                        : "outline"
                    }
                    className="w-full justify-start dark:text-white"
                    onClick={() => onSelectSolution(solution)}
                  >
                    {solution.title}
                  </Button>
                ))}
              </CardContent>
            </div>
          )}
        </Card>
      )}

      {/* Other Solutions (not categorized) */}
      {otherSolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Altre soluzioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherSolutions.map((solution) => (
              <Button
                key={solution.id}
                variant={
                  selectedSolution?.id === solution.id ? "default" : "outline"
                }
                className="w-full justify-start text-white"
                onClick={() => onSelectSolution(solution)}
              >
                {solution.title}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
