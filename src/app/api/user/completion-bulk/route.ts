import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { completedTopicsTable, completedSubtopicsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API endpoint to fetch all completed topics and subtopics for a user in a single call
 * This optimizes the theory page loading by avoiding multiple individual API calls
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Fetch all completed topics for this user
    const completedTopics = await db
      .select({
        topic_id: completedTopicsTable.topic_id,
      })
      .from(completedTopicsTable)
      .where(eq(completedTopicsTable.user_id, user.id));

    // Fetch all completed subtopics for this user
    const completedSubtopics = await db
      .select({
        subtopic_id: completedSubtopicsTable.subtopic_id,
      })
      .from(completedSubtopicsTable)
      .where(eq(completedSubtopicsTable.user_id, user.id));

    // Return all completion data in a single response
    return NextResponse.json({
      completedTopics: completedTopics.map((item) => item.topic_id),
      completedSubtopics: completedSubtopics.map((item) => item.subtopic_id),
    });
  } catch (error) {
    console.error("Error fetching bulk completion status:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion statuses" },
      { status: 500 }
    );
  }
}
