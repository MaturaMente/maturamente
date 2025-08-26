import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "@langchain/core/documents";
import { stableIdForDocument } from "./file-processing";

/**
 * Get BGE embeddings (same model as Python version)
 */
function getBgeEmbeddings() {
  if (!process.env.HUGGINGFACEHUB_API_KEY) {
    throw new Error("HUGGINGFACEHUB_API_KEY is required");
  }
  
  return new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY,
    model: "BAAI/bge-base-en-v1.5",
  });
}

/**
 * Ensure Pinecone index exists
 */
export async function ensurePineconeIndex(
  indexName: string,
  dimension: number = 768
): Promise<void> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  const pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY 
  });

  try {
    await pinecone.describeIndex(indexName);
    console.log(`Index ${indexName} already exists`);
  } catch (error) {
    console.log(`Creating index ${indexName}...`);
    await pinecone.createIndex({
      name: indexName,
      dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    
    // Wait for index to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Upsert documents to Pinecone
 */
export async function upsertDocumentsToPinecone(
  docs: Document[],
  indexName: string
): Promise<void> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  console.log(`🚀 Starting Pinecone upsert for ${docs.length} documents to index: ${indexName}`);

  if (docs.length === 0) {
    throw new Error("No documents provided for Pinecone upsert");
  }

  try {
    const embeddings = getBgeEmbeddings();
    console.log(`🔗 BGE embeddings initialized successfully`);
    
    const pinecone = new Pinecone({ 
      apiKey: process.env.PINECONE_API_KEY 
    });
    console.log(`🔗 Pinecone client initialized`);
    
    const index = pinecone.Index(indexName);
    console.log(`📍 Connected to Pinecone index: ${indexName}`);
    
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: index }
    );
    console.log(`🏪 Vector store created successfully`);

    // Generate stable IDs for each document
    const ids = docs.map(stableIdForDocument);
    console.log(`🔑 Generated ${ids.length} stable document IDs`);
    
    // Validate documents before upload
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (!doc.pageContent || doc.pageContent.trim().length === 0) {
        throw new Error(`Document ${i} has empty content`);
      }
      if (!doc.metadata?.source) {
        throw new Error(`Document ${i} missing source in metadata`);
      }
      if (!doc.metadata?.user_id) {
        throw new Error(`Document ${i} missing user_id in metadata`);
      }
    }
    console.log(`✅ All documents validated successfully`);
    
    // Debug logging
    console.log(`📊 Upload summary:`, {
      documentCount: docs.length,
      indexName,
      sampleSource: docs[0].metadata?.source,
      sampleUserId: docs[0].metadata?.user_id,
      sampleContentLength: docs[0].pageContent?.length || 0,
      totalContentLength: docs.reduce((acc, doc) => acc + (doc.pageContent?.length || 0), 0)
    });
    
    console.log(`📄 Sample document metadata:`, JSON.stringify(docs[0].metadata, null, 2));
    
    // Perform the upload
    console.log(`⬆️ Starting document upload to Pinecone...`);
    await vectorStore.addDocuments(docs, { ids });
    console.log(`✅ Successfully upserted ${docs.length} documents to Pinecone index ${indexName}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`❌ Pinecone upsert failed:`, {
      error: errorMessage,
      stack: errorStack,
      documentCount: docs.length,
      indexName,
      firstDocSource: docs[0]?.metadata?.source,
      firstDocUserId: docs[0]?.metadata?.user_id
    });
    throw new Error(`Pinecone upsert failed: ${errorMessage}`);
  }
}

/**
 * Search Pinecone with filtering (used for RAG)
 */
export async function pineconeSearch(
  query: string,
  indexName: string,
  k: number = 5,
  filter?: Record<string, any>
): Promise<Document[]> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  const embeddings = getBgeEmbeddings();
  const pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY 
  });
  
  const index = pinecone.Index(indexName);
  
  const vectorStore = await PineconeStore.fromExistingIndex(
    embeddings,
    { pineconeIndex: index }
  );

  return vectorStore.similaritySearch(query, k, filter);
}

/**
 * Search user's uploaded files specifically
 */
export async function searchUserFiles(
  query: string,
  userId: string,
  indexName: string,
  fileSources?: string[], // Optional: filter by specific file sources
  k: number = 8
): Promise<Document[]> {
  const filter: Record<string, any> = {
    user_id: userId,
  };
  
  // If specific file sources are provided, filter by them
  if (fileSources && fileSources.length > 0) {
    filter.source = { $in: fileSources };
  }
  
  console.log(`🔍 Searching user files with:`, {
    userId,
    query: query.substring(0, 50) + "...",
    fileSources,
    filter,
    k
  });
  
  const results = await pineconeSearch(query, indexName, k, filter);
  console.log(`📖 Found ${results.length} chunks for user files search`);
  
  return results;
}

/**
 * Delete documents by user and source (for file deletion)
 * Works with both serverless and pod-based indexes
 */
export async function deleteDocumentsFromPinecone(
  userId: string,
  pineconeSource: string,
  indexName: string
): Promise<void> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  const pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY 
  });
  
  const index = pinecone.Index(indexName);
  
  try {
    // First approach: Try metadata filtering (works for pod-based indexes)
    console.log(`🗑️ Attempting metadata-based deletion for ${pineconeSource}`);
    await index.deleteMany({
      user_id: userId,
      source: pineconeSource
    });
    console.log(`✅ Successfully deleted documents via metadata filter for user ${userId} and source ${pineconeSource}`);
  } catch (metadataError) {
    console.log(`⚠️ Metadata filtering not supported, trying ID-based deletion:`, metadataError);
    
    // Fallback approach: Query for IDs first, then delete by IDs (works for all index types)
    try {
      // Use a dummy query to find all vectors with matching metadata
      const embeddings = getBgeEmbeddings();
      const vectorStore = await PineconeStore.fromExistingIndex(
        embeddings,
        { pineconeIndex: index }
      );
      
      // Get all documents with matching metadata (using a broad search)
      const filter = {
        user_id: userId,
        source: pineconeSource
      };
      
      // Query with a generic vector to find matching documents
      // We'll do multiple queries to get all possible matches
      const queries = [
        "document",
        "text", 
        "content",
        "file",
        "data"
      ];
      
      const allIds = new Set<string>();
      
      for (const query of queries) {
        try {
          const results = await vectorStore.similaritySearch(query, 100, filter);
          
          // Extract IDs from results if they have them
          results.forEach((doc: any) => {
            if (doc.metadata?.id) {
              allIds.add(doc.metadata.id);
            }
          });
        } catch (queryError) {
          console.log(`Query "${query}" failed:`, queryError);
          // Continue with other queries
        }
      }
      
      if (allIds.size > 0) {
        const idsArray = Array.from(allIds);
        console.log(`🔍 Found ${idsArray.length} vector IDs to delete: ${idsArray.slice(0, 5)}${idsArray.length > 5 ? '...' : ''}`);
        
        // Delete by IDs in batches (Pinecone has limits on batch size)
        const batchSize = 100;
        for (let i = 0; i < idsArray.length; i += batchSize) {
          const batch = idsArray.slice(i, i + batchSize);
          await index.deleteMany(batch);
          console.log(`🗑️ Deleted batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors)`);
        }
        
        console.log(`✅ Successfully deleted ${idsArray.length} documents by IDs for user ${userId} and source ${pineconeSource}`);
      } else {
        console.log(`⚠️ No documents found to delete for user ${userId} and source ${pineconeSource}`);
      }
      
    } catch (fallbackError) {
      console.error(`❌ Both deletion methods failed:`, fallbackError);
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
      throw new Error(`Failed to delete documents: ${errorMessage}`);
    }
  }
}

/**
 * Delete ALL documents for a specific user (bulk cleanup)
 * Works with both serverless and pod-based indexes
 */
export async function deleteAllUserDocuments(
  userId: string,
  indexName: string
): Promise<void> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  const pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY 
  });
  
  const index = pinecone.Index(indexName);
  
  try {
    // First approach: Try metadata filtering (works for pod-based indexes)
    console.log(`🗑️ Attempting metadata-based cleanup for user ${userId}`);
    await index.deleteMany({
      user_id: userId
    });
    console.log(`✅ Successfully deleted ALL documents via metadata filter for user ${userId}`);
  } catch (metadataError) {
    console.log(`⚠️ Metadata filtering not supported, trying ID-based cleanup:`, metadataError);
    
    // Fallback approach: Query for all user IDs first, then delete by IDs
    try {
      const embeddings = getBgeEmbeddings();
      const vectorStore = await PineconeStore.fromExistingIndex(
        embeddings,
        { pineconeIndex: index }
      );
      
      // Get all documents for this user
      const filter = {
        user_id: userId
      };
      
      // Query with multiple terms to find all user documents
      const queries = [
        "document",
        "text", 
        "content",
        "file",
        "data",
        "note",
        "pdf"
      ];
      
      const allIds = new Set<string>();
      
      for (const query of queries) {
        try {
          const results = await vectorStore.similaritySearch(query, 100, filter);
          
          // Extract IDs from results
          results.forEach((doc: any) => {
            if (doc.metadata?.id) {
              allIds.add(doc.metadata.id);
            }
          });
        } catch (queryError) {
          console.log(`Query "${query}" failed during cleanup:`, queryError);
          // Continue with other queries
        }
      }
      
      if (allIds.size > 0) {
        const idsArray = Array.from(allIds);
        console.log(`🔍 Found ${idsArray.length} total vector IDs to delete for user cleanup`);
        
        // Delete by IDs in batches
        const batchSize = 100;
        for (let i = 0; i < idsArray.length; i += batchSize) {
          const batch = idsArray.slice(i, i + batchSize);
          await index.deleteMany(batch);
          console.log(`🗑️ Deleted cleanup batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors)`);
        }
        
        console.log(`✅ Successfully deleted ${idsArray.length} documents by IDs for user ${userId}`);
      } else {
        console.log(`⚠️ No documents found to delete for user ${userId}`);
      }
      
    } catch (fallbackError) {
      console.error(`❌ Both cleanup methods failed:`, fallbackError);
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
      throw new Error(`Failed to cleanup user documents: ${errorMessage}`);
    }
  }
}

/**
 * Get vector count for a specific user file (useful for debugging)
 */
export async function getFileVectorCount(
  userId: string,
  pineconeSource: string,
  indexName: string
): Promise<number> {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is required");
  }

  const pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY 
  });
  
  const index = pinecone.Index(indexName);
  
  try {
    const stats = await index.describeIndexStats({
      filter: {
        user_id: userId,
        source: pineconeSource,
      },
    });
    return stats.totalVectorCount || 0;
  } catch (error) {
    console.error("Error getting vector count:", error);
    return 0;
  }
}
