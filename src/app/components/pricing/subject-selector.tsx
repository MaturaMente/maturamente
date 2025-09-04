"use client";

import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, FileText, GraduationCap } from "lucide-react";
import { getSubjectIcon } from "@/utils/subject-icons";

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  maturita: boolean;
  notes_count: number;
}

interface SubjectSelectorProps {
  subjects: Subject[];
  selectedSubjects: string[];
  onSelectionChange: (subjects: string[]) => void;
  maxSelectable?: number;
}

export function SubjectSelector({
  subjects,
  selectedSubjects,
  onSelectionChange,
  maxSelectable,
}: SubjectSelectorProps) {
  const handleToggleSubject = (subjectId: string) => {
    const isSelected = selectedSubjects.includes(subjectId);

    if (isSelected) {
      onSelectionChange(selectedSubjects.filter((id) => id !== subjectId));
    } else {
      if (typeof maxSelectable === "number") {
        const next = [...selectedSubjects, subjectId];
        onSelectionChange(next.slice(0, maxSelectable));
      } else {
        onSelectionChange([...selectedSubjects, subjectId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.id);
          return (
            <div
              key={subject.id}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "border-border shadow-lg scale-[1.01]"
                  : "border-[var(--subject-color)]/20 hover:border-muted-foreground/30 hover:scale-[1.01]"
              }`}
              onClick={() => handleToggleSubject(subject.id)}
              style={
                {
                  "--subject-color": subject.color,
                  boxShadow: isSelected
                    ? `0 8px 32px ${subject.color}20`
                    : "none",
                } as React.CSSProperties
              }
            >
              {/* subtle top highlight line inspired by pricing */}
              <hr className="hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent via-[var(--subject-color)] to-transparent" />

              {/* soft color glow background */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />

              <div className="flex flex-col h-full p-4 justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getSubjectIcon(subject.name);
                      return Icon ? (
                        <div className="flex h-7 w-7 items-center justify-center">
                          <Icon
                            className="h-4 w-4"
                            style={{ color: `${subject.color}75` }}
                          />
                        </div>
                      ) : null;
                    })()}
                    <h3
                      className={`font-semibold text-[var(--subject-color)] group-hover:text-[var(--subject-color)] transition-colors ${
                        isSelected
                          ? "md:text-[var(--subject-color)]"
                          : "md:text-foreground"
                      }`}
                    >
                      {subject.name}
                    </h3>
                  </div>
                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isSelected
                          ? "shadow-md"
                          : "border-2 border-muted-foreground/30 group-hover:border-[var(--subject-color)]"
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? subject.color
                          : "transparent",
                        borderColor: isSelected ? subject.color : undefined,
                      }}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
                          {subject.notes_count === 1
                            ? "disponibile"
                            : "disponibili"}
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
