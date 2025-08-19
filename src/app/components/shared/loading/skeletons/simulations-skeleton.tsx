import { Skeleton } from "@/components/ui/skeleton";

/**
 * Simple simulations page skeleton - minimal layout
 */
export function SimulationsSkeleton() {
  return (
    <div className="">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-border my-4 sm:my-6 pb-2">
        <Skeleton className="h-9 sm:h-10 w-48 mb-4 sm:mb-0" />
        <Skeleton className="h-10 w-full sm:max-w-xs" />
      </div>

      {/* Year sections */}
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, yearIndex) => (
          <div key={yearIndex} className="space-y-6">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, cardIndex) => (
                <Skeleton key={cardIndex} className="h-56 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
