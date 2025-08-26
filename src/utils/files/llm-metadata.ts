import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { Document } from "@langchain/core/documents";
import { searchUserFiles } from "./pinecone-storage";

export interface GeneratedMetadata {
  title: string;
  description: string;
}

/**
 * Generate title and description using DeepSeek via RAG
 */
export async function generateFileMetadata(
  pineconeSource: string,
  userId: string,
  indexName: string
): Promise<GeneratedMetadata> {
  try {
    console.log(`🤖 Generating metadata for file:`, { pineconeSource, userId, indexName });
    
    // Use RAG to get the most relevant chunks for metadata generation
    // We'll use a generic query to get representative content
    const queries = [
      "document content summary overview",
      "main topic subject matter",
      "key concepts themes ideas"
    ];
    
    let allDocs: Document[] = [];
    
    // Search with multiple queries to get diverse content
    for (const query of queries) {
      console.log(`🔍 Searching with query: "${query}"`);
      const docs = await searchUserFiles(
        query, 
        userId, 
        indexName, 
        [pineconeSource], // Filter by this specific file
        3 // Get fewer docs per query to avoid token limits
      );
      console.log(`📖 Found ${docs.length} docs for query "${query}"`);
      allDocs.push(...docs);
    }
    
    // Remove duplicates based on content
    const uniqueDocs = allDocs.filter((doc, index, arr) => 
      arr.findIndex(d => d.pageContent === doc.pageContent) === index
    );
    
    console.log(`📄 Total unique docs found: ${uniqueDocs.length}`);
    
    // If no docs found, log details for debugging
    if (uniqueDocs.length === 0) {
      console.log(`🔍 No documents found. Debug info:`, {
        pineconeSource,
        userId,
        indexName,
        queriesUsed: queries
      });
      
      // Try a broader search without specific queries
      console.log(`🔍 Trying broader search...`);
      const broadDocs = await searchUserFiles(
        "content", 
        userId, 
        indexName, 
        [pineconeSource], 
        5
      );
      console.log(`🔍 Broad search found ${broadDocs.length} docs`);
      
      if (broadDocs.length > 0) {
        allDocs.push(...broadDocs);
      }
    }
    
    // Re-check after broad search
    const finalUniqueDocs = allDocs.filter((doc, index, arr) => 
      arr.findIndex(d => d.pageContent === doc.pageContent) === index
    );
    
    console.log(`📄 Final unique docs found: ${finalUniqueDocs.length}`);
    
    // Take the first 5 most relevant chunks to avoid token limits
    const contextDocs = finalUniqueDocs.slice(0, 5);
    const contextText = contextDocs
      .map(doc => doc.pageContent)
      .join("\n---\n");
    
    console.log(`📝 Context text length: ${contextText.length} characters`);
    if (contextText.length > 0) {
      console.log(`📝 Context preview: ${contextText.substring(0, 200)}...`);
    }
    
    if (!contextText.trim()) {
      console.log(`⚠️ No context found for file ${pineconeSource} after all attempts, using fallback metadata`);
      // Fallback if no content found
      return {
        title: "Documento caricato",
        description: "Documento caricato dall'utente per l'analisi e la consultazione."
      };
    }
    
    // Generate title
    const titleResult = await generateText({
      model: deepseek("deepseek-chat"),
      prompt: `Based on the following document content, give a title to this document following this format: Main title - subtitle.

Document content:
${contextText}

Respond with ONLY the title in the requested format. Keep it concise and informative in Italian.`,
      maxOutputTokens: 100,
    });
    
    // Generate description
    const descriptionResult = await generateText({
      model: deepseek("deepseek-chat"),
      prompt: `Based on the following document content, give a 50-60 words description of this document in Italian.

Document content:
${contextText}

Respond with ONLY the description. Be concise and informative.`,
      maxOutputTokens: 150,
    });
    
    const generatedMetadata = {
      title: titleResult.text.trim() || "Documento caricato",
      description: descriptionResult.text.trim() || "Documento caricato dall'utente per l'analisi e la consultazione."
    };
    
    console.log(`✅ Generated metadata:`, generatedMetadata);
    return generatedMetadata;
    
  } catch (error) {
    console.error("Error generating metadata:", error);
    
    // Fallback metadata
    const fallbackMetadata = {
      title: "Documento caricato",
      description: "Documento caricato dall'utente per l'analisi e la consultazione."
    };
    console.log(`🔄 Using fallback metadata:`, fallbackMetadata);
    return fallbackMetadata;
  }
}

