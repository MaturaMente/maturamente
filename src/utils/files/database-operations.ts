import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { uploadedFilesTable } from "@/db/schema";
import { FileType, ProcessingStatus, UploadedFile } from "@/types/uploadedFilesTypes";

export interface CreateFileRecord {
  user_id: string;
  file_name: string;
  pinecone_source: string;
  file_type: FileType;
  title: string;
  description: string;
  n_pages: number;
  storage_path?: string;
  processing_status?: ProcessingStatus;
}

/**
 * Create a new file record in the database
 */
export async function createFileRecord(data: CreateFileRecord): Promise<UploadedFile> {
  const [result] = await db
    .insert(uploadedFilesTable)
    .values({
      ...data,
      processing_status: data.processing_status || "pending",
    })
    .returning();
    
  return result as UploadedFile;
}

/**
 * Update file processing status
 */
export async function updateFileStatus(
  fileId: string,
  status: ProcessingStatus
): Promise<void> {
  await db
    .update(uploadedFilesTable)
    .set({ processing_status: status })
    .where(eq(uploadedFilesTable.id, fileId));
}

/**
 * Update file metadata (title and description)
 */
export async function updateFileMetadata(
  fileId: string,
  title: string,
  description: string
): Promise<void> {
  await db
    .update(uploadedFilesTable)
    .set({ title, description })
    .where(eq(uploadedFilesTable.id, fileId));
}

/**
 * Get all files for a user
 */
export async function getUserFiles(userId: string): Promise<UploadedFile[]> {
  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(eq(uploadedFilesTable.user_id, userId))
    .orderBy(desc(uploadedFilesTable.upload_timestamp));
    
  return files as UploadedFile[];
}

/**
 * Get a specific file by ID and user
 */
export async function getFileById(fileId: string, userId: string): Promise<UploadedFile | null> {
  const [file] = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(
      eq(uploadedFilesTable.id, fileId),
      eq(uploadedFilesTable.user_id, userId)
    ));
    
  return file as UploadedFile || null;
}

/**
 * Get a file by pinecone source and user
 */
export async function getFileByPineconeSource(
  pineconeSource: string, 
  userId: string
): Promise<UploadedFile | null> {
  const [file] = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(
      eq(uploadedFilesTable.pinecone_source, pineconeSource),
      eq(uploadedFilesTable.user_id, userId)
    ));
    
  return file as UploadedFile || null;
}

/**
 * Delete a file record
 */
export async function deleteFileRecord(fileId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(uploadedFilesTable)
    .where(and(
      eq(uploadedFilesTable.id, fileId),
      eq(uploadedFilesTable.user_id, userId)
    ));
    
  return result.rowCount > 0;
}

/**
 * Search user files by title or description
 */
export async function searchUserFilesByText(
  userId: string,
  searchTerm: string
): Promise<UploadedFile[]> {
  // Note: For more advanced text search, you might want to use PostgreSQL's full-text search
  // This is a simple implementation using LIKE
  const searchPattern = `%${searchTerm.toLowerCase()}%`;
  
  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(
      eq(uploadedFilesTable.user_id, userId),
      // You might need to adjust this based on your database setup
      // This is a simplified search - consider using full-text search for production
    ))
    .orderBy(desc(uploadedFilesTable.upload_timestamp));
    
  // Filter in application for simplicity (consider moving to SQL for performance)
  return files.filter(file => 
    file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) as UploadedFile[];
}

/**
 * Get files count by status
 */
export async function getFileStatusCounts(userId: string): Promise<{
  pending: number;
  parsing: number;
  chunking: number;
  embedding: number;
  metadata: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const files = await getUserFiles(userId);
  
  const counts = {
    pending: 0,
    parsing: 0,
    chunking: 0,
    embedding: 0,
    metadata: 0,
    completed: 0,
    failed: 0,
    total: files.length,
  };
  
  files.forEach(file => {
    if (file.processing_status in counts) {
      (counts as any)[file.processing_status]++;
    }
  });
  
  return counts;
}

/**
 * Get recently uploaded files (last 7 days)
 */
export async function getRecentFiles(userId: string, days: number = 7): Promise<UploadedFile[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(
      eq(uploadedFilesTable.user_id, userId),
      // Note: You might need to adjust the date comparison based on your database setup
    ))
    .orderBy(desc(uploadedFilesTable.upload_timestamp));
    
  // Filter by date in application (consider moving to SQL for performance)
  return files.filter(file => 
    new Date(file.upload_timestamp) >= cutoffDate
  ) as UploadedFile[];
}
