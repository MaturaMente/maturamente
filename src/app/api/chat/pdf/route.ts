import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, UIMessage, consumeStream } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { auth } from "@/lib/auth";
import { checkBudgetAvailability, recordAIUsage } from "@/utils/ai-budget/budget-management";
import { getSubscriptionStatus } from "@/utils/subscription-utils";
import { db } from "@/db/drizzle";
import { notesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Allow longer streaming; remove 30s cap
export const maxDuration = 300;

export async function POST(req: Request) {
  // Get user session
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check AI budget availability before processing
  const hasBudget = await checkBudgetAvailability(userId);
  if (!hasBudget) {
    const sub = await getSubscriptionStatus(userId);
    const cta = sub?.isFreeTrial ? {
      title: "Prova gratuita terminata",
      message: "Hai esaurito il credito AI della prova gratuita. Passa al piano premium per continuare.",
      upgradeUrl: "/pricing"
    } : undefined;
    return Response.json({ 
      error: "Budget AI esaurito per questo mese. Il tuo budget si rinnoverà con il prossimo periodo di fatturazione.",
      cta
    }, { status: 429 });
  }

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

  // If user is on free trial and the note is not marked for free trial, block chat
  try {
    const sub = await getSubscriptionStatus(userId);
    const isTrial = !!(sub?.isFreeTrial && sub?.isActive);
    if (isTrial && noteSlug) {
      const noteRows = await db
        .select({ free_trial: notesTable.free_trial })
        .from(notesTable)
        .where(eq(notesTable.slug, noteSlug))
        .limit(1);
      const isNoteFree = noteRows[0]?.free_trial === true;
      if (!isNoteFree) {
        return Response.json(
          {
            error:
              "Questa chat AI non è disponibile nella prova gratuita per questo appunto.",
            cta: {
              title: "Sblocca la chat AI",
              message:
                "Attiva il piano Premium per usare la chat AI su tutti gli appunti.",
              upgradeUrl: "/pricing",
            },
          },
          { status: 403 }
        );
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
    onFinish: async (finishResult) => {
      // Record AI usage after completion
      if (finishResult.usage && userId) {
        // DeepSeek uses inputTokens/outputTokens instead of promptTokens/completionTokens
        const inputTokens = finishResult.usage.inputTokens || 0;
        const outputTokens = finishResult.usage.outputTokens || 0;
        const cachedTokens = finishResult.usage.cachedInputTokens || 0;
        
        await recordAIUsage(
          userId,
          inputTokens,
          outputTokens,
          'pdf',
          'deepseek-chat',
          cachedTokens
        );
      }
    },
  });

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
  });
}
