export interface BalancedRetrievalOptions {
  /** Total number of chunks to retrieve across all documents */
  totalChunks: number;
  /** Minimum chunks per document (if available) */
  minChunksPerDoc?: number;
  /** Maximum chunks per document */
  maxChunksPerDoc?: number;
  /** Whether to boost diversity across documents */
  enforceDistribution?: boolean;
}

export interface RetrievedChunk {
  pageContent: string;
  metadata: {
    source?: string;
    [key: string]: any;
  };
  score?: number;
}

export interface BalancedRetrievalResult {
  chunks: RetrievedChunk[];
  distribution: Record<string, number>; // source -> chunk count
  totalRetrieved: number;
}

/**
 * Implements balanced retrieval across multiple documents to ensure fair representation
 * from each selected document rather than all chunks coming from a single document.
 * Handles both note slugs (which need .pdf appended) and user file sources (which are already complete)
 */
export async function balancedSimilaritySearch(
  vectorStore: any, // Using any for now to avoid import issues
  query: string,
  selectedSources: string[], // Can be note slugs or user file sources
  options: BalancedRetrievalOptions,
  subjectFilter?: string,
  isUserFile?: boolean[] // Array indicating which sources are user files
): Promise<BalancedRetrievalResult> {
  const {
    totalChunks,
    minChunksPerDoc = 1,
    maxChunksPerDoc = Math.ceil(totalChunks / 2),
    enforceDistribution = true,
  } = options;

  // Handle both note slugs (need .pdf) and user files (already have extension)
  const allowedSources = selectedSources.map((source, index) => {
    const isUserFileSource = isUserFile && isUserFile[index];
    return isUserFileSource ? source : `${source}.pdf`;
  });

  console.log(`📚 Balanced search - sources:`, { selectedSources, allowedSources, isUserFile });

  if (allowedSources.length === 0) {
    return { chunks: [], distribution: {}, totalRetrieved: 0 };
  }

  // Strategy 1: If we only have one document, use standard retrieval
  if (allowedSources.length === 1) {
    try {
      const filter = { source: { $in: allowedSources } };
      const docs = await vectorStore.similaritySearch(
        query,
        totalChunks,
        filter
      );

      const filteredDocs = filterBySubjectAndSource(
        docs,
        subjectFilter,
        allowedSources
      );
      const chunks = convertToRetrievedChunks(filteredDocs);

      return {
        chunks,
        distribution: { [allowedSources[0]]: chunks.length },
        totalRetrieved: chunks.length,
      };
    } catch (error) {
      console.error("Single document retrieval failed:", error);
      return { chunks: [], distribution: {}, totalRetrieved: 0 };
    }
  }

  // Strategy 2: Balanced retrieval across multiple documents
  if (enforceDistribution) {
    return await distributedRetrieval(
      vectorStore,
      query,
      allowedSources,
      totalChunks,
      minChunksPerDoc,
      maxChunksPerDoc,
      subjectFilter
    );
  } else {
    // Strategy 3: Fallback to large retrieval + post-processing
    return await postProcessedRetrieval(
      vectorStore,
      query,
      allowedSources,
      totalChunks,
      maxChunksPerDoc,
      subjectFilter
    );
  }
}

/**
 * Retrieves a fixed number of chunks from each document, then merges and re-ranks
 */
async function distributedRetrieval(
  vectorStore: any,
  query: string,
  allowedSources: string[],
  totalChunks: number,
  minChunksPerDoc: number,
  maxChunksPerDoc: number,
  subjectFilter?: string
): Promise<BalancedRetrievalResult> {
  const distribution: Record<string, number> = {};
  const allChunks: RetrievedChunk[] = [];

  // Calculate chunks per document
  const baseChunksPerDoc = Math.max(
    minChunksPerDoc,
    Math.floor(totalChunks / allowedSources.length)
  );
  const extraChunks = totalChunks - baseChunksPerDoc * allowedSources.length;

  try {
    // Retrieve from each document individually
    for (let i = 0; i < allowedSources.length; i++) {
      const source = allowedSources[i];
      const chunksForThisDoc = baseChunksPerDoc + (i < extraChunks ? 1 : 0);
      const cappedChunks = Math.min(chunksForThisDoc, maxChunksPerDoc);

      try {
        const filter = { source: { $in: [source] } };
        const docs = await vectorStore.similaritySearch(
          query,
          cappedChunks,
          filter
        );

        const filteredDocs = filterBySubjectAndSource(docs, subjectFilter, [
          source,
        ]);
        const chunks = convertToRetrievedChunks(filteredDocs);

        allChunks.push(...chunks);
        distribution[source] = chunks.length;

        console.log(`Retrieved ${chunks.length} chunks from ${source}`);
      } catch (docError) {
        console.error(`Failed to retrieve from ${source}:`, docError);
        distribution[source] = 0;
      }
    }

    // Optional: Re-rank all chunks by similarity if you want global ordering
    // This preserves the balanced distribution while optimizing relevance
    allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      chunks: allChunks.slice(0, totalChunks),
      distribution,
      totalRetrieved: allChunks.length,
    };
  } catch (error) {
    console.error("Distributed retrieval failed:", error);
    return { chunks: [], distribution: {}, totalRetrieved: 0 };
  }
}

