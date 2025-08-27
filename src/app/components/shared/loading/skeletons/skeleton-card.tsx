import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  /**
   * Width of the card skeleton
   * @default "w-full"
   */
  width?: string;

  /**
   * Height of the card skeleton
   * @default "h-48"
   */
  height?: string;

  /**
   * Additional classes to be applied to the card
   */
  className?: string;
}

/**
 * A reusable card skeleton component that mimics card layouts
 */
export function SkeletonCard({
  width = "w-full",
  height = "h-48",
  className,
}: SkeletonCardProps) {
  return (
    <Skeleton
      className={cn(
        "rounded-lg",
        width,
        height,
        className
      )}
    />
  );
}
