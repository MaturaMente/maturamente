"use client";

import { useEffect, useState, ReactNode } from "react";

interface ResponsiveSkeletonWrapperProps {
  /**
   * The component to render on mobile screens
   */
  mobileView: ReactNode;

  /**
   * The component to render on desktop screens
   */
  desktopView: ReactNode;

  /**
   * The breakpoint at which to switch from mobile to desktop view (in pixels)
   * @default 768
   */
  breakpoint?: number;

  /**
   * Component to render during initial mount before client-side detection
   * If not provided, a simple fallback will be used
   */
  fallback?: ReactNode;
}

/**
 * A responsive wrapper component that renders different skeletons based on screen size
 */
export function ResponsiveSkeletonWrapper({
  mobileView,
  desktopView,
  breakpoint = 768,
  fallback,
}: ResponsiveSkeletonWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // Add event listener for resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  // Show fallback during SSR to prevent hydration mismatch
  if (!mounted) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Simple fallback if none provided
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-muted rounded-md w-48"></div>
        <div className="grid grid-cols-1 gap-6">
          <div className="h-40 bg-muted rounded-md"></div>
          <div className="h-40 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  return <>{isMobile ? mobileView : desktopView}</>;
}
