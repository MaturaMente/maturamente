import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFiles, searchUserFilesByText } from "@/utils/files/database-operations";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    // Get search query parameter
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let files;
    if (search && search.trim().length > 0) {
      files = await searchUserFilesByText(session.user.id, search.trim());
    } else {
      files = await getUserFiles(session.user.id);
    }

    return NextResponse.json({
      success: true,
      files
    });

  } catch (error) {
    console.error("Files list error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}

// POST method for complex filtering (if needed in future)
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { search, fileType, status } = body;

    // For now, use the simple search. Can be enhanced later for complex filtering
    let files;
    if (search && search.trim().length > 0) {
      files = await searchUserFilesByText(session.user.id, search.trim());
    } else {
      files = await getUserFiles(session.user.id);
    }

    // Additional filtering if needed
    if (fileType && fileType !== "all") {
      files = files.filter(file => file.file_type === fileType);
    }

    if (status && status !== "all") {
      files = files.filter(file => file.processing_status === status);
    }

    return NextResponse.json({
      success: true,
      files
    });

  } catch (error) {
    console.error("Files search error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}
