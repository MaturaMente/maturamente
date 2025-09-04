"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import Link from "next/link";
import type { DashboardSubscriptionData } from "@/types/dashboardTypes";

interface SubscriptionCardProps {
  subscriptionData: DashboardSubscriptionData;
}

export function SubscriptionCard({ subscriptionData }: SubscriptionCardProps) {
  const [isFreeTrial, setIsFreeTrial] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user/subscription-status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setIsFreeTrial(!!data?.isFreeTrial);
          setDaysLeft(data?.daysLeft ?? null);
        }
      } catch {}
    };
    load();
  }, []);

  if (!subscriptionData.hasActiveSubscription && !isFreeTrial) {
    return (
      <Link href="/pricing">
        <Button className="ml-0 md:ml-2 font-bold text-white flex items-center gap-2 cursor-pointer">
          Attiva un piano
          <Crown className="h-4 w-4 text-white" />
        </Button>
      </Link>
    );
  }

  // Derive subjects count from plan name (e.g., "Piano 3 Materie")
  const subjectsMatch = subscriptionData.planName.match(/(\d+)/);
  const subjectsCount = subjectsMatch ? parseInt(subjectsMatch[1], 10) : null;

  return (
    <div className="w-full md:w-auto rounded-2xl border bg-card/80 backdrop-blur-sm shadow-md px-4 py-3">
      <div className="flex items-center gap-3">
        <Crown className="h-5 w-5 text-amber-600" />
        <div className="min-w-0">
          {isFreeTrial ? (
            <>
              <p className="text-sm font-semibold leading-tight">Prova gratuita</p>
              <div className="text-xs text-muted-foreground">
                {typeof daysLeft === "number" ? `${daysLeft} giorni rimanenti` : `2 settimane`}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold leading-tight">Piano Premium</p>
              {subjectsCount !== null && (
                <div className="text-xs text-muted-foreground">
                  {subjectsCount} materie attive
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
