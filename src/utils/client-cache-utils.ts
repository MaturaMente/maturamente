/**
 * Client-side cache invalidation utilities
 * Used to refresh subscription and user data after checkout/upgrades
 */

/**
 * Forces refresh of subscription-related data by clearing client caches
 * and triggering re-fetches of subscription endpoints
 */
export function invalidateClientSubscriptionCache() {
  if (typeof window === "undefined") return;

  try {
    // Clear any potential localStorage cached data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("subscription") ||
          key.includes("subjects") ||
          key.includes("user"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear sessionStorage subscription-related data
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.includes("subscription") ||
          key.includes("subjects") ||
          key.includes("user"))
      ) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

    console.log("Client subscription cache invalidated");
  } catch (error) {
    console.error("Error invalidating client subscription cache:", error);
  }
}

/**
 * Triggers a hard refresh to ensure all data is fresh
 * Use this as a fallback when softer refresh methods aren't sufficient
 */
export function forcePageRefresh(targetUrl: string = "/dashboard") {
  if (typeof window !== "undefined") {
    window.location.href = targetUrl;
  }
}

/**
 * Soft refresh subscription data by triggering fresh API calls
 * This attempts to refresh data without a full page reload
 */
export async function softRefreshSubscriptionData(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    // Clear client cache first
    invalidateClientSubscriptionCache();

    // Call the server-side cache refresh endpoint first
    await fetch("/api/user/refresh-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((error) => {
      console.warn("Failed to refresh server-side cache:", error);
    });

    // Trigger fresh API calls with no-cache headers
    const endpoints = [
      "/api/user/subscription-status",
      "/api/user/subject-access",
      "/api/user/subjects",
    ];

    await Promise.all(
      endpoints.map((endpoint) =>
        fetch(endpoint, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }).catch((error) => {
          console.warn(`Failed to refresh ${endpoint}:`, error);
        })
      )
    );

    console.log("Subscription data soft refresh completed");
    return true;
  } catch (error) {
    console.error("Error during soft refresh:", error);
    return false;
  }
}
