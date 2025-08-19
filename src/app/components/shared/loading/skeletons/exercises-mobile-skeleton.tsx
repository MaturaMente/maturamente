import { Skeleton } from "@/components/ui/skeleton";
import { BaseListSkeleton } from "./base-list-skeleton";
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
        <Skeleton className="h-12 w-full rounded-md" />
      </div>

      {/* Exercise List Skeleton */}
      <div className="rounded-md border overflow-hidden">
        <BaseListSkeleton
          count={5}
          itemHeight="h-[120px]"
          gap="gap-0"
          withBorder={false}
          itemClassName="border-b border-border last:border-0"
        />
      </div>
    </div>
  );
}
