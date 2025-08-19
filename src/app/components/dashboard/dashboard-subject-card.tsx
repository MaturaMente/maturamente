"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { UserSubject } from "@/types/subjectsTypes";
import { getSubjectIcon } from "@/utils/subject-icons";

interface DashboardSubjectCardProps {
  subject: UserSubject;
}

export function DashboardSubjectCard({ subject }: DashboardSubjectCardProps) {
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
        {/* subtle top highlight line */}
        <hr className="hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent via-[var(--subject-color)] to-transparent" />

        {/* soft color glow background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />

        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center justify-between">
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
                <CardTitle className="text-xl font-semibold tracking-tight group-hover:text-[var(--subject-color)]/90 transition-colors">
                  {subject.name}
                </CardTitle>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--subject-color)]" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 space-y-6">
          <p className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3">
            {subject.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
