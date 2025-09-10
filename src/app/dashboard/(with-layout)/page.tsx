import React from "react";
import { Suspense } from "react";
import { getCurrentUserOptional, isAuthenticated } from "@/utils/user-context";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";
import { DashboardSkeleton } from "@/app/components/shared/loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileText, BookOpen, Bot, Crown } from "lucide-react";
import { getSubjectIcon } from "@/utils/subject-icons";
import { SubjectsDataServer } from "@/app/components/dashboard/le-mie-materie/subjects-data-server";
import { DashboardSubjectCard } from "@/app/components/dashboard/dashboard-subject-card";
import { getUserSubjects } from "@/utils/subjects-data";
import { CheckoutSuccessHandler } from "@/app/components/stripe/checkout-success-handler";
import { SubscriptionChecker } from "@/app/components/subscription/subscription-checker";
import { SubscriptionCard } from "@/app/components/dashboard/subscription-card";
import { NotesChart } from "@/app/components/shared/charts/notes-chart";
import { RecentStudyNotes } from "@/app/components/dashboard/recent-study-notes";
import {
  getDashboardSubscriptionData,
  getDashboardRecentStudyData,
} from "@/utils/dashboard-data";
import type { Metadata } from "next";
import { getDailyStudyActivity } from "@/utils/study-sessions";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica, statistiche di progresso e impostazioni del profilo.",
  keywords: [
    "dashboard maturità",
    "area personale",
    "statistiche studio",
    "progresso matematica",
    "simulazioni personali",
  ],
  openGraph: {
    title: "Dashboard | MaturaMente",
    description:
      "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica e statistiche di progresso.",
    url: "/dashboard",
  },
  twitter: {
    title: "Dashboard | MaturaMente",
    description:
      "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica e statistiche.",
  },
  alternates: {
    canonical: "/dashboard",
  },
};

// Force dynamic rendering since we use headers() through getCurrentUser()
export const dynamic = "force-dynamic";

// Configure for better caching
export const revalidate = 300; // 5 minutes revalidation for dashboard data

export default async function DashboardMaturamentePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
      <Suspense fallback={null}>
        <CheckoutSuccessHandler />
      </Suspense>
    </Suspense>
  );
}

