"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface FreeTrialCTAProps {
  title?: string;
  description?: string;
  className?: string;
}

export function FreeTrialCTA({
  title = "Contenuto Premium",
  description = "Questo contenuto è disponibile solo per gli utenti Premium. Passa al piano completo per accedere a tutto il materiale di Maturità.",
  className = "",
}: FreeTrialCTAProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  return (
    <div className={`flex items-center justify-center min-h-[400px] p-4 ${className}`}>
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <Button onClick={handleUpgrade} className="w-full text-white">
            Passa al Premium
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
