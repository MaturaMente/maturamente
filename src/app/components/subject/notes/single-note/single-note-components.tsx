"use client";

import { useState, useEffect } from "react";
import PdfViewerWithTrialLimits from "@/app/components/shared/renderer/pdf-viewer-with-trial-limits";
import { MessageCircle, AlertCircle } from "lucide-react";
import type { Note } from "@/types/notesTypes";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import PdfChat from "@/app/components/chat/pdf-chat";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PDFComponentProps {
  note: Note;
  mobileFullscreen?: boolean;
  onToggleMobileFullscreen?: () => void;
  isFreeTrialUser?: boolean;
  maxAllowedPages?: number;
}

interface ChatComponentProps {
  // Add any props needed for the chat component in the future
}

// PDF component for displaying the note's PDF content with signed URL support
export function PDFComponent({
  note,
  mobileFullscreen,
  onToggleMobileFullscreen,
  isFreeTrialUser = false,
  maxAllowedPages = 3,
}: PDFComponentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch a signed URL for the note
  const fetchSignedUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notes/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteId: note.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch signed URL");
      }

      setSignedUrl(data.signedUrl);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);

      // Only log unexpected errors to console, not free trial restrictions
      if (
        !/non è disponibile|non.*disponibile|Questa risorsa/.test(errorMessage)
      ) {
        console.error("Error fetching signed URL:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch signed URL when component mounts or note changes
  useEffect(() => {
    fetchSignedUrl();
  }, [note.id]);

  // Auto-refresh signed URL every 50 minutes (before 1-hour expiry)
  useEffect(() => {
    if (!signedUrl) return;

    const refreshInterval = setInterval(() => {
      fetchSignedUrl();
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, [signedUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinner text="Caricamento PDF..." size="sm" />
      </div>
    );
  }

  if (error) {
    const isTrialRestriction =
      /non è disponibile|non.*disponibile|Questa risorsa/.test(error);
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-sm text-muted-foreground mb-4">
            {isTrialRestriction
              ? "Questo contenuto non è disponibile nella prova gratuita."
              : `Errore nel caricamento del PDF: ${error}`}
          </p>
          {isTrialRestriction ? (
            <Link href="/pricing">
              <Button className="text-white">Passa al Premium</Button>
            </Link>
          ) : (
            <button
              onClick={fetchSignedUrl}
              className="text-sm text-primary hover:underline"
            >
              Riprova
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">PDF non disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <PdfViewerWithTrialLimits
        pdfUrl={signedUrl}
        className="w-full h-full"
        height="100%"
        initialScale={1.2}
        mobileFullscreen={mobileFullscreen}
        onToggleMobileFullscreen={onToggleMobileFullscreen}
        isFreeTrialUser={isFreeTrialUser}
        maxAllowedPages={maxAllowedPages}
      />
    </div>
  );
}
