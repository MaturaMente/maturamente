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
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Reactivate the subscription by removing the cancel_at_period_end flag
    await stripe.subscriptions.update(
      userSubscription[0].stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    // Update the subscription record in our database
    await db
      .update(subscriptions)
      .set({
        cancel_at_period_end: false,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.user_id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
