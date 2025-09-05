import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllUserNotes, getAllRecentStudiedNotes } from "@/utils/notes-data";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAllUserNotes(session.user.id);
    // return enriched info for selection UI
    const notes = data.allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      n_pages: n.n_pages,
      slug: n.slug,
      is_favorite: n.is_favorite,
      subject_id: n.subject_id,
      free_trial: n.free_trial,
      created_at: n.created_at,
    }));

    // recent studied notes (limit to a few for UI)
    const recentNotes = await getAllRecentStudiedNotes(session.user.id);

    return NextResponse.json({
      notes,
      recentNotes,
      subjects: data.subjects,
    });
  } catch (err) {
    console.error("Error fetching dashboard notes:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
