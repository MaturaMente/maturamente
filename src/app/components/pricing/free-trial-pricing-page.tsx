"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Star,
  ArrowRight,
  ArrowLeft,
  Clock,
  BookOpen,
  Bot,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { SubjectSelector } from "./subject-selector";
import type { SubscriptionStatus } from "@/types/subscriptionTypes";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  maturita: boolean;
  notes_count: number;
}

interface FreeTrialPricingPageProps {
  subjects: Subject[];
}

export function FreeTrialPricingPage({ subjects }: FreeTrialPricingPageProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const maxTrialSubjects = 3;

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/free-trial-pricing" });
  };

  // Check subscription status when user is authenticated
  useEffect(() => {
    const checkSubscription = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/user/subscription-status");
          if (response.ok) {
            const data = await response.json();
            setSubscriptionStatus(data);
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
      setCheckingSubscription(false);
    };

    if (sessionStatus === "authenticated") {
      checkSubscription();
    } else if (sessionStatus === "unauthenticated") {
      setCheckingSubscription(false);
    }
  }, [session?.user?.id, sessionStatus]);

  const handleStartFreeTrial = async () => {
    if (selectedSubjects.length === 0 || selectedSubjects.length > maxTrialSubjects || !session?.user?.id) {
      return;
    }

    setStatus("processing");
    setLoading(true);

    try {
      const response = await fetch("/api/subscription/start-free-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedSubjects,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Impossibile avviare la prova gratuita");
      }

      // Set success state with subscription info like regular subscription
      setStatus("success");
      setMessage("Prova gratuita attivata con successo!");
      setSubscriptionInfo({
        plan: "Prova Gratuita",
        subjects: selectedSubjects.length,
      });

      // Redirect after 3 seconds like regular subscription
      setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("bypassSubscriptionRedirect", "true");
        }
        router.push("/dashboard");
      }, 3000);
    } catch (error) {
      console.error("Error:", error);
      setStatus("error");
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedToTrial = selectedSubjects.length > 0 && selectedSubjects.length <= maxTrialSubjects && session?.user?.id;

  const handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bypassSubscriptionRedirect", "true");
    }
    router.push("/dashboard");
  };

  const handleRetry = () => {
    handleStartFreeTrial();
  };

  const handleDismiss = () => {
    setStatus("idle");
    setMessage("");
    setSubscriptionInfo(null);
  };

  // If user has active paid subscription, redirect them
  useEffect(() => {
    if (subscriptionStatus?.isActive && !subscriptionStatus?.isFreeTrial && !checkingSubscription) {
      router.push("/dashboard");
    }
  }, [subscriptionStatus?.isActive, subscriptionStatus?.isFreeTrial, checkingSubscription, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-green-50/30 dark:from-green-950/20 dark:via-background dark:to-green-950/10">
      <div className="container mx-auto px-4 py-8">
        {status !== "idle" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {status === "processing" && (
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                  )}
                  {status === "success" && (
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  )}
                  {status === "error" && (
                    <X className="h-12 w-12 text-red-500" />
                  )}
                </div>
                <CardTitle>
                  {status === "processing" && "Attivazione prova gratuita..."}
                  {status === "success" && "Prova gratuita attivata!"}
                  {status === "error" && "Qualcosa è andato storto"}
                </CardTitle>
                <CardDescription>
                  {status === "processing" &&
                    "Attendi mentre attiviamo la tua prova gratuita."}
                  {status === "success" &&
                    "La tua prova gratuita è stata attivata con successo."}
                  {status === "error" &&
                    "Abbiamo riscontrato un problema nell'attivazione della prova gratuita."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && (
                  <p className="text-sm text-center text-muted-foreground">
                    {message}
                  </p>
                )}

                {subscriptionInfo && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      {subscriptionInfo.plan} attivato
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Accesso a {subscriptionInfo.subjects} materi
                      {subscriptionInfo.subjects !== 1 ? "e" : "a"}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {status === "error" && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      className="flex-1"
                    >
                      Riprova
                    </Button>
                  )}
                  <Button
                    onClick={status === "success" ? () => router.push("/dashboard") : handleDismiss}
                    className="flex-1"
                    variant={status === "error" ? "default" : "outline"}
                  >
                    {status === "success" ? "Continua alla Dashboard" : "Chiudi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/pricing")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai prezzi
          </Button>
          {session?.user && (
            <Button
              variant="ghost"
              onClick={handleReturnToDashboard}
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Star className="w-3 h-3 mr-1" />
            Prova Gratuita 2 Settimane
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 via-green-700 to-green-800 dark:from-green-500 dark:via-green-400 dark:to-green-600 bg-clip-text text-transparent leading-tight">
            Inizia Gratis, Studia Subito
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Scopri MaturaMente senza impegno. Scegli fino a 3 materie e accedi agli appunti selezionati per 2 settimane complete.
          </p>

          {/* Free Trial Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <Clock className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-green-800 dark:text-green-400">2 Settimane Gratis</h3>
              <p className="text-sm text-green-600 dark:text-green-500 text-center">Nessuna carta richiesta</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <BookOpen className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-green-800 dark:text-green-400">3 Materie</h3>
              <p className="text-sm text-green-600 dark:text-green-500 text-center">Accesso agli appunti selezionati</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <Bot className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-green-800 dark:text-green-400">AI Limitata</h3>
              <p className="text-sm text-green-600 dark:text-green-500 text-center">€0,05 di crediti AI</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Subject Selection - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">Scegli le tue materie</h2>
                <p className="text-muted-foreground">
                  Seleziona fino a {maxTrialSubjects} materie per la tua prova gratuita. Potrai sempre aggiungerne altre passando al piano Premium.
                </p>
              </div>
              <SubjectSelector
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSelectionChange={(ids) =>
                  setSelectedSubjects(ids.slice(0, maxTrialSubjects))
                }
                maxSelectable={maxTrialSubjects}
              />
            </div>

            {/* Trial Summary - Takes 1 column, sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="shadow-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2 text-green-800 dark:text-green-400">
                      <Star className="w-5 h-5" />
                      Prova Gratuita
                    </CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-500">
                      {selectedSubjects.length === 0
                        ? "Seleziona le materie per iniziare"
                        : `${selectedSubjects.length} di ${maxTrialSubjects} materia${
                            selectedSubjects.length === 1 ? "" : "e"
                          } selezionata${
                            selectedSubjects.length === 1 ? "" : "e"
                          }`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {selectedSubjects.length > 0 ? (
                      <>
                        {/* Trial Details */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700 dark:text-green-400">Durata</span>
                            <span className="font-semibold text-green-800 dark:text-green-300">2 settimane</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700 dark:text-green-400">Costo</span>
                            <span className="font-semibold text-green-800 dark:text-green-300">Gratis</span>
                          </div>
                        </div>

                        {/* What's Included */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-green-800 dark:text-green-400">
                            Cosa è incluso:
                          </h4>
                          <div className="space-y-2">
                            {[
                              "Appunti selezionati delle materie scelte",
                              "Accesso limitato all'AI tutor",
                              "Tracciamento del progresso base",
                              "Interfaccia completa",
                            ].map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-green-700 dark:text-green-400">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* What's NOT Included */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">
                            Non incluso:
                          </h4>
                          <div className="space-y-2">
                            {[
                              "Contenuti Maturità",
                              "Caricamento file personali",
                              "Accesso completo agli appunti",
                            ].map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span className="text-red-600 dark:text-red-400">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-green-600 dark:text-green-500 text-sm">
                          Seleziona fino a {maxTrialSubjects} materie per iniziare la tua prova gratuita
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-4">
                    {sessionStatus === "unauthenticated" ? (
                      <Button
                        className="w-full h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white border-0"
                        onClick={handleGoogleLogin}
                        variant="secondary"
                      >
                        Accedi per iniziare gratis
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartFreeTrial}
                        disabled={!canProceedToTrial || loading}
                        variant="secondary"
                        className={cn(
                          "w-full h-12 text-base font-medium border-0",
                          canProceedToTrial
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-green-300 text-green-800 cursor-not-allowed"
                        )}
                        size="lg"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Avvio prova gratuita...
                          </div>
                        ) : selectedSubjects.length === 0 ? (
                          "Seleziona le materie per continuare"
                        ) : selectedSubjects.length > maxTrialSubjects ? (
                          `Massimo ${maxTrialSubjects} materie`
                        ) : (
                          <div className="flex items-center gap-2">
                            Inizia prova gratuita
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Alla fine della prova potrai passare al piano Premium per accedere a tutti i contenuti
          </p>
          <Button variant="outline" onClick={() => router.push("/pricing")}>
            Scopri il piano Premium
          </Button>
        </div>
      </div>
    </div>
  );
}
