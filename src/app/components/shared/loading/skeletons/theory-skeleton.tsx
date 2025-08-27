import { HeaderSkeleton } from "./header-skeleton";
import { BaseListSkeleton } from "./base-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the theory page (topic, subtopic, long text, sidebar)
 */
export function TheorySkeleton() {
  return (
    <div className="flex gap-8 min-h-screen">
      {/* Main content skeleton */}
      <main className="flex-1 min-h-[800px]">
        <HeaderSkeleton titleWidth="w-72" withSubtitle />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-1/2" /> {/* Subtopic title */}
          <Skeleton className="h-5 w-1/3" /> {/* Subtopic subtitle */}
          <div className="space-y-3 mt-6 min-h-[400px]">
            {/* Long text skeleton with fixed dimensions */}
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
            <Skeleton className="h-5 w-9/12" />
            <Skeleton className="h-5 w-8/12" />
            <Skeleton className="h-5 w-7/12" />
            <Skeleton className="h-5 w-7/12" />
            <Skeleton className="h-5 w-7/12" />
            <Skeleton className="h-5 w-7/12" />
            <Skeleton className="h-5 w-7/12" />
            {/* Image placeholder */}
            <div className="my-8">
              <Skeleton className="h-64 w-full max-w-2xl mx-auto rounded-lg" />
            </div>
            {/* More content */}
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-9/12" />
            <Skeleton className="h-5 w-8/12" />
          </div>
        </div>
      </main>
      {/* Sidebar skeleton with fixed width */}
      <aside className="hidden lg:block w-64 flex-shrink-0 min-h-[600px]">
        <div className="space-y-4 sticky top-8">
          <Skeleton className="h-7 w-40 mb-2" /> {/* Sidebar title */}
          <BaseListSkeleton count={5} itemHeight="h-6" withBorder={false} />
          <div className="mt-8 space-y-2">
            <Skeleton className="h-6 w-32" />
            <BaseListSkeleton count={3} itemHeight="h-5" withBorder={false} />
          </div>
        </div>
      </aside>
    </div>
  );
}
