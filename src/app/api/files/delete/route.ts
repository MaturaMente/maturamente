import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileById, deleteFileRecord } from "@/utils/files/database-operations";
import { deleteDocumentsFromPinecone } from "@/utils/files/pinecone-storage";

export async function DELETE(req: NextRequest) {
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
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "ID file mancante" },
        { status: 400 }
      );
    }

    // Get file details to verify ownership
    const file = await getFileById(fileId, session.user.id);
    if (!file) {
      return NextResponse.json(
        { success: false, error: "File non trovato" },
        { status: 404 }
      );
    }

    // Delete from Pinecone first
    const indexName = process.env.PINECONE_INDEX_NAME || "rag-test";
    try {
      await deleteDocumentsFromPinecone(
        session.user.id, 
        file.pinecone_source, 
        indexName
      );
      console.log(`Deleted vectors from Pinecone for file: ${file.file_name}`);
    } catch (pineconeError) {
      console.error("Error deleting from Pinecone:", pineconeError);
      // Continue with database deletion even if Pinecone fails
      // The orphaned vectors won't hurt and can be cleaned up later
    }

    // Delete from database
    const deleted = await deleteFileRecord(fileId, session.user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Errore durante la cancellazione" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File eliminato con successo"
    });

  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}

// For URL-based deletion (alternative approach)
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

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "ID file mancante" },
        { status: 400 }
      );
    }

    // Get file details to verify ownership
    const file = await getFileById(fileId, session.user.id);
    if (!file) {
      return NextResponse.json(
        { success: false, error: "File non trovato" },
        { status: 404 }
      );
    }

    // Delete from Pinecone first
    const indexName = process.env.PINECONE_INDEX_NAME || "rag-test";
    try {
      await deleteDocumentsFromPinecone(
        session.user.id, 
        file.pinecone_source, 
        indexName
      );
      console.log(`Deleted vectors from Pinecone for file: ${file.file_name}`);
    } catch (pineconeError) {
      console.error("Error deleting from Pinecone:", pineconeError);
      // Continue with database deletion even if Pinecone fails
    }

    // Delete from database
    const deleted = await deleteFileRecord(fileId, session.user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Errore durante la cancellazione" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File eliminato con successo"
    });

  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}
