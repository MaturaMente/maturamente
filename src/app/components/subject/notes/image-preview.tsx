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
  width,
  height,
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

  // Use inline styles only if both width and height are provided
  const containerStyle = width && height ? { width, height } : {};
  const imageProps = width && height ? { width, height } : {};

  if (imageError) {
    return (
      <div
        className={cn(
          "bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center",
          className
        )}
        style={containerStyle}
      >
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={containerStyle}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center"
          style={containerStyle}
        >
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md w-full h-full" />
        </div>
      )}
      <img
        src={previewUrl}
        alt={alt}
        {...imageProps}
        className={cn(
          "rounded-md object-top border border-gray-200 dark:border-gray-700",
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
