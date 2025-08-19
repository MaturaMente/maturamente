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
  Award,
  CheckCircle2,
  History,
  GraduationCap,
  SquareLibrary,
  BookMinus,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// Import types from types folder
import type {
  RecentSimulation,
  RecentTheoryItem,
  StatisticsClientProps,
} from "@/types/statisticsTypes";

// Import the new chart component
import { MaturitàChart } from "@/app/components/shared/charts/maturità-chart";

export function StatisticsMaturità({ data }: StatisticsClientProps) {
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const subjectColor = "#3b82f6";

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
    totalSimulations,
    completedSimulations,
    completionPercentage,
    totalTimeSpent,
    simulationTypeBreakdown,
    totalTopics,
    completedTopicsCount,
    topicsCompletionPercentage,
    totalSubtopics,
    completedSubtopicsCount,
    subtopicsCompletionPercentage,
    totalExerciseCards,
    completedExerciseCards,
    exerciseCardsCompletionPercentage,
    totalExercises,
    completedExercises,
    exercisesCompletionPercentage,
    monthlyActivity,
    recentSimulations,
    recentTheory,
    recentExerciseCards,
  } = data;

  // Format time from minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Combine and sort recent activity
  const recentActivity = [
    ...recentSimulations,
    ...recentTheory,
    ...recentExerciseCards,
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="w-full overflow-hidden">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 md:gap-4">
          <div className="min-w-0 flex-1 md:block hidden">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Statistiche sulla tua Maturità
            </h2>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Analisi dei tuoi progressi nella preparazione alla maturità
            </p>
          </div>
          <div className="flex-col items-center gap-3 border border-border/50 shadow-sm rounded-lg md:w-auto justify-center px-4 md:px-5 py-3">
            <p className="text-xl md:text-2xl font-semibold text-primary">
              {formatTime(totalTimeSpent)}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Tempo di studio
            </p>
          </div>
        </div>
      </div>

      {/* Learning Activities - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Theory Progress Card */}
        <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-background border-amber-500/20">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BookMinus className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-shrink-0" />
              <span className="min-w-0">Teoria</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Il tuo progresso nello studio della teoria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xl md:text-2xl font-bold">
                    {completedTopicsCount}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    su {totalTopics} argomenti
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-amber-500">
                    {topicsCompletionPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    completato
                  </div>
                </div>
              </div>
              <Progress
                value={topicsCompletionPercentage}
                className="h-1.5 [&>div]:bg-amber-500 bg-amber-100 dark:bg-amber-900"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xl md:text-2xl font-bold">
                    {completedSubtopicsCount}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    su {totalSubtopics} sotto-argomenti
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-amber-500">
                    {subtopicsCompletionPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    completato
                  </div>
                </div>
              </div>
              <Progress
                value={subtopicsCompletionPercentage}
                className="h-1.5 [&>div]:bg-amber-500 bg-amber-100 dark:bg-amber-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exercises Progress Card */}
        <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-green-500/5 to-background border-green-500/20">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
              <span className="min-w-0">Esercizi</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Il tuo progresso negli esercizi pratici
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xl md:text-2xl font-bold">
                    {completedExerciseCards}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    su {totalExerciseCards} schede esercizi
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-green-500">
                    {exerciseCardsCompletionPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    completato
                  </div>
                </div>
              </div>
              <Progress
                value={exerciseCardsCompletionPercentage}
                className="h-1.5 [&>div]:bg-green-500 bg-green-100 dark:bg-green-900"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xl md:text-2xl font-bold">
                    {completedExercises}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    su {totalExercises} esercizi individuali
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-green-500">
                    {exercisesCompletionPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    completato
                  </div>
                </div>
              </div>
              <Progress
                value={exercisesCompletionPercentage}
                className="h-1.5 [&>div]:bg-green-500 bg-green-100 dark:bg-green-900"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Card - Full Width */}
      <Card className="w-full relative overflow-hidden bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <SquareLibrary className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
            <span className="min-w-0">Simulazioni</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Il tuo progresso nelle simulazioni d'esame
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Main Progress - Left Column */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-2xl md:text-3xl font-bold">
                    {completedSimulations}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    su {totalSimulations} simulazioni
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl md:text-2xl font-bold text-primary">
                    {completionPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    completato
                  </div>
                </div>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            {/* Simulation Type Breakdown - Right Column */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm md:text-base text-muted-foreground">
                Completate per tipologia
              </h4>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <div className="text-center p-2 md:p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-lg md:text-xl font-bold text-primary">
                    {simulationTypeBreakdown.ordinarie}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Ordinarie
                  </div>
                </div>
                <div className="text-center p-2 md:p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-lg md:text-xl font-bold text-primary">
                    {simulationTypeBreakdown.suppletive}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Suppletive
                  </div>
                </div>
                <div className="text-center p-2 md:p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-lg md:text-xl font-bold text-primary">
                    {simulationTypeBreakdown.straordinarie}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Straordinarie
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed stats */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm md:max-w-md mt-4">
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
          {/* Use the new MaturitàChart component */}
          <MaturitàChart
            monthlyActivity={monthlyActivity}
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
                  <span className="min-w-0">Attività recente</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Le tue ultime attività completate
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between gap-3 border-b pb-3 md:pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2 md:gap-3 flex-1 w-full overflow-hidden">
                        <div
                          className={`rounded-full p-1.5 md:p-2 flex-shrink-0 ${
                            activity.type === "simulation"
                              ? "bg-primary/10"
                              : activity.type === "topic"
                              ? "bg-amber-500/10"
                              : "bg-green-500/10"
                          }`}
                        >
                          {activity.type === "simulation" ? (
                            <SquareLibrary className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          ) : activity.type === "topic" ? (
                            <BookMinus className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                          ) : (
                            <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-medium text-sm md:text-base break-words line-clamp-2 min-w-0">
                            {activity.title}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {activity.type === "simulation"
                              ? `Tentativo ${
                                  (activity as RecentSimulation).attempt
                                }`
                              : activity.type === "topic"
                              ? "Argomento"
                              : activity.type === "subtopic"
                              ? "Sotto-argomento"
                              : "Esercizio"}{" "}
                            • {activity.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {activity.type === "simulation" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs md:text-sm px-2 md:px-3"
                            asChild
                          >
                            <Link
                              href={`/${subjectSlug}/simulazioni/${
                                (activity as RecentSimulation).slug ||
                                (activity as RecentSimulation).simulationId
                              }?referrer=statistiche`}
                            >
                              Dettagli
                            </Link>
                          </Button>
                        ) : activity.type === "topic" ||
                          activity.type === "subtopic" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-500/20 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 text-xs md:text-sm px-2 md:px-3"
                            asChild
                          >
                            <Link
                              href={`/${subjectSlug}/teoria/${
                                activity.type === "topic"
                                  ? (activity as RecentTheoryItem).slug
                                  : (activity as RecentTheoryItem).topicSlug
                              }${
                                activity.type === "subtopic"
                                  ? `?subtopic=${
                                      (activity as RecentTheoryItem).slug
                                    }&referrer=statistiche`
                                  : "?referrer=statistiche"
                              }`}
                            >
                              Vai alla teoria
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500/20 text-green-700 hover:bg-green-500/10 hover:text-green-800 text-xs md:text-sm px-2 md:px-3"
                            asChild
                          >
                            <Link
                              href={`/${subjectSlug}/esercizi/card/${
                                (activity as RecentTheoryItem).slug
                              }?referrer=statistiche`}
                            >
                              Vai all'esercizio
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 md:py-12 text-sm md:text-base">
                  Non hai ancora completato nessuna attività
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Call to action */}
      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardHeader className="mb-0 pb-0">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Award className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
            <span className="min-w-0">Migliora la tua preparazione</span>
          </CardTitle>
          <h4 className="font-medium mb-3 text-xs md:text-sm text-muted-foreground">
            Consigli per uno studio efficace
          </h4>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Study Tips */}
          <div>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Simulazioni regolari
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Completa almeno una simulazione a settimana
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Studio costante
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Dedica tempo regolare allo studio della teoria
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium">
                    Ripasso mirato
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Concentrati sugli argomenti in cui hai più difficoltà
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 pt-2">
            <Button asChild className="w-full text-white text-sm">
              <Link href={`/${subjectSlug}/simulazioni?referrer=statistiche`}>
                <SquareLibrary className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Nuova simulazione
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-amber-500/20 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 text-sm"
            >
              <Link href={`/${subjectSlug}/teoria?referrer=statistiche`}>
                <BookMinus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Studia teoria
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-green-500/20 text-green-700 hover:bg-green-500/10 hover:text-green-800 text-sm"
            >
              <Link href={`/${subjectSlug}/esercizi?referrer=statistiche`}>
                <GraduationCap className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Pratica esercizi
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
