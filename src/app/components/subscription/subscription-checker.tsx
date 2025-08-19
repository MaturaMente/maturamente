"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSubscriptionStatus } from "@/utils/subscription-utils";

interface SubscriptionCheckerProps {
  userId: string;
  children: React.ReactNode;
}

export function SubscriptionChecker({
  userId,
  children,
}: SubscriptionCheckerProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      try {
        // If returning from Stripe checkout success on /dashboard, bypass once
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const urlSessionId = url.searchParams.get("session_id");
          const urlSuccess = url.searchParams.get("success");
          if (urlSessionId && urlSuccess === "true") {
            sessionStorage.setItem("bypassSubscriptionRedirect", "true");
            setHasAccess(true);
            setIsChecking(false);
            return;
          }
        }

        // Check if user has bypassed the subscription requirement for this session
        const bypassFlag =
          typeof window !== "undefined"
            ? sessionStorage.getItem("bypassSubscriptionRedirect")
            : null;

        if (bypassFlag === "true") {
          setHasAccess(true);
          setIsChecking(false);
          return;
        }

        // Check actual subscription status
        const subscriptionStatus = await getSubscriptionStatus(userId);

        if (subscriptionStatus?.isActive) {
          setHasAccess(true);
        } else {
          // Redirect to pricing if no active subscription and no bypass
          router.push("/pricing");
          return;
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // On error, redirect to pricing to be safe
        router.push("/pricing");
        return;
      } finally {
        setIsChecking(false);
      }
    }

    checkSubscription();
  }, [userId, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if user has access
  return hasAccess ? <>{children}</> : null;
}
