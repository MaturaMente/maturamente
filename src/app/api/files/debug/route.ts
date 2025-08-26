import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { debugUserFile } from "@/utils/files/debug-pinecone";
import { getUserFiles } from "@/utils/files/database-operations";

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
    const { fileId, action } = body;
    
    if (action === "debug-file" && fileId) {
      // Get file info from database
      const files = await getUserFiles(session.user.id);
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: "File non trovato" },
          { status: 404 }
        );
      }
      
      console.log(`🔧 Debug requested for file: ${file.file_name} (${file.pinecone_source})`);
      
      // Debug the file in Pinecone
      await debugUserFile(
        session.user.id,
        file.pinecone_source,
        process.env.PINECONE_INDEX_NAME || "rag-test"
      );
      
      return NextResponse.json({
        success: true,
        message: "Debug info logged to console",
        file: {
          id: file.id,
          file_name: file.file_name,
          pinecone_source: file.pinecone_source,
          processing_status: file.processing_status,
        }
      });
    }
    
    if (action === "list-files") {
      const files = await getUserFiles(session.user.id);
      
      return NextResponse.json({
        success: true,
        files: files.map(f => ({
          id: f.id,
          file_name: f.file_name,
          pinecone_source: f.pinecone_source,
          processing_status: f.processing_status,
          upload_timestamp: f.upload_timestamp,
        }))
      });
    }
    
    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}
