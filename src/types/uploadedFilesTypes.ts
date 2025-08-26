export type FileType = "pdf" | "docx" | "txt" | "md";

export type ProcessingStatus = "pending" | "parsing" | "chunking" | "embedding" | "metadata" | "completed" | "failed";

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  pinecone_source: string;
  file_type: FileType;
  title: string;
  description: string;
  n_pages: number;
  storage_path?: string;
  upload_timestamp: Date;
  processing_status: ProcessingStatus;
  created_at: Date;
}

export interface CreateFileData {
  file_name: string;
  file_type: FileType;
  file_buffer: Buffer;
}

export interface FileUploadProgress {
  stage: "uploading" | "parsing" | "chunking" | "embedding" | "metadata" | "completed" | "failed";
  message: string;
  progress?: number;
}

export interface FileProcessingResult {
  success: boolean;
  fileId?: string;
  error?: string;
  file?: UploadedFile;
}

// UI-specific types
export interface UIUploadedFile {
  id: string;
  file_name: string;
  file_type: FileType;
  title: string;
  description: string;
  n_pages: number;
  upload_timestamp: string; // ISO string for UI
  processing_status: ProcessingStatus;
  is_selected?: boolean;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: FileUploadProgress | null;
  error: string | null;
}

export interface FilesFilterState {
  searchTerm: string;
  fileType: FileType | "all";
  sortBy: "date" | "name" | "type";
  sortOrder: "asc" | "desc";
}

export interface FileSelectionState {
  selectedFiles: string[]; // Array of file IDs or pinecone sources
  maxSelections?: number;
}

// API Response types
export interface FileUploadResponse {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

export interface FilesListResponse {
  success: boolean;
  files?: UploadedFile[];
  error?: string;
}

export interface FileDeleteResponse {
  success: boolean;
  error?: string;
}
