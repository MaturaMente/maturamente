"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogIn,
  Sparkles,
  TrendingUp,
  BookMinus,
  SquareLibrary,
  ChartNoAxesColumn,
} from "lucide-react";
import { signIn } from "next-auth/react";

interface UnauthenticatedOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  features?: string[];
}

export function UnauthenticatedOverlay({
  children,
  title = "Accedi per vedere i tuoi dati",
  description = "Crea un account gratuito per accedere a tutte le funzionalità di MaturaMate",
  features = [
    "Monitora i tuoi progressi",
    "Salva i tuoi risultati",
    "Statistiche dettagliate",
    "Piani di studio personalizzati",
  ],
}: UnauthenticatedOverlayProps) {
  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div>
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md border shadow-2xl flex-col gap-4 py-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 md:px-8">
            {/* Features list */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    {index === 0 && (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                    {index === 1 && (
                      <SquareLibrary className="h-4 w-4 text-primary" />
                    )}
                    {index === 2 && (
                      <ChartNoAxesColumn className="h-4 w-4 text-primary" />
                    )}
                    {index === 3 && (
                      <BookMinus className="h-4 w-4 text-primary" />
                    )}
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
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Inizia subito e preparati al meglio per la maturità
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
