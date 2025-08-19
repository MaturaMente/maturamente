import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { pendingSubscriptionChanges, subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's current subscription
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (!userSubscription.length) {
      return NextResponse.json({ pendingChanges: [] });
    }

    const subscription = userSubscription[0];

    // Get pending changes for this subscription
    const pendingChanges = await db
      .select()
      .from(pendingSubscriptionChanges)
      .where(
        and(
          eq(pendingSubscriptionChanges.subscription_id, subscription.id),
          eq(pendingSubscriptionChanges.status, "pending")
        )
      );

    return NextResponse.json({ pendingChanges });
  } catch (error) {
    console.error("Error fetching pending subscription changes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
