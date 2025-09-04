import { NextRequest, NextResponse } from "next/server";
import { stripe, SUBSCRIPTION_PLANS, calculateCustomPrice } from "@/lib/stripe";
import { calculateMonthlyAIBudget } from "@/utils/ai-budget/budget-management";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscriptions, relationSubjectsUserTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "ID sessione richiesto" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    if (!checkoutSession.subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    // Get subscription - could be ID string or expanded object
    let stripeSubscription;
    if (typeof checkoutSession.subscription === "string") {
      // Retrieve subscription with expanded data to get all fields
      stripeSubscription = await stripe.subscriptions.retrieve(
        checkoutSession.subscription,
        {
          expand: ["default_payment_method", "items.data.price"],
        }
      );
    } else {
      stripeSubscription = checkoutSession.subscription;
      // If we have the object but it's missing timestamps, retrieve it again
      if (!(stripeSubscription as any).current_period_start) {
        stripeSubscription = await stripe.subscriptions.retrieve(
          stripeSubscription.id,
          {
            expand: ["default_payment_method", "items.data.price"],
          }
        );
      }
    }

    const { planType, selectedSubjects, customPrice, subjectCount } =
      checkoutSession.metadata!;

    // Log subscription data for debugging
    console.log(
      "Full Stripe subscription object:",
      JSON.stringify(stripeSubscription, null, 2)
    );

    // Helper to get timestamps with fallback
    const getTimestamps = (subscription: any) => {
      const currentPeriodStart = subscription.current_period_start;
      const currentPeriodEnd = subscription.current_period_end;

      // If timestamps are missing, create them based on creation time
      if (!currentPeriodStart && subscription.created) {
        const now = subscription.created;
        const oneMonth = 30 * 24 * 60 * 60; // 30 days in seconds
        return {
          start: now,
          end: now + oneMonth,
        };
      }

      return {
        start: currentPeriodStart,
        end: currentPeriodEnd,
      };
    };

    const timestamps = getTimestamps(stripeSubscription);
    console.log("Using timestamps:", timestamps);

    // Parse selected subjects to get count
    const selectedSubjectsArray = JSON.parse(selectedSubjects);
    const actualSubjectCount = selectedSubjectsArray.length;

    // Prepare custom pricing data (only CUSTOM plans are supported now)
    const actualMateriaLimit = subjectCount
      ? parseInt(subjectCount)
      : actualSubjectCount;
    const actualCustomPrice = customPrice
      ? parseFloat(customPrice)
      : calculateCustomPrice(actualSubjectCount);

    // Helper function to safely convert timestamps
    const safeTimestamp = (timestamp: any): Date | null => {
      if (!timestamp) {
        console.log("Timestamp is null/undefined:", timestamp);
        return null;
      }
      const ts =
        typeof timestamp === "number" ? timestamp : parseInt(timestamp);
      if (isNaN(ts)) {
        console.log("Invalid timestamp:", timestamp);
        return null;
      }
      // Stripe timestamps are in seconds, convert to milliseconds
      const date = new Date(ts * 1000);
      console.log("Converted timestamp:", timestamp, "->", date.toISOString());
      return date;
    };

    // Check if user already has a subscription
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    // Calculate AI budget (25% of subscription price)
    const aiBudget = calculateMonthlyAIBudget(actualCustomPrice || 0);

    if (existingSubscription.length > 0) {
      // Update existing subscription (handles free trial to premium upgrade)
      await db
        .update(subscriptions)
        .set({
          stripe_customer_id: checkoutSession.customer as string,
          stripe_subscription_id: stripeSubscription.id,
          stripe_price_id: stripeSubscription.items.data[0].price.id,
          status: stripeSubscription.status,
          subject_count: actualMateriaLimit,
          custom_price: actualCustomPrice?.toString(),
          monthly_ai_budget: aiBudget.toFixed(4),
          is_free_trial: false, // Upgrade from free trial to premium
          current_period_start: safeTimestamp(timestamps.start),
          current_period_end: safeTimestamp(timestamps.end),
          cancel_at_period_end:
            (stripeSubscription as any).cancel_at_period_end || false,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.user_id, session.user.id));
    } else {
      // Create new subscription record
      await db.insert(subscriptions).values({
        user_id: session.user.id,
        stripe_customer_id: checkoutSession.customer as string,
        stripe_subscription_id: stripeSubscription.id,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        status: stripeSubscription.status,
        subject_count: actualMateriaLimit,
        custom_price: actualCustomPrice?.toString(),
        monthly_ai_budget: aiBudget.toFixed(4),
        is_free_trial: false, // This is a premium subscription
        current_period_start: safeTimestamp(timestamps.start),
        current_period_end: safeTimestamp(timestamps.end),
        cancel_at_period_end:
          (stripeSubscription as any).cancel_at_period_end || false,
      });
    }

    // Clear existing subject access and add new ones
    await db
      .delete(relationSubjectsUserTable)
      .where(eq(relationSubjectsUserTable.user_id, session.user.id));

    // Add selected subjects to user's access
    for (const subjectId of selectedSubjectsArray) {
      await db.insert(relationSubjectsUserTable).values({
        user_id: session.user.id,
        subject_id: subjectId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Abbonamento attivato con successo",
      subscription: {
        plan: "MaturaMente Pro",
        subjects: selectedSubjectsArray.length,
        price: actualCustomPrice,
      },
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
