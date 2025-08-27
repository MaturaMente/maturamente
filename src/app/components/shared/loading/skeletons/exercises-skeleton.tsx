import { SkeletonText, SkeletonCard, SkeletonList } from "../index";
import { HeaderSkeleton } from "./header-skeleton";
import { ResponsiveSkeletonWrapper } from "./responsive-skeleton-wrapper";
import { ExercisesMobileSkeleton } from "./exercises-mobile-skeleton";

/**
 * Skeleton for the exercises topic sidebar
 */
function TopicsSidebarSkeleton() {
  return (
    <div className="bg-card/50 rounded-lg border p-4 sticky top-20">
      <SkeletonText numberOfLines={1} height="h-7" width="w-36" className="mb-5" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <SkeletonText numberOfLines={1} height="h-7" width="w-full" />
            <div className="pl-4 space-y-2">
              <SkeletonList
                count={i === 0 ? 4 : 3}
                variant="simple"
                itemHeight="h-6"
                gap="gap-2"
                itemClassName="w-[90%]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for a subtopic section with exercise cards
 */
function SubtopicSectionSkeleton() {
  return (
    <div className="space-y-4 mb-8">
      <div className="lg:border-l-4 lg:border-border lg:pl-2">
        <SkeletonText numberOfLines={1} height="h-8" width="w-52" />
      </div>
      <SkeletonList
        count={3}
        variant="card"
        gridColumns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        className="grid gap-4"
        renderItem={(i) => <SkeletonCard key={i} height="h-[180px]" />}
      />
    </div>
  );
}

/**
 * Skeleton for the exercises page (desktop view)
 */
export function ExercisesDesktopSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withAction={true} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Content - Left Side */}
        <div className="md:col-span-9">
          <div className="space-y-10">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-8">
                <SkeletonText numberOfLines={1} height="h-9" width="w-64" />
                {Array.from({ length: 2 }).map((_, j) => (
                  <SubtopicSectionSkeleton key={j} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="md:col-span-3">
          <TopicsSidebarSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive skeleton that shows appropriate version based on screen size
 */
export function ExercisesSkeleton() {
  return (
    <ResponsiveSkeletonWrapper
      mobileView={<ExercisesMobileSkeleton />}
      desktopView={<ExercisesDesktopSkeleton />}
    />
  );
}
