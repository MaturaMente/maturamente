import { db } from "@/db/drizzle";
import { flaggedExercisesCardsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
        { status: 400 }
      );
    }

    // Check if the card is already flagged by this user
    const existingFlag = await db
      .select({ id: flaggedExercisesCardsTable.id })
      .from(flaggedExercisesCardsTable)
      .where(
        and(
          eq(flaggedExercisesCardsTable.user_id, user.id),
          eq(flaggedExercisesCardsTable.exercise_card_id, cardId)
        )
      );

    // If already flagged, remove it (toggle off)
    if (existingFlag.length > 0) {
      await db
        .delete(flaggedExercisesCardsTable)
        .where(
          and(
            eq(flaggedExercisesCardsTable.user_id, user.id),
            eq(flaggedExercisesCardsTable.exercise_card_id, cardId)
          )
        )
        .returning({ id: flaggedExercisesCardsTable.id });

      return NextResponse.json({
        message: "Card removed from favorites",
        flagged: false,
      });
    }
    // Otherwise, add the flag (toggle on)
    else {
      await db
        .insert(flaggedExercisesCardsTable)
        .values({
          user_id: user.id,
          exercise_card_id: cardId,
        })
        .returning({ id: flaggedExercisesCardsTable.id });

      return NextResponse.json({
        message: "Card added to favorites",
        flagged: true,
      });
    }
  } catch (error) {
    console.error("Error in flag-card API:", error);
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
    const cardId = url.searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
        { status: 400 }
      );
    }

    // Check if the card is flagged by this user
    const existingFlag = await db
      .select({ id: flaggedExercisesCardsTable.id })
      .from(flaggedExercisesCardsTable)
      .where(
        and(
          eq(flaggedExercisesCardsTable.user_id, user.id),
          eq(flaggedExercisesCardsTable.exercise_card_id, cardId)
        )
      );

    return NextResponse.json({
      flagged: existingFlag.length > 0,
    });
  } catch (error) {
    console.error("Error in flag-card API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