/**
 * Validate and clean generated metadata
 */
export function validateMetadata(metadata: GeneratedMetadata): GeneratedMetadata {
  const maxTitleLength = 200;
  const maxDescriptionLength = 300;
  const minDescriptionLength = 20;
  
  let { title, description } = metadata;
  
  // Clean and validate title
  title = title.replace(/^["']|["']$/g, '').trim();
  if (title.length > maxTitleLength) {
    title = title.substring(0, maxTitleLength - 3) + "...";
  }
  if (!title) {
    title = "Documento caricato";
  }
  
  // Clean and validate description
  description = description.replace(/^["']|["']$/g, '').trim();
  if (description.length > maxDescriptionLength) {
    description = description.substring(0, maxDescriptionLength - 3) + "...";
  }
  if (description.length < minDescriptionLength) {
    description = "Documento caricato dall'utente per l'analisi e la consultazione.";
  }
  
  return { title, description };
}

/**
 * Generate metadata with retry logic and improved error handling
 */
export async function generateFileMetadataWithRetry(
  pineconeSource: string,
  userId: string,
  indexName: string,
  maxRetries: number = 5
): Promise<GeneratedMetadata> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Metadata generation attempt ${attempt}/${maxRetries} for ${pineconeSource}`);
      
      // For the first few attempts, add a delay to allow Pinecone indexing to complete
      if (attempt <= 3) {
        const delay = 2000 * attempt; // 2s, 4s, 6s
        console.log(`⏱️ Waiting ${delay}ms for Pinecone indexing to complete...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const metadata = await generateFileMetadata(pineconeSource, userId, indexName);
      
      // Check if we got meaningful metadata (not just fallback)
      if (metadata.title !== "Documento caricato" && metadata.description !== "Documento caricato dall'utente per l'analisi e la consultazione.") {
        console.log(`✅ Successfully generated metadata for ${pineconeSource} on attempt ${attempt}`);
        return validateMetadata(metadata);
      } else if (attempt < maxRetries) {
        console.log(`⚠️ Got fallback metadata on attempt ${attempt}, retrying...`);
        throw new Error("Received fallback metadata, retrying");
      } else {
        console.log(`⚠️ Using fallback metadata after ${maxRetries} attempts for ${pineconeSource}`);
        return validateMetadata(metadata);
      }
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Metadata generation attempt ${attempt} failed for ${pineconeSource}:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        console.log(`⏱️ Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ All metadata generation attempts failed for ${pineconeSource}:`, lastError);
  
  // Return fallback metadata
  return validateMetadata({
    title: "Documento caricato",
    description: "Documento caricato dall'utente per l'analisi e la consultazione."
  });
}

/**
 * Manually retry metadata generation for files that have fallback metadata
 * This is useful for debugging and fixing files that didn't get proper metadata
 */
export async function retryMetadataForFile(
  fileId: string,
  userId: string,
  indexName: string = process.env.PINECONE_INDEX_NAME || "rag-test"
): Promise<GeneratedMetadata> {
  console.log(`🔄 Manual metadata retry for file ID: ${fileId}`);
  
  // This would require importing database functions, but for now we'll expect the pineconeSource to be passed
  throw new Error("retryMetadataForFile requires refactoring to work with file IDs");
}
