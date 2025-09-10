"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  LogIn,
  TrendingUp,
  BookMinus,
  SquareLibrary,
  ChartNoAxesColumn,
} from "lucide-react";
import { signIn } from "next-auth/react";

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  features?: string[];
}

export function AuthPopup({
  isOpen,
  onClose,
  features = [
    "Appunti su ogni argomento",
    "Accesso a PIT, il tuo Personal Intelligent Tutor",
    "Sezione Maturità con teoria, esercizi e simulazioni",
    "Monitora i tuoi progressi",
  ],
}: AuthPopupProps) {
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;

  const handleGoogleLogin = () => {
    // If we're in a subject-specific route, redirect back to that subject
    const callbackUrl = subjectSlug
      ? `/${subjectSlug}`
      : "/dashboard/le-mie-materie";
    signIn("google", { callbackUrl });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="space-y-6 px-6 py-12 md:px-8 justify-center items-center">
        <DialogHeader className="text-center justify-center items-center">
          <DialogTitle className="text-2xl font-bold">
            Accesso Richiesto
          </DialogTitle>
          <DialogDescription className="text-base">
            Per accedere a questa funzionalità, devi essere registrato.
          </DialogDescription>
        </DialogHeader>
        {/* Features list */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                {index === 0 && <TrendingUp className="h-4 w-4 text-primary" />}
                {index === 1 && (
                  <SquareLibrary className="h-4 w-4 text-primary" />
                )}
                {index === 2 && (
                  <ChartNoAxesColumn className="h-4 w-4 text-primary" />
                )}
                {index === 3 && <BookMinus className="h-4 w-4 text-primary" />}
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            className="w-full text-white"
            size="lg"
            onClick={handleGoogleLogin}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Accedi con Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Inizia subito e preparati al meglio per il liceo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing auth popup state
export function useAuthPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const showAuthPopup = () => setIsOpen(true);
  const hideAuthPopup = () => setIsOpen(false);

  return {
    isAuthPopupOpen: isOpen,
    showAuthPopup,
    hideAuthPopup,
  };
}