async function DashboardContent() {
  // Check if user is authenticated (outside try/catch)
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <UnauthenticatedDashboard />;
  }

  // Get current user from headers (set by middleware)
  const user = await getCurrentUserOptional();
  if (!user) {
    return <UnauthenticatedDashboard />;
  }

  const userId = user.id;

  try {
    // Fetch data in parallel
    const [
      subjectsData,
      userSubjects,
      subscriptionData,
      dailyActivity,
      recentStudyData,
    ] = await Promise.all([
      SubjectsDataServer(),
      getUserSubjects(userId),
      getDashboardSubscriptionData(userId),
      getDailyStudyActivity(userId, 60),
      getDashboardRecentStudyData(userId, 6),
    ]);

    return (
      <SubscriptionChecker userId={userId}>
        <div className="pointer-events-none absolute top-0 left-0 h-100 w-100 bg-blue-500/20 rounded-[50%] -translate-x-1/3 -translate-y-1/3 blur-[100px]" />
        <div className="flex flex-col gap-8 pb-10 container mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="relative w-full pt-2">
            <div className="relative p-5 md:p-7">
              <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Ciao {user.name}
                  </h1>
                  <p className="text-muted-foreground mt-2 md:text-base">
                    Continua il tuo studio da dove lo avevi lasciato
                  </p>
                </div>
                <div className="w-full lg:w-auto">
                  <SubscriptionCard subscriptionData={subscriptionData} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:px-0 px-4">
            {/* Row 1: Le mie materie (larger) + Ore di studio (smaller) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Le mie materie Section - takes 2/3 of the width */}
              <Card className="lg:col-span-2 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Le mie materie
                  </CardTitle>
                  <CardDescription>
                    Le materie che stai studiando di più
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectsData.subjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative w-full h-full">
                      {subjectsData.subjects.slice(0, 4).map((subject) => (
                        <DashboardSubjectCard
                          key={subject.id}
                          subject={subject}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessuna materia disponibile</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/le-mie-materie">
                      Tutte le materie
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Recent study notes section */}
              <Card className="lg:col-span-1 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Appunti recenti
                  </CardTitle>
                  <CardDescription>
                    Gli ultimi appunti che hai studiato
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <RecentStudyNotes recentNotes={recentStudyData} />
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Pit (smaller) + Ore di studio (larger) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pit Section - takes 1/3 of the width */}
              <Card className="lg:col-span-1 overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xl h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-primary" />
                    Pit
                  </CardTitle>
                  <CardDescription>
                    Le tue materie studiate di recente
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {(() => {
                    // Derive 3 most recent DISTINCT subjects from recentStudyData
                    const seen = new Set<string>();
                    const distinctBySubject = recentStudyData
                      .filter((n) => {
                        if (seen.has(n.subjectSlug)) return false;
                        seen.add(n.subjectSlug);
                        return true;
                      })
                      .slice(0, 3);

                    if (distinctBySubject.length === 0) {
                      return (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Nessuna materia recente. Inizia a studiare dai tuoi
                          appunti.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {distinctBySubject.map((n) => {
                          const Icon = getSubjectIcon(n.subjectName);
                          const color = n.subjectColor;
                          const cardStyle = {
                            "--subject-color": color,
                          } as React.CSSProperties;
                          return (
                            <Link
                              key={n.subjectSlug}
                              href={`/${n.subjectSlug}/Pit`}
                              className="group block"
                              style={cardStyle}
                            >
                              <div className="relative rounded-xl border p-4 md:p-5 min-h-[84px] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer overflow-hidden">
                                {/* subtle top highlight line */}
                                <hr className="hidden dark:block via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent via-[var(--subject-color)] to-transparent" />

                                <div
                                  className="pointer-events-none absolute -top-16 left-1/2 h-24 w-full -translate-x-1/2 rounded-[50%] blur-[60px]"
                                  style={{ backgroundColor: `${color}33` }}
                                />
                                <div className="relative z-10 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-10 w-10 items-center justify-center">
                                      {Icon ? (
                                        <Icon
                                          className="h-5 w-5"
                                          style={{ color: `${color}90` }}
                                        />
                                      ) : (
                                        <Bot
                                          className="h-5 w-5"
                                          style={{ color: `${color}90` }}
                                        />
                                      )}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-sm md:text-base font-semibold truncate">
                                        {n.subjectName}
                                      </div>
                                      <div className="text-xs md:text-sm text-muted-foreground truncate">
                                        Apri il tutor di {n.subjectName}
                                      </div>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--subject-color)]" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full text-white">
                    <Link href="/dashboard/pit">
                      Parla con Pit
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              {/* Ore di studio Section - takes 1/3 of the width */}
              <div className="lg:col-span-2 rounded-2xl backdrop-blur-sm shadow-xl">
                <NotesChart dailyActivity={dailyActivity} />
              </div>
            </div>
          </div>
        </div>
      </SubscriptionChecker>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <SubscriptionChecker userId={userId}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Errore nel caricamento della dashboard. Riprova più tardi.
          </p>
        </div>
      </SubscriptionChecker>
    );
  }
}

// Unauthenticated dashboard component
function UnauthenticatedDashboard() {
  // Sample data for demonstration
  const sampleData = (
    <div className="flex flex-col gap-6 pb-8 container mx-auto max-w-6xl px-4 min-h-[calc(100vh-4rem)]">
      {/* Hero Banner */}
      <div className="relative w-full pt-4 md:px-2 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,#000)]" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Ciao Paolo Auletta
              </h1>
              <p className="text-muted-foreground mt-2">
                Continua il tuo studio da dove lo avevi lasciato
              </p>
            </div>
            <Card className="w-full lg:w-auto">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Piano Pro</p>
                    <p className="text-xs text-muted-foreground">
                      Prossimo rinnovo 12/04/2025
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample cards */}
        <Card className="lg:col-span-2 h-48">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Le mie materie</div>
          </CardContent>
        </Card>
        <Card className="h-64">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Ore di studio</div>
          </CardContent>
        </Card>
        <Card className="h-64">
          <CardContent className="p-4">
            <div className="text-xl font-bold">AI Tutor</div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 h-32">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Appunti recenti</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <UnauthenticatedOverlay
      title="Accedi alla tua Dashboard"
      description="Crea un account gratuito per monitorare i tuoi progressi e personalizzare il tuo percorso di studio"
      features={[
        "Appunti su ogni argomento",
        "Accesso a PIT, il tuo Personal Intelligent Tutor",
        "Sezione Maturità con teoria, esercizi e simulazioni",
        "Monitora i tuoi progressi",
      ]}
    >
      {sampleData}
    </UnauthenticatedOverlay>
  );
}
