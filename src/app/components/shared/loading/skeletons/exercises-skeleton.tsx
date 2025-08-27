import { Skeleton } from "@/components/ui/skeleton";
import { BaseCardSkeleton } from "./base-card-skeleton";
import { HeaderSkeleton } from "./header-skeleton";
import { ResponsiveSkeletonWrapper } from "./responsive-skeleton-wrapper";
import { ExercisesMobileSkeleton } from "./exercises-mobile-skeleton";

/**
 * Skeleton for the exercises topic sidebar
 */
function TopicsSidebarSkeleton() {
  return (
    <div className="bg-card/50 rounded-lg border p-4 sticky top-20">
      <Skeleton className="h-7 w-36 mb-5" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-7 w-full rounded-md" />
            <div className="pl-4 space-y-2">
              {Array.from({ length: i === 0 ? 4 : 3 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-[90%] rounded-md" />
              ))}
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
        <Skeleton className="h-8 w-52 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <BaseCardSkeleton key={i} height="h-[180px]" />
        ))}
      </div>
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
                <Skeleton className="h-9 w-64 rounded-md" />
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
