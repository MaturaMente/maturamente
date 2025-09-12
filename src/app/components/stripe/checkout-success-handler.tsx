"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import {
  softRefreshSubscriptionData,
  forcePageRefresh,
} from "@/utils/client-cache-utils";

export function CheckoutSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const success = searchParams.get("success");

    if (sessionId && success === "true") {
      // Ensure the subscription checker bypass is active immediately on return
      if (typeof window !== "undefined") {
        sessionStorage.setItem("bypassSubscriptionRedirect", "true");
      }
      processCheckout(sessionId);
    }
  }, [searchParams]);

  const processCheckout = async (sessionId: string) => {
    setStatus("processing");

    try {
      const response = await fetch("/api/stripe/process-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        setSubscriptionInfo(data.subscription);

        // Refresh subscription data and redirect to dashboard
        setTimeout(async () => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("bypassSubscriptionRedirect");

            // Try soft refresh first, fallback to hard refresh if it fails
            const softRefreshSuccess = await softRefreshSubscriptionData();

            if (softRefreshSuccess) {
              // Navigate to dashboard after successful soft refresh
              router.replace("/dashboard");
            } else {
              // Fallback to hard refresh if soft refresh fails
              forcePageRefresh("/dashboard");
            }
          }
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Elaborazione del checkout fallita");
      }
    } catch (error) {
      console.error("Error processing checkout:", error);
      setStatus("error");
      setMessage("Si è verificato un errore imprevisto");
    }
  };

  const handleRetry = () => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      processCheckout(sessionId);
    }
  };

  const handleDismiss = () => {
    // Reset status to hide the popup
    setStatus("idle");
    setMessage("");
    setSubscriptionInfo(null);

    // Clear the URL parameters to dismiss the popup
    const url = new URL(window.location.href);
    url.searchParams.delete("session_id");
    url.searchParams.delete("success");
    router.replace(url.pathname);

    // Remove the bypass flag when user dismisses the modal
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("bypassSubscriptionRedirect");
    }
  };

  // Don't render anything if there's no checkout to process
  if (status === "idle") return null;

  return (
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
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle>
            {status === "processing" && "Elaborazione del tuo acquisto..."}
            {status === "success" && "Pagamento riuscito!"}
            {status === "error" && "Qualcosa è andato storto"}
          </CardTitle>
          <CardDescription>
            {status === "processing" &&
              "Attendi mentre attiviamo il tuo abbonamento."}
            {status === "success" &&
              "Il tuo abbonamento è stato attivato con successo."}
            {status === "error" &&
              "Abbiamo riscontrato un problema nell'elaborazione del tuo pagamento."}
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
                Accesso a {subscriptionInfo.subjects} materia
                {subscriptionInfo.subjects !== 1 ? "e" : ""}
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
              onClick={handleDismiss}
              className="flex-1"
              variant={status === "error" ? "default" : "outline"}
            >
              {status === "success" ? "Continua alla Dashboard" : "Chiudi"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
