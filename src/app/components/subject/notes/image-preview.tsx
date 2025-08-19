"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  previewUrl: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function ImagePreview({
  previewUrl,
  width = 80,
  height = 100,
  className,
  alt = "Note preview",
}: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (imageError) {
    return (
      <div
        className={cn(
          "bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center",
          className
        )}
        style={{ width, height }}
      >
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md w-full h-full" />
        </div>
      )}
      <img
        src={previewUrl}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "rounded-md object-cover border border-gray-200 dark:border-gray-700",
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200"
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
}
