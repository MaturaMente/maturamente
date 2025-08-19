"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "cookie_consent";

interface CookieConsentProps {
  className?: string;
}

export function CookieConsent({ className }: CookieConsentProps) {
  const [showConsent, setShowConsent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (
      !mounted ||
      typeof window === "undefined" ||
      typeof localStorage === "undefined"
    )
      return;

    // Check if user has already given consent
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsent) {
      setShowConsent(true);
    }
  }, [mounted]);

  const acceptAll = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(COOKIE_CONSENT_KEY, "all");
    }
    setShowConsent(false);
  };

  const acceptNecessary = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(COOKIE_CONSENT_KEY, "necessary");
    }
    setShowConsent(false);
  };

  if (!mounted || !showConsent) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 md:p-6",
        className
      )}
    >
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2 text-sm">
          <p>
            Utilizziamo i cookie per migliorare la tua esperienza sul nostro
            sito. Alcuni cookie sono necessari per il funzionamento del sito,
            mentre altri ci aiutano a capire come interagisci con esso.
          </p>
          <p className="text-muted-foreground">
            Leggi la nostra{" "}
            <Link
              href="/privacy-policy"
              className="underline hover:text-primary"
            >
              Privacy Policy
            </Link>{" "}
            e i{" "}
            <Link
              href="/terms-and-conditions"
              className="underline hover:text-primary"
            >
              Termini di Servizio
            </Link>{" "}
            per saperne di più.
          </p>
        </div>
        <div className="flex flex-row gap-2 min-w-[200px] justify-center items-start w-full">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={acceptNecessary}
          >
            Solo Necessari
          </Button>
          <Button className="w-full sm:w-auto text-white" onClick={acceptAll}>
            Accetta Tutti
          </Button>
        </div>
      </div>
    </div>
  );
}
