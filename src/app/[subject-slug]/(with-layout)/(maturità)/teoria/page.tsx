import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { subtopicsTable } from "@/db/schema";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TheorySkeleton } from "@/app/components/shared/loading";
import {
  getTopicsWithSubtopicsBySubjectId,
  getSubjectBySlug,
} from "@/utils/topics-subtopics-data";
import { getUserCompletionData } from "@/utils/theory";
import { getUserSubjectBySlug } from "@/utils/subjects-data";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { isUserOnFreeTrial } from "@/utils/free-trial-check";
import { FreeTrialCTA } from "@/app/components/shared/free-trial-cta";

// Generate dynamic metadata based on the subject
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}): Promise<Metadata> {
  const { "subject-slug": subjectSlug } = await params;

  return {
    title: "Teoria Matematica",
    description:
      "Sezione teoria completa per la maturità scientifica. Studia analisi matematica, limiti, derivate, integrali, studio di funzioni e geometria analitica con spiegazioni dettagliate ed esempi.",
    keywords: [
      "teoria matematica",
      "analisi matematica",
      "limiti funzioni",
      "derivate",
      "integrali",
      "studio di funzione",
      "continuità",
      "teoremi matematica",
      "maturità scientifica teoria",
    ],
    openGraph: {
      title: "Teoria Matematica | MaturaMente",
      description:
        "Sezione teoria completa per la maturità scientifica. Studia analisi matematica, limiti, derivate, integrali e studio di funzioni.",
      url: `/${subjectSlug}/teoria`,
    },
    twitter: {
      title: "Teoria Matematica | MaturaMente",
      description:
        "Sezione teoria completa per la maturità scientifica. Studia analisi matematica, limiti, derivate e integrali.",
    },
    alternates: {
      canonical: `/${subjectSlug}/teoria`,
    },
  };
}

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Configure for ISR with revalidation
export const revalidate = 3600; // 1 hour revalidation for theory topics

// Cached static data fetching function for topics by subject
const getCachedTopicsDataBySubject = (subjectId: string) => {
  return unstable_cache(
    async () => {
      try {
        const topicsWithSubtopics = await getTopicsWithSubtopicsBySubjectId(
          subjectId
        );
        return topicsWithSubtopics;
      } catch (error) {
        console.error("Error fetching cached topics data for subject:", error);
        return [];
      }
    },
    [`theory-topics-data-${subjectId}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: ["topics", "theory", `subject-${subjectId}`],
    }
  );
};

interface PageProps {
  params: Promise<{ "subject-slug": string }>;
}

export default function TheoryPageWrapper({ params }: PageProps) {
  return (
    <Suspense fallback={<TheorySkeleton />}>
      <TheoryPage params={params} />
    </Suspense>
  );
}

async function TheoryPage({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}) {
  // Get subject slug from params
  const { "subject-slug": subjectSlug } = await params;

  // Check if user is authenticated
  const authenticated = await isAuthenticated();

  // Get subject data - try authenticated version first, then fallback to public
  let subject;
  if (authenticated) {
    const userId = await getCurrentUserIdOptional();
    if (userId) {
      subject = await getUserSubjectBySlug(userId, subjectSlug);
    }
  }

  // If no subject found via user route, try public route
  if (!subject) {
    subject = await getSubjectBySlug(subjectSlug);
  }

  if (!subject) {
    redirect("/dashboard");
  }

  // Get cached topics data for this subject
  const getCachedTopicsData = getCachedTopicsDataBySubject(subject.id);
  const allTopics = await getCachedTopicsData();

  if (allTopics.length === 0) {
    // If no topics exist, create a placeholder message
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Teoria</h1>
        <p className="text-muted-foreground">
          Non ci sono ancora argomenti disponibili per questa materia.
        </p>
      </div>
    );
  }

  if (!authenticated) {
    // For unauthenticated users, redirect to the first topic
    redirect(`/${subjectSlug}/teoria/${allTopics[0].slug}`);
  }

  // Check if user is on free trial first
  const isFreeTrial = await isUserOnFreeTrial();
  
  if (isFreeTrial) {
    return (
      <FreeTrialCTA 
        title="Teoria Maturità - Premium"
        description="La sezione Teoria per la Maturità è disponibile solo con il piano Premium. Passa al piano completo per accedere a tutti gli argomenti di teoria."
      />
    );
  }

  // Get user from headers (set by middleware) - only for authenticated users
  const userId = await getCurrentUserIdOptional();

  if (!userId) {
    // Fallback to first topic if user ID is not available
    redirect(`/${subjectSlug}/teoria/${allTopics[0].slug}`);
  }

  // Use cached completion data
  const { completedTopicIds, completedSubtopicIds } =
    await getUserCompletionData(userId);

  // Find first uncompleted topic
  const firstUncompletedTopic = allTopics.find(
    (topic) => !completedTopicIds.includes(topic.id)
  );

  // Determine redirect URL based on completion status
  let redirectUrl: string;

  if (firstUncompletedTopic) {
    // Get all subtopics for this topic
    const subtopics = await db
      .select()
      .from(subtopicsTable)
      .where(eq(subtopicsTable.topic_id, firstUncompletedTopic.id))
      .orderBy(subtopicsTable.order_index);

    // Find first uncompleted subtopic
    const firstUncompletedSubtopic = subtopics.find(
      (subtopic) => !completedSubtopicIds.includes(subtopic.id)
    );

    if (firstUncompletedSubtopic) {
      // Redirect to uncompleted subtopic
      redirectUrl = `/${subjectSlug}/teoria/${firstUncompletedTopic.slug}?subtopic=${firstUncompletedSubtopic.slug}`;
    } else {
      // All subtopics completed but topic isn't, redirect to topic
      redirectUrl = `/${subjectSlug}/teoria/${firstUncompletedTopic.slug}`;
    }
  } else {
    // All topics completed, redirect to first topic
    redirectUrl = `/${subjectSlug}/teoria/${allTopics[0].slug}`;
  }

  // Perform single redirect to prevent race conditions
  redirect(redirectUrl);
}
