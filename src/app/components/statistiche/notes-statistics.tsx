"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  BookOpen,
  History,
  Star,
  FolderOpen,
  Dot,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { NotesStatisticsClientProps } from "@/types/statisticsTypes";
import { NotesChart } from "@/app/components/shared/charts/notes-chart";

export function NotesStatistics({
  data,
  subjectColor,
}: NotesStatisticsClientProps) {
  const [mounted, setMounted] = useState(false);
  const params = useParams();

  // Get the current subject slug from params
  const subjectSlug = (params?.["subject-slug"] as string) || "";

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const {
    totalNotes,
    studiedNotes,
    studiedPercentage,
    recentNotes,
    monthlyStudyActivity,
    dailyStudyActivity,
  } = data;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <div
      className="flex flex-col gap-4 md:gap-6"
      style={
        {
          "--subject-color": subjectColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className="hidden w-full md:block">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 md:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              Statistiche sui tuoi appunti
            </h2>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Riepilogo dei tuoi appunti e delle tue materie
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Notes Overview Card */}
        <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-[color:var(--subject-color)]/5 to-background border-[color:var(--subject-color)]/20">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-[color:var(--subject-color)] flex-shrink-0" />
              <span className="truncate">I tuoi appunti</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Riepilogo di tutti i tuoi appunti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-2xl md:text-3xl font-bold">
                  {totalNotes}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  appunti totali
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Studied Notes Card */}
        <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-[color:var(--subject-color)]/5 to-background border-[color:var(--subject-color)]/20">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-[color:var(--subject-color)] flex-shrink-0" />
              <span className="truncate">Appunti Studiati</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Gli appunti che hai studiato almeno una volta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-2xl md:text-3xl font-bold">
                  {studiedNotes}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  su {totalNotes} appunti
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl md:text-2xl font-bold text-[color:var(--subject-color)]">
                  {studiedPercentage}%
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  studiati
                </div>
              </div>
            </div>
            <Progress
              value={studiedPercentage}
              className="h-2 [&>div]:bg-[color:var(--subject-color)] bg-[color:var(--subject-color)]/10 dark:bg-[color:var(--subject-color)]/20"
            />
          </CardContent>
        </Card>
      </div>

      {/* Study Analysis and Recent Activity */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm md:max-w-md">
          <TabsTrigger
            value="activity"
            className="text-xs md:text-sm px-2 md:px-4"
          >
            Statistiche mensili
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="text-xs md:text-sm px-2 md:px-4"
          >
            Attività recente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <NotesChart
            dailyActivity={dailyStudyActivity || []}
            subjectColor={subjectColor}
          />
        </TabsContent>

        <TabsContent value="recent">
          <Card className="container mx-auto">
            <CardHeader className="mb-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <History
                    className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"
                    style={{ color: subjectColor }}
                  />
                  <span>Appunti recenti</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Gli appunti che hai studiato più di recente
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentNotes.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {recentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between gap-3 border-b pb-3 md:pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
                        <div className="rounded-full p-1.5 md:p-2 flex-shrink-0 bg-[color:var(--subject-color)]/10">
                          <FileText className="h-4 w-4 md:h-5 md:w-5 text-[color:var(--subject-color)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm md:text-base break-words line-clamp-2">
                            {note.title}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground flex items-center">
                            {note.subjectName}
                            <Dot className="h-4 w-4" />
                            {note.date}
                            {note.studyTimeMinutes ? (
                              <>
                                <Dot className="h-4 w-4" />
                                {formatStudyTime(note.studyTimeMinutes)}
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[color:var(--subject-color)]/20 text-[color:var(--subject-color)] hover:bg-[color:var(--subject-color)]/10 hover:text-[color:var(--subject-color)] text-xs md:text-sm px-2 md:px-3"
                          asChild
                        >
                          <Link href={`/${subjectSlug}/${note.slug}`}>
                            Visualizza
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 md:py-12 text-sm md:text-base">
                  Non hai ancora nessun appunto
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Call to action */}
      <Card className="hidden md:block bg-gradient-to-br from-[color:var(--subject-color)]/5 to-background border-[color:var(--subject-color)]/20">
        <CardHeader className="mb-0 pb-0">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Star className="h-4 w-4 md:h-5 md:w-5 text-[color:var(--subject-color)] flex-shrink-0" />
            <span className="truncate">Organizza i tuoi appunti</span>
          </CardTitle>
          <h4 className="font-medium mb-3 text-xs md:text-sm text-muted-foreground">
            Suggerimenti per un migliore studio
          </h4>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Study Tips */}
          <div>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-[color:var(--subject-color)]/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 text-[color:var(--subject-color)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Contrassegna i preferiti
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Segna gli appunti più importanti per trovarli velocemente
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-[color:var(--subject-color)]/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <FolderOpen className="h-3 w-3 md:h-3.5 md:w-3.5 text-[color:var(--subject-color)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Organizza per materia
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Mantieni gli appunti organizzati per argomento
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-[color:var(--subject-color)]/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5 text-[color:var(--subject-color)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Ripassa regolarmente
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Consulta spesso i tuoi appunti per consolidare le conoscenze
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 pt-2">
            <Button
              asChild
              className="w-full text-white text-sm bg-[color:var(--subject-color)] hover:bg-[color:var(--subject-color)]/90"
              variant="secondary"
            >
              <Link href={`/${subjectSlug}`}>
                <FileText className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Visualizza tutti gli appunti
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-[color:var(--subject-color)]/20 text-[color:var(--subject-color)] hover:bg-[color:var(--subject-color)]/10 hover:text-[color:var(--subject-color)] text-sm"
            >
              <Link href={`/${subjectSlug}`}>
                <Star className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Appunti preferiti
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
