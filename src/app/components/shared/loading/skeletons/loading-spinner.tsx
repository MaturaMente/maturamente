"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
}

export function LoadingSpinner({
  text = "Caricamento...",
  size = "md",
  fullHeight = true,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullHeight ? "h-[50vh]" : "w-full"
      }`}
    >
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-primary ${
          !fullHeight ? "mb-4" : ""
        }`}
      />
      {text && <p className="text-muted-foreground mt-4">{text}</p>}
    </div>
  );
}
