import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { completedSubtopicsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subtopic_id } = await request.json();

    if (!subtopic_id) {
      return NextResponse.json(
        { error: "Subtopic ID is required" },
        { status: 400 }
      );
    }

    // Check if it's already marked as completed
    const existingCompletion = await db
      .select()
      .from(completedSubtopicsTable)
      .where(
        and(
          eq(completedSubtopicsTable.user_id, user.id),
          eq(completedSubtopicsTable.subtopic_id, subtopic_id)
        )
      );

    // If not already completed, mark it as completed
    if (existingCompletion.length === 0) {
      await db.insert(completedSubtopicsTable).values({
        user_id: user.id,
        subtopic_id: subtopic_id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Subtopic marked as completed",
    });
  } catch (error) {
    console.error("Error marking subtopic as completed:", error);
    return NextResponse.json(
      { error: "Failed to mark subtopic as completed" },
      { status: 500 }
    );
  }
}
