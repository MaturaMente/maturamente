import { Suspense } from "react";
import { StatisticsSkeleton } from "@/app/components/shared/loading";
import { getCurrentUserOptional, isAuthenticated } from "@/utils/user-context";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";
import { getUserSubjectBySlug } from "@/utils/subjects-data";
import { getNotesStatistics } from "@/utils/notes-data";
import { getAllStatisticsDataBySubject } from "@/utils/statistics-data";
import type { Metadata } from "next";

// Import client components
import { NotesStatistics } from "@/app/components/statistiche/notes-statistics";
import { StatisticsMaturità } from "@/app/components/statistiche/maturità-statistics";

// Import UI components for sample data
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Heart } from "lucide-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiche",
  description:
    "Visualizza le tue statistiche di studio su MaturaMente. Monitora i progressi negli appunti, simulazioni, teoria completata e aree di miglioramento per la maturità.",
  keywords: [
    "statistiche studio",
    "progresso maturità",
    "analisi performance",
    "appunti preferiti",
    "punteggi simulazioni",
    "teoria completata",
    "monitoraggio studio",
    "dashboard analytics",
  ],
  openGraph: {
    title: "Statistiche | MaturaMente",
    description:
      "Visualizza le tue statistiche di studio su MaturaMente. Monitora i progressi negli appunti e nella preparazione alla maturità.",
    url: "/statistiche",
  },
  twitter: {
    title: "Statistiche | MaturaMente",
    description:
      "Visualizza le tue statistiche di studio su MaturaMente. Monitora i progressi negli appunti.",
  },
  alternates: {
    canonical: "/statistiche",
  },
};

interface StatisticsPageProps {
  params: Promise<{
    "subject-slug": string;
  }>;
}

export default async function StatisticsPage({ params }: StatisticsPageProps) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<StatisticsSkeleton />}>
      <StatisticsContent subjectSlug={resolvedParams["subject-slug"]} />
    </Suspense>
  );
}

async function StatisticsContent({ subjectSlug }: { subjectSlug: string }) {
  try {
    // Check if user is authenticated
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      return <UnauthenticatedStatistics />;
    }

    // Get current user
    const user = await getCurrentUserOptional();
    if (!user) {
      return <UnauthenticatedStatistics />;
    }

    const userId = user.id;

    // Get current subject to check if it has maturità
    const currentSubject = await getUserSubjectBySlug(userId, subjectSlug);
    if (!currentSubject) {
      return (
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-bold tracking-tight">Statistiche</h1>
          <p className="text-muted-foreground">
            Materia non trovata o non hai accesso a questa materia.
          </p>
        </div>
      );
    }

    // Fetch notes statistics (always shown)
    const notesData = await getNotesStatistics(userId, currentSubject.id);

    // Fetch maturità statistics only if subject has maturità
    let maturitaData = null;
    if (currentSubject.maturita) {
      maturitaData = await getAllStatisticsDataBySubject(
        userId,
        currentSubject.id
      );
    }

    return (
      <div className="flex flex-col gap-8 container mx-auto max-w-5xl">
        {/* Main Header */}
        <div className="relative w-full pt-4 overflow-hidden border-b border-border pb-2">
          <div className="relative">
            <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0 md:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight truncate">
                  Statistiche
                </h1>
                <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
                  Riepilogo dettagliato dei tuoi progressi in{" "}
                  {currentSubject.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Use tabs if maturità is available, otherwise show only notes */}
        {currentSubject.maturita && maturitaData ? (
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="notes" className="text-sm">
                Appunti
              </TabsTrigger>
              <TabsTrigger value="maturita" className="text-sm">
                Maturità
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-2 md:mt-4">
              <NotesStatistics
                data={notesData}
                subjectColor={currentSubject.color}
              />
            </TabsContent>

            <TabsContent value="maturita" className="mt-2 md:mt-4">
              <StatisticsMaturità data={maturitaData} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Show only notes statistics when no maturità */
          <NotesStatistics
            data={notesData}
            subjectColor={currentSubject.color}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error("Error loading statistics:", error);
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Statistiche</h1>
        <p className="text-muted-foreground">
          Si è verificato un errore durante il caricamento delle statistiche.
        </p>
      </div>
    );
  }
}

// Unauthenticated statistics component
function UnauthenticatedStatistics() {
  // Minimal sample data for demonstration
  const sampleData = (
    <div className="flex flex-col gap-6 p-4 md:p-24 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Statistiche</h1>
        <p className="text-muted-foreground">
          Monitora i tuoi progressi e analizza le tue performance
        </p>
      </div>

      {/* Sample Notes Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="h-24">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div className="text-xl font-bold">24</div>
            </div>
            <div className="text-xs text-muted-foreground">Appunti</div>
          </CardContent>
        </Card>
        <Card className="h-24">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <div className="text-xl font-bold">12</div>
            </div>
            <div className="text-xs text-muted-foreground">Preferiti</div>
          </CardContent>
        </Card>
        <Card className="h-24">
          <CardContent className="p-4">
            <div className="text-xl font-bold">85%</div>
            <div className="text-xs text-muted-foreground">Completamento</div>
          </CardContent>
        </Card>
        <Card className="h-24">
          <CardContent className="p-4">
            <div className="text-xl font-bold">2h</div>
            <div className="text-xs text-muted-foreground">Studio oggi</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <UnauthenticatedOverlay
      title="Accedi alle tue Statistiche"
      description="Crea un account gratuito per visualizzare statistiche dettagliate dei tuoi progressi di studio"
      features={[
        "Statistiche dettagliate degli appunti",
        "Analisi dei progressi nel tempo",
        "Statistiche per argomento",
        "Confronto con obiettivi personali",
      ]}
    >
      {sampleData}
    </UnauthenticatedOverlay>
  );
}
