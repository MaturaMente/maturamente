import { SkeletonText, SkeletonCard } from "../index";

/**
 * Simple dashboard page skeleton - minimal layout
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-8 container mx-auto max-w-5xl px-4">
      {/* Hero Banner */}
      <div className="relative w-full pt-4 md:px-2">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <SkeletonText numberOfLines={1} height="h-9" width="w-64" />
            <SkeletonText numberOfLines={1} height="h-5" width="w-80" />
          </div>
          <SkeletonCard height="h-16" width="w-48" className="rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard height="h-64" className="lg:col-span-2" />
          <SkeletonCard height="h-64" />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard height="h-48" />
          <SkeletonCard height="h-48" />
        </div>
      </div>
    </div>
  );
}
