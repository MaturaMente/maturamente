import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { notesTable, noteStudySessionsTable, subjectsTable } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

// Dynamic: do not cache this route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Build a subquery to get the latest session for each note for this user and subject
    const latestSessionsSubquery = db
      .select({
        note_id: noteStudySessionsTable.note_id,
        latest_active_at:
          sql<Date>`MAX(${noteStudySessionsTable.last_active_at})`.as(
            "latest_active_at"
          ),
      })
      .from(noteStudySessionsTable)
      .innerJoin(notesTable, eq(noteStudySessionsTable.note_id, notesTable.id))
      .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
      .where(
        and(
          eq(noteStudySessionsTable.user_id, session.user.id),
          eq(subjectsTable.slug, slug)
        )
      )
      .groupBy(noteStudySessionsTable.note_id)
      .as("latest_sessions");

    const recent = await db
      .select({
        id: notesTable.id,
        title: notesTable.title,
        description: notesTable.description,
        slug: notesTable.slug,
        latest_active_at: (latestSessionsSubquery as any)
          .latest_active_at as unknown as Date,
      })
      .from(latestSessionsSubquery)
      .innerJoin(
        notesTable,
        eq((latestSessionsSubquery as any).note_id, notesTable.id)
      )
      .orderBy(desc((latestSessionsSubquery as any).latest_active_at))
      .limit(20);

    return NextResponse.json({
      recentNotes: recent.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        slug: r.slug || "",
      })),
    });
  } catch (err) {
    console.error("Error fetching recent subject notes (uncached):", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
