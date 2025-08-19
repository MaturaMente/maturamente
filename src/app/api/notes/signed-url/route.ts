import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { notesTable, relationSubjectsUserTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCachedSignedUrl, setCachedSignedUrl } from "@/utils/signed-url-cache";

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { noteId, storagePath } = await request.json();

    // Validate input - we need either noteId or storagePath
    if (!noteId && !storagePath) {
      return NextResponse.json(
        { error: "Either noteId or storagePath is required" },
        { status: 400 }
      );
    }

    let finalStoragePath = storagePath;

    // If noteId is provided, fetch the storage path and verify user access
    if (noteId) {
      const noteResult = await db
        .select({
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
        })
        .from(notesTable)
        .where(eq(notesTable.id, noteId))
        .limit(1);

      if (!noteResult[0]) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      // Verify user has access to this note's subject
      const userSubjectAccess = await db
        .select()
        .from(relationSubjectsUserTable)
        .where(
          and(
            eq(relationSubjectsUserTable.user_id, session.user.id),
            eq(relationSubjectsUserTable.subject_id, noteResult[0].subject_id!)
          )
        )
        .limit(1);

      if (!userSubjectAccess[0]) {
        return NextResponse.json(
          { error: "Access denied to this note" },
          { status: 403 }
        );
      }

      finalStoragePath = noteResult[0].storage_path;
    }

    if (!finalStoragePath) {
      return NextResponse.json(
        { error: "Storage path not found" },
        { status: 404 }
      );
    }

    // 1-hour TTL for signed URL caching to match Supabase signed URL expiry
    const ttlSeconds = 3600;

    // Try cache first
    const sessionUserId = session.user.id;
    const cacheKey = `${sessionUserId}:${finalStoragePath}`;
    const cached = getCachedSignedUrl(cacheKey);
    if (cached) {
      return NextResponse.json({
        signedUrl: cached.url,
        message: "Signed URL (cached)",
        expiresIn: cached.expiresInSeconds,
        cached: true,
      });
    }

    // Generate a signed URL for the PDF file in the 'notes' bucket
    // URL expires in 1 hour (3600 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from("notes")
      .createSignedUrl(finalStoragePath, ttlSeconds);

    if (error) {
      console.error("Error generating signed URL:", error);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    if (!data || !data.signedUrl) {
      return NextResponse.json(
        { error: "No signed URL returned" },
        { status: 500 }
      );
    }

    // Store in cache
    setCachedSignedUrl(cacheKey, data.signedUrl, ttlSeconds);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      message: "Signed URL generated successfully",
      expiresIn: ttlSeconds, // 1 hour in seconds
      cached: false,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
