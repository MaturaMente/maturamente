import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    data?: any;
    body?: any;
  };
  const { messages } = body;

  // subject can arrive via header or request body
  const subjectFromHeader = req.headers.get("x-subject") ?? undefined;
  const subject: string | undefined =
    subjectFromHeader ??
    body?.data?.subject ??
    body?.body?.subject ??
    undefined;

  // optional list of selected note slugs for targeted retrieval
  // Prefer extracting from the latest user message metadata so it also works with regenerate()
  let selectedNoteSlugs: string[] | undefined = undefined;
  try {
    const lastUserWithMeta = [...(body?.messages || [])]
      .reverse()
      .find((m: any) => m?.role === "user" && (m as any)?.metadata);
    const meta: any = (lastUserWithMeta as any)?.metadata || undefined;
    if (meta && Array.isArray(meta.selectedNoteSlugs)) {
      selectedNoteSlugs = meta.selectedNoteSlugs as string[];
    }
  } catch {}

  // Keep a short-term history so the model has immediate context without
  // sending the entire conversation every time.
  const SHORT_HISTORY_LIMIT = 12;
  const recentMessages = messages.slice(-SHORT_HISTORY_LIMIT);

  // Build a query from the latest user message
  const lastUser = [...recentMessages].reverse().find((m) => m.role === "user");
  const lastUserQuery = lastUser
    ? lastUser.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ")
    : "";

  // RAG
  let contextText = "";
  try {
    const shouldUseRag =
      Array.isArray(selectedNoteSlugs) && selectedNoteSlugs.length > 0;
    if (
      shouldUseRag &&
      process.env.PINECONE_API_KEY &&
      process.env.HUGGINGFACEHUB_API_KEY &&
      lastUserQuery
    ) {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const indexName = process.env.PINECONE_INDEX_NAME || "rag-test";
      const index = pinecone.Index(indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(
        new HuggingFaceInferenceEmbeddings({
          apiKey: process.env.HUGGINGFACEHUB_API_KEY,
          model: "BAAI/bge-base-en-v1.5",
        }),
        { pineconeIndex: index }
      );

      const SUBJECT_METADATA_KEY =
        process.env.PINECONE_SUBJECT_KEY || "subject";

      // To avoid API incompatibilities, do not use server-side subject filters.
      // Only include a source $in filter if present; otherwise pass no filter.
      const filter =
        selectedNoteSlugs && selectedNoteSlugs.length > 0
          ? { source: { $in: selectedNoteSlugs.map((s) => `${s}.pdf`) } }
          : undefined;
      let docs: any[] = [];
      try {
        // Pass the filter directly (LangChain's PineconeStore expects the filter object as the 3rd arg)
        docs = await vectorStore.similaritySearch(lastUserQuery, 6, filter);
      } catch (filterErr) {
        console.error(
          "Pinecone filtered search failed, retrying without filter",
          filterErr
        );
        // Retry without filter to avoid hard failures during debugging
        docs = await vectorStore.similaritySearch(lastUserQuery, 6);
      }
      console.log("RAG query", {
        index: indexName,
        subject,
        filter,
        k: 6,
        returned: docs?.length,
      });
      if (docs?.[0]?.metadata) {
        console.log("RAG first doc metadata", docs[0].metadata);
      }
      // Hard filter by subject and selected sources in case the vector store or index ignores/loosens the server-side filter
      const subjectLower = subject?.toLowerCase();
      const allowedSources = (selectedNoteSlugs || []).map((s) => `${s}.pdf`);
      const filteredDocs = docs.filter((d: any) => {
        const bySubject = subjectLower
          ? (d.metadata?.[SUBJECT_METADATA_KEY] ?? "")
              .toString()
              .toLowerCase() === subjectLower
          : true;
        const bySource = allowedSources.length
          ? allowedSources.includes((d.metadata?.source ?? "").toString())
          : true;
        return bySubject && bySource;
      });
      contextText = filteredDocs.map((d: any) => d.pageContent).join("\n---\n");
    }
  } catch (err) {
    // If retrieval fails, continue without context
    console.error("RAG retrieval failed", err);
  }

  const systemPrompt =
    `Sei un tutor amichevole e competente. Rispondi SEMPRE in italiano.
Se disponibili, usa le informazioni pertinenti dal seguente contesto per rispondere in modo accurato.
Se il contesto non contiene informazioni utili, rispondi basandoti sulla tua conoscenza generale e dichiara chiaramente che la risposta è basata sulla tua conoscenza.
${subject ? `Soggetto corrente: ${subject}` : ""}

Contesto (potrebbe essere vuoto):\n${contextText}`.trim();

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: systemPrompt,
    messages: convertToModelMessages(recentMessages),
  });

  return result.toUIMessageStreamResponse();
}
