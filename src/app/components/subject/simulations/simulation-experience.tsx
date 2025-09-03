"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  TabletSmartphone,
  ArrowLeft,
  CheckCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PdfViewer from "@/app/components/shared/renderer/pdf-renderer";
import { SimulationClientProps } from "@/types/simulationsTypes";
import { AuthPopup, useAuthPopup } from "@/app/components/auth/auth-popup";

export default function SimulationExperience({
  simulation,
  userId,
  hasStarted,
  isCompleted,
  completedSimulationId,
  startedAt,
  isAuthenticated = false,
}: SimulationClientProps) {
  const router = useRouter();
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;
  const [showConfirmation, setShowConfirmation] = useState(!hasStarted);
  const [isRestarting, setIsRestarting] = useState(false);

  // Auth popup hook
  const { isAuthPopupOpen, showAuthPopup, hideAuthPopup } = useAuthPopup();

  // Calculate initial time remaining based on start time
  const calculateInitialTimeRemaining = () => {
    if (!hasStarted || isCompleted || !startedAt) {
      return simulation.time_in_min * 60; // Default to full time in seconds
    }

    const startTime = new Date(startedAt).getTime();
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    const totalSeconds = simulation.time_in_min * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    return remainingSeconds;
  };

  const [timeRemaining, setTimeRemaining] = useState<number>(
    calculateInitialTimeRemaining()
  );
  const [timerActive, setTimerActive] = useState(hasStarted && !isCompleted);

  // Complete a simulation - wrapped in useCallback to avoid dependency issues
  const handleCompleteSimulation = useCallback(async () => {
    if (!hasStarted || isCompleted) return;

    try {
      const response = await fetch("/api/simulations/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId: simulation.id,
          completedSimulationId,
          userId,
        }),
      });

      if (response.ok) {
        setTimerActive(false);
        router.push(`/${subjectSlug}/simulazioni/${simulation.slug}/soluzioni`);
      } else {
        console.error("Failed to complete simulation");
      }
    } catch (error) {
      console.error("Error completing simulation:", error);
    }
  }, [
    hasStarted,
    isCompleted,
    simulation.id,
    simulation.slug,
    completedSimulationId,
    userId,
    router,
    subjectSlug,
  ]);

  // Start the timer when a user begins a simulation
  useEffect(() => {
    if (!timerActive) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCompleteSimulation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, handleCompleteSimulation]);

  // Format time based on duration
  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      // Format as hours:minutes:seconds when >= 1 hour
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      // Format as minutes:seconds when < 1 hour
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  };

  // Get human-readable duration for display
  const getHumanReadableDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (remainingMinutes === 0) {
        return `${hours} ${hours === 1 ? "ora" : "ore"}`;
      } else {
        return `${hours} ${hours === 1 ? "ora" : "ore"} e ${remainingMinutes} ${
          remainingMinutes === 1 ? "minuto" : "minuti"
        }`;
      }
    } else {
      return `${minutes} ${minutes === 1 ? "minuto" : "minuti"}`;
    }
  };

  // Start a new simulation
  const handleStartSimulation = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      showAuthPopup();
      return;
    }

    try {
      const response = await fetch("/api/simulations/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId: simulation.id,
          userId,
        }),
      });

      if (response.ok) {
        setShowConfirmation(false);
        setTimerActive(true);
        router.refresh();
      } else {
        // Try to get more detailed error info
        try {
          const errorData = await response.json();
          console.error("Failed to start simulation:", errorData);
        } catch {
          console.error(
            "Failed to start simulation with status:",
            response.status
          );
        }
      }
    } catch (error) {
      console.error("Error starting simulation:", error);
    }
  };

  // Start over/do again - Modified to skip confirmation and directly start the simulation
  const handleStartOver = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      showAuthPopup();
      return;
    }

    try {
      setIsRestarting(true);
      // Call API to reset simulation status
      const response = await fetch("/api/simulations/restart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId: simulation.id,
        }),
      });

      if (response.ok) {
        // The restart API already creates a new record, so we just need to update the UI
        setShowConfirmation(false);
        setTimerActive(true);
        router.refresh();
      } else {
        console.error("Failed to restart simulation");
      }
    } catch (error) {
      console.error("Error restarting simulation:", error);
    } finally {
      setIsRestarting(false);
    }
  };

  // If the user has completed this simulation, show solutions page
  if (isCompleted) {
    return (
      <>
        <CompletedView
          simulation={simulation}
          isRestarting={isRestarting}
          onStartOver={handleStartOver}
        />

        {/* Auth popup for unauthenticated users */}
        <AuthPopup isOpen={isAuthPopupOpen} onClose={hideAuthPopup} />
      </>
    );
  }

  // Show confirmation page before starting the simulation
  if (showConfirmation) {
    return (
      <>
        <ConfirmationView
          simulation={simulation}
          onStartSimulation={handleStartSimulation}
          formatDuration={getHumanReadableDuration}
        />

        {/* Auth popup for unauthenticated users */}
        <AuthPopup isOpen={isAuthPopupOpen} onClose={hideAuthPopup} />
      </>
    );
  }

  // Show the actual simulation with timer
  return (
    <>
      <ActiveSimulation
        simulation={simulation}
        timeRemaining={timeRemaining}
        formatTime={formatTime}
        onComplete={handleCompleteSimulation}
      />

      {/* Auth popup for unauthenticated users */}
      <AuthPopup isOpen={isAuthPopupOpen} onClose={hideAuthPopup} />
    </>
  );
}

