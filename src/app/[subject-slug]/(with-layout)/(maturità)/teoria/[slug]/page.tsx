import type { Metadata } from "next";
import TheoryPage from "@/app/components/subject/teoria/theory-layout";
import {
  getCurrentUserIdOptional,
  isAuthenticated,
} from "@/utils/user-context";
import {
  getTopicsWithSubtopics,
  getAllTopics,
  getSubtopicsByTopic,
  getCompletedTopics,
  getCompletedSubtopics,
} from "@/utils/topics-subtopics-data";
import { getTheoryContent } from "@/utils/theory";
import { SubtopicWithTheoryType } from "@/types/theoryTypes";
import { TopicType, TopicWithSubtopicsType } from "@/types/topicsTypes";
import { unstable_cache } from "next/cache";

// Generate dynamic metadata based on the theory topic
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug": string; slug: string }>;
}): Promise<Metadata> {
  try {
    const { "subject-slug": subjectSlug, slug } = await params;
    const allTopics = await getAllTopics();
    const currentTopic = allTopics.find((t) => t.slug === slug);

    if (!currentTopic) {
      return {
        title: "Argomento Non Trovato",
        description: "L'argomento di teoria richiesto non è stato trovato.",
      };
    }

    const topicTitle = currentTopic.name;
    const topicDescription =
      currentTopic.description ||
      `Studia ${currentTopic.name} con teoria completa, esempi dettagliati e esercizi per la maturità scientifica.`;

    return {
      title: topicTitle,
      description: topicDescription,
      keywords: [
        currentTopic.name.toLowerCase(),
        "teoria matematica",
        "maturità scientifica",
        "analisi matematica",
        "spiegazione dettagliata",
        "esempi pratici",
        "studio teoria",
      ],
      openGraph: {
        title: `${topicTitle} | Teoria | MaturaMente`,
        description: topicDescription,
        url: `/${subjectSlug}/teoria/${slug}`,
        type: "article",
      },
      twitter: {
        title: `${topicTitle} | Teoria | MaturaMente`,
        description: topicDescription,
      },
      alternates: {
        canonical: `/${subjectSlug}/teoria/${slug}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for theory topic:", error);
    return {
      title: "Teoria Matematica",
      description:
        "Studia teoria matematica per la maturità scientifica su MaturaMente.",
    };
  }
}

// Force dynamic rendering since we use headers() through getCurrentUserId()
export const dynamic = "force-dynamic";

// Configure for ISR (Incremental Static Regeneration)
export const revalidate = 3600; // Revalidate every hour for static content

// Allow dynamic routes not captured by generateStaticParams
export const dynamicParams = true;

// Generate static params for all topics at build time
export async function generateStaticParams() {
  try {
    const allTopics = await getAllTopics();

    // Generate static params for all topics
    return allTopics.map((topic) => ({
      slug: topic.slug,
    }));
  } catch (error) {
    console.error("Error generating static params for theory:", error);
    return [];
  }
}

// Cached static data fetching function
const getCachedTopicData = unstable_cache(
  async (slug: string) => {
    try {
      // 1. Fetch all topics and find the current one
      const allTopics = await getAllTopics();
      const currentTopic = allTopics.find((t) => t.slug === slug);

      if (!currentTopic) {
        throw new Error(`Topic with slug ${slug} not found`);
      }

      // 2. Get topics with subtopics for navigation
      const topicsWithSubtopics = await getTopicsWithSubtopics();

      // 3. Get subtopics for the current topic
      const allSubtopics = await getSubtopicsByTopic(currentTopic.id);

      // 4. Get theory content for all subtopics
      const theoryContentPromises = allSubtopics.map((subtopic) =>
        getTheoryContent(subtopic.id)
      );
      const theoryContentBySubtopic = await Promise.all(theoryContentPromises);

      // 5. Filter out null subtopic_ids in theory content
      const validTheoryContent = theoryContentBySubtopic
        .flat()
        .filter((item) => item.subtopic_id !== null);

      // 6. Combine subtopics with theory content and exercise cards
      const subtopicsWithTheory = allSubtopics.map((s) => ({
        ...s,
        theory: validTheoryContent.filter((t) => t.subtopic_id === s.id),
        exercise_cards: [],
      })) as SubtopicWithTheoryType[];

      // Return static data that can be cached
      return {
        currentTopic: currentTopic as TopicType,
        topicsWithSubtopics: topicsWithSubtopics as TopicWithSubtopicsType[],
        subtopicsWithTheory,
      };
    } catch (error) {
      console.error("Error fetching cached topic data:", error);
      throw error;
    }
  },
  ["theory-topic-data"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["theory", "topics"],
  }
);

interface PageProps {
  params: Promise<{
    "subject-slug": string;
    slug: string;
  }>;
}

export default async function TopicPage({ params }: PageProps) {
  // Extract the slug from params
  const { slug } = await params;

  // Check authentication and get user ID if available
  const authenticated = await isAuthenticated();
  const userId = authenticated ? await getCurrentUserIdOptional() : null;

  // Fetch cached static data
  const staticData = await getCachedTopicData(slug);

  // Fetch completion data if user is authenticated
  let completedTopicIds: string[] = [];
  let completedSubtopicIds: string[] = [];

  if (authenticated && userId) {
    const completedTopics = await getCompletedTopics(userId);
    const completedSubtopics = await getCompletedSubtopics(userId);

    // Create a list of completed topics and subtopics IDs, filtering out any null values
    completedTopicIds = completedTopics
      .map((t) => t.topic_id)
      .filter((id): id is string => id !== null);

    completedSubtopicIds = completedSubtopics
      .map((s) => s.subtopic_id)
      .filter((id): id is string => id !== null);
  }

  // Render with both static and dynamic data
  // The TheoryPage component will handle client-side completion state
  return (
    <TheoryPage
      currentTopic={staticData.currentTopic}
      topicsWithSubtopics={staticData.topicsWithSubtopics}
      subtopicsWithTheory={staticData.subtopicsWithTheory}
      topics={staticData.topicsWithSubtopics}
      initialCompletedTopics={completedTopicIds}
      initialCompletedSubtopics={completedSubtopicIds}
      userId={userId}
      isAuthenticated={authenticated}
    />
  );
}
