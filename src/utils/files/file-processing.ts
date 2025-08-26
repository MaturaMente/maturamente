import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import mammoth from "mammoth";
import crypto from "crypto";
import fs from "fs";

import { FileType } from "@/types/uploadedFilesTypes";

// Re-export FileType for backward compatibility
export type { FileType } from "@/types/uploadedFilesTypes";

export interface ProcessedFile {
  documents: Document[];
  pages: number;
  originalFilename: string;
  pineconeSource: string; // Unique filename for Pinecone
}

/**
 * Generate a stable ID for a document chunk based on its metadata
 */
export function stableIdForDocument(doc: Document): string {
  const hasher = crypto.createHash("sha256");
  const source = doc.metadata?.source || "";
  const page = doc.metadata?.page || "";
  const chunkIndex = doc.metadata?.chunk_index || "";
  hasher.update(`${source}|${page}|${chunkIndex}`);
  return hasher.digest("hex");
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove special characters except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Generate a unique filename for Pinecone storage in kebab-case
 */
export function generatePineconeSource(originalFilename: string, userId: string): string {
  const timestamp = Date.now();
  const hash = crypto.createHash("md5").update(`${userId}_${originalFilename}_${timestamp}`).digest("hex").slice(0, 8);
  
  // Extract extension and base name properly
  const lastDotIndex = originalFilename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalFilename.substring(lastDotIndex + 1) : '';
  const baseName = lastDotIndex !== -1 ? originalFilename.substring(0, lastDotIndex) : originalFilename;
  
  // Convert to kebab-case
  const kebabBaseName = toKebabCase(baseName);
  const kebabExtension = extension.toLowerCase();
  
  return `${kebabBaseName}-${hash}.${kebabExtension}`;
}

/**
 * Load and chunk a PDF file
 */
export async function loadAndChunkPdf(
  filePath: string,
  pineconeSource: string,
  userId: string,
  chunkSize: number = 768,
  chunkOverlap: number = 90
): Promise<Document[]> {
  console.log(`📖 Loading PDF file: ${filePath}`);
  
  try {
    const loader = new PDFLoader(filePath);
    const pages = await loader.load();
    console.log(`📄 PDF loaded successfully: ${pages.length} pages found`);
    
    if (pages.length === 0) {
      throw new Error("PDF file appears to be empty or corrupted");
    }
    
    // Check for content
    const totalContent = pages.reduce((acc, page) => acc + page.pageContent.length, 0);
    console.log(`📝 Total content length: ${totalContent} characters`);
    
    if (totalContent === 0) {
      throw new Error("PDF file contains no extractable text content");
    }
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", " ", ""],
    });
    
    const chunkedDocs = await splitter.splitDocuments(pages);
    console.log(`✂️ PDF split into ${chunkedDocs.length} chunks`);
    
    if (chunkedDocs.length === 0) {
      throw new Error("Failed to create any chunks from PDF content");
    }
    
    const enrichedDocs: Document[] = [];
    for (let idx = 0; idx < chunkedDocs.length; idx++) {
      const doc = chunkedDocs[idx];
      
      // Skip empty chunks
      if (!doc.pageContent || doc.pageContent.trim().length === 0) {
        console.log(`⚠️ Skipping empty chunk ${idx}`);
        continue;
      }
      
      const metadata = { ...doc.metadata };
      metadata.source = pineconeSource;
      metadata.chunk_index = idx;
      metadata.user_id = userId;
      metadata.file_type = "pdf";
      
      enrichedDocs.push(new Document({
        pageContent: doc.pageContent.trim(),
        metadata,
      }));
    }
    
    console.log(`✅ PDF processing completed: ${enrichedDocs.length} valid chunks created`);
    
    if (enrichedDocs.length === 0) {
      throw new Error("No valid chunks could be created from PDF content");
    }
    
    return enrichedDocs;
    
  } catch (error) {
    console.error(`❌ PDF processing failed for ${filePath}:`, error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load and chunk a DOCX file
 */
export async function loadAndChunkDocx(
  filePath: string,
  pineconeSource: string,
  userId: string,
  chunkSize: number = 768,
  chunkOverlap: number = 90
): Promise<Document[]> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " ", ""],
  });
  
  // Create a single document from the DOCX text
  const document = new Document({
    pageContent: text,
    metadata: {
      source: pineconeSource,
      page: 1,
    },
  });
  
  const chunkedDocs = await splitter.splitDocuments([document]);
  
  const enrichedDocs: Document[] = [];
  for (let idx = 0; idx < chunkedDocs.length; idx++) {
    const doc = chunkedDocs[idx];
    const metadata = { ...doc.metadata };
    metadata.source = pineconeSource;
    metadata.chunk_index = idx;
    metadata.user_id = userId;
    metadata.file_type = "docx";
    
    enrichedDocs.push(new Document({
      pageContent: doc.pageContent,
      metadata,
    }));
  }
  
  return enrichedDocs;
}

/**
 * Load and chunk a TXT file
 */