// Inlined Timer Display Component
interface TimerDisplayProps {
  timeRemaining: number;
  formatTime: (seconds: number) => string;
}

function TimerDisplay({ timeRemaining, formatTime }: TimerDisplayProps) {
  const isLowTime = timeRemaining < 300;

  return (
    <div
      className={`flex items-center justify-center rounded-md border ${
        isLowTime
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          : "border-border/30 bg-muted/20"
      } px-3 py-1.5`}
    >
      <Clock className={`h-4 w-4 mr-2 ${isLowTime ? "text-red-500" : ""}`} />
      <span
        className={`font-mono text-base ${
          isLowTime ? "text-red-500 font-bold" : ""
        }`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}

// Inlined Active Simulation Component
interface ActiveSimulationProps {
  simulation: any;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  onComplete: () => Promise<void>;
}

function ActiveSimulation({
  simulation,
  timeRemaining,
  formatTime,
  onComplete,
}: ActiveSimulationProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "min-h-screen flex flex-col"
      }
    >
      <AlertDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Sei sicuro di voler terminare la simulazione?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata e la simulazione verrà
              considerata completata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={onComplete}>
              <span className="text-white">Conferma</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="md:flex hidden sticky top-0 py-3 px-4 border-b z-10 flex flex-row justify-between items-center">
        <Link href={`/${subjectSlug}/simulazioni`} className="block mr-3">
          <div className="text-muted-foreground items-center w-fit gap-1 flex flex-row hover:text-foreground transition-all">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Torna alle simulazioni</span>
          </div>
        </Link>
        <div className="flex items-center">
          <h1 className="text-xl font-medium">{simulation.title}</h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <TimerDisplay timeRemaining={timeRemaining} formatTime={formatTime} />

          <div className="flex gap-2 flex-1 sm:flex-initial justify-end">
            <Button
              onClick={() => setShowCompleteDialog(true)}
              variant="default"
              className="text-white"
              size="sm"
            >
              Termina Simulazione
            </Button>
          </div>
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3 px-4">
        <div className="bg-background sticky top-0 py-3 border-b z-10 flex flex-col justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <Link href={`/${subjectSlug}/simulazioni`} className="block mr-3">
              <div className="text-muted-foreground items-center w-fit gap-1 flex flex-row hover:text-foreground transition-all">
                <ArrowLeft className="h-4 w-4" />
                <span>Torna indietro</span>
              </div>
            </Link>
            <TimerDisplay
              timeRemaining={timeRemaining}
              formatTime={formatTime}
            />
          </div>
          <div className="flex items-center justify-center w-full">
            <h1 className="text-2xl font-medium">{simulation.title}</h1>
          </div>
          <div className="flex items-center justify-center w-full">
            <Button
              onClick={() => setShowCompleteDialog(true)}
              variant="default"
              className="text-white w-full"
              size="sm"
            >
              Termina Simulazione
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 w-full relative ${
          fullscreen ? "h-[calc(100vh-112px)]" : "h-[calc(100vh-180px)]"
        }`}
      >
        <div className="absolute inset-0 py-4 sm:p-6 flex flex-col">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-border/30 flex flex-col">
            <PdfViewer
              pdfUrl={simulation.pdf_url}
              height="100%"
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Inlined Completed View Component
interface CompletedViewProps {
  simulation: any;
  isRestarting: boolean;
  onStartOver: () => Promise<void>;
}

function CompletedView({
  simulation,
  isRestarting,
  onStartOver,
}: CompletedViewProps) {
  // Get the referrer from URL params
  const searchParams = useSearchParams();
  const referrer = searchParams.get("referrer");
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  // Determine the back path and text based on the referrer
  const getBackDetails = () => {
    switch (referrer) {
      case "statistiche":
        return {
          path: `/${subjectSlug}/statistiche`,
          text: "Torna alle statistiche",
        };
      case "preferiti":
        return {
          path: `/${subjectSlug}/preferiti`,
          text: "Torna ai preferiti",
        };
      default:
        return {
          path: `/${subjectSlug}/simulazioni`,
          text: "Torna alle simulazioni",
        };
    }
  };

  const { path, text } = getBackDetails();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
      <div className="relative w-full max-w-2xl flex justify-center">
        <Link href={path}>
          <div className="absolute -top-10 left-0 text-muted-foreground items-center w-fit gap-1 flex flex-row hover:text-foreground transition-all z-10">
            <ArrowLeft className="h-4 w-4" />
            <span>{text}</span>
          </div>
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{simulation.title}</CardTitle>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardDescription>
              Hai già completato questa simulazione.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Puoi rivedere le soluzioni oppure ripetere la simulazione per
              esercitarti ulteriormente.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <Button
              variant="outline"
              onClick={onStartOver}
              disabled={isRestarting}
              className="w-full sm:w-auto"
            >
              {isRestarting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Riavvio...
                </>
              ) : (
                "Ripeti Simulazione"
              )}
            </Button>
            <Link
              href={`/${subjectSlug}/simulazioni/${simulation.slug}/soluzioni`}
              className="w-full sm:w-auto"
            >
              <Button variant="default" className="text-white w-full sm:w-auto">
                <FileText className="mr-2 h-4 w-4" />
                Vedi Soluzioni
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Inlined Confirmation View Component
interface ConfirmationViewProps {
  simulation: any;
  onStartSimulation: () => Promise<void>;
  formatDuration: (minutes: number) => string;
}

function ConfirmationView({
  simulation,
  onStartSimulation,
  formatDuration,
}: ConfirmationViewProps) {
  // Get the referrer from URL params
  const searchParams = useSearchParams();
  const referrer = searchParams.get("referrer");
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  // Determine the back path and text based on the referrer
  const getBackDetails = () => {
    switch (referrer) {
      case "statistiche":
        return {
          path: `/${subjectSlug}/statistiche`,
          text: "Torna alle statistiche",
        };
      case "preferiti":
        return {
          path: `/${subjectSlug}/preferiti`,
          text: "Torna ai preferiti",
        };
      default:
        return {
          path: `/${subjectSlug}/simulazioni`,
          text: "Torna alle simulazioni",
        };
    }
  };

  const { path, text } = getBackDetails();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
      <div className="relative w-full max-w-2xl flex justify-center">
        <Link href={path}>
          <div className="absolute -top-10 left-0 text-muted-foreground items-center w-fit gap-1 flex flex-row hover:text-foreground transition-all z-10">
            <ArrowLeft className="h-4 w-4" />
            <span>{text}</span>
          </div>
        </Link>
        <Card className="w-full border-border">
          <div className="pt-4">
            <CardHeader>
              <CardTitle className="text-2xl">
                Sei pronto per iniziare la simulazione?
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {/* Main simulation information */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-1">{simulation.title}</h2>
              </div>

              {/* Duration information */}
              <div className="flex-col items-start text-muted-foreground border border-border/50 rounded-md p-3 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 flex-shrink-0" />
                  <p className="font-medium text-foreground">
                    Durata: {formatDuration(simulation.time_in_min)}
                  </p>
                </div>
                <p className="text-sm">
                  Avrai questo tempo per completare tutti gli esercizi.
                </p>
              </div>
              {/* Mobile disclaimer */}
              <div className="mt-6 md:hidden flex-col items-start bg-primary/10 border border-primary/20 text-primary rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TabletSmartphone className="h-5 w-5 flex-shrink-0" />
                  <p className="font-medium">Consiglio</p>
                </div>
                <p className="text-sm text-primary/80">
                  È consigliato svolgere le simulazioni da desktop o tablet per
                  una migliore esperienza.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/30 pt-4 flex justify-end">
              <Button
                onClick={onStartSimulation}
                variant={"default"}
                className="md:mx-0 mx-auto items-center justify-center text-white"
              >
                Inizia Simulazione
              </Button>
            </CardFooter>
          </div>
        </Card>
      </div>
    </div>
  );
}
