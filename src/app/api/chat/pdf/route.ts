import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

// Allow longer streaming; remove 30s cap
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    data?: any;
    body?: any;
  };
  const { messages } = body;

  // Subject and note slug can arrive via headers or request body/metadata
  const subjectFromHeader = req.headers.get("x-subject") ?? undefined;
  const subject: string | undefined =
    subjectFromHeader ??
    body?.data?.subject ??
    body?.body?.subject ??
    undefined;

  const noteSlugFromHeader = req.headers.get("x-note-slug") ?? undefined;

  // Extract a single note slug from the latest user message metadata; fall back to header
  let noteSlug: string | undefined = noteSlugFromHeader;
  try {
    const lastUserWithMeta = [...(body?.messages || [])]
      .reverse()
      .find((m: any) => m?.role === "user" && (m as any)?.metadata);
    const meta: any = (lastUserWithMeta as any)?.metadata || undefined;
    if (!noteSlug && meta) {
      if (typeof meta.noteSlug === "string" && meta.noteSlug.length > 0) {
        noteSlug = meta.noteSlug;
      } else if (
        Array.isArray(meta.selectedNoteSlugs) &&
        meta.selectedNoteSlugs.length > 0
      ) {
        noteSlug = meta.selectedNoteSlugs[0];
      }
    }
  } catch {}

  // Keep a short-term history
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

  // RAG strictly scoped to the single note
  let contextText = "";
  try {
    const shouldUseRag = typeof noteSlug === "string" && noteSlug.length > 0;
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

      const allowedSources = noteSlug ? [`${noteSlug}.pdf`] : [];
      const filter = allowedSources.length
        ? { source: { $in: allowedSources } }
        : undefined;

      let docs: any[] = [];
      try {
        docs = await vectorStore.similaritySearch(lastUserQuery, 8, filter);
      } catch (filterErr) {
        console.error(
          "Pinecone filtered search failed, retrying without filter",
          filterErr
        );
        docs = await vectorStore.similaritySearch(lastUserQuery, 8);
      }

      // Hard filter by subject and exact source in case the vector store ignores the server-side filter
      const subjectLower = subject?.toLowerCase();
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
    console.error("PDF chat RAG retrieval failed", err);
  }

  const systemPrompt =
    `Sei un tutor intelligente che aiuta lo studente a comprendere i contenuti di un PDF. 
    Rispondi SEMPRE in italiano. 
    
    Regole fondamentali:
      1. Usa esclusivamente le informazioni contenute nel PDF fornito come fonte principale. 
      2. Cita sempre i passaggi rilevanti (tra virgolette) o indica sezione/pagina quando possibile. 
      3. Mantieni le risposte ancorate al testo: non inventare contenuti che non sono presenti nel documento. 
      4. Se devi aggiungere conoscenze esterne, dichiaralo chiaramente in una sezione separata chiamata "Conoscenza generale". 
      5. Se il PDF non contiene informazioni sufficienti, dillo esplicitamente e, se utile, suggerisci allo studente dove potrebbe cercare (es. sezioni, parole chiave, indice). 
      6. Le spiegazioni devono essere semplici e adatte a studenti delle superiori. 

    Contesto: il modello riceve estratti dal PDF, che possono essere incompleti. 
    ${subject ? `Materia: ${subject}` : ""}
    ${noteSlug ? `Documento: ${noteSlug}` : ""}

    Estratto dal PDF:\n${contextText}`.trim();

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: systemPrompt,
    messages: convertToModelMessages(recentMessages),
  });

  return result.toUIMessageStreamResponse();
}
