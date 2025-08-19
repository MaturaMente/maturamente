import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/utils/user-context";
import { db } from "@/db/drizzle";
import {
  completedTopicsTable,
  completedSubtopicsTable,
  subtopicsTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from headers (set by middleware)
    const userId = await getCurrentUserId();

    console.log("Topics API: User ID from headers:", userId);

    // Parse the request body
    const body = await request.json();
    const { topic_id } = body;

    console.log("Topics API: Received topic_id:", topic_id);

    if (!topic_id) {
      console.log("Topics API: Missing topic_id in request");
      return NextResponse.json(
        { error: "Topic ID is required" },
        { status: 400 }
      );
    }

    // Check if the topic is already marked as completed by this user
    const existingEntry = await db
      .select()
      .from(completedTopicsTable)
      .where(
        and(
          eq(completedTopicsTable.user_id, userId),
          eq(completedTopicsTable.topic_id, topic_id)
        )
      )
      .limit(1);

    // If it's already completed, just return success
    if (existingEntry.length > 0) {
      console.log("Topics API: Topic already completed");
      return NextResponse.json(
        { message: "Topic already marked as completed" },
        { status: 200 }
      );
    }

    // Get all subtopics for this topic
    const subtopics = await db
      .select()
      .from(subtopicsTable)
      .where(eq(subtopicsTable.topic_id, topic_id));

    console.log("Topics API: Found subtopics:", subtopics.length);

    // Mark the topic as completed first
    await db.insert(completedTopicsTable).values({
      user_id: userId,
      topic_id: topic_id,
    });

    console.log("Topics API: Topic marked as completed");

    // Then mark all related subtopics as completed
    for (const subtopic of subtopics) {
      // Check if the subtopic is already completed
      const existingSubtopicCompletion = await db
        .select()
        .from(completedSubtopicsTable)
        .where(
          and(
            eq(completedSubtopicsTable.user_id, userId),
            eq(completedSubtopicsTable.subtopic_id, subtopic.id)
          )
        )
        .limit(1);

      // Only insert if not already completed
      if (existingSubtopicCompletion.length === 0) {
        await db.insert(completedSubtopicsTable).values({
          user_id: userId,
          subtopic_id: subtopic.id,
        });
      }
    }

    console.log("Topics API: All subtopics marked as completed");

    // Revalidate affected caches
    revalidateTag(`user-${userId}`);
    revalidateTag("dashboard");
    revalidateTag("topics");
    revalidateTag("completion");

    console.log("Topics API: Cache revalidated");

    return NextResponse.json(
      {
        message: "Topic and all subtopics marked as completed successfully",
        completedSubtopicIds: subtopics.map((s) => s.id),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Topics API: Error marking topic as completed:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to mark topic as completed",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
