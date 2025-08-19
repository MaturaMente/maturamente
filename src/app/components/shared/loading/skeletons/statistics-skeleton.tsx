import { Skeleton } from "@/components/ui/skeleton";

/**
 * Simple statistics page skeleton - minimal layout
 */
export function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 container mx-auto max-w-5xl">
      {/* Header */}
      <div className="relative w-full pt-4">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 md:gap-4">
          <div>
            <Skeleton className="h-8 md:h-9 w-32 mb-1 md:mb-2" />
            <Skeleton className="h-4 md:h-5 w-64" />
          </div>
          <Skeleton className="h-16 w-32 rounded-lg" />
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 w-fit">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>

      {/* Activity Chart */}
      <Skeleton className="h-80 rounded-lg" />

      {/* Bottom Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