/**
 * Retrieves a large set of chunks then post-processes to ensure balance
 */
async function postProcessedRetrieval(
  vectorStore: any,
  query: string,
  allowedSources: string[],
  totalChunks: number,
  maxChunksPerDoc: number,
  subjectFilter?: string
): Promise<BalancedRetrievalResult> {
  try {
    // Retrieve more chunks than needed to have options for balancing
    const retrievalMultiplier = 3;
    const retrieveCount = totalChunks * retrievalMultiplier;

    const filter = { source: { $in: allowedSources } };
    const docs = await vectorStore.similaritySearch(
      query,
      retrieveCount,
      filter
    );

    const filteredDocs = filterBySubjectAndSource(
      docs,
      subjectFilter,
      allowedSources
    );
    const allChunks = convertToRetrievedChunks(filteredDocs);

    // Group by source
    const chunksBySource: Record<string, RetrievedChunk[]> = {};
    allowedSources.forEach((source) => {
      chunksBySource[source] = [];
    });

    allChunks.forEach((chunk) => {
      const source = chunk.metadata.source;
      if (source && chunksBySource[source]) {
        chunksBySource[source].push(chunk);
      }
    });

    // Balanced selection
    const selectedChunks: RetrievedChunk[] = [];
    const distribution: Record<string, number> = {};

    // Initialize distribution
    allowedSources.forEach((source) => {
      distribution[source] = 0;
    });

    // Round-robin selection to ensure balance
    let remainingSlots = totalChunks;
    let currentSourceIndex = 0;

    while (remainingSlots > 0 && selectedChunks.length < totalChunks) {
      let addedInThisRound = false;

      for (let i = 0; i < allowedSources.length && remainingSlots > 0; i++) {
        const sourceIndex = (currentSourceIndex + i) % allowedSources.length;
        const source = allowedSources[sourceIndex];
        const availableChunks = chunksBySource[source];
        const alreadySelected = distribution[source];

        if (
          alreadySelected < maxChunksPerDoc &&
          alreadySelected < availableChunks.length
        ) {
          const chunk = availableChunks[alreadySelected];
          selectedChunks.push(chunk);
          distribution[source]++;
          remainingSlots--;
          addedInThisRound = true;
        }
      }

      if (!addedInThisRound) {
        break; // No more chunks available from any source
      }

      currentSourceIndex = (currentSourceIndex + 1) % allowedSources.length;
    }

    return {
      chunks: selectedChunks,
      distribution,
      totalRetrieved: selectedChunks.length,
    };
  } catch (error) {
    console.error("Post-processed retrieval failed:", error);
    return { chunks: [], distribution: {}, totalRetrieved: 0 };
  }
}

function filterBySubjectAndSource(
  docs: any[],
  subjectFilter?: string,
  allowedSources?: string[]
): any[] {
  return docs.filter((d: any) => {
    const SUBJECT_METADATA_KEY = process.env.PINECONE_SUBJECT_KEY || "subject";

    const bySubject = subjectFilter
      ? (d.metadata?.[SUBJECT_METADATA_KEY] ?? "").toString().toLowerCase() ===
        subjectFilter.toLowerCase()
      : true;

    const bySource =
      allowedSources && allowedSources.length > 0
        ? allowedSources.includes((d.metadata?.source ?? "").toString())
        : true;

    return bySubject && bySource;
  });
}

function convertToRetrievedChunks(docs: any[]): RetrievedChunk[] {
  return docs.map((d: any) => ({
    pageContent: d.pageContent,
    metadata: d.metadata || {},
    score: d.score, // If available
  }));
}

/**
 * Formats the distribution information for logging/debugging
 */
export function formatDistributionLog(result: BalancedRetrievalResult): string {
  const { distribution, totalRetrieved } = result;
  const distributionStr = Object.entries(distribution)
    .map(([source, count]) => `${source}: ${count}`)
    .join(", ");
  return `Total: ${totalRetrieved} chunks [${distributionStr}]`;
}
