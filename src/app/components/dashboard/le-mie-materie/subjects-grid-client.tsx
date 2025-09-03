"use client";

import { useState, useEffect } from "react";
import { SubjectCard } from "./subject-card-client";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import type { UserSubject } from "@/types/subjectsTypes";
import Link from "next/link";

interface SubjectsGridProps {
  subjects: UserSubject[];
  error?: string | null;
}

export function SubjectsGrid({ subjects, error }: SubjectsGridProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Errore nel caricamento</h3>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Nessuna materia trovata</h3>
          <p className="text-muted-foreground max-w-sm">
            Non hai ancora aggiunto nessuna materia al tuo profilo. Inizia
            aggiungendo le tue prime materie di studio.
          </p>
          <Button className="gap-2 text-white">
            <Plus className="h-4 w-4" />
            Aggiungi materia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center md:justify-between text-center md:text-left">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-semibold">Le tue materie</h2>
          <p className="text-muted-foreground text-lg">
            {subjects.length} {subjects.length === 1 ? "materia" : "materie"}{" "}
            disponibili
          </p>
        </div>
        {subjects.length < 12 && (
          <Link href="/dashboard/settings" className="hidden md:block">
            <Button className="gap-2 cursor-pointer text-white" size="lg">
              <Plus className="h-4 w-4" />
              <span>Acquista nuove materie</span>
            </Button>
          </Link>
        )}
      </div>
      {subjects.length < 12 && (
        <Link href="/dashboard/settings" className="block md:hidden">
          <Button className="gap-2 cursor-pointer text-white w-full" size="lg">
            <Plus className="h-4 w-4" />
            <span>Acquista nuove materie</span>
          </Button>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
