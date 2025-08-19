import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { noteStudySessionsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Handle both JSON and FormData (for sendBeacon)
    let action: string;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const body = await request.json();
      action = body.action;
    } else {
      // Handle FormData from sendBeacon
      const formData = await request.formData();
      action = formData.get("action") as string;
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!action || !["ping", "end"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'ping' or 'end'" },
        { status: 400 }
      );
    }

    // Always update last_active_at for both ping and end actions
    const updateData = {
      last_active_at: new Date(),
    };

    // Update the study session (ensure user owns the session)
    const [updatedSession] = await db
      .update(noteStudySessionsTable)
      .set(updateData)
      .where(
        and(
          eq(noteStudySessionsTable.id, sessionId),
          eq(noteStudySessionsTable.user_id, session.user.id)
        )
      )
      .returning({
        id: noteStudySessionsTable.id,
        last_active_at: noteStudySessionsTable.last_active_at,
      });

    if (!updatedSession) {
      return NextResponse.json(
        { error: "Study session not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId: updatedSession.id,
      lastActiveAt: updatedSession.last_active_at,
      action: action,
    });
  } catch (error) {
    console.error("Error updating study session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
