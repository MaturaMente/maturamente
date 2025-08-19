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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";

interface PdfViewerProps {
  pdfUrl: string;
  className?: string;
  height?: number | string;
  initialScale?: number;
  mobileFullscreen?: boolean;
  onToggleMobileFullscreen?: () => void;
}

export default function PdfViewer({
  pdfUrl,
  className = "",
  height = 500,
  initialScale = 1.5,
  mobileFullscreen,
  onToggleMobileFullscreen,
}: PdfViewerProps) {
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

  // Reload the current PDF
  const reloadPDF = async () => {
    setIsLoading(true);

    // Clean up current resources
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        console.log("Error cancelling render task:", e);
      }
      renderTaskRef.current = null;
    }

    if (pdfDocRef.current) {
      try {
        pdfDocRef.current.destroy();
      } catch (e) {
        console.log("Error destroying PDF document:", e);
      }
      pdfDocRef.current = null;
    }

    try {
      // Dynamically import PDF.js
      const pdfjsLib = await import("pdfjs-dist");

      // Set up the worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

      // Get the document using our proxy for external URLs
      const proxyUrl = getProxyUrl(pdfUrl);

      // Create loading task
      const loadingTask = pdfjsLib.getDocument(proxyUrl);

      // Await the document
      const pdfDoc = await loadingTask.promise;

      // Store the PDF document reference
      pdfDocRef.current = pdfDoc;
      setNumPages(pdfDoc.numPages);

      // Render the current page
      await renderPage(pageNum);
    } catch (error) {
      console.error("Error reloading PDF:", error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative touch-none md:touch-auto ${className}`}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className={`${
          fullscreen ? "fixed" : "absolute"
        } top-6 left-0 right-0 z-20 px-4 flex justify-between items-center`}
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
            <span className="text-sm">
              {pageNum} / {numPages}
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
            onClick={reloadPDF}
            title="Reload PDF"
            className="h-8 w-8 p-0"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="h-8 w-8 p-0"
          >
            {fullscreen ? (
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
            style={{
              display: "block",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          />
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner text="Caricamento PDF..." size="sm" />
        </div>
      )}
    </div>
  );
}
