import { getSubscriptionStatus } from "@/utils/subscription-utils";
import { getCurrentUserIdOptional } from "@/utils/user-context";

/**
 * Check if the current user is on a free trial and should be blocked from Maturità content
 * @returns {Promise<boolean>} true if user is on free trial, false otherwise
 */
export async function isUserOnFreeTrial(userIdOverride?: string | null): Promise<boolean> {
  try {
    const userId = userIdOverride ?? (await getCurrentUserIdOptional());
    if (!userId) return false;

    const subscriptionStatus = await getSubscriptionStatus(userId);
    // Check if user is on free trial AND the trial is still active
    return subscriptionStatus?.isFreeTrial === true && subscriptionStatus?.isActive === true;
  } catch (error) {
    console.error("Error checking free trial status:", error);
    return false;
  }
}
