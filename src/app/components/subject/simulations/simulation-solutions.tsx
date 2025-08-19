"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SolutionsClientProps } from "@/types/simulationsTypes";
import SolutionCategories from "./solution/solution-categories";
import SolutionViewer from "./solution/solution-viewer";

export default function SimulationSolutions({
  simulation,
  solutions,
}: SolutionsClientProps) {
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;
  const [selectedSolution, setSelectedSolution] = useState(
    solutions.length > 0 ? solutions[0] : null
  );

  return (
    <div>
      <div className="mb-8">
        <div className="block md:hidden mb-4">
          <Link href={`/${subjectSlug}/simulazioni`}>
            <div className="text-muted-foreground items-center w-fit gap-1 mb-1 flex flex-row hover:text-foreground transition-all md:block hidden">
              <ArrowLeft className="h-4 w-4" />
              <span>Torna alle simulazioni</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-between mb-8 border-b pb-4 border-border">
          <h1 className="text-4xl font-bold text-left">Soluzioni</h1>
          <Link href={`/${subjectSlug}/simulazioni`}>
            <div className="text-muted-foreground items-center w-fit gap-1 mb-1 flex flex-row hover:text-foreground transition-all">
              <span>Torna alle simulazioni</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SolutionCategories
          solutions={solutions}
          selectedSolution={selectedSolution}
          onSelectSolution={(solution) => setSelectedSolution(solution)}
        />

        <SolutionViewer selectedSolution={selectedSolution} />
      </div>
    </div>
  );
}
