import { db } from "@/db/drizzle";
import { completedExercisesTable, exercisesTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // Get user session
  const session = await auth();
  const user = session?.user;

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const { exerciseId, isCorrect } = await request.json();

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Exercise ID is required" },
        { status: 400 }
      );
    }

    // Get the exercise to find its card ID
    const exercise = await db
      .select({
        id: exercisesTable.id,
        exercise_card_id: exercisesTable.exercise_card_id,
      })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    if (exercise.length === 0) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Get the current attempt number for this user and exercise
    const previousAttempts = await db
      .select({
        id: completedExercisesTable.id,
        attempt: completedExercisesTable.attempt,
      })
      .from(completedExercisesTable)
      .where(
        and(
          eq(completedExercisesTable.exercise_id, exerciseId),
          eq(completedExercisesTable.user_id, user.id)
        )
      );

    // For retry functionality: if there are previous attempts, increment the attempt number
    const currentAttempt =
      previousAttempts.length > 0
        ? Math.max(...previousAttempts.map((pa) => pa.attempt)) + 1
        : 1;

    // Save the exercise completion status
    await db.insert(completedExercisesTable).values({
      exercise_id: exerciseId,
      user_id: user.id,
      is_correct: isCorrect,
      attempt: currentAttempt,
    });

    // Get the card ID
    const cardId = exercise[0].exercise_card_id;

    // Get all exercises for this card
    const cardExercises = await db
      .select({
        id: exercisesTable.id,
      })
      .from(exercisesTable)
      .where(eq(exercisesTable.exercise_card_id, cardId));

    // Get all latest completed exercises for this user and card using a subquery
    // We use a window function to get only the latest attempt for each exercise
    const latestAttempts = await db.execute(sql`
      WITH RankedAttempts AS (
        SELECT 
          ce.exercise_id,
          ce.is_correct,
          ce.attempt,
          ROW_NUMBER() OVER (PARTITION BY ce.exercise_id ORDER BY ce.attempt DESC) as rn
        FROM completed_exercises ce
        JOIN exercises e ON ce.exercise_id = e.id
        WHERE 
          ce.user_id = ${user.id} 
          AND e.exercise_card_id = ${cardId}
      )
      SELECT exercise_id, is_correct, attempt
      FROM RankedAttempts
      WHERE rn = 1
    `);

    type AttemptRow = {
      exercise_id: string;
      is_correct: boolean;
    };

    const completedExercisesMap: Record<string, boolean> = {};
    (latestAttempts.rows as AttemptRow[]).forEach((row) => {
      if (row.exercise_id) {
        completedExercisesMap[row.exercise_id] = row.is_correct;
      }
    });

    // Check if all exercises have been attempted
    const allCompleted = cardExercises.every(
      (exercise) => typeof completedExercisesMap[exercise.id] !== "undefined"
    );

    // Count how many exercises are correct based on most recent attempts
    const correctCount = Object.values(completedExercisesMap).filter(
      Boolean
    ).length;

    // Check if all exercises are correct in their latest attempts
    const allCorrect = correctCount === cardExercises.length;

    // Response data
    const responseData = {
      success: true,
      exerciseCompleted: true,
      allCompleted,
      allCorrect,
      correctCount,
      totalExercises: cardExercises.length,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error completing exercise:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
