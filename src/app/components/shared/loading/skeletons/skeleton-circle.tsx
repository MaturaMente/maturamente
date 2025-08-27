import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCircleProps {
  /**
   * Size of the circular skeleton
   * @default "h-12 w-12"
   */
  size?: string;

  /**
   * Additional classes to be applied to the circle
   */
  className?: string;
}

/**
 * A reusable circular skeleton component for avatars, icons, etc.
 */
export function SkeletonCircle({
  size = "h-12 w-12",
  className,
}: SkeletonCircleProps) {
  return (
    <Skeleton
      className={cn(
        "rounded-full",
        size,
        className
      )}
    />
  );
}
