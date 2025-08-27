import { SkeletonCard, SkeletonList } from "../index";
import { HeaderSkeleton } from "./header-skeleton";

/**
 * Skeleton for the exercises page (mobile view)
 */
export function ExercisesMobileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withAction={true} />

      {/* Mobile Topic Dropdown Skeleton */}
      <div className="mb-6">
        <SkeletonCard height="h-12" width="w-full" />
      </div>

      {/* Exercise List Skeleton */}
      <div className="rounded-md border overflow-hidden">
        <SkeletonList
          count={5}
          variant="simple"
          itemHeight="h-[120px]"
          gap="gap-0"
          itemClassName="border-b border-border last:border-0"
        />
      </div>
    </div>
  );
}
