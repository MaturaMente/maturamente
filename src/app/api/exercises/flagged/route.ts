import { db } from "@/db/drizzle";
import {
  flaggedExercisesCardsTable,
  exercisesCardsTable,
  subtopicsTable,
  topicsTable,
  exercisesTable,
  completedExercisesTable,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET handler to retrieve flagged exercise cards for the current user
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensuring that user.id is a string before using it in database operations
    const userId = user.id as string;

    // Fetch flagged exercise cards with details
    const flaggedCardsRaw = await db
      .select({
        id: exercisesCardsTable.id,
        description: exercisesCardsTable.description,
        difficulty: exercisesCardsTable.difficulty,
        subtopic_id: exercisesCardsTable.subtopic_id,
        subtopic_name: subtopicsTable.name,
        topic_id: subtopicsTable.topic_id,
        topic_name: topicsTable.name,
        created_at: flaggedExercisesCardsTable.created_at,
      })
      .from(flaggedExercisesCardsTable)
      .innerJoin(
        exercisesCardsTable,
        eq(flaggedExercisesCardsTable.exercise_card_id, exercisesCardsTable.id)
      )
      .leftJoin(
        subtopicsTable,
        eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
      )
      .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
      .where(eq(flaggedExercisesCardsTable.user_id, userId))
      .orderBy(flaggedExercisesCardsTable.created_at);

    // Process each card to get completion information
    const flaggedCardsWithCompletion = await Promise.all(
      flaggedCardsRaw.map(async (card) => {
        // Get total exercises in the card
        const exercisesInCard = await db
          .select({
            count: count(),
          })
          .from(exercisesTable)
          .where(eq(exercisesTable.exercise_card_id, card.id));

        const totalExercises = exercisesInCard[0]?.count || 0;

        // Count completed exercises
        const completedExercises = await db
          .select({
            count: count(),
          })
          .from(completedExercisesTable)
          .innerJoin(
            exercisesTable,
            eq(completedExercisesTable.exercise_id, exercisesTable.id)
          )
          .where(
            and(
              eq(completedExercisesTable.user_id, userId),
              eq(exercisesTable.exercise_card_id, card.id),
              eq(completedExercisesTable.is_correct, true)
            )
          );

        const completedCount = completedExercises[0]?.count || 0;

        return {
          id: card.id,
          description: card.description,
          topic_name: card.topic_name || "",
          subtopic_name: card.subtopic_name || "",
          difficulty: card.difficulty || 1,
          is_completed: totalExercises > 0 && completedCount === totalExercises,
          total_exercises: totalExercises,
          completed_exercises: completedCount,
        };
      })
    );

    return NextResponse.json(flaggedCardsWithCompletion);
  } catch (error) {
    console.error("Error fetching flagged exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged exercises" },
      { status: 500 }
    );
  }
}
