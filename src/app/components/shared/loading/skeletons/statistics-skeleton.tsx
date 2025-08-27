import { SkeletonText, SkeletonCard, SkeletonList } from "../index";

/**
 * Simple statistics page skeleton - minimal layout
 */
export function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 container mx-auto max-w-5xl">
      {/* Header */}
      <div className="relative w-full pt-4">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 md:gap-4">
          <div className="space-y-2">
            <SkeletonText numberOfLines={1} height="h-8 md:h-9" width="w-32" />
            <SkeletonText numberOfLines={1} height="h-4 md:h-5" width="w-64" />
          </div>
          <SkeletonCard height="h-16" width="w-32" />
        </div>
      </div>

      {/* Main Stats Cards */}
      <SkeletonList
        count={4}
        variant="card"
        gridColumns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        className="grid gap-4"
        renderItem={(i) => <SkeletonCard key={i} height="h-24" />}
      />

      {/* Tabs */}
      <div className="flex gap-1 w-fit">
        <SkeletonList
          count={3}
          variant="simple"
          itemHeight="h-9"
          gap="gap-1"
          className="flex flex-row"
          itemClassName="w-24"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <SkeletonCard height="h-64" />
        <SkeletonCard height="h-64" />
      </div>

      {/* Activity Chart */}
      <SkeletonCard height="h-80" />

      {/* Bottom Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <SkeletonCard height="h-48" />
        <SkeletonCard height="h-48" />
      </div>
    </div>
  );
}
