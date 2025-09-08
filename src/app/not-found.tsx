"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're in a subject route
  const isSubjectRoute = pathname.match(/^\/[a-zA-Z0-9-]+\/[^\/]+/);
  const subjectSlug = isSubjectRoute ? pathname.split("/")[1] : null;

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  const handleBackToSubject = () => {
    if (subjectSlug) {
      router.push(`/${subjectSlug}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        {/* 404 Icon/Number */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-muted-foreground/30">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Pagina non trovata
          </h2>
          <p className="text-muted-foreground">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {/* Back to Subject Button - Only show if in subject route */}
          {isSubjectRoute && subjectSlug && (
            <Button
              onClick={handleBackToSubject}
              variant="default"
              className="inline-flex items-center gap-2 text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna alla materia
            </Button>
          )}

          {/* Back to Dashboard Button */}
          <Button
            onClick={handleBackToDashboard}
            variant={isSubjectRoute ? "outline" : "default"}
            className="inline-flex items-center gap-2 text-white"
          >
            <Home className="h-4 w-4" />
            Torna alla dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
