"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Fetch subscription status via API to avoid using server-only utilities on the client

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
        async function fetchSubscriptionStatus() {
          try {
            const response = await fetch("/api/user/subscription-status", {
              cache: "no-store",
            });
            if (!response.ok) return null;
            return (await response.json()) as { isActive?: boolean } | null;
          } catch (_) {
            return null;
          }
        }

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
        const subscriptionStatus = await fetchSubscriptionStatus();

        if (subscriptionStatus?.isActive) {
          setHasAccess(true);
        } else {
          // Small delay and re-check before redirecting to pricing
          await new Promise((resolve) => setTimeout(resolve, 500));
          const refreshedStatus = await fetchSubscriptionStatus();
          if (refreshedStatus?.isActive) {
            setHasAccess(true);
          } else {
            router.push("/pricing");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Small delay before redirecting on error
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push("/pricing");
        console.log("Redirecting to pricing");
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
