import { db } from "@/db/drizzle";
import {
  flaggedExercisesTable,
  exercisesTable,
  subtopicsTable,
  topicsTable,
  exercisesCardsTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET handler to retrieve flagged individual exercises for the current user
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch flagged exercises with details
    const flaggedExercises = await db
      .select({
        id: exercisesTable.id,
        question_data: exercisesTable.question_data,
        solution_data: exercisesTable.solution_data,
        exercise_card_id: exercisesTable.exercise_card_id,
        card_description: exercisesCardsTable.description,
        difficulty: exercisesCardsTable.difficulty,
        subtopic_id: exercisesCardsTable.subtopic_id,
        subtopic_name: subtopicsTable.name,
        topic_id: subtopicsTable.topic_id,
        topic_name: topicsTable.name,
        created_at: flaggedExercisesTable.created_at,
      })
      .from(flaggedExercisesTable)
      .innerJoin(
        exercisesTable,
        eq(flaggedExercisesTable.exercise_id, exercisesTable.id)
      )
      .innerJoin(
        exercisesCardsTable,
        eq(exercisesTable.exercise_card_id, exercisesCardsTable.id)
      )
      .leftJoin(
        subtopicsTable,
        eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
      )
      .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
      .where(eq(flaggedExercisesTable.user_id, user.id))
      .orderBy(flaggedExercisesTable.created_at);

    return NextResponse.json(flaggedExercises);
  } catch (error) {
    console.error("Error fetching flagged exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged exercises" },
      { status: 500 }
    );
  }
}
