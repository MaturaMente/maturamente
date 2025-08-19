"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Minus } from "lucide-react";
import { getSubjectIcon } from "@/utils/subject-icons";
import { useState } from "react";
import type { SubjectUI } from "@/types/subjectsTypes";

interface SubjectCardProps {
  subject: SubjectUI;
  isSelected?: boolean;
  disabled?: boolean;
  state?: "current" | "available" | "pending-removal";
  onToggle?: (subjectId: string, next: boolean) => void;
  onUndoPendingRemoval?: (subjectId: string) => Promise<void>;
}

export function SubjectCard({
  subject,
  isSelected = false,
  disabled = false,
  state = "available",
  onToggle,
  onUndoPendingRemoval,
}: SubjectCardProps) {
  const [open, setOpen] = useState(false);
  const clickable = !!onToggle && state !== "pending-removal" && !disabled;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer ${
        clickable
          ? "cursor-pointer"
          : state === "pending-removal"
          ? "opacity-80"
          : ""
      } ${
        isSelected
          ? "border-border shadow-lg scale-[1.01]"
          : "border-[var(--subject-color)]/20 hover:border-muted-foreground/30 hover:scale-[1.01]"
      }`}
      onClick={(e) => {
        if (!clickable) return;
        e.preventDefault();
        onToggle?.(subject.id, !isSelected);
      }}
      style={
        {
          "--subject-color": subject.color,
          boxShadow: isSelected ? `0 4px 24px ${subject.color}10` : "none",
        } as React.CSSProperties
      }
    >
      {/* subtle top highlight line inspired by pricing */}
      <hr className="hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent via-[var(--subject-color)] to-transparent" />

      {/* soft color glow background */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />

      <div className="flex items-start justify-between p-6">
        <div className="flex-1 space-y-2">
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
                  backgroundColor: isSelected ? subject.color : "transparent",
                  borderColor: isSelected ? subject.color : undefined,
                }}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {subject.description}
          </p>

          {state === "current" && !isSelected && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="destructive" className="text-xs">
                Rimozione
              </Badge>
            </div>
          )}

          {state === "available" && isSelected && (
            <Badge className="text-xs bg-green-500 text-white">Aggiunta</Badge>
          )}

          {state === "pending-removal" && (
            <div className="flex items-center gap-2">
              <Badge className="text-xs bg-red-600 text-white">
                In Sospeso
              </Badge>
              {onUndoPendingRemoval && (
                <AlertDialog open={open} onOpenChange={setOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 gap-1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span className="font-bold">Annulla Rimozione</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Minus className="w-4 h-4" />
                        Annulla Rimozione Materia
                      </AlertDialogTitle>
                      <div className="text-base text-blue-500 bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
                        Questa azione annullerà la rimozione programmata di “
                        {subject.name}”. L’abbonamento verrà aggiornato ora
                        senza alcun costo aggiuntivo.
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await onUndoPendingRemoval(subject.id);
                          setOpen(false);
                        }}
                        className="text-white"
                      >
                        Continua
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
