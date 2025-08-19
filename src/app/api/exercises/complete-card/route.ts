import { db } from "@/db/drizzle";
import {
  completedExercisesTable,
  exercisesTable,
  completedExercisesCardsTable,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // Get user session
  const session = await auth();
  const user = session?.user;

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `Received request to complete card: ${cardId} for user: ${user.id}`
    );

    // First, check if this card is already completed by the user
    const existingCard = await db
      .select({
        id: completedExercisesCardsTable.id,
      })
      .from(completedExercisesCardsTable)
      .where(
        and(
          eq(completedExercisesCardsTable.exercise_card_id, cardId),
          eq(completedExercisesCardsTable.user_id, user.id)
        )
      );

    // If card is already completed, return success without creating a duplicate
    if (existingCard.length > 0) {
      console.log(`Card ${cardId} already completed by user ${user.id}`);
      return NextResponse.json({
        success: true,
        cardCompleted: true,
        alreadyCompleted: true,
      });
    }

    // Get all exercises for this card
    const cardExercises = await db
      .select({
        id: exercisesTable.id,
      })
      .from(exercisesTable)
      .where(eq(exercisesTable.exercise_card_id, cardId));

    if (cardExercises.length === 0) {
      return NextResponse.json(
        { error: "Card not found or has no exercises" },
        { status: 404 }
      );
    }

    console.log(`Found ${cardExercises.length} exercises for card: ${cardId}`);

    // Extract exercise IDs
    const exerciseIds = cardExercises.map((e) => e.id);

    // Get all completed exercises for this user and card
    const completedExercises = await db
      .select({
        exercise_id: completedExercisesTable.exercise_id,
        is_correct: completedExercisesTable.is_correct,
      })
      .from(completedExercisesTable)
      .where(
        and(
          eq(completedExercisesTable.user_id, user.id),
          inArray(completedExercisesTable.exercise_id, exerciseIds)
        )
      );

    // Create a map of exercise IDs to completion status
    const completedExercisesMap: Record<string, boolean> = {};
    completedExercises.forEach((exercise) => {
      if (exercise.exercise_id) {
        completedExercisesMap[exercise.exercise_id] = exercise.is_correct;
      }
    });

    // Count how many exercises are marked as correct
    const correctCount = Object.values(completedExercisesMap).filter(
      Boolean
    ).length;

    // Check if all exercises are correctly completed
    const allCorrect = correctCount === cardExercises.length;

    // Instead of using a transaction
    if (allCorrect) {
      // Just perform the insert directly
      await db.insert(completedExercisesCardsTable).values({
        exercise_card_id: cardId,
        user_id: user.id,
      });

      return NextResponse.json({
        success: true,
        cardCompleted: true,
        allCorrect: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          cardCompleted: false,
          allCorrect: false,
          message: "Cannot complete card until all exercises are correct",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error completing card:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
