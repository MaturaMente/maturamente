"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, GraduationCap } from "lucide-react";
import type { UserSubject } from "@/types/subjectsTypes";
import { getSubjectIcon } from "@/utils/subject-icons";

interface SubjectCardProps {
  subject: UserSubject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  // Convert color to CSS custom property for theming
  const cardStyle = {
    "--subject-color": subject.color,
  } as React.CSSProperties;

  return (
    <Link href={`/${subject.slug}`} className="group block">
      <Card
        className="flex flex-col justify-between h-full rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer overflow-hidden"
        style={{
          ...cardStyle,
          boxShadow: `0px 4px 24px ${subject.color}10`,
          ["--subject-color" as any]: subject.color,
        }}
      >
        {/* subtle top highlight line inspired by pricing */}
        <hr className="hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent via-[var(--subject-color)] to-transparent" />

        {/* soft color glow background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />

        <CardHeader className="px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getSubjectIcon(subject.name);
                  return Icon ? (
                    <span className="flex h-9 w-9 items-center justify-center">
                      <Icon
                        className="h-5 w-5"
                        style={{ color: `${subject.color}90` }}
                      />
                    </span>
                  ) : null;
                })()}
                <CardTitle className="text-2xl font-bold tracking-tight group-hover:text-[var(--subject-color)]/90 transition-colors">
                  {subject.name}
                </CardTitle>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--subject-color)]" />
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-6">
          <p className="text-base text-muted-foreground/90 leading-relaxed line-clamp-3">
            {subject.description}
          </p>

          <div className="flex items-center gap-1 pt-3 border-t border-border/80">
            <div className="flex items-center justify-center w-9 h-9 rounded-full">
              <FileText
                className="h-4.5 w-4.5"
                style={{ color: `${subject.color}75` }}
              />
            </div>
            <div className="flex justify-between w-full">
              <span className="text-sm font-medium">
                {subject.notes_count}{" "}
                {subject.notes_count === 1 ? "appunto" : "appunti"}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {subject.notes_count === 1 ? "disponibile" : "disponibili"}
                </span>
              </span>
            </div>
            {subject.maturita && (
              <Badge
                className="inline-flex items-center gap-1 text-xs w-fit"
                style={{
                  backgroundColor: `${subject.color}18`,
                  color: subject.color,
                  borderColor: `${subject.color}40`,
                }}
              >
                <GraduationCap className="h-3.5 w-3.5" /> Maturità
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
