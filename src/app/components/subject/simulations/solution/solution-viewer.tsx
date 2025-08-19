"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PdfViewer from "@/app/components/shared/renderer/pdf-renderer";
import { Solution } from "@/types/simulationsTypes";

interface SolutionViewerProps {
  selectedSolution: Solution | null;
}

export default function SolutionViewer({
  selectedSolution,
}: SolutionViewerProps) {
  if (!selectedSolution) {
    return (
      <div className="md:col-span-2 flex items-center justify-center h-full bg-muted/30 rounded-lg p-12">
        <p className="text-muted-foreground">
          Seleziona una soluzione per visualizzarla
        </p>
      </div>
    );
  }

  return (
    <div className="md:col-span-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{selectedSolution.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative min-h-[600px]">
            <PdfViewer
              pdfUrl={selectedSolution.pdf_url}
              height={600}
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
