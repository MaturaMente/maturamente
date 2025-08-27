import { Skeleton } from "@/components/ui/skeleton";

/**
 * Simple dashboard page skeleton - minimal layout
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-8 container mx-auto max-w-5xl px-4">
      {/* Hero Banner */}
      <div className="relative w-full pt-4 md:px-2">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-16 w-48 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
