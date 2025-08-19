"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScreenshotProps {
  srcLight: string;
  srcDark?: string;
  mobileSrcLight?: string;
  mobileSrcDark?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  mobileBreakpoint?: number;
  priority?: boolean;
}

export default function Screenshot({
  srcLight,
  srcDark,
  mobileSrcLight,
  mobileSrcDark,
  alt,
  width,
  height,
  className,
  mobileBreakpoint = 768, // Default to md breakpoint
  priority = false,
}: ScreenshotProps) {
  const { resolvedTheme } = useTheme();
  const [src, setSrc] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    // Set initial state based on window size
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    // Check immediately
    checkIsMobile();

    // Setup resize listener
    window.addEventListener("resize", checkIsMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [mobileBreakpoint]);

  // Set the appropriate image based on theme and device
  useEffect(() => {
    if (resolvedTheme) {
      const isDarkMode = resolvedTheme === "dark";

      if (isMobile) {
        // Use mobile image sources if available, fallback to desktop
        const mobileSource = isDarkMode
          ? mobileSrcDark || srcDark || srcLight // Dark mobile, fallback to dark desktop, then light desktop
          : mobileSrcLight || srcLight; // Light mobile, fallback to light desktop
        setSrc(mobileSource);
      } else {
        // Use desktop image sources
        setSrc(isDarkMode ? srcDark || srcLight : srcLight);
      }
    }
  }, [
    resolvedTheme,
    srcLight,
    srcDark,
    mobileSrcLight,
    mobileSrcDark,
    isMobile,
  ]);

  if (!src) {
    return (
      <div
        style={{ width, height }}
        className={cn("bg-muted", className)}
        aria-label={alt}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    />
  );
}
