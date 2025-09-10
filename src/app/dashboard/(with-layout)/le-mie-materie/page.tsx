import { Suspense } from "react";
import { SubjectsDataServer } from "@/app/components/dashboard/le-mie-materie/subjects-data-server";
import { SubjectsGrid } from "@/app/components/dashboard/le-mie-materie/subjects-grid-client";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";
import { isAuthenticated } from "@/utils/user-context";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Le mie materie | MaturaMente",
  description:
    "Esplora tutte le tue materie di studio su MaturaMente. Accedi ai tuoi appunti e materiali didattici organizzati per materia.",
  keywords: [
    "materie studio",
    "appunti materie",
    "materiali didattici",
    "organizzazione studio",
    "MaturaMente materie",
  ],
};

// Loading component for subjects
function SubjectsLoadingSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Server component to handle data fetching
async function SubjectsContent() {
  const data = await SubjectsDataServer();
  return <SubjectsGrid subjects={data.subjects} error={data.error} />;
}

export default async function LeMieMateriePage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <div className="items-center h-full">
        <UnauthenticatedOverlay
          title="Accedi alle tue materie"
          description="Crea un account gratuito per organizzare e accedere ai tuoi appunti per materia"
        >
          <></>
        </UnauthenticatedOverlay>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <Suspense fallback={<SubjectsLoadingSkeleton />}>
        <SubjectsContent />
      </Suspense>
    </div>
  );
}
