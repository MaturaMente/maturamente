"use client";

import { useState, useEffect } from "react";
import PdfViewer from "@/app/components/shared/renderer/pdf-renderer";
import { MessageCircle, AlertCircle } from "lucide-react";
import type { Note } from "@/types/notesTypes";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";

interface PDFComponentProps {
  note: Note;
  mobileFullscreen?: boolean;
  onToggleMobileFullscreen?: () => void;
}

interface ChatComponentProps {
  // Add any props needed for the chat component in the future
}

// PDF component for displaying the note's PDF content with signed URL support
export function PDFComponent({
  note,
  mobileFullscreen,
  onToggleMobileFullscreen,
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
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching signed URL:", err);
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
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-sm text-muted-foreground mb-4">
            Errore nel caricamento del PDF: {error}
          </p>
          <button
            onClick={fetchSignedUrl}
            className="text-sm text-primary hover:underline"
          >
            Riprova
          </button>
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
      <PdfViewer
        pdfUrl={signedUrl}
        className="w-full h-full"
        height="100%"
        initialScale={1.2}
        mobileFullscreen={mobileFullscreen}
        onToggleMobileFullscreen={onToggleMobileFullscreen}
      />
    </div>
  );
}

// Chat component for AI interaction (placeholder for now)
export function ChatComponent({}: ChatComponentProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium text-foreground">AI Tutor</h2>
        </div>
      </div>

      {/* Chat Content Placeholder */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">AI Chat</h3>
            <p className="text-sm text-muted-foreground">
              Presto potrai chattare con l'AI per ottenere aiuto con questo
              appunto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
