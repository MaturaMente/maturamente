import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import {
  pendingSubscriptionChanges,
  subscriptions,
  relationSubjectsUserTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import {
  calculateCustomPrice,
  getStripeLineItemsForCustom,
} from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { changeId } = await request.json();

    if (!changeId) {
      return NextResponse.json(
        { error: "changeId is required" },
        { status: 400 }
      );
    }

    // Get the pending change
    const pendingChange = await db
      .select()
      .from(pendingSubscriptionChanges)
      .where(
        and(
          eq(pendingSubscriptionChanges.id, changeId),
          eq(pendingSubscriptionChanges.status, "pending")
        )
      )
      .limit(1);

    if (!pendingChange.length) {
      return NextResponse.json(
        { error: "Pending change not found or already processed" },
        { status: 404 }
      );
    }

    const change = pendingChange[0];

    // Verify the change belongs to the current user
    if (change.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to modify this change" },
        { status: 403 }
      );
    }

    // Get the current subscription from our database
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (!userSubscription.length) {
      return NextResponse.json(
        { error: "No subscription found" },
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

    // For downgrades, we need to revert the subscription record changes
    if (change.change_type === "downgrade") {
      try {
        // For downgrades, the user subject access was never changed during the downgrade
        // Only the subscription record (count and price) was updated
        // So we need to revert those changes to restore the original state

        // Get current user subjects (this never changed during downgrade)
        const currentSubjects = await db
          .select()
          .from(relationSubjectsUserTable)
          .where(eq(relationSubjectsUserTable.user_id, session.user.id));

        const currentSubjectIds = currentSubjects.map((rel) => rel.subject_id!);
        const originalSubjectCount = currentSubjectIds.length;
        const originalPrice = calculateCustomPrice(originalSubjectCount);

        console.log("Reverting downgrade changes...", {
          currentSubjects: currentSubjectIds.length,
          downgradedCount: change.new_subject_count,
          originalCount: originalSubjectCount,
          originalPrice,
        });

        // 1. Revert Stripe subscription to original state
        console.log("Reverting Stripe subscription to original state...");

        const stripeSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );
        const newLineItems = getStripeLineItemsForCustom(originalSubjectCount);

        const updateParams = {
          items: [
            // Delete existing items
            ...stripeSubscription.items.data.map((item) => ({
              id: item.id,
              deleted: true,
            })),
            // Add original items
            ...newLineItems.map((item) => ({
              price: item.price,
              quantity: item.quantity,
            })),
          ],
          // Use none to prevent prorations when reverting downgrade
          proration_behavior: "none" as const,
        };

        await stripe.subscriptions.update(stripeSubscriptionId, updateParams);

        // 2. Revert local database subscription record to original state
        console.log("Reverting local subscription record to original state...");

        await db
          .update(subscriptions)
          .set({
            subject_count: originalSubjectCount,
            custom_price: originalPrice.toString(),
            updated_at: new Date(),
          })
          .where(eq(subscriptions.user_id, session.user.id));

        // Note: We don't need to change relationSubjectsUserTable because it was never
        // modified during the downgrade - user keeps access until period end

        console.log("Successfully reverted downgrade to original state");
      } catch (revertError) {
        console.error("Error reverting downgrade changes:", revertError);
        return NextResponse.json(
          { error: "Failed to revert downgrade changes" },
          { status: 500 }
        );
      }
    }

    // Note: previously we attempted to cancel a Stripe subscription schedule
    // via a stored schedule ID on the pending change. Since we no longer
    // store or rely on that field, we skip schedule cancellation here.

    // Mark the change as cancelled in our database
    await db
      .update(pendingSubscriptionChanges)
      .set({
        status: "cancelled",
        updated_at: new Date(),
      })
      .where(eq(pendingSubscriptionChanges.id, changeId));

    return NextResponse.json({
      message: "Pending change cancelled and reverted successfully",
    });
  } catch (error) {
    console.error("Error undoing pending subscription change:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
