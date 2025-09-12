"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Crown, Upload, MessageSquare, FileText, Sparkles } from "lucide-react";

interface SubscriptionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  features?: string[];
}

export function SubscriptionPopup({
  isOpen,
  onClose,
  title = "Funzionalità Premium Richiesta",
  description = "Per caricare documenti e utilizzare tutte le funzionalità avanzate, attiva un piano premium.",
  features = [
    "Carica documenti illimitati",
    "Chat con i tuoi appunti",
    "Riassunti automatici AI",
    "Supporto per PDF, DOCX, TXT, MD",
  ],
}: SubscriptionPopupProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  // Debug log
  console.log("🔍 SubscriptionPopup render - isOpen:", isOpen);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only trigger onClose when the dialog is being closed by the user
        if (!open) onClose();
      }}
    >
      <DialogContent className="space-y-6 px-6 py-12 md:px-8 justify-center items-center">
        <DialogHeader className="text-center justify-center items-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {description}
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
                {index === 0 && <Upload className="h-4 w-4 text-primary" />}
                {index === 1 && (
                  <MessageSquare className="h-4 w-4 text-primary" />
                )}
                {index === 2 && <Sparkles className="h-4 w-4 text-primary" />}
                {index === 3 && <FileText className="h-4 w-4 text-primary" />}
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
            onClick={handleUpgrade}
          >
            <Crown className="mr-2 h-4 w-4" />
            Attiva Piano Premium
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sblocca tutte le funzionalità avanzate di MaturaMente
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing subscription popup state
export function useSubscriptionPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const showSubscriptionPopup = () => {
    console.log("🚀 Showing subscription popup");
    setIsOpen(true);
  };

  const hideSubscriptionPopup = () => {
    console.log("❌ Hiding subscription popup");
    setIsOpen(false);
  };

  return {
    isSubscriptionPopupOpen: isOpen,
    showSubscriptionPopup,
    hideSubscriptionPopup,
  };
}
