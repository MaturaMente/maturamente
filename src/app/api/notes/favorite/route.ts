import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { flaggedNotesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { noteId, isFavorite } = await request.json();

    if (!noteId || typeof isFavorite !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    if (isFavorite) {
      // Add to favorites
      await db
        .insert(flaggedNotesTable)
        .values({
          user_id: session.user.id,
          note_id: noteId,
        })
        .onConflictDoNothing();
    } else {
      // Remove from favorites
      await db
        .delete(flaggedNotesTable)
        .where(
          and(
            eq(flaggedNotesTable.user_id, session.user.id),
            eq(flaggedNotesTable.note_id, noteId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling favorite note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
