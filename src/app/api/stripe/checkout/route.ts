import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  SUBSCRIPTION_PLANS,
  getStripeLineItemsForCustom,
  calculateCustomPrice,
} from "@/lib/stripe";
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

    const { planType, selectedSubjects } = await request.json();

    // Validate plan type (should always be CUSTOM now)
    if (planType !== "CUSTOM") {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Validate selected subjects count
    if (!selectedSubjects || selectedSubjects.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one subject" },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS.CUSTOM;

    // Check if user already has an active subscription
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (
      existingSubscription.length > 0 &&
      existingSubscription[0].status === "active"
    ) {
      return NextResponse.json(
        {
          error: "You already have an active subscription",
        },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = existingSubscription[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
    }

    // Prepare line items for custom subscription
    const lineItems = getStripeLineItemsForCustom(selectedSubjects.length);

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        planType: "CUSTOM",
        selectedSubjects: JSON.stringify(selectedSubjects),
        customPrice: calculateCustomPrice(selectedSubjects.length).toString(),
        subjectCount: selectedSubjects.length.toString(),
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
