import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTextProps {
  /**
   * Number of text lines to display
   * @default 3
   */
  numberOfLines?: number;

  /**
   * Width of the text lines - can be string or array for different widths per line
   * @default "w-full"
   */
  width?: string | string[];

  /**
   * Height of each text line
   * @default "h-4"
   */
  height?: string;

  /**
   * Gap between lines
   * @default "gap-2"
   */
  gap?: string;

  /**
   * Additional classes to be applied to the container
   */
  className?: string;

  /**
   * Additional classes to be applied to each line
   */
  lineClassName?: string;
}

/**
 * A reusable text skeleton component that mimics text lines
 */
export function SkeletonText({
  numberOfLines = 3,
  width = "w-full",
  height = "h-4",
  gap = "gap-2",
  className,
  lineClassName,
}: SkeletonTextProps) {
  const widths = Array.isArray(width) ? width : Array(numberOfLines).fill(width);

  return (
    <div className={cn("flex flex-col", gap, className)}>
      {Array.from({ length: numberOfLines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            height,
            widths[i] || widths[0] || "w-full",
            // Make the last line shorter by default if using full width
            i === numberOfLines - 1 && width === "w-full" && numberOfLines > 1
              ? "w-3/4"
              : "",
            lineClassName
          )}
        />
      ))}
    </div>
  );
}
