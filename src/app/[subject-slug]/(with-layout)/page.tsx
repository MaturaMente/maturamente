import { Suspense } from "react";
import { NotesDataServer } from "@/app/components/subject/notes/notes-data-server";
import { SkeletonText, SkeletonCard, SkeletonList } from "@/app/components/shared/loading";

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
          <SkeletonText numberOfLines={1} height="h-9" width="w-48" />
          <div className="relative w-full sm:max-w-xs">
            <SkeletonCard height="h-10" width="w-full" />
          </div>
        </div>
      </div>

      {/* Favorites Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <SkeletonText numberOfLines={1} height="h-7" width="w-24" />
        </div>
        <SkeletonList
          count={3}
          variant="card"
          gridColumns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          className="grid gap-4"
          renderItem={(i) => <SkeletonCard key={i} height="h-42" />}
        />
      </section>

      {/* All Notes Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <SkeletonText numberOfLines={1} height="h-7" width="w-32" />
        </div>
        <SkeletonList
          count={8}
          variant="card"
          gridColumns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          className="grid gap-4"
          renderItem={(i) => <SkeletonCard key={i} height="h-42" />}
        />
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
