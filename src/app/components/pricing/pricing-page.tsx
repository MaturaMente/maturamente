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
  Calculator,
  ArrowRight,
  ArrowLeft,
  Settings,
  ChevronDown,
} from "lucide-react";
import { calculateCustomPrice } from "@/utils/subscription/subscription-plans";
import getStripe from "@/utils/subscription/stripe-client";
import { SubjectSelector } from "./subject-selector";
import type { SubscriptionStatus } from "@/types/subscriptionTypes";
// duplicate import removed
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

interface PricingPageProps {
  subjects: Subject[];
}

export function PricingPage({ subjects }: PricingPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [hasScrolledToCheckout, setHasScrolledToCheckout] = useState(false);

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
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

    if (status === "authenticated") {
      checkSubscription();
    } else if (status === "unauthenticated") {
      setCheckingSubscription(false);
    }
  }, [session?.user?.id, status]);

  // If user is on free trial and moving to premium, preselect current subjects
  useEffect(() => {
    const preselect = async () => {
      if (!subscriptionStatus?.isFreeTrial || !session?.user?.id) return;
      try {
        const res = await fetch("/api/user/subject-access", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.selectedSubjects) && data.selectedSubjects.length > 0) {
            setSelectedSubjects(data.selectedSubjects);
          }
        }
      } catch {}
    };
    preselect();
  }, [subscriptionStatus?.isFreeTrial, session?.user?.id]);

  // Show mobile bar when user selects subjects on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setShowMobileBar(
        isMobile && selectedSubjects.length > 0 && !hasScrolledToCheckout
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedSubjects.length, hasScrolledToCheckout]);

  // Reset scroll state when subjects change
  useEffect(() => {
    setHasScrolledToCheckout(false);
  }, [selectedSubjects.length]);

  // Enhanced detection: Hide mobile bar when checkout card is in viewport
  useEffect(() => {
    const checkoutCard = document.getElementById("checkout-card");
    if (!checkoutCard) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          // Card is more than 50% visible
          setHasScrolledToCheckout(true);
        }
      },
      {
        threshold: 0.5, // Trigger when 50% of the card is visible
        rootMargin: "-50px 0px", // Add some margin to avoid triggering too early
      }
    );

    observer.observe(checkoutCard);

    return () => observer.disconnect();
  }, []);

  const handleCheckout = async () => {
    if (selectedSubjects.length === 0 || !session?.user?.id) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: "CUSTOM",
          selectedSubjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const stripe = await getStripe();
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = calculateCustomPrice(selectedSubjects.length);
  const canProceedToCheckout = selectedSubjects.length > 0 && session?.user?.id;

  const handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bypassSubscriptionRedirect", "true");
    }
    router.push("/dashboard");
  };

  const handleScrollToCheckout = () => {
    const checkoutCard = document.getElementById("checkout-card");
    if (checkoutCard) {
      checkoutCard.scrollIntoView({ behavior: "smooth", block: "center" });
      // Hide the mobile bar after scroll animation completes
      setTimeout(() => {
        setHasScrolledToCheckout(true);
      }, 800); // Adjust timing to match scroll animation
    }
  };

  const handleGoToSettings = () => {
    router.push("/dashboard/settings");
  };

  // If user has active subscription (but not free trial), show the subscription message
  if (subscriptionStatus?.isActive && !subscriptionStatus?.isFreeTrial && !checkingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="max-w-lg w-full">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Check className="w-5 h-5 text-green-500" />
                  Abbonamento Attivo
                </CardTitle>
                <CardDescription>
                  Hai già un abbonamento attivo. Puoi gestirlo dalle
                  impostazioni.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Stai attualmente pagando{" "}
                    <span className="font-semibold">
                      €{subscriptionStatus.price.toFixed(2)}
                    </span>{" "}
                    al mese per{" "}
                    <span className="font-semibold">
                      {subscriptionStatus.subjectCount} materia
                      {subscriptionStatus.subjectCount === 1 ? "" : "e"}
                    </span>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  onClick={handleGoToSettings}
                  className="w-full flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Gestisci Abbonamento
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReturnToDashboard}
                  className="w-full flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Torna alla Dashboard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        {session?.user && (
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleReturnToDashboard}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna alla Dashboard
            </Button>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            <Star className="w-3 h-3 mr-1" />
            Prezzi Flessibili
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
            Studia Intelligente, Paga Meno
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Scegli esattamente quello di cui hai bisogno. Nessun pacchetto
            fisso, nessuno spreco. Aumenta o diminuisci in qualsiasi momento.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-foreground font-medium">€5,99</span>
              <span className="text-muted-foreground">prima materia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-foreground font-medium">€2.49</span>
              <span className="text-muted-foreground">ogni aggiuntiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-foreground font-medium">
                Cancella quando vuoi
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Subject Selection - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              {/* Free Trial CTA */}
              {!subscriptionStatus?.isFreeTrial && (
              <div className="mb-8">
                <div className="rounded-xl border bg-card/60 backdrop-blur p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-xs font-medium">
                        <Star className="w-3 h-3" /> Prova gratuita
                      </div>
                      <div className="space-y-1">
                      <h3 className="text-xl md:text-2xl font-semibold">Inizia gratis per 2 settimane</h3>
                      <p className="text-sm text-muted-foreground max-w-prose">
                        Scegli fino a 3 materie e prova MaturaMente senza carta.
                        <br />
                          Accesso limitato agli appunti e all'AI.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        className="text-white"
                        onClick={() => router.push("/free-trial-pricing")}
                      >
                        Inizia la prova gratuita
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              )}
              <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Scegli le Tue Materie
                </h2>
                <p className="text-muted-foreground">
                  Seleziona le materie che vuoi studiare. Puoi modificare la tua
                  selezione in qualsiasi momento.
                </p>
              </div>
              <SubjectSelector
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSelectionChange={setSelectedSubjects}
                />
              </div>
            </div>

            {/* Pricing Summary - Takes 1 column, sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card
                  id="checkout-card"
                  className="shadow-xl bg-card/80 backdrop-blur-sm border-border"
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      Il Tuo Piano
                    </CardTitle>
                    <CardDescription>
                      {selectedSubjects.length === 0
                        ? "Seleziona le materie per vedere i prezzi"
                        : `${selectedSubjects.length} materia${
                            selectedSubjects.length === 1 ? "" : "e"
                          } selezionat${
                            selectedSubjects.length === 1 ? "" : "e"
                          }`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {selectedSubjects.length > 0 ? (
                      <>
                        {/* Pricing Breakdown */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Prima materia
                            </span>
                            <span className="font-medium">€5,99</span>
                          </div>

                          {selectedSubjects.length > 1 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {selectedSubjects.length - 1} aggiuntiv
                                {selectedSubjects.length - 1 === 1 ? "a" : "e"}
                              </span>
                              <span className="font-medium">
                                €
                                {((selectedSubjects.length - 1) * 2.49).toFixed(
                                  2
                                )}
                              </span>
                            </div>
                          )}

                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Totale/mese</span>
                              <span className="text-2xl font-bold text-primary">
                                €{totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* What's Included */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-foreground">
                            Cosa è incluso:
                          </h4>
                          <div className="space-y-2">
                            {["Teoria ed esercizi completi", "Tracciamento studio con IA", "Analisi del progresso", "Supporto prioritario"].map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-muted-foreground">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calculator className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Seleziona le materie per vedere i tuoi prezzi
                          personalizzati
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-4">
                    {status === "unauthenticated" ? (
                      <Button
                        className="w-full h-12 text-base font-medium text-white cursor-pointer"
                        onClick={handleGoogleLogin}
                      >
                        Accedi per Continuare
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckout}
                        disabled={!canProceedToCheckout || loading}
                        className="w-full h-12 text-base cursor-pointer"
                        size="lg"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Elaborazione...
                          </div>
                        ) : selectedSubjects.length === 0 ? (
                          "Seleziona le materie per continuare"
                        ) : (
                          <div className="flex items-center gap-2 text-white">
                            Inizia per €{totalPrice.toFixed(2)}/mese
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

        {/* Mobile Bottom Bar */}
        {showMobileBar && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50 lg:hidden animate-in slide-in-from-bottom duration-300">
            <div className="container mx-auto p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {selectedSubjects.length} materi
                    {selectedSubjects.length === 1 ? "a" : "e"} selezionat
                    {selectedSubjects.length === 1 ? "a" : "e"}
                  </div>
                  <div className="text-xl font-bold text-primary">
                    €{totalPrice.toFixed(2)}/mese
                  </div>
                </div>
                <Button onClick={handleScrollToCheckout} className="flex text-white items-center gap-2 min-w-[120px]" disabled={!canProceedToCheckout}>
                  Continua
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
