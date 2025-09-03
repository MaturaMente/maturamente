import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  calculateCustomPrice,
  getStripeLineItemsForCustom,
} from "@/lib/stripe";
import { calculateMonthlyAIBudget, addBudgetToCurrentPeriod } from "@/utils/ai-budget/budget-management";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import {
  subscriptions,
  relationSubjectsUserTable,
  pendingSubscriptionChanges,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newSubjectIds, timing } = await request.json();

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

    // For this implementation, we'll always use immediate timing with proration
    // This aligns with Stripe's best practices
    const effectiveTiming = "immediate";

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

    // Load user's current subject access (actual immediate access today)
    const currentRelations = await db
      .select()
      .from(relationSubjectsUserTable)
      .where(eq(relationSubjectsUserTable.user_id, session.user.id));
    const originalSubjectIds = currentRelations
      .map((r) => r.subject_id!)
      .filter(Boolean) as string[];

    const currentSubjectCount = currentSubscription.subject_count || 0;
    // Subjects the user is trying to add that are not currently in access
    const addedNewSubjects = (newSubjectIds as string[]).filter(
      (id) => !originalSubjectIds.includes(id)
    );

    // Immediate target for upgrade must KEEP currently accessible subjects
    // if the user is adding new ones while there is a pending downgrade.
    let immediateTargetSubjectIds: string[] = newSubjectIds;
    if (addedNewSubjects.length > 0) {
      const set = new Set<string>([...originalSubjectIds, ...addedNewSubjects]);
      immediateTargetSubjectIds = Array.from(set);
    }

    const newSubjectCount = immediateTargetSubjectIds.length;

    // Calculate new pricing
    const newPrice = calculateCustomPrice(newSubjectCount);
    const currentPrice = parseFloat(currentSubscription.custom_price || "0");

    // Determine change type based on actual current count
    const changeType =
      newSubjectCount > currentSubjectCount
        ? "upgrade"
        : newSubjectCount < currentSubjectCount
        ? "downgrade"
        : "no_change";

    if (changeType === "no_change") {
      return NextResponse.json({
        success: false,
        message: "No changes detected in subject selection",
      });
    }

    try {
      console.log("Processing immediate subscription change with proration...");

      // Get the current Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      // Get the new line items for the target subscription
      const newLineItems = getStripeLineItemsForCustom(newSubjectCount);

      console.log("Subscription change details:", {
        currentPrice,
        newPrice,
        currentSubjectCount,
        newSubjectCount,
        changeType,
        stripeSubscriptionId,
        newLineItems,
      });

      // No prorated pricing - no immediate charges

      // Update subscription items with different proration behavior based on change type
      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [
          // Delete existing items
          ...stripeSubscription.items.data.map((item) => ({
            id: item.id,
            deleted: true,
          })),
          // Add new items
          ...newLineItems.map((item) => ({
            price: item.price,
            quantity: item.quantity,
          })),
        ],
        // No prorated pricing - users pay full price regardless of timing
        // For both upgrades and downgrades, use none to avoid any proration
        proration_behavior: "none",
      };

      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscriptionId,
        updateParams
      );

      console.log("Stripe subscription updated successfully");

      // No prorated pricing - no immediate charges for upgrades

      // Update our local database
      if (changeType === "upgrade") {
        // For upgrades, update immediately and add additional budget to current period
        await updateLocalSubscription(
          session.user.id,
          immediateTargetSubjectIds,
          newSubjectCount,
          newPrice,
          currentPrice // Pass current price to calculate additional budget
        );

        // If there is a pending downgrade, ensure it is UPDATED to keep newly added subjects
        const existingPendingDowngrade = await db
          .select()
          .from(pendingSubscriptionChanges)
          .where(
            and(
              eq(
                pendingSubscriptionChanges.subscription_id,
                currentSubscription.id
              ),
              eq(pendingSubscriptionChanges.status, "pending"),
              eq(pendingSubscriptionChanges.change_type, "downgrade")
            )
          );

        if (existingPendingDowngrade.length > 0) {
          const pending = existingPendingDowngrade[0];
          // Merge newly added subjects so that the downgrade target retains them
          const pendingTarget = Array.isArray(pending.new_subject_ids)
            ? (pending.new_subject_ids as string[])
            : [];
          const mergedTargetSet = new Set<string>([
            ...pendingTarget,
            ...addedNewSubjects,
          ]);
          const mergedTargetIds = Array.from(mergedTargetSet);

          await db
            .update(pendingSubscriptionChanges)
            .set({
              new_subject_ids: mergedTargetIds,
              new_subject_count: mergedTargetIds.length,
              new_price: calculateCustomPrice(
                mergedTargetIds.length
              ).toString(),
              updated_at: new Date(),
            })
            .where(eq(pendingSubscriptionChanges.id, pending.id));
        }
      } else {
        // For downgrades, store pending change and keep current access until period end
        await storePendingDowngrade(
          session.user.id,
          newSubjectIds,
          newSubjectCount,
          newPrice,
          stripeSubscriptionId
        );
      }

      console.log("Local subscription data updated successfully");

      // Prepare response message based on change type
      let message = "";
      if (changeType === "upgrade") {
        message =
          "Subscription upgraded successfully! The new subjects are now available and you'll be charged the full price starting from your next billing cycle.";
      } else {
        message =
          "Subscription downgraded successfully! You'll keep access to all subjects until the end of your current billing period. Your next invoice will reflect the new lower price.";
      }

      return NextResponse.json({
        success: true,
        message,
        changeType,
        timing: effectiveTiming,
        newSubjectCount,
        newPrice,
        subscriptionId: updatedSubscription.id,
      });
    } catch (error) {
      console.error("Error processing subscription change:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error processing plan change:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to update local subscription data
async function updateLocalSubscription(
  userId: string,
  newSubjectIds: string[],
  newSubjectCount: number,
  newPrice: number,
  currentPrice?: number // Optional current price for calculating additional budget
) {
  // Calculate new AI budget
  const newAiBudget = calculateMonthlyAIBudget(newPrice);

  // Update our local database
  await db
    .update(subscriptions)
    .set({
      subject_count: newSubjectCount,
      custom_price: newPrice.toString(),
      monthly_ai_budget: newAiBudget.toFixed(4),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.user_id, userId));

  // For upgrades, add additional budget to current period
  if (currentPrice && newPrice > currentPrice) {
    const additionalBudgetEur = (newPrice - currentPrice) * 0.25;
    console.log("Adding additional budget for upgrade:", {
      currentPrice,
      newPrice,
      additionalBudgetEur
    });
    
    await addBudgetToCurrentPeriod(userId, additionalBudgetEur);
  }

  // Update user's subject access
  await db
    .delete(relationSubjectsUserTable)
    .where(eq(relationSubjectsUserTable.user_id, userId));

  for (const subjectId of newSubjectIds) {
    await db.insert(relationSubjectsUserTable).values({
      user_id: userId,
      subject_id: subjectId,
    });
  }
}

// Helper function to store pending downgrade for processing at period end
async function storePendingDowngrade(
  userId: string,
  newSubjectIds: string[],
  newSubjectCount: number,
  newPrice: number,
  stripeSubscriptionId: string
) {
  // Get current subscription to determine when change should take effect
  const currentSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);

  if (!currentSubscription.length) {
    throw new Error("Subscription not found");
  }

  const periodEnd = currentSubscription[0].current_period_end;

  // Check for existing pending changes for this subscription
  const existingPendingChanges = await db
    .select()
    .from(pendingSubscriptionChanges)
    .where(
      and(
        eq(
          pendingSubscriptionChanges.subscription_id,
          currentSubscription[0].id
        ),
        eq(pendingSubscriptionChanges.status, "pending")
      )
    );

  if (existingPendingChanges.length > 0) {
    // Update existing pending change instead of creating a new one
    const existingChange = existingPendingChanges[0];

    await db
      .update(pendingSubscriptionChanges)
      .set({
        new_subject_ids: newSubjectIds,
        new_subject_count: newSubjectCount,
        new_price: newPrice.toString(),
        scheduled_date: periodEnd,
        updated_at: new Date(),
      })
      .where(eq(pendingSubscriptionChanges.id, existingChange.id));

    console.log("Updated existing pending subscription change:", {
      changeId: existingChange.id,
      newSubjectCount,
      newPrice,
    });
  } else {
    // Create new pending change
    await db.insert(pendingSubscriptionChanges).values({
      user_id: userId,
      subscription_id: currentSubscription[0].id,
      change_type: "downgrade",
      timing: "next_period",
      new_subject_ids: newSubjectIds,
      new_subject_count: newSubjectCount,
      new_price: newPrice.toString(),
      scheduled_date: periodEnd,
      status: "pending",
    });

    console.log("Created new pending subscription change for downgrade");
  }

  // For downgrades, DON'T change current period budget
  // Update subscription record with new pricing info for Stripe (but keep current monthly_ai_budget for this period)
  await db
    .update(subscriptions)
    .set({
      subject_count: newSubjectCount,
      custom_price: newPrice.toString(),
      // Note: monthly_ai_budget stays the same for current period
      // It will be updated when the pending change is processed at period end
      updated_at: new Date(),
    })
    .where(eq(subscriptions.user_id, userId));

  console.log("Downgrade scheduled - current period budget unchanged:", {
    userId,
    newSubjectCount,
    newPrice,
    message: "AI budget will be reduced starting next billing period"
  });
}
