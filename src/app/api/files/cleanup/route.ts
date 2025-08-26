import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAllUserDocuments } from "@/utils/files/pinecone-storage";

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

    const indexName = process.env.PINECONE_INDEX_NAME || "rag-test";
    
    console.log(`🧹 Cleaning up all documents for user: ${session.user.id}`);
    
    // Delete all user documents from Pinecone
    await deleteAllUserDocuments(session.user.id, indexName);
    
    return NextResponse.json({
      success: true,
      message: "Tutti i documenti sono stati eliminati da Pinecone"
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore durante la pulizia dell'indice" 
      },
      { status: 500 }
    );
  }
}
