import { db } from "@/db/drizzle";
import { subscriptions, relationSubjectsUserTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateCustomPrice } from "@/utils/subscription/subscription-plans";
import { calculateMonthlyAIBudget } from "@/utils/ai-budget/budget-management";
import { unstable_cache, revalidateTag } from "next/cache";
import type {
  SubscriptionStatus,
  UserSubjectAccess,
  SubscriptionData,
} from "@/types/subscriptionTypes";

export function getUserSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  return unstable_cache(
    async () => {
      const userSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, userId))
        .orderBy(desc(subscriptions.updated_at))
        .limit(1);

      return userSubscription.length > 0 ? userSubscription[0] : null;
    },
    ["getUserSubscription", userId],
    { revalidate: 30, tags: ["subscription", `user-${userId}`] }
  )();
}

export function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus | null> {
  return unstable_cache(
    async () => {
      const subscription = await getUserSubscription(userId);

      if (!subscription) {
        return null;
      }

      // If the most recent subscription is a canceled free trial, treat as no subscription
      if (subscription.status === "canceled" && subscription.is_free_trial === true) {
        return null;
      }

      // Auto-expire free trial if past 14 days from created_at or current_period_end
      // Consider trial subscriptions active while within the trial period, but never if status is "canceled"
      let isActive = subscription.status === "active";
      let currentPeriodEnd = subscription.current_period_end;
      let daysLeft: number | null = null;
      let isFreeTrial = !!subscription.is_free_trial;
      const isSubscriptionCanceled = subscription.status === "canceled";

      if (isFreeTrial) {
        // Determine trial end: use current_period_end if set, else created_at + 14 days
        const startDate = subscription.current_period_start || subscription.created_at;
        const trialEnd = currentPeriodEnd || new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const now = new Date();
        currentPeriodEnd = trialEnd;

        if (now > trialEnd) {
          isActive = false;
        } else {
          // Mark trial as active while within trial window, unless subscription was explicitly canceled
          isActive = !isSubscriptionCanceled;
          daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      const actualPrice = subscription.custom_price
        ? parseFloat(subscription.custom_price.toString())
        : calculateCustomPrice(subscription.subject_count || 0);

      return {
        isActive,
        isPastDue: subscription.status === "past_due",
        isCanceled: subscription.status === "canceled",
        willCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        currentPeriodEnd,
        subjectCount: subscription.subject_count || 0,
        price: actualPrice,
        // Only report free trial when it's actually active
        isFreeTrial: isFreeTrial && isActive,
        daysLeft,
      };
    },
    ["getSubscriptionStatus", userId],
    { revalidate: 30, tags: ["subscription", `user-${userId}`] }
  )();
}

export function getUserSubjectAccess(
  userId: string
): Promise<UserSubjectAccess> {
  return unstable_cache(
    async () => {
      const subscription = await getUserSubscription(userId);

      if (!subscription || subscription.status !== "active") {
        return {
          hasAccess: false,
          subjectsCount: 0,
          maxSubjects: 0,
          availableSlots: 0,
          selectedSubjects: [],
        } as UserSubjectAccess;
      }

      const userSubjects = await db
        .select({
          subject_id: relationSubjectsUserTable.subject_id,
        })
        .from(relationSubjectsUserTable)
        .where(eq(relationSubjectsUserTable.user_id, userId));

      const selectedSubjects = userSubjects
        .map((s) => s.subject_id)
        .filter(Boolean) as string[];

      const maxSubjects = subscription.subject_count || selectedSubjects.length;

      return {
        hasAccess: true,
        subjectsCount: selectedSubjects.length,
        maxSubjects,
        availableSlots: Math.max(0, maxSubjects - selectedSubjects.length),
        selectedSubjects,
      } as UserSubjectAccess;
    },
    ["getUserSubjectAccess", userId],
    { revalidate: 60, tags: ["subjects", "subscription", `user-${userId}`] }
  )();
}

export function hasSubjectAccess(
  userId: string,
  subjectId: string
): Promise<boolean> {
  return unstable_cache(
    async () => {
      const userAccess = await getUserSubjectAccess(userId);

      if (!userAccess.hasAccess) {
        return false;
      }

      return userAccess.selectedSubjects.includes(subjectId);
    },
    ["hasSubjectAccess", userId, subjectId],
    { revalidate: 60, tags: ["subjects", "subscription", `user-${userId}`] }
  )();
}

// Update AI budget when subscription price changes
export async function updateSubscriptionAIBudget(subscriptionId: string, newPriceEur: number) {
  const newBudget = calculateMonthlyAIBudget(newPriceEur);
  
  await db
    .update(subscriptions)
    .set({
      monthly_ai_budget: newBudget.toFixed(4),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));

  // Invalidate cache for this subscription
  const subscription = await db
    .select({ user_id: subscriptions.user_id })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (subscription.length && subscription[0].user_id) {
    // Clear related caches
    revalidateTag(`user-${subscription[0].user_id}`);
    revalidateTag("subscription");
  }
}

// Create AI budget when a new subscription is created
export async function createInitialAIBudget(subscriptionId: string, customPriceEur: number) {
  const aiBudget = calculateMonthlyAIBudget(customPriceEur);
  
  await db
    .update(subscriptions)
    .set({
      monthly_ai_budget: aiBudget.toFixed(4),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

// Initialize AI budgets for existing active subscriptions (run once)
export async function initializeExistingSubscriptionBudgets() {
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  for (const subscription of activeSubscriptions) {
    const customPrice = parseFloat(subscription.custom_price.toString());
    const aiBudget = calculateMonthlyAIBudget(customPrice);
    
    await db
      .update(subscriptions)
      .set({
        monthly_ai_budget: aiBudget.toFixed(4),
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
  
  console.log(`Updated AI budgets for ${activeSubscriptions.length} active subscriptions`);
}
