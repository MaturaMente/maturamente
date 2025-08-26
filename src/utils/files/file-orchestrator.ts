import { processFile, FileType } from "./file-processing";
import { upsertDocumentsToPinecone, ensurePineconeIndex } from "./pinecone-storage";
import { generateFileMetadataWithRetry } from "./llm-metadata";
import { createFileRecord, updateFileStatus, updateFileMetadata } from "./database-operations";
import { UploadedFile } from "@/types/uploadedFilesTypes";
import fs from "fs";
import path from "path";
import os from "os";

export interface FileProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  indexName?: string;
}

export interface FileProcessingResult {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

/**
 * Async version that works with an existing file record for real-time progress tracking
 */
export async function processUploadedFileAsync(
  fileBuffer: Buffer,
  fileName: string,
  fileType: FileType,
  userId: string,
  existingFileId: string,
  options: FileProcessingOptions = {}
): Promise<FileProcessingResult> {
  const {
    chunkSize = 768,
    chunkOverlap = 90,
    indexName = process.env.PINECONE_INDEX_NAME || "rag-test"
  } = options;

  let tempFilePath: string | null = null;

  try {
    console.log(`🔄 Starting async processing for existing file: ${fileName} (ID: ${existingFileId})`);

    // Step 1: Create temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `upload_${userId}_${Date.now()}_${fileName}`;
    tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Step 2: Get existing file record to use its pineconeSource
    const { getFileById } = await import("@/utils/files/database-operations");
    const existingFile = await getFileById(existingFileId, userId);
    if (!existingFile) {
      throw new Error("Could not find existing file record");
    }

    // Step 3: Update status to parsing and process file
    console.log(`🔍 Parsing document: ${fileName}`);
    await updateFileStatus(existingFileId, "parsing");
    
    const processedFile = await processFile(
      tempFilePath,
      fileName,
      fileType,
      userId,
      existingFile.pinecone_source, // Use existing pineconeSource
      chunkSize,
      chunkOverlap
    );

    // Step 4: Update file record with processing info
    await updateFileStatus(existingFileId, "chunking");
    await updateFileMetadata(existingFileId, "Elaborazione in corso...", "Il documento è in fase di elaborazione.");
    // Update pages count
    await getFileById(existingFileId, userId).then(async (file) => {
      if (file) {
        const db = (await import("@/db/drizzle")).db;
        const { uploadedFilesTable } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(uploadedFilesTable)
          .set({ n_pages: processedFile.pages })
          .where(eq(uploadedFilesTable.id, existingFileId));
      }
    });

    // Step 5: Ensure Pinecone index exists
    console.log(`🔗 Ensuring Pinecone index exists: ${indexName}`);
    await ensurePineconeIndex(indexName);
    console.log(`✅ Pinecone index ready: ${indexName}`);

    // Step 6: Upload to Pinecone
    console.log(`📤 Starting Pinecone upload for ${processedFile.documents.length} chunks from file: ${fileName}`);
    await updateFileStatus(existingFileId, "embedding");
    
    try {
      await upsertDocumentsToPinecone(processedFile.documents, indexName);
      console.log(`✅ Successfully uploaded ${processedFile.documents.length} chunks to Pinecone for file: ${fileName}`);
    } catch (pineconeError) {
      console.error(`❌ PINECONE UPLOAD FAILED for file: ${fileName}`, pineconeError);
      const errorMessage = pineconeError instanceof Error ? pineconeError.message : "Unknown Pinecone error";
      throw new Error(`Pinecone upload failed: ${errorMessage}`);
    }

    // Step 7: Wait for Pinecone indexing to propagate
    console.log(`⏱️ Waiting for Pinecone indexing to complete...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 8: Generate metadata using LLM
    console.log(`🤖 Starting metadata generation for file: ${fileName}`);
    await updateFileStatus(existingFileId, "metadata");
    const metadata = await generateFileMetadataWithRetry(
      processedFile.pineconeSource,
      userId,
      indexName
    );
    console.log(`✅ Metadata generated successfully for file: ${fileName}`, { title: metadata.title, description: metadata.description });

    // Step 9: Update database record with generated metadata
    console.log(`📝 Updating database with metadata:`, { title: metadata.title, description: metadata.description });
    await updateFileMetadata(existingFileId, metadata.title, metadata.description);
    await updateFileStatus(existingFileId, "completed");
    console.log(`✅ Successfully updated database for file: ${fileName}`);

    // Step 10: Get final file record
    const finalFile = await getFileById(existingFileId, userId);
    if (!finalFile) {
      throw new Error("Could not retrieve final file record");
    }

    return {
      success: true,
      file: finalFile
    };

  } catch (error) {
    console.error(`❌ Error processing file: ${fileName}`, error);
    
    // Update status to failed
    try {
      await updateFileStatus(existingFileId, "failed");
    } catch (updateError) {
      console.error("Failed to update file status to failed:", updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Could not clean up temporary file: ${tempFilePath}`, cleanupError);
      }
    }
  }
}

/**
 * Main orchestrator function that handles the complete file processing pipeline
 */
