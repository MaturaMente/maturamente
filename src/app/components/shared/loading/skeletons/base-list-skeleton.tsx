import { cn } from "@/lib/utils";

interface BaseListSkeletonProps {
  /**
   * Number of items to display in the list
   * @default 5
   */
  count?: number;

  /**
   * Height of each item in the list
   * @default "h-12"
   */
  itemHeight?: string;

  /**
   * Gap between list items
   * @default "gap-2"
   */
  gap?: string;

  /**
   * Whether to add a border to each item
   * @default true
   */
  withBorder?: boolean;

  /**
   * Whether to apply a subtle background color
   * @default true
   */
  withBackground?: boolean;

  /**
   * Additional classes to be applied to the list container
   */
  className?: string;

  /**
   * Additional classes to be applied to each list item
   */
  itemClassName?: string;
}

/**
 * A base list skeleton component that can be configured with various props
 */
export function BaseListSkeleton({
  count = 5,
  itemHeight = "h-12",
  gap = "gap-2",
  withBorder = true,
  withBackground = true,
  className,
  itemClassName,
}: BaseListSkeletonProps) {
  return (
    <div className={cn("flex flex-col", gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-md",
            itemHeight,
            withBackground && "bg-card/50",
            withBorder && "border",
            itemClassName
          )}
        />
      ))}
    </div>
  );
}
