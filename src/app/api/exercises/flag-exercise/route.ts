import { db } from "@/db/drizzle";
import { flaggedExercisesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exerciseId } = await request.json();

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Exercise ID is required" },
        { status: 400 }
      );
    }

    // Check if the exercise is already flagged by this user
    const existingFlag = await db
      .select({ id: flaggedExercisesTable.id })
      .from(flaggedExercisesTable)
      .where(
        and(
          eq(flaggedExercisesTable.user_id, user.id),
          eq(flaggedExercisesTable.exercise_id, exerciseId)
        )
      );

    // If already flagged, remove it (toggle off)
    if (existingFlag.length > 0) {
      await db
        .delete(flaggedExercisesTable)
        .where(
          and(
            eq(flaggedExercisesTable.user_id, user.id),
            eq(flaggedExercisesTable.exercise_id, exerciseId)
          )
        )
        .returning({ id: flaggedExercisesTable.id });

      return NextResponse.json({
        message: "Exercise removed from favorites",
        flagged: false,
      });
    }
    // Otherwise, add the flag (toggle on)
    else {
      await db
        .insert(flaggedExercisesTable)
        .values({
          user_id: user.id,
          exercise_id: exerciseId,
        })
        .returning({ id: flaggedExercisesTable.id });

      return NextResponse.json({
        message: "Exercise added to favorites",
        flagged: true,
      });
    }
  } catch (error) {
    console.error("Error in flag-exercise API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const exerciseId = url.searchParams.get("exerciseId");

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Exercise ID is required" },
        { status: 400 }
      );
    }

    // Check if the exercise is flagged by this user
    const existingFlag = await db
      .select({ id: flaggedExercisesTable.id })
      .from(flaggedExercisesTable)
      .where(
        and(
          eq(flaggedExercisesTable.user_id, user.id),
          eq(flaggedExercisesTable.exercise_id, exerciseId)
        )
      );

    return NextResponse.json({
      flagged: existingFlag.length > 0,
    });
  } catch (error) {
    console.error("Error in flag-exercise API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
