import { Skeleton } from "@/components/ui/skeleton";

/**
 * Simple statistics page skeleton - minimal layout
 */
export function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 container mx-auto max-w-5xl">
      {/* Header */}
      <div className="relative w-full pt-4">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-8 md:h-9 w-48" />
          <Skeleton className="h-4 md:h-5 w-80" />
        </div>
      </div>

      {/* Main Stats Cards (2 cards) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>

      {/* Tabs (2 triggers) */}
      <div className="flex gap-2 w-fit">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Activity Chart (default tab content) */}
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}
