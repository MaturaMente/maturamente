import { Suspense } from "react";
import { NotesDataServer } from "@/app/components/subject/notes/notes-data-server";
import { Skeleton } from "@/components/ui/skeleton";

interface SubjectPageProps {
  params: Promise<{
    "subject-slug": string;
  }>;
}

function NotesLoadingSkeleton() {
  return (
    <div className="space-y-8 opacity">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <Skeleton className="h-9 w-48" />
          <div className="relative w-full sm:max-w-xs">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Favorites Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-42 rounded-lg w-full"></Skeleton>
          ))}
        </div>
      </section>

      {/* All Notes Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-42 rounded-lg w-full"></Skeleton>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { "subject-slug": subjectSlug } = await params;

  return (
    <div className="container mx-auto">
      <Suspense fallback={<NotesLoadingSkeleton />}>
        {/* soft color glow background */}
        <NotesDataServer subjectSlug={subjectSlug} />
      </Suspense>
    </div>
  );
}
