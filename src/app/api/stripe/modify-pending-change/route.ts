import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import {
  pendingSubscriptionChanges,
  subscriptions,
  relationSubjectsUserTable,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
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

    const { subjectId, restoreSubjectIds } = await request.json();
    const subjectsToRestore: string[] = Array.isArray(restoreSubjectIds)
      ? restoreSubjectIds
      : subjectId
      ? [subjectId]
      : [];

    if (subjectsToRestore.length === 0) {
      return NextResponse.json(
        { error: "Provide subjectId or restoreSubjectIds[]" },
        { status: 400 }
      );
    }

    // Get user's subscription
    const [userSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (!userSubscription || !userSubscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Load pending downgrade change(s)
    const pendingChanges = await db
      .select()
      .from(pendingSubscriptionChanges)
      .where(
        and(
          eq(pendingSubscriptionChanges.subscription_id, userSubscription.id),
          eq(pendingSubscriptionChanges.status, "pending"),
          eq(pendingSubscriptionChanges.change_type, "downgrade")
        )
      );

    if (pendingChanges.length === 0) {
      return NextResponse.json(
        { error: "No pending downgrade found to modify" },
        { status: 404 }
      );
    }

    // We only expect a single pending downgrade. If multiple exist, apply to the first.
    const change = pendingChanges[0];

    // Current subjects (the user still has access to all of these until period end)
    const currentRelations = await db
      .select()
      .from(relationSubjectsUserTable)
      .where(eq(relationSubjectsUserTable.user_id, session.user.id));
    const originalSubjectIds = currentRelations
      .map((r) => r.subject_id!)
      .filter(Boolean) as string[];

    // Validate: subjectsToRestore must exist in originalSubjectIds
    const invalid = subjectsToRestore.filter(
      (id) => !originalSubjectIds.includes(id)
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "One or more subject IDs are invalid for this user" },
        { status: 400 }
      );
    }

    const currentTargetIds: string[] = Array.isArray(change.new_subject_ids)
      ? (change.new_subject_ids as string[])
      : [];

    // Compute updated target (i.e., cancel removal of these subjects by adding them back to the target set)
    const updatedTargetSet = new Set(currentTargetIds);
    for (const id of subjectsToRestore) {
      updatedTargetSet.add(id);
    }
    const updatedTargetIds = Array.from(updatedTargetSet);

    // Clamp to only subjects the user originally has
    const clampedTargetIds = updatedTargetIds.filter((id) =>
      originalSubjectIds.includes(id)
    );

    // Stripe immediate update: we must reflect the increased count now (upgrade semantics)
    const newCountNow = clampedTargetIds.length;
    const newPriceNow = calculateCustomPrice(newCountNow);

    const stripeSubscriptionId = userSubscription.stripe_subscription_id!;

    // Update Stripe subscription items: upgrade immediately with proration
    const stripeSubscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );
    const newLineItems = getStripeLineItemsForCustom(newCountNow);

    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        // Remove all existing items
        ...stripeSubscription.items.data.map((item) => ({
          id: item.id,
          deleted: true,
        })),
        // Add updated items
        ...newLineItems.map((item) => ({
          price: item.price,
          quantity: item.quantity,
        })),
      ],
      proration_behavior: "always_invoice",
    });

    // Update local subscription record now
    await db
      .update(subscriptions)
      .set({
        subject_count: newCountNow,
        custom_price: newPriceNow.toString(),
        updated_at: new Date(),
      })
      .where(eq(subscriptions.user_id, session.user.id));

    // If after restoration there is no more change (target equals original), cancel the pending change
    const noMoreChange = clampedTargetIds.length === originalSubjectIds.length;
    if (noMoreChange) {
      await db
        .update(pendingSubscriptionChanges)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(pendingSubscriptionChanges.id, change.id));
    } else {
      const updatedPriceAtRenewal = calculateCustomPrice(
        clampedTargetIds.length
      );
      await db
        .update(pendingSubscriptionChanges)
        .set({
          new_subject_ids: clampedTargetIds,
          new_subject_count: clampedTargetIds.length,
          new_price: updatedPriceAtRenewal.toString(),
          updated_at: new Date(),
        })
        .where(eq(pendingSubscriptionChanges.id, change.id));
    }

    return NextResponse.json({
      message:
        subjectsToRestore.length === 1
          ? "Rimozione annullata per la materia selezionata"
          : "Rimozione annullata per le materie selezionate",
      pendingChangeResolved: noMoreChange,
      newSubjectCount: newCountNow,
      newPrice: newPriceNow,
    });
  } catch (error) {
    console.error("Error modifying pending change:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
