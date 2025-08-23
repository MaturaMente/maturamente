"use client";

import { useEffect, useRef, useState } from "react";
import { Star, FileText, Bot, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import type { Note } from "@/types/notesTypes";
import { PDFComponent } from "./single-note-components";
import { useStudySession } from "./use-study-session";
import PdfChat from "@/app/components/chat/pdf-chat";

interface SingleNoteLayoutProps {
  note: Note;
}

export function SingleNoteLayout({ note }: SingleNoteLayoutProps) {
  const [isFavorite, setIsFavorite] = useState(note.is_favorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionTruncatable, setIsDescriptionTruncatable] =
    useState(false);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  const [isDesktopFullscreen, setIsDesktopFullscreen] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const params = useParams();

  // Initialize study session tracking
  const { session, isTracking } = useStudySession({
    noteId: note.id,
    enabled: true,
  });

  // Parse title to extract main title and subtitle
  const parseTitle = (title: string) => {
    const separatorIndex = title.indexOf(" - ");
    if (separatorIndex !== -1) {
      return {
        mainTitle: title.substring(0, separatorIndex),
        subtitle: title.substring(separatorIndex + 3),
      };
    }
    return {
      mainTitle: title,
      subtitle: null,
    };
  };

  const { mainTitle, subtitle } = parseTitle(note.title);

  const handleBackToSubject = () => {
    const subjectSlug = params["subject-slug"];
    router.push(`/${subjectSlug}`);
  };

  const handleToggleFavorite = async () => {
    setIsTogglingFavorite(true);

    // Optimistic update
    setIsFavorite(!isFavorite);

    try {
      const response = await fetch("/api/notes/favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ noteId: note.id, isFavorite: !isFavorite }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update on error
      setIsFavorite(isFavorite);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Prevent background scroll when mobile fullscreen is active
  useEffect(() => {
    if (isMobileFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileFullscreen]);

  // On desktop, auto-scroll main split view into focus on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop && desktopContainerRef.current) {
      desktopContainerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b md:p-8 p-4">
        {/* Back button */}
        <div className="mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToSubject}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 cursor-pointer" />
            Indietro
          </Button>
        </div>

        {/* Title and metadata */}
        <div className="space-y-3 max-w-full">
          <div className="flex items-start justify-between border-b pb-3 gap-4 max-w-full">
            <div className="flex-1 overflow-hidden">
              <h1 className="md:text-4xl text-2xl font-semibold text-foreground break-words line-clamp-1">
                {mainTitle}
              </h1>
              {subtitle && (
                <h2 className="md:text-xl text-lg text-muted-foreground mt-1 break-words line-clamp-1">
                  {subtitle}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Star
                className={cn(
                  "md:h-5 h-4 md:w-5 w-4 transition-colors hover:text-yellow-400 hover:scale-110 transition-all cursor-pointer",
                  isFavorite && "fill-yellow-400 text-yellow-400 cursor-pointer"
                )}
                onClick={handleToggleFavorite}
              />
            </div>
          </div>

          {/* Description and metadata */}
          <div className="space-y-2 max-w-full">
            {note.description && (
              <div className="overflow-hidden">
                <p
                  ref={descriptionRef}
                  className={cn(
                    "text-muted-foreground text-sm md:text-base break-words",
                    !isDescriptionExpanded && "line-clamp-2"
                  )}
                >
                  {note.description}
                </p>
                {(isDescriptionTruncatable || isDescriptionExpanded) && (
                  <button
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    className="text-primary text-sm hover:underline mt-1 focus:outline-none"
                  >
                    {isDescriptionExpanded ? "Leggi di meno" : "Leggi di più"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Interface */}
      <div
        className={cn(
          "md:hidden",
          isMobileFullscreen
            ? "fixed inset-0 z-50 bg-background h-[100dvh] flex flex-col px-0"
            : "flex-1 px-4"
        )}
      >
        <Tabs defaultValue="pdf" className="h-screen flex flex-col">
          <div className={cn("relative", isMobileFullscreen ? "mt-2" : "mt-4")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Chat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="pdf"
            className="flex-1 mt-2 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="flex-1 rounded-lg border overflow-hidden min-h-0">
              <PDFComponent
                note={note}
                mobileFullscreen={isMobileFullscreen}
                onToggleMobileFullscreen={() =>
                  setIsMobileFullscreen((p) => !p)
                }
              />
            </div>
          </TabsContent>

          <TabsContent
            value="chat"
            className="flex-1 mt-2 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="flex-1 rounded-lg border overflow-hidden min-h-0">
              <PdfChat />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Side-by-Side Layout */}
      <div
        ref={desktopContainerRef}
        className={cn(
          "hidden md:flex flex-1 border-b w-full h-screen",
          isDesktopFullscreen
            ? "fixed inset-0 z-50 bg-background"
            : "bg-background"
        )}
      >
        {/* Left section - PDF Viewer */}
        <div className="w-2/3 flex-1 flex flex-col h-screen">
          {/* PDF Viewer */}
          <div className="flex-1 relative overflow-hidden">
            <PDFComponent
              note={note}
              mobileFullscreen={isDesktopFullscreen}
              onToggleMobileFullscreen={() => setIsDesktopFullscreen((p) => !p)}
            />
          </div>
        </div>

        {/* Right section - AI Chat */}
        <div className="w-1/3 border-l bg-background flex flex-col h-screen">
          <div className="flex-1 overflow-hidden">
            <PdfChat />
          </div>
        </div>
      </div>
    </div>
  );
}
