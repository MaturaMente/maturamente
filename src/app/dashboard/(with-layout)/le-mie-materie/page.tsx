import { Suspense } from "react";
import { SubjectsDataServer } from "@/app/components/dashboard/le-mie-materie/subjects-data-server";
import { SkeletonText, SkeletonCard, SkeletonList } from "@/app/components/shared/loading";
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
      <div className="space-y-2 mb-8">
        <SkeletonText numberOfLines={1} height="h-8" width="w-48" />
        <SkeletonText numberOfLines={1} height="h-5" width="w-32" />
      </div>
      <SkeletonList
        count={6}
        variant="card"
        gridColumns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        className="grid gap-6"
        renderItem={(i) => <SkeletonCard key={i} height="h-48" />}
      />
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
          features={[
            "Organizza appunti per materia",
            "Accesso rapido ai materiali",
            "Tracciamento del progresso",
            "Sincronizzazione su tutti i dispositivi",
          ]}
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
