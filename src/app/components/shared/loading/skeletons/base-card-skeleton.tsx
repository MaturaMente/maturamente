import { cn } from "@/lib/utils";

interface BaseCardSkeletonProps {
  /**
   * Height of the card skeleton
   * @default "h-[180px]"
   */
  height?: string;

  /**
   * Width of the card skeleton
   * @default "w-full"
   */
  width?: string;

  /**
   * Additional classes to be applied to the card
   */
  className?: string;

  /**
   * Whether to apply a subtle background color
   * @default true
   */
  withBackground?: boolean;

  /**
   * Whether to show a border around the card
   * @default true
   */
  withBorder?: boolean;

  /**
   * Whether to apply a  to the card
   * @default true
   */
  withShadow?: boolean;
}

/**
 * A base card skeleton component that can be configured with various props
 */
export function BaseCardSkeleton({
  height = "h-[180px]",
  width = "w-full",
  className,
  withBackground = true,
  withBorder = true,
  withShadow = true,
}: BaseCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        height,
        width,
        withBackground && "bg-card/50",
        withBorder && "border",
        withShadow && "-sm",
        className
      )}
    />
  );
}
