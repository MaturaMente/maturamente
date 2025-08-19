import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import {
  completedExercisesTable,
  completedExercisesCardsTable,
  completedTopicsTable,
  completedSubtopicsTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get("itemType");
    const itemId = searchParams.get("itemId");

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check if the user has completed the item
    let isCompleted = false;
    let data = null;

    switch (itemType) {
      case "topic":
        data = await db
          .select()
          .from(completedTopicsTable)
          .where(
            and(
              eq(completedTopicsTable.user_id, user.id),
              eq(completedTopicsTable.topic_id, itemId)
            )
          );
        isCompleted = data.length > 0;
        break;

      case "subtopic":
        data = await db
          .select()
          .from(completedSubtopicsTable)
          .where(
            and(
              eq(completedSubtopicsTable.user_id, user.id),
              eq(completedSubtopicsTable.subtopic_id, itemId)
            )
          );
        isCompleted = data.length > 0;
        break;

      case "exercise":
        data = await db
          .select()
          .from(completedExercisesTable)
          .where(
            and(
              eq(completedExercisesTable.user_id, user.id),
              eq(completedExercisesTable.exercise_id, itemId),
              eq(completedExercisesTable.is_correct, true)
            )
          );
        isCompleted = data.length > 0;
        break;

      case "exerciseCard":
        data = await db
          .select()
          .from(completedExercisesCardsTable)
          .where(
            and(
              eq(completedExercisesCardsTable.user_id, user.id),
              eq(completedExercisesCardsTable.exercise_card_id, itemId)
            )
          );
        isCompleted = data.length > 0;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid item type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ isCompleted });
  } catch (error) {
    console.error("Error checking completion status:", error);
    return NextResponse.json(
      { error: "Failed to check completion status" },
      { status: 500 }
    );
  }
}
