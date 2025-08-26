import { Pinecone } from "@pinecone-database/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";

/**
 * Debug utility to manually check what's in Pinecone
 */
export async function debugPineconeIndex(
  indexName: string,
  userId?: string,
  source?: string
) {
  console.log(`🔍 Debug Pinecone Index: ${indexName}`);
  
  if (!process.env.PINECONE_API_KEY || !process.env.HUGGINGFACEHUB_API_KEY) {
    console.error("❌ Missing API keys");
    return;
  }

  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.Index(indexName);
    
    // Get index stats
    const stats = await index.describeIndexStats();
    console.log(`📊 Index Stats:`, stats);
    
    // If we have a user ID and source, try to search for specific documents
    if (userId && source) {
      const embeddings = new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HUGGINGFACEHUB_API_KEY,
        model: "BAAI/bge-base-en-v1.5",
      });
      
      const vectorStore = await PineconeStore.fromExistingIndex(
        embeddings,
        { pineconeIndex: index }
      );
      
      console.log(`🔍 Searching for documents with user_id: ${userId} and source: ${source}`);
      
      // Try different search queries
      const testQueries = [
        "document content",
        "text content",
        "information",
        "summary"
      ];
      
      for (const query of testQueries) {
        console.log(`\n🔎 Testing query: "${query}"`);
        
        try {
          // Search without filter
          const allResults = await vectorStore.similaritySearch(query, 5);
          console.log(`📄 Found ${allResults.length} total results`);
          
          if (allResults.length > 0) {
            console.log(`📝 Sample result metadata:`, JSON.stringify(allResults[0].metadata, null, 2));
          }
          
          // Search with user filter only
          const userResults = await vectorStore.similaritySearch(query, 5, {
            user_id: userId
          });
          console.log(`👤 Found ${userResults.length} user-specific results`);
          
          // Search with user and source filter
          const specificResults = await vectorStore.similaritySearch(query, 5, {
            user_id: userId,
            source: source
          });
          console.log(`🎯 Found ${specificResults.length} specific file results`);
          
          if (specificResults.length > 0) {
            console.log(`📋 Specific result:`, {
              content: specificResults[0].pageContent.substring(0, 100) + "...",
              metadata: specificResults[0].metadata
            });
          }
        } catch (error) {
          console.error(`❌ Error with query "${query}":`, error);
        }
      }
    }
    
    // Try to list some documents using the newer API
    try {
      const listResult = await index.listPaginated({ limit: 10 });
      console.log(`📋 Found ${listResult.vectors?.length || 0} vector IDs`);
      if (listResult.vectors && listResult.vectors.length > 0) {
        console.log(`🆔 Sample vector IDs:`, listResult.vectors.slice(0, 3).map((v: any) => v.id));
      }
    } catch (listError) {
      const errorMessage = listError instanceof Error ? listError.message : "Unknown error";
      console.log(`ℹ️ List operation not available or failed:`, errorMessage);
    }
    
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

/**
 * Check if specific vectors exist in the index
 */
export async function checkVectorExists(
  indexName: string,
  vectorId: string
) {
  console.log(`🔍 Checking if vector ${vectorId} exists in ${indexName}`);
  
  if (!process.env.PINECONE_API_KEY) {
    console.error("❌ Missing PINECONE_API_KEY");
    return;
  }

  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.Index(indexName);
    
    const result = await index.fetch([vectorId]);
    console.log(`📄 Vector fetch result:`, result);
    
    if (result.records && result.records[vectorId]) {
      console.log(`✅ Vector ${vectorId} exists`);
      console.log(`📋 Metadata:`, result.records[vectorId].metadata);
    } else {
      console.log(`❌ Vector ${vectorId} not found`);
    }
  } catch (error) {
    console.error("❌ Error checking vector:", error);
  }
}

/**
 * Utility to be called from API routes for debugging
 */
export async function debugUserFile(
  userId: string,
  pineconeSource: string,
  indexName: string = "rag-test"
) {
  console.log(`🚀 Debugging user file: ${pineconeSource} for user: ${userId}`);
  await debugPineconeIndex(indexName, userId, pineconeSource);
}
