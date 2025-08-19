import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HeaderSkeletonProps {
  /**
   * Whether to include a subtitle skeleton
   * @default false
   */
  withSubtitle?: boolean;

  /**
   * Width of the title skeleton
   * @default "w-52"
   */
  titleWidth?: string;

  /**
   * Width of the subtitle skeleton (if enabled)
   * @default "w-3/4"
   */
  subtitleWidth?: string;

  /**
   * Whether to include a right-side action button skeleton
   * @default false
   */
  withAction?: boolean;

  /**
   * Whether to include a bottom border
   * @default true
   */
  withBorder?: boolean;

  /**
   * Additional classes to be applied to the header container
   */
  className?: string;
}

/**
 * A reusable header skeleton component for page headers
 */
export function HeaderSkeleton({
  withSubtitle = false,
  titleWidth = "w-52",
  subtitleWidth = "w-3/4",
  withAction = false,
  withBorder = true,
  className,
}: HeaderSkeletonProps) {
  return (
    <div
      className={cn(
        "flex justify-between items-center mb-8",
        withBorder && "border-b pb-4 border-border",
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className={cn("h-10", titleWidth)} />
        {withSubtitle && <Skeleton className={cn("h-5", subtitleWidth)} />}
      </div>

      {withAction && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      )}
    </div>
  );
}
