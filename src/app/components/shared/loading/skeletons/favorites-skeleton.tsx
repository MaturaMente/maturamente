import { SkeletonText, SkeletonCard, SkeletonList } from "../index";

/**
 * Simple favorites page skeleton - minimal layout
 */
export function FavoritesSkeleton() {
  return (
    <div>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-border my-4 md:my-6 pb-2">
        <div className="flex flex-col gap-1 mb-2 md:mb-0">
          <SkeletonText numberOfLines={1} height="h-8 md:h-10" width="w-64" />
          <SkeletonText numberOfLines={1} height="h-4" width="w-80" />
        </div>
        <SkeletonCard height="h-10" width="w-full sm:max-w-xs" />
      </div>

      {/* Content sections */}
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, yearIndex) => (
          <div key={yearIndex} className="space-y-6">
            <SkeletonText numberOfLines={1} height="h-7" width="w-32" />
            <SkeletonList
              count={4}
              variant="card"
              gridColumns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              className="grid gap-5"
              renderItem={(i) => <SkeletonCard key={i} height="h-48" />}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
