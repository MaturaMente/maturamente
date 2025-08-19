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

      let immediateChargeAmount = 0;
      let invoiceId = null;

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
        // For upgrades, use always_invoice to immediately charge
        // For downgrades, use none to avoid proration credits - user keeps access until period end
        proration_behavior:
          changeType === "upgrade" ? "always_invoice" : "none",
      };

      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscriptionId,
        updateParams
      );

      console.log("Stripe subscription updated successfully");

      // For upgrades with always_invoice, Stripe automatically creates and attempts to pay an invoice
      if (changeType === "upgrade") {
        try {
          // Get the latest invoice for this customer to find the proration charge
          const invoices = await stripe.invoices.list({
            customer: stripeSubscription.customer as string,
            limit: 5,
            status: "open", // Look for open invoices first
          });

          // Look for an open invoice (unpaid) that was just created
          let latestInvoice = invoices.data.find(
            (invoice) =>
              invoice.status === "open" &&
              invoice.amount_due > 0 &&
              invoice.lines.data.some(
                (line) => (line as any).proration === true
              )
          );

          // If no open invoice found, check for recent paid invoices
          if (!latestInvoice) {
            const paidInvoices = await stripe.invoices.list({
              customer: stripeSubscription.customer as string,
              limit: 5,
              status: "paid",
            });

            latestInvoice = paidInvoices.data.find(
              (invoice) =>
                invoice.created > Date.now() / 1000 - 60 && // Created in last minute
                invoice.lines.data.some(
                  (line) => (line as any).proration === true
                )
            );
          }

          if (latestInvoice) {
            invoiceId = latestInvoice.id;

            if (latestInvoice.status === "open") {
              // If invoice is open, try to pay it
              console.log("Found open proration invoice, attempting to pay...");
              try {
                const paidInvoice = await stripe.invoices.pay(
                  latestInvoice.id!
                );
                immediateChargeAmount = paidInvoice.amount_paid / 100;
                console.log("Immediate charge processed successfully:", {
                  invoiceId: paidInvoice.id,
                  amountPaid: immediateChargeAmount,
                  status: paidInvoice.status,
                });
              } catch (payError) {
                console.error("Error paying invoice:", payError);
                immediateChargeAmount = 0;
              }
            } else if (latestInvoice.status === "paid") {
              // Invoice was already paid automatically
              immediateChargeAmount = latestInvoice.amount_paid / 100;
              console.log("Invoice was already paid automatically:", {
                invoiceId: latestInvoice.id,
                amountPaid: immediateChargeAmount,
                status: latestInvoice.status,
              });
            }
          } else {
            console.log(
              "No proration invoice found, charge will appear on next regular invoice"
            );
          }
        } catch (invoiceError) {
          console.error("Error processing immediate charge:", invoiceError);
          // Continue with subscription update even if charging fails
        }
      }

      // Update our local database
      if (changeType === "upgrade") {
        // For upgrades, update immediately
        await updateLocalSubscription(
          session.user.id,
          immediateTargetSubjectIds,
          newSubjectCount,
          newPrice
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

      // Prepare response message based on change type and charging result
      let message = "";
      if (changeType === "upgrade") {
        if (immediateChargeAmount > 0) {
          message = `Subscription upgraded successfully! You have been charged €${immediateChargeAmount.toFixed(
            2
          )} for the remaining billing period.`;
        } else {
          message =
            "Subscription upgraded successfully! The prorated amount will be added to your next invoice.";
        }
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
        immediateChargeAmount,
        chargedImmediately: immediateChargeAmount > 0,
        invoiceId,
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
  newPrice: number
) {
  // Update our local database
  await db
    .update(subscriptions)
    .set({
      subject_count: newSubjectCount,
      custom_price: newPrice.toString(),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.user_id, userId));

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

  // Update subscription record with new pricing info for Stripe
  await db
    .update(subscriptions)
    .set({
      subject_count: newSubjectCount,
      custom_price: newPrice.toString(),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.user_id, userId));
}
