import { SkeletonText, SkeletonCard, SkeletonList } from "../index";

/**
 * Simple simulations page skeleton - minimal layout
 */
export function SimulationsSkeleton() {
  return (
    <div className="">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-border my-4 sm:my-6 pb-2">
        <SkeletonText numberOfLines={1} height="h-9 sm:h-10" width="w-48" className="mb-4 sm:mb-0" />
        <SkeletonCard height="h-10" width="w-full sm:max-w-xs" />
      </div>

      {/* Year sections */}
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, yearIndex) => (
          <div key={yearIndex} className="space-y-6">
            <SkeletonText numberOfLines={1} height="h-8" width="w-32" />
            <SkeletonList
              count={6}
              variant="card"
              gridColumns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              className="grid gap-6"
              renderItem={(i) => <SkeletonCard key={i} height="h-56" />}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
