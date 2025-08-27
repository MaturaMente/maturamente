import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "./skeleton-card";
import { SkeletonText } from "./skeleton-text";
import { SkeletonCircle } from "./skeleton-circle";
import { cn } from "@/lib/utils";

interface SkeletonListProps {
  /**
   * Number of items to display in the list
   * @default 5
   */
  count?: number;

  /**
   * Layout type for the list items
   * @default "simple"
   */
  variant?: "simple" | "card" | "text" | "avatar" | "custom";

  /**
   * Height of each item (for simple and custom variants)
   * @default "h-12"
   */
  itemHeight?: string;

  /**
   * Gap between list items
   * @default "gap-4"
   */
  gap?: string;

  /**
   * Grid layout for card variant
   * @default "grid-cols-1"
   */
  gridColumns?: string;

  /**
   * Additional classes to be applied to the list container
   */
  className?: string;

  /**
   * Additional classes to be applied to each list item (for simple and custom variants)
   */
  itemClassName?: string;

  /**
   * Custom render function for custom variant
   */
  renderItem?: (index: number) => React.ReactNode;
}

/**
 * A flexible list skeleton component that can render different types of list items
 */
export function SkeletonList({
  count = 5,
  variant = "simple",
  itemHeight = "h-12",
  gap = "gap-4",
  gridColumns = "grid-cols-1",
  className,
  itemClassName,
  renderItem,
}: SkeletonListProps) {
  const containerClasses = cn(
    "flex flex-col",
    variant === "card" && `grid ${gridColumns}`,
    gap,
    className
  );

  const renderSkeletonItem = (index: number) => {
    switch (variant) {
      case "card":
        return <SkeletonCard key={index} />;
      
      case "text":
        return <SkeletonText key={index} numberOfLines={2} className="space-y-1" />;
      
      case "avatar":
        return (
          <div key={index} className="flex items-center gap-3">
            <SkeletonCircle size="h-10 w-10" />
            <SkeletonText numberOfLines={2} className="flex-1 space-y-1" />
          </div>
        );
      
      case "custom":
        return renderItem ? renderItem(index) : (
          <Skeleton key={index} className={cn(itemHeight, "w-full rounded-md", itemClassName)} />
        );
      
      case "simple":
      default:
        return (
          <Skeleton key={index} className={cn(itemHeight, "w-full rounded-md", itemClassName)} />
        );
    }
  };

  return (
    <div className={containerClasses}>
      {Array.from({ length: count }).map((_, i) => renderSkeletonItem(i))}
    </div>
  );
}
