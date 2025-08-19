import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { noteStudySessionsTable } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    // Check for existing active sessions (no ended_at timestamp)
    const existingSessions = await db
      .select({
        id: noteStudySessionsTable.id,
        started_at: noteStudySessionsTable.started_at,
        last_active_at: noteStudySessionsTable.last_active_at,
      })
      .from(noteStudySessionsTable)
      .where(
        and(
          eq(noteStudySessionsTable.user_id, session.user.id),
          eq(noteStudySessionsTable.note_id, noteId)
        )
      )
      .orderBy(desc(noteStudySessionsTable.started_at))
      .limit(1);

    // If there's an existing session that's still recent (within the last 5 minutes), use it
    if (existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      const lastActiveTime = new Date(existingSession.last_active_at).getTime();
      const currentTime = Date.now();
      const timeDifference = currentTime - lastActiveTime;
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDifference < fiveMinutesInMs) {
        return NextResponse.json({
          sessionId: existingSession.id,
          startedAt: existingSession.started_at,
        });
      }
    }

    // Create a new study session
    const [studySession] = await db
      .insert(noteStudySessionsTable)
      .values({
        user_id: session.user.id,
        note_id: noteId,
      })
      .returning({
        id: noteStudySessionsTable.id,
        started_at: noteStudySessionsTable.started_at,
      });

    return NextResponse.json({
      sessionId: studySession.id,
      startedAt: studySession.started_at,
    });
  } catch (error) {
    console.error("Error creating study session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
