import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubjectNotes, getRecentStudiedNotes } from "@/utils/notes-data";

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
    const data = await getSubjectNotes(slug, session.user.id);
    // return enriched info for selection UI
    const notes = data.allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      n_pages: n.n_pages,
      slug: n.slug,
      is_favorite: n.is_favorite,
      free_trial: n.free_trial,
      created_at: n.created_at,
    }));
    // recent studied notes (limit to a few for UI)
    const recentNotes = await getRecentStudiedNotes(
      session.user.id,
      data.subject.id
    );

    return NextResponse.json({ notes, recentNotes });
  } catch (err) {
    console.error("Error fetching notes by subject:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