export async function loadAndChunkTxt(
  filePath: string,
  pineconeSource: string,
  userId: string,
  chunkSize: number = 768,
  chunkOverlap: number = 90
): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  const docs = await loader.load();
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " ", ""],
  });
  
  const chunkedDocs = await splitter.splitDocuments(docs);
  
  const enrichedDocs: Document[] = [];
  for (let idx = 0; idx < chunkedDocs.length; idx++) {
    const doc = chunkedDocs[idx];
    const metadata = { ...doc.metadata };
    metadata.source = pineconeSource;
    metadata.chunk_index = idx;
    metadata.user_id = userId;
    metadata.file_type = "txt";
    
    enrichedDocs.push(new Document({
      pageContent: doc.pageContent,
      metadata,
    }));
  }
  
  return enrichedDocs;
}

/**
 * Load and chunk a Markdown file
 */
export async function loadAndChunkMd(
  filePath: string,
  pineconeSource: string,
  userId: string,
  chunkSize: number = 768,
  chunkOverlap: number = 90
): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  const docs = await loader.load();
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " ", ""],
  });
  
  const chunkedDocs = await splitter.splitDocuments(docs);
  
  const enrichedDocs: Document[] = [];
  for (let idx = 0; idx < chunkedDocs.length; idx++) {
    const doc = chunkedDocs[idx];
    const metadata = { ...doc.metadata };
    metadata.source = pineconeSource;
    metadata.chunk_index = idx;
    metadata.user_id = userId;
    metadata.file_type = "md";
    
    enrichedDocs.push(new Document({
      pageContent: doc.pageContent,
      metadata,
    }));
  }
  
  return enrichedDocs;
}

/**
 * Estimate number of pages for different file types
 */
export async function estimatePages(filePath: string, fileType: FileType): Promise<number> {
  switch (fileType) {
    case "pdf":
      try {
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();
        return Math.max(1, docs.length);
      } catch (error) {
        console.error("Error estimating PDF pages:", error);
        return 1;
      }
    
    case "docx":
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const wordCount = result.value.split(/\s+/).length;
        // Rough estimation: 250 words per page
        return Math.max(1, Math.ceil(wordCount / 250));
      } catch (error) {
        console.error("Error estimating DOCX pages:", error);
        return 1;
      }
    
    case "txt":
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const wordCount = content.split(/\s+/).length;
        // Rough estimation: 250 words per page
        return Math.max(1, Math.ceil(wordCount / 250));
      } catch (error) {
        console.error("Error estimating TXT pages:", error);
        return 1;
      }
    
    case "md":
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const wordCount = content.split(/\s+/).length;
        // Rough estimation: 250 words per page
        return Math.max(1, Math.ceil(wordCount / 250));
      } catch (error) {
        console.error("Error estimating MD pages:", error);
        return 1;
      }
    
    default:
      return 1;
  }
}

/**
 * Main function to process any supported file type
 */
export async function processFile(
  filePath: string,
  originalFilename: string,
  fileType: FileType,
  userId: string,
  pineconeSource: string,
  chunkSize: number = 768,
  chunkOverlap: number = 90
): Promise<ProcessedFile> {
  console.log(`🔄 Processing file: ${originalFilename} (${fileType})`);
  console.log(`📝 Using provided Pinecone source: ${pineconeSource}`);
  
  let documents: Document[];
  
  try {
    switch (fileType) {
      case "pdf":
        documents = await loadAndChunkPdf(filePath, pineconeSource, userId, chunkSize, chunkOverlap);
        break;
      case "docx":
        documents = await loadAndChunkDocx(filePath, pineconeSource, userId, chunkSize, chunkOverlap);
        break;
      case "txt":
        documents = await loadAndChunkTxt(filePath, pineconeSource, userId, chunkSize, chunkOverlap);
        break;
      case "md":
        documents = await loadAndChunkMd(filePath, pineconeSource, userId, chunkSize, chunkOverlap);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    console.log(`✅ Successfully processed ${originalFilename}: ${documents.length} chunks created`);
    
    if (documents.length === 0) {
      throw new Error(`No content could be extracted from ${originalFilename}. The file might be empty, corrupted, or contain only images.`);
    }
    
    // Additional validation
    const totalContentLength = documents.reduce((acc, doc) => acc + doc.pageContent.length, 0);
    if (totalContentLength < 10) {
      throw new Error(`File ${originalFilename} contains insufficient text content (${totalContentLength} characters). It might be a scanned document or contain only images.`);
    }
    
    console.log(`📊 Content summary for ${originalFilename}:`, {
      chunks: documents.length,
      totalChars: totalContentLength,
      avgChunkSize: Math.round(totalContentLength / documents.length)
    });
    
  } catch (error) {
    console.error(`❌ File processing failed for ${originalFilename}:`, error);
    throw error;
  }
  
  const pages = await estimatePages(filePath, fileType);
  
  return {
    documents,
    pages,
    originalFilename,
    pineconeSource,
  };
}
