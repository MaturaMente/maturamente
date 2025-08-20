import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionStatus } from "@/utils/subscription-utils";

// Ensure this route is always dynamic and not cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionStatus = await getSubscriptionStatus(session.user.id);

    if (!subscriptionStatus) {
      return NextResponse.json(null, {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    return NextResponse.json(subscriptionStatus, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
