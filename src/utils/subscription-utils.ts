import { db } from "@/db/drizzle";
import { subscriptions, relationSubjectsUserTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateCustomPrice } from "@/utils/subscription/subscription-plans";
import { unstable_cache } from "next/cache";
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

      const actualPrice = subscription.custom_price
        ? parseFloat(subscription.custom_price.toString())
        : calculateCustomPrice(subscription.subject_count || 0);

      return {
        isActive: subscription.status === "active",
        isPastDue: subscription.status === "past_due",
        isCanceled: subscription.status === "canceled",
        willCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        currentPeriodEnd: subscription.current_period_end,
        subjectCount: subscription.subject_count || 0,
        price: actualPrice,
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
