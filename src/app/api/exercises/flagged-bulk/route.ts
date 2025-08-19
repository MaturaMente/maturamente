import { db } from "@/db/drizzle";
import { flaggedExercisesTable, flaggedExercisesCardsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * API endpoint to fetch flagged exercises in bulk for a user
 * This optimizes the exercise page loading by avoiding multiple individual API calls
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const exerciseIds = url.searchParams.get("exerciseIds");
    const cardIds = url.searchParams.get("cardIds");

    // Create response object
    const result: {
      flaggedExercises?: string[];
      flaggedCards?: string[];
    } = {};

    // If exercise IDs are provided, get flagged exercises
    if (exerciseIds) {
      const ids = exerciseIds.split(",");

      const flaggedExercises = await db
        .select({
          exercise_id: flaggedExercisesTable.exercise_id,
        })
        .from(flaggedExercisesTable)
        .where(
          and(
            eq(flaggedExercisesTable.user_id, user.id),
            inArray(flaggedExercisesTable.exercise_id, ids)
          )
        );

      // Filter out any null values before assigning
      result.flaggedExercises = flaggedExercises
        .map((fe) => fe.exercise_id)
        .filter((id): id is string => id !== null);
    }

    // If card IDs are provided, get flagged cards
    if (cardIds) {
      const ids = cardIds.split(",");

      const flaggedCards = await db
        .select({
          card_id: flaggedExercisesCardsTable.exercise_card_id,
        })
        .from(flaggedExercisesCardsTable)
        .where(
          and(
            eq(flaggedExercisesCardsTable.user_id, user.id),
            inArray(flaggedExercisesCardsTable.exercise_card_id, ids)
          )
        );

      // Filter out any null values before assigning
      result.flaggedCards = flaggedCards
        .map((fc) => fc.card_id)
        .filter((id): id is string => id !== null);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in flagged-bulk API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
