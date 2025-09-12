import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { invalidateUserSubscriptionCache } from "@/utils/subscription-utils";

/**
 * API endpoint to manually refresh subscription cache for a user
 * This can be called from client-side after subscription changes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Invalidate subscription cache for the user
    invalidateUserSubscriptionCache(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Subscription cache refreshed successfully",
    });
  } catch (error) {
    console.error("Error refreshing subscription cache:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disable caching for this endpoint
export const revalidate = 0;
