import { HeaderSkeleton } from "./header-skeleton";
import { SkeletonText, SkeletonCard, SkeletonList } from "../index";

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
          <SkeletonText numberOfLines={1} height="h-8" width="w-1/2" /> {/* Subtopic title */}
          <SkeletonText numberOfLines={1} height="h-5" width="w-1/3" /> {/* Subtopic subtitle */}
          <div className="space-y-3 mt-6 min-h-[400px]">
            {/* Long text skeleton with varying widths */}
            <SkeletonText 
              numberOfLines={10} 
              width={["w-full", "w-11/12", "w-10/12", "w-9/12", "w-8/12", "w-7/12", "w-7/12", "w-7/12", "w-7/12", "w-7/12"]}
              className="space-y-3"
            />
            {/* Image placeholder */}
            <div className="my-8">
              <SkeletonCard height="h-64" className="max-w-2xl mx-auto" />
            </div>
            {/* More content */}
            <SkeletonText 
              numberOfLines={3} 
              width={["w-full", "w-9/12", "w-8/12"]}
              className="space-y-3"
            />
          </div>
        </div>
      </main>
      {/* Sidebar skeleton with fixed width */}
      <aside className="hidden lg:block w-64 flex-shrink-0 min-h-[600px]">
        <div className="space-y-4 sticky top-8">
          <SkeletonText numberOfLines={1} height="h-7" width="w-40" className="mb-2" /> {/* Sidebar title */}
          <SkeletonList count={5} variant="simple" itemHeight="h-6" gap="gap-2" itemClassName="bg-transparent" />
          <div className="mt-8 space-y-2">
            <SkeletonText numberOfLines={1} height="h-6" width="w-32" />
            <SkeletonList count={3} variant="simple" itemHeight="h-5" gap="gap-2" itemClassName="bg-transparent" />
          </div>
        </div>
      </aside>
    </div>
  );
}
