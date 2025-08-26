import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileById, getFileStatusCounts } from "@/utils/files/database-operations";

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

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");
    
    if (fileId) {
      // Get specific file status
      console.log(`📋 Status API: Getting file status for ID: ${fileId}, User: ${session.user.id}`);
      
      const file = await getFileById(fileId, session.user.id);
      if (!file) {
        console.log(`❌ Status API: File not found - ID: ${fileId}, User: ${session.user.id}`);
        return NextResponse.json(
          { success: false, error: "File non trovato" },
          { status: 404 }
        );
      }

      console.log(`✅ Status API: File found - Status: ${file.processing_status}, Title: ${file.title}`);

      const fileResponse = {
        id: file.id,
        file_name: file.file_name,
        processing_status: file.processing_status,
        title: file.title,
        description: file.description,
        upload_timestamp: file.upload_timestamp,
        pinecone_source: file.pinecone_source,
        file_type: file.file_type,
        n_pages: file.n_pages,
        created_at: file.created_at,
        user_id: file.user_id
      };

      return NextResponse.json({
        success: true,
        file: fileResponse
      });
    } else {
      // Get status counts for all user files
      const counts = await getFileStatusCounts(session.user.id);
      
      return NextResponse.json({
        success: true,
        counts
      });
    }

  } catch (error) {
    console.error("File status error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}
