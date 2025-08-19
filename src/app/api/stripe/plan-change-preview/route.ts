import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  calculateCustomPrice,
  getStripeLineItemsForCustom,
} from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import {
  subscriptions,
  pendingSubscriptionChanges,
  relationSubjectsUserTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newSubjectIds } = await request.json();

    if (
      !newSubjectIds ||
      !Array.isArray(newSubjectIds) ||
      newSubjectIds.length === 0
    ) {
      return NextResponse.json(
        { error: "newSubjectIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get user's current subscription
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (
      !userSubscription.length ||
      !userSubscription[0].stripe_subscription_id
    ) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const currentSubscription = userSubscription[0];
    const stripeSubscriptionId = currentSubscription.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400 }
      );
    }

    // Get pending changes to calculate the effective current subject count
    const pendingChanges = await db
      .select()
      .from(pendingSubscriptionChanges)
      .where(
        and(
          eq(
            pendingSubscriptionChanges.subscription_id,
            currentSubscription.id
          ),
          eq(pendingSubscriptionChanges.status, "pending")
        )
      );

    // Determine real-time current access from relations, but exclude subjects that are pending removal
    const currentRelations = await db
      .select()
      .from(relationSubjectsUserTable)
      .where(eq(relationSubjectsUserTable.user_id, session.user.id));
    const originalSubjectIds = currentRelations
      .map((r) => r.subject_id!)
      .filter(Boolean) as string[];

    // If there is a pending downgrade, treat the user's effective base as the target of that downgrade
    const pendingDowngrade = pendingChanges.find(
      (c) => c.change_type === "downgrade"
    );
    const baseSubjectIds: string[] = pendingDowngrade
      ? (pendingDowngrade.new_subject_ids as string[]) || []
      : originalSubjectIds;

    let effectiveCurrentSubjectCount = baseSubjectIds.length;
    let effectiveCurrentPrice = calculateCustomPrice(
      effectiveCurrentSubjectCount
    );

    // Compare selection against base to infer intent and target
    const addedNewSubjects = (newSubjectIds as string[]).filter(
      (id: string) => !baseSubjectIds.includes(id)
    );
    const removedSubjects = baseSubjectIds.filter(
      (id: string) => !(newSubjectIds as string[]).includes(id)
    );

    // Determine change type using explicit adds/removes
    let changeType: "upgrade" | "downgrade" | "no_change" = "no_change";
    if (addedNewSubjects.length > 0) changeType = "upgrade";
    else if (removedSubjects.length > 0) changeType = "downgrade";

    // Target subject ids for preview
    const targetSubjectIds: string[] =
      changeType === "upgrade"
        ? Array.from(new Set<string>([...baseSubjectIds, ...addedNewSubjects]))
        : changeType === "downgrade"
        ? (newSubjectIds as string[])
        : baseSubjectIds;

    const newSubjectCount = targetSubjectIds.length;

    // Calculate pricing
    const currentPrice = effectiveCurrentPrice;
    const newPrice = calculateCustomPrice(newSubjectCount);

    if (changeType === "no_change") {
      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount: 0,
        isUpgrade: false,
        isDowngrade: false,
        changeType: "no_change",
        effectiveDate: new Date().toISOString(),
      });
    }

    try {
      // Get the current Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      // Get the new line items for the target subscription
      const newLineItems = getStripeLineItemsForCustom(newSubjectCount);

      // Calculate proration manually since we want to provide an accurate preview
      // This calculates how much of the billing period remains and prorates accordingly
      const periodProgress = getCurrentPeriodProgress(currentSubscription);
      const priceDifference = newPrice - currentPrice;
      // For downgrades, no proration credit is given - user keeps access until period end
      const prorationAmount =
        changeType === "downgrade" ? 0 : priceDifference * (1 - periodProgress);

      console.log("Preview calculation:", {
        currentPrice,
        newPrice,
        storedSubjectCount: currentSubscription.subject_count,
        effectiveCurrentSubjectCount,
        newSubjectCount,
        changeType,
        prorationAmount,
        periodProgress,
        priceDifference,
        pendingChangesCount: pendingChanges.length,
      });

      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount,
        isUpgrade: changeType === "upgrade",
        isDowngrade: changeType === "downgrade",
        changeType,
        effectiveDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error calculating preview:", error);

      // Fallback calculation if Stripe preview fails
      const periodProgress = getCurrentPeriodProgress(currentSubscription);
      const priceDifference = newPrice - currentPrice;
      // For downgrades, no proration credit is given - user keeps access until period end
      const estimatedProration =
        changeType === "downgrade" ? 0 : priceDifference * (1 - periodProgress);

      console.log("Using fallback calculation:", {
        periodProgress,
        priceDifference,
        estimatedProration,
      });

      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount: estimatedProration,
        isUpgrade: changeType === "upgrade",
        isDowngrade: changeType === "downgrade",
        changeType,
        effectiveDate: new Date().toISOString(),
        estimated: true,
      });
    }
  } catch (error) {
    console.error("Error processing plan change preview:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate how far through the current billing period we are
function getCurrentPeriodProgress(subscription: any): number {
  if (!subscription.current_period_start || !subscription.current_period_end) {
    return 0;
  }

  const now = new Date().getTime();
  const periodStart = new Date(subscription.current_period_start).getTime();
  const periodEnd = new Date(subscription.current_period_end).getTime();

  const totalPeriod = periodEnd - periodStart;
  const elapsed = now - periodStart;

  return Math.max(0, Math.min(1, elapsed / totalPeriod));
}
