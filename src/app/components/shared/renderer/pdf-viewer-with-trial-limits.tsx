"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Lock,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import Link from "next/link";

interface PdfViewerWithTrialLimitsProps {
  pdfUrl: string;
  className?: string;
  height?: number | string;
  initialScale?: number;
  mobileFullscreen?: boolean;
  onToggleMobileFullscreen?: () => void;
  // Free trial specific props
  isFreeTrialUser?: boolean;
}

// Component for the blur overlay with CTA
function BlurOverlay() {
  return (
    <div className="absolute top-16 left-0 right-0 bottom-0 z-30 flex items-center justify-center">
      <div className="text-center p-8 bg-white/90 rounded-lg shadow-2xl border border-gray-200/50 backdrop-blur-sm max-w-sm mx-4">
        <div className="mb-4">
          <Lock className="h-12 w-12 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Contenuto Premium
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Per visualizzare tutte le pagine di questo PDF e accedere a tutti i
          contenuti premium, passa dal piano di prova al piano Premium.
        </p>
        <Link href="/pricing">
          <Button className="w-full flex items-center justify-center gap-2 text-white font-medium py-2 px-4">
            <Crown className="w-4 h-4" />
            Passa al Premium
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PdfViewerWithTrialLimits({
  pdfUrl,
  className = "",
  height = 500,
  initialScale = 1,
  mobileFullscreen,
  onToggleMobileFullscreen,
  isFreeTrialUser = false,
}: PdfViewerWithTrialLimitsProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialScale);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(initialScale);

  // Function to determine if a page should be restricted based on new rules
  const determinePageRestriction = (
    currentPage: number,
    totalPages: number,
    isFreeTrialUser: boolean
  ): boolean => {
    if (!isFreeTrialUser) return false;

    if (totalPages >= 2 && totalPages <= 5) {
      // For 2-5 pages: show only the first page
      return currentPage > 1;
    } else if (totalPages > 5) {
      // For 5+ pages: show first two, hide next 3, show next two, hide next 3, etc.
      // Pattern: show 2, hide 3, show 2, hide 3...
      // Example with 10 pages: show 1-2, hide 3-5, show 6-7, hide 8-10

      if (currentPage <= 2) return false; // Show pages 1-2

      // For pages 3+, we need to determine the cycle
      const pageAfterFirstTwo = currentPage - 2; // Position relative to page 3
      const cycleLength = 5; // 3 hidden + 2 shown
      const positionInCycle = ((pageAfterFirstTwo - 1) % cycleLength) + 1;

      // In each cycle: positions 1-3 are hidden, positions 4-5 are shown
      return positionInCycle <= 3;
    }

    return false; // For PDFs with < 2 pages, show everything
  };

  // Check if current page is restricted for free trial users
  const isPageRestricted = determinePageRestriction(
    pageNum,
    numPages,
    isFreeTrialUser
  );

  // Function to get proxy URL for PDFs
  const getProxyUrl = (originalUrl: string) => {
    // For local PDFs (those hosted on our server), use them directly
    if (typeof window === "undefined") return originalUrl;

    if (
      originalUrl.startsWith("/") ||
      originalUrl.startsWith(window.location.origin)
    ) {
      return originalUrl;
    }

    // For external PDFs, use our proxy
    return `/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  // Function to render PDF page
  const renderPage = async (num: number) => {
    if (!pdfDocRef.current) return;

    setIsLoading(true);

    try {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch (e) {
          console.log("Error cancelling previous render task:", e);
        }
        renderTaskRef.current = null;
      }

      const page = await pdfDocRef.current.getPage(num);
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Clear previous content
      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const viewport = page.getViewport({ scale, rotation: 0 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Store the render task to be able to cancel it if needed
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
      setIsLoading(false);

      // Set PDF width as CSS variable for centering
      if (canvas) {
        containerRef.current?.style.setProperty(
          "--pdf-width",
          `${canvas.width}px`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("cancelled")) {
        console.log("Rendering was cancelled");
      } else if (
        error instanceof Error &&
        error.message.includes("Transport destroyed")
      ) {
        console.log("Transport destroyed - PDF document may have been closed");
      } else {
        console.error("Error rendering page:", error);
      }
      setIsLoading(false);
    }
  };

  // Load the PDF document
  useEffect(() => {
    let isComponentMounted = true;

    if (!pdfUrl) return;

    setIsLoading(true);
    setPageNum(1);

    // Clean up previous resources
    const cleanup = () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          console.log("Error cancelling render task during cleanup:", e);
        }
        renderTaskRef.current = null;
      }

      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch (e) {
          console.log("Error destroying PDF document during cleanup:", e);
        }
        pdfDocRef.current = null;
      }
    };

    // Clean up previous instance
    cleanup();

    const loadPDF = async () => {
      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import("pdfjs-dist");

        // Set up the worker using the file we copied to the public directory
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        // Get the document using our proxy for external URLs
        const proxyUrl = getProxyUrl(pdfUrl);

        // Create loading task with better error handling
        const loadingTask = pdfjsLib.getDocument(proxyUrl);
        loadingTask.onPassword = (
          updatePassword: (password: string) => void,
          reason: number
        ) => {
          console.log("Password required for PDF:", reason);
          // You could implement a password prompt here
          return Promise.resolve();
        };

        // Await the document with a timeout
        const pdfDoc = (await Promise.race([
          loadingTask.promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("PDF loading timeout")), 30000)
          ),
        ])) as any; // Type assertion to handle the PDF document

        // Check if component is still mounted before updating state
        if (!isComponentMounted) {
          pdfDoc.destroy();
          return;
        }

        // Store the PDF document reference
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);

        // Render the first page
        await renderPage(1);
      } catch (error) {
        console.error("Error loading PDF:", error);
        setIsLoading(false);
      }
    };

    loadPDF();

    // Cleanup function
    return () => {
      isComponentMounted = false;
      cleanup();
    };
  }, [pdfUrl]);

  // Re-render the page when scale changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pageNum);

      // Update the canvas width CSS variable on scale change
      const updateCanvasWidth = () => {
        if (canvasRef.current) {
          containerRef.current?.style.setProperty(
            "--pdf-width",
            `${canvasRef.current.width}px`
          );
        }
      };

      // Small delay to ensure the canvas is updated
      const timeoutId = setTimeout(updateCanvasWidth, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [scale]);

  // Navigation functions
  const goToPreviousPage = () => {
    if (pageNum <= 1) return;
    setPageNum((prev) => {
      const newPage = prev - 1;
      renderPage(newPage);
      return newPage;
    });
  };

  const goToNextPage = () => {
    if (pageNum >= numPages) return;
    setPageNum((prev) => {
      const newPage = prev + 1;
      renderPage(newPage);
      return newPage;
    });
  };

  // Zoom functions
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Toggle fullscreen mode for the PDF canvas
  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!fullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
          setFullscreen(true);
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
          setFullscreen(true);
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          (containerRef.current as any).mozRequestFullScreen();
          setFullscreen(true);
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
          setFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          setFullscreen(false);
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
          setFullscreen(false);
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
          setFullscreen(false);
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
          setFullscreen(false);
        }
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(
        !!document.fullscreenElement ||
          !!(document as any).webkitFullscreenElement ||
          !!(document as any).mozFullScreenElement ||
          !!(document as any).msFullscreenElement
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  // Touch gesture handlers for pinch-to-zoom on mobile
  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touches = event.nativeEvent.touches as unknown as TouchList;
    if (touches.length === 2) {
      pinchStartDistanceRef.current = getDistance(touches[0], touches[1]);
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touches = event.nativeEvent.touches as unknown as TouchList;
    if (touches.length === 2 && pinchStartDistanceRef.current) {
      event.preventDefault();
      const currentDistance = getDistance(touches[0], touches[1]);
      const ratio = currentDistance / pinchStartDistanceRef.current;
      const nextScale = Math.max(
        0.5,
        Math.min(3, pinchStartScaleRef.current * ratio)
      );
      if (Math.abs(nextScale - scale) > 0.01) {
        setScale(nextScale);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pinchStartDistanceRef.current) {
      pinchStartDistanceRef.current = null;
    }
  };

  // Prevent context menu (right-click) to disable copying/saving
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Prevent drag and drop
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Enhanced protection for restricted pages
  useEffect(() => {
    if (isPageRestricted) {
      // Additional client-side obfuscation (still bypassable, but adds friction)
      const style = document.createElement("style");
      style.textContent = `
        canvas { 
          filter: blur(20px) !important; 
          opacity: 0.3 !important;
          pointer-events: none !important;
        }
      `;
      style.setAttribute("data-trial-protection", "true");
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.querySelector(
          '[data-trial-protection="true"]'
        );
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [isPageRestricted]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      className={`relative touch-none md:touch-auto ${className}`}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <div
        className={`${
          fullscreen ? "fixed" : "absolute"
        } top-6 left-0 right-0 z-20
        px-4 flex justify-between items-center`}
      >
        {/* Page navigation controls */}
        <div className="bg-background/80 rounded-full px-3 py-1 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousPage}
              disabled={pageNum <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm flex items-center gap-1">
              {pageNum} / {numPages}
              {isPageRestricted && <Lock className="h-3 w-3 text-amber-500" />}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNum >= numPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF controls */}
        <div className="bg-background/80 rounded-lg p-1 shadow-sm backdrop-blur-sm hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            title="Zoom Out"
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            title="Zoom In"
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={
              onToggleMobileFullscreen
                ? onToggleMobileFullscreen
                : toggleFullscreen
            }
            title={
              onToggleMobileFullscreen
                ? mobileFullscreen
                  ? "Esci a schermo intero"
                  : "Schermo intero"
                : fullscreen
                ? "Exit Fullscreen"
                : "Fullscreen"
            }
            className="h-8 w-8 p-0"
          >
            {onToggleMobileFullscreen ? (
              mobileFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )
            ) : fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="bg-background/80 rounded-lg p-1 shadow-sm backdrop-blur-sm md:hidden block relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            title="Zoom Out"
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            title="Zoom In"
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {onToggleMobileFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              aria-label={
                mobileFullscreen
                  ? "Esci a schermo intero"
                  : "Apri a schermo intero"
              }
              onClick={onToggleMobileFullscreen}
            >
              {mobileFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="absolute inset-0 mt-12 mb-2 overflow-auto">
        <div
          className="flex items-start py-4"
          style={{
            minWidth: "max-content",
            width: "max-content",
            minHeight: "max-content",
            margin: "0 auto",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
          <canvas
            ref={canvasRef}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            draggable={false}
            style={{
              display: "block",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              userSelect: "none",
              pointerEvents: "auto",
            }}
          />
        </div>
      </div>

      {/* Blur overlay for restricted pages */}
      {isPageRestricted && <BlurOverlay />}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-40">
          <LoadingSpinner text="Caricamento PDF..." size="sm" />
        </div>
      )}
    </div>
  );
}
