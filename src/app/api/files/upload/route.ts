import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processUploadedFile, isValidFileType, getFileTypeFromName, validateFileSize } from "@/utils/files/file-orchestrator";
import { getSubscriptionStatus } from "@/utils/subscription-utils";
import { FileType } from "@/types/uploadedFilesTypes";

export const maxDuration = 300; // 5 minutes for file processing

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

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(session.user.id);
    if (!subscriptionStatus?.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Abbonamento premium richiesto",
          requiresSubscription: true
        },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nessun file caricato" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidFileType(file.name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Tipo di file non supportato. Sono supportati: PDF, DOCX, TXT, MD" 
        },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Il file è troppo grande. Dimensione massima: 50MB" 
        },
        { status: 400 }
      );
    }

    const fileType = getFileTypeFromName(file.name) as FileType;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Create initial file record for real-time tracking
    const { createFileRecord } = await import("@/utils/files/database-operations");
    const { generatePineconeSource } = await import("@/utils/files/file-processing");
    
    const initialFile = await createFileRecord({
      user_id: session.user.id,
      file_name: file.name,
      pinecone_source: generatePineconeSource(file.name, session.user.id),
      file_type: fileType,
      title: "Elaborazione in corso...",
      description: "Il documento è in fase di elaborazione.",
      n_pages: 1, // Will be updated during processing
      processing_status: "pending"
    });

    console.log(`📁 Created initial file record with ID: ${initialFile.id} for real-time tracking`);

    // Start asynchronous file processing with existing file record
    const { processUploadedFileAsync } = await import("@/utils/files/file-orchestrator");
    
    processUploadedFileAsync(
      fileBuffer,
      file.name,
      fileType,
      session.user.id,
      initialFile.id
    ).then((result) => {
      if (result.success) {
        console.log(`✅ Async file processing completed for: ${file.name}`);
      } else {
        console.error(`❌ Async file processing failed for: ${file.name}`, result.error);
      }
    }).catch((error) => {
      console.error(`❌ Async file processing error for: ${file.name}`, error);
    });

    return NextResponse.json({
      success: true,
      fileId: initialFile.id,
      file: initialFile
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore interno del server" 
      },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
