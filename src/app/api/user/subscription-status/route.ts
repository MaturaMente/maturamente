import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionStatus } from "@/utils/subscription-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionStatus = await getSubscriptionStatus(session.user.id);

    if (!subscriptionStatus) {
      return NextResponse.json(null);
    }

    return NextResponse.json(subscriptionStatus);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
