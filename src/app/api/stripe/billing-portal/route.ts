import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting billing portal session creation...");

    const session = await auth();

    if (!session?.user?.id) {
      console.log("User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Creating portal session for user: ${session.user.id}`);

    // Get user's subscription to find their Stripe customer ID
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (!userSubscription.length || !userSubscription[0].stripe_customer_id) {
      console.log("No active subscription or customer ID found");
      return NextResponse.json(
        {
          error: "No active subscription found",
        },
        { status: 404 }
      );
    }

    const customerId = userSubscription[0].stripe_customer_id;
    console.log(`Found customer ID: ${customerId}`);

    // Try to create portal session without configuration first
    try {
      console.log(
        "Attempting to create portal session without configuration..."
      );
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings`,
      });

      console.log(`Successfully created portal session: ${portalSession.id}`);
      return NextResponse.json({ url: portalSession.url });
    } catch (configError) {
      console.log(
        "Failed to create session without configuration:",
        configError
      );

      // If that fails, try to create a minimal configuration and use it
      try {
        console.log("Creating minimal billing portal configuration...");

        const configuration = await stripe.billingPortal.configurations.create({
          features: {
            payment_method_update: {
              enabled: true,
            },
            invoice_history: {
              enabled: true,
            },
          },
          default_return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings`,
        });

        console.log(`Created configuration: ${configuration.id}`);

        // Now try to create the session with the configuration
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings`,
          configuration: configuration.id,
        });

        console.log(
          `Successfully created portal session with configuration: ${portalSession.id}`
        );
        return NextResponse.json({ url: portalSession.url });
      } catch (createConfigError) {
        console.error("Failed to create configuration:", createConfigError);
        throw createConfigError;
      }
    }
  } catch (error) {
    console.error("Error creating billing portal session:", error);

    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion:
          "Please set up billing portal configuration in Stripe Dashboard: https://dashboard.stripe.com/test/settings/billing/portal",
      },
      { status: 500 }
    );
  }
}
