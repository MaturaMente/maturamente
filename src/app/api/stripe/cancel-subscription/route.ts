import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (
      userSubscription.length === 0 ||
      !userSubscription[0].stripe_subscription_id
    ) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Cancel the subscription at period end using Stripe
    const stripeSubscription = await stripe.subscriptions.update(
      userSubscription[0].stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update the subscription record in our database
    await db
      .update(subscriptions)
      .set({
        cancel_at_period_end: true,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.user_id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the current period",
      cancelAt: (stripeSubscription as any).current_period_end,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
