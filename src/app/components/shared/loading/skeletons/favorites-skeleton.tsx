import { Skeleton } from "@/components/ui/skeleton";

/**
 * Simple favorites page skeleton - minimal layout
 */
export function FavoritesSkeleton() {
  return (
    <div>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-border my-4 md:my-6 pb-2">
        <div className="flex flex-col gap-1 mb-2 md:mb-0">
          <Skeleton className="h-8 md:h-10 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-full sm:max-w-xs" />
      </div>

      {/* Content sections */}
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, yearIndex) => (
          <div key={yearIndex} className="space-y-6">
            <Skeleton className="h-7 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 4 }).map((_, cardIndex) => (
                <Skeleton key={cardIndex} className="h-48 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
