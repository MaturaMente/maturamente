import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Dot } from "lucide-react";
import type { DashboardRecentStudyData } from "@/types/dashboardTypes";
import { getSubjectIcon } from "@/utils/subject-icons";

interface RecentStudyNotesProps {
  recentNotes: DashboardRecentStudyData[];
}

export function RecentStudyNotes({ recentNotes }: RecentStudyNotesProps) {
  if (recentNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nessuna sessione di studio recente</p>
        <p className="text-sm mt-1">
          Inizia a studiare per vedere qui i tuoi appunti recenti
        </p>
      </div>
    );
  }

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {recentNotes.slice(0, 4).map((note) => (
        <div
          key={note.id}
          className="flex items-center justify-between gap-3 border-b pb-3 md:pb-4 last:border-0 last:pb-0"
          style={{ ["--subject-color" as any]: note.subjectColor }}
        >
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div>
              {(() => {
                const Icon = getSubjectIcon(note.subjectName);
                return Icon ? (
                  <span className="flex h-9 w-9 items-center justify-center">
                    <Icon
                      className="h-5 w-5"
                      style={{ color: `${note.subjectColor}90` }}
                    />
                  </span>
                ) : null;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm md:text-base break-words line-clamp-2">
                {note.title}
              </h4>
              <span className="text-xs md:text-sm text-muted-foreground flex items-center">
                <span>{note.subjectName}</span>
                <Dot className="h-4 w-4" />
                <span>{formatStudyTime(note.studyTimeMinutes)}</span>
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Link
              href={`/${note.subjectSlug}/${note.slug}`}
              className="inline-flex"
            >
              <span
                className="inline-flex items-center border text-xs md:text-sm px-2 md:px-3 py-1 rounded-md transition-colors cursor-pointer"
                style={{
                  color: note.subjectColor,
                  borderColor: `${note.subjectColor}33`,
                  backgroundColor: `${note.subjectColor}0D`,
                }}
              >
                Visualizza
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
