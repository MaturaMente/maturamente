import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, UIMessage, consumeStream } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import {
  balancedSimilaritySearch,
  formatDistributionLog,
} from "@/utils/chat/balanced-rag-retrieval";
import { auth } from "@/lib/auth";
import { searchUserFiles } from "@/utils/files/pinecone-storage";
import { checkBudgetAvailability, recordAIUsage } from "@/utils/ai-budget/budget-management";
import { getSubscriptionStatus } from "@/utils/subscription-utils";

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

  // optional list of selected note slugs for targeted retrieval
  // Prefer extracting from the latest user message metadata so it also works with regenerate()
  let selectedNoteSlugs: string[] | undefined = undefined;
  let selectedFileSources: string[] | undefined = undefined;
  try {
    const lastUserWithMeta = [...(body?.messages || [])]
      .reverse()
      .find((m: any) => m?.role === "user" && (m as any)?.metadata);
    const meta: any = (lastUserWithMeta as any)?.metadata || undefined;
    if (meta && Array.isArray(meta.selectedNoteSlugs)) {
      selectedNoteSlugs = meta.selectedNoteSlugs as string[];
    }
    if (meta && Array.isArray(meta.selectedFileSources)) {
      selectedFileSources = meta.selectedFileSources as string[];
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
      (Array.isArray(selectedNoteSlugs) && selectedNoteSlugs.length > 0) ||
      (Array.isArray(selectedFileSources) && selectedFileSources.length > 0);
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

      // For dashboard chat, we allow documents from any subject since the user
      // can select notes from multiple subjects and uploaded files
      // Build filter for both notes and user files
      let allSources: string[] = [];
      if (selectedNoteSlugs && selectedNoteSlugs.length > 0) {
        allSources.push(...selectedNoteSlugs.map((s) => `${s}.pdf`));
      }
      if (selectedFileSources && selectedFileSources.length > 0) {
        allSources.push(...selectedFileSources);
      }

      const filter =
        allSources.length > 0 ? { source: { $in: allSources } } : undefined;
      try {
        // Use balanced retrieval for multi-document queries across subjects and user files
        const allSelectedSources = [
          ...(selectedNoteSlugs || []),
          ...(selectedFileSources || []),
        ];

        // Create flag array to identify user files vs note slugs
        const isUserFileFlags = [
          ...Array(selectedNoteSlugs?.length || 0).fill(false), // Note slugs = false
          ...Array(selectedFileSources?.length || 0).fill(true), // User files = true
        ];

        const balancedResult = await balancedSimilaritySearch(
          vectorStore,
          lastUserQuery,
          allSelectedSources,
          {
            totalChunks: 16,
            minChunksPerDoc: 1,
            maxChunksPerDoc: 4,
            enforceDistribution: true,
          },
          undefined, // no subject filter for dashboard
          isUserFileFlags
        );

        console.log(
          "Dashboard balanced RAG:",
          formatDistributionLog(balancedResult)
        );
        console.log("RAG query", {
          index: indexName,
          selectedNotes: selectedNoteSlugs?.length || 0,
          selectedFiles: selectedFileSources?.length || 0,
          totalSelected: allSelectedSources.length,
          totalRetrieved: balancedResult.totalRetrieved,
        });

        contextText = balancedResult.chunks
          .map((chunk) => chunk.pageContent)
          .join("\n---\n");
      } catch (balancedErr) {
        console.error(
          "Balanced retrieval failed, falling back to standard retrieval",
          balancedErr
        );

        // Fallback to original method
        let docs: any[] = [];
        try {
          docs = await vectorStore.similaritySearch(lastUserQuery, 6, filter);
        } catch (filterErr) {
          console.error(
            "Pinecone filtered search failed, retrying without filter",
            filterErr
          );
          docs = await vectorStore.similaritySearch(lastUserQuery, 6);
        }

        // Hard filter by selected sources (both notes and user files)
        const filteredDocs = docs.filter((d: any) => {
          const source = (d.metadata?.source ?? "").toString();
          const bySource = allSources.length
            ? allSources.includes(source)
            : true;
          return bySource;
        });
        contextText = filteredDocs
          .map((d: any) => d.pageContent)
          .join("\n---\n");
      }
    }
  } catch (err) {
    // If retrieval fails, continue without context
    console.error("RAG retrieval failed", err);
  }

  const systemPrompt =
    `Ti chiami Pit (Personal Intelligent Tutor): un tutor empatico, chiaro e competente.

    Rispondi SEMPRE in italiano, in modo conciso ma completo. Parla come un tutor umano: incoraggiante, rispettoso e focalizzato sugli obiettivi dello studente.

    Linee guida fondamentali:
      1. Dai priorità assoluta alle informazioni contenute nei documenti forniti (appunti PDF e file caricati dall'utente).
      2. Quando possibile, indica da quale documento e pagina/sezione proviene l'informazione.
      3. Se più documenti trattano lo stesso argomento, integra le informazioni in un'unica risposta coerente.
      4. Mantieni le risposte ancorate ai documenti: non inventare contenuti assenti.
      5. Se i documenti non bastano, dichiaralo e aggiungi (se appropriato) una sezione "Conoscenza generale" separata.
      6. Preferisci strutture leggibili: brevi paragrafi, elenchi puntati, esempi semplici, analogie.
      7. Alla fine, proponi sempre un piccolo passo successivo ("Prossimo passo suggerito").

    Contesto estratto dai documenti selezionati (bilanciato):\n${contextText}`.trim();

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
          'dashboard',
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