export async function processUploadedFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: FileType,
  userId: string,
  options: FileProcessingOptions = {}
): Promise<FileProcessingResult> {
  const {
    chunkSize = 768,
    chunkOverlap = 90,
    indexName = process.env.PINECONE_INDEX_NAME || "rag-test"
  } = options;

  let tempFilePath: string | null = null;
  let fileRecord: UploadedFile | null = null;

  try {
    // Step 1: Generate consistent pineconeSource
    const { generatePineconeSource } = await import("@/utils/files/file-processing");
    const pineconeSource = generatePineconeSource(fileName, userId);
    console.log(`📝 Generated Pinecone source: ${pineconeSource}`);

    // Step 2: Create temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `upload_${userId}_${Date.now()}_${fileName}`;
    tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Step 3: Initial processing to get basic info
    console.log(`🔍 Parsing document: ${fileName}`);
    const processedFile = await processFile(
      tempFilePath,
      fileName,
      fileType,
      userId,
      pineconeSource, // Use the consistent pineconeSource
      chunkSize,
      chunkOverlap
    );

    // Step 4: Create initial database record
    fileRecord = await createFileRecord({
      user_id: userId,
      file_name: fileName,
      pinecone_source: pineconeSource, // Use the same pineconeSource
      file_type: fileType,
      title: "Elaborazione in corso...", // Temporary title
      description: "Il documento è in fase di elaborazione.", // Temporary description
      n_pages: processedFile.pages,
      processing_status: "chunking"
    });

    // Step 5: Ensure Pinecone index exists
    console.log(`🔗 Ensuring Pinecone index exists: ${indexName}`);
    await ensurePineconeIndex(indexName);
    console.log(`✅ Pinecone index ready: ${indexName}`);

    // Step 6: Upload to Pinecone
    console.log(`📤 Starting Pinecone upload for ${processedFile.documents.length} chunks from file: ${fileName}`);
    if (!fileRecord) {
      throw new Error("File record not found");
    }
    await updateFileStatus(fileRecord.id, "embedding");
    console.log(`📄 Sample chunk preview:`, {
      source: processedFile.pineconeSource,
      firstChunkLength: processedFile.documents[0]?.pageContent?.length || 0,
      metadata: processedFile.documents[0]?.metadata || {}
    });
    
    try {
      await upsertDocumentsToPinecone(processedFile.documents, indexName);
      console.log(`✅ Successfully uploaded ${processedFile.documents.length} chunks to Pinecone for file: ${fileName}`);
    } catch (pineconeError) {
      console.error(`❌ PINECONE UPLOAD FAILED for file: ${fileName}`, pineconeError);
      const errorMessage = pineconeError instanceof Error ? pineconeError.message : "Unknown Pinecone error";
      console.error(`🔍 Failed upload details:`, {
        fileName,
        pineconeSource: processedFile.pineconeSource,
        documentCount: processedFile.documents.length,
        indexName,
        userId,
        error: errorMessage
      });
      throw new Error(`Pinecone upload failed: ${errorMessage}`);
    }

    // Step 7: Wait for Pinecone indexing to propagate
    console.log(`⏱️ Waiting for Pinecone indexing to complete...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

    // Step 8: Generate metadata using LLM
    console.log(`🤖 Starting metadata generation for file: ${fileName}`);
    await updateFileStatus(fileRecord.id, "metadata");
    const metadata = await generateFileMetadataWithRetry(
      processedFile.pineconeSource,
      userId,
      indexName
    );
    console.log(`✅ Metadata generated successfully for file: ${fileName}`, { title: metadata.title, description: metadata.description });

    // Step 9: Update database record with generated metadata
    console.log(`📝 Updating database with metadata:`, { title: metadata.title, description: metadata.description });
    await updateFileMetadata(fileRecord.id, metadata.title, metadata.description);
    await updateFileStatus(fileRecord.id, "completed");
    console.log(`✅ Successfully updated database for file: ${fileName}`);

    // Step 10: Return updated file record
    const updatedFile: UploadedFile = {
      ...fileRecord,
      title: metadata.title,
      description: metadata.description,
      processing_status: "completed"
    };

    console.log(`Successfully processed file: ${fileName}`);
    return {
      success: true,
      file: updatedFile
    };

  } catch (error) {
    console.error("❌ Error processing file:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("❌ Error context:", {
      fileName,
      fileType,
      userId,
      hasFileRecord: !!fileRecord,
      fileRecordId: fileRecord?.id,
      step: "unknown"
    });
    
    // Update status to failed if we have a record
    if (fileRecord) {
      try {
        await updateFileStatus(fileRecord.id, "failed");
        console.log(`⚠️ Marked file ${fileRecord.id} as failed in database`);
      } catch (dbError) {
        console.error("❌ Failed to update file status in database:", dbError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`❌ Final error for file ${fileName}: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };

  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
  }
}

/**
 * Get supported file types
 */
export function getSupportedFileTypes(): FileType[] {
  return ["pdf", "docx", "txt", "md"];
}

/**
 * Validate file type
 */
export function isValidFileType(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  return getSupportedFileTypes().includes(extension as FileType);
}

/**
 * Get file type from filename
 */
export function getFileTypeFromName(fileName: string): FileType | null {
  const extension = fileName.toLowerCase().split('.').pop();
  const supportedTypes = getSupportedFileTypes();
  
  if (supportedTypes.includes(extension as FileType)) {
    return extension as FileType;
  }
  
  return null;
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(fileSize: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return fileSize <= maxSize; // Default 50MB limit
}

/**
 * Get file size limit for display
 */
export function getFileSizeLimit(): string {
  return "50MB";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Batch process multiple files (for future enhancement)
 */
export async function processBatchFiles(
  files: Array<{
    buffer: Buffer;
    fileName: string;
    fileType: FileType;
  }>,
  userId: string,
  options: FileProcessingOptions = {}
): Promise<FileProcessingResult[]> {
  const results: FileProcessingResult[] = [];
  
  // Process files sequentially to avoid overwhelming the system
  for (const file of files) {
    const result = await processUploadedFile(
      file.buffer,
      file.fileName,
      file.fileType,
      userId,
      options
    );
    results.push(result);
  }
  
  return results;
}
