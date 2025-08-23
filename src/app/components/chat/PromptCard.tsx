"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

type PromptCardProps = {
  title: string;
  description: string;
  onClick: () => void;
  Icon: LucideIcon;
  variant: "subject" | "dashboard";
};

export default function PromptCard({
  title,
  description,
  onClick,
  Icon,
  variant,
}: PromptCardProps) {
  const highlightViaClass =
    variant === "subject" ? "via-[var(--subject-color)]" : "via-blue-400";
  const glowBgClass =
    variant === "subject" ? "bg-[var(--subject-color)]/20" : "bg-blue-500/20";
  const iconColorClass = variant === "subject" ? undefined : "text-blue-400";
  const iconColorStyle =
    variant === "subject"
      ? ({ color: "var(--subject-color)" } as React.CSSProperties)
      : undefined;

  return (
    <button
      type="button"
      className="relative text-left rounded-2xl border border-border bg-card/80 p-5 md:p-6 hover:-translate-y-0.5 transition-all duration-300 shadow-xl hover:shadow-2xl backdrop-blur-sm overflow-hidden group"
      onClick={onClick}
    >
      {/* subtle top highlight line (dark only) */}
      <hr
        className={`hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent ${highlightViaClass} to-transparent`}
      />
      {/* soft color glow background */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-32 w-full -translate-x-1/2 rounded-[50%] ${glowBgClass} blur-[72px]`}
      />
      {/* subtle gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent dark:from-white/[0.03]" />

      <div className="relative flex items-center gap-3 mb-2 text-base font-medium">
        <Icon
          className={`h-5 w-5 ${iconColorClass || ""}`}
          style={iconColorStyle}
        />
        <span>{title}</span>
      </div>
      <div className="relative text-sm text-muted-foreground">
        {description}
      </div>
    </button>
  );
}
