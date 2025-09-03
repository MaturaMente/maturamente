import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicExercisesPage } from "@/app/components/subject/esercizi/exercises-page";
import { Suspense } from "react";
import { ExercisesSkeleton } from "@/app/components/shared/loading";
import { auth } from "@/lib/auth";
import { connection } from "next/server";
import {
  getAllTopics,
  getTopicsWithSubtopics,
  getSubtopicsByTopic,
  getSubjectBySlug,
} from "@/utils/topics-subtopics-data";
import {
  getExerciseCardsWithCompletion,
  getFavoriteExerciseCardsForTopic,
} from "@/utils/exercise-data";
import { db } from "@/db/drizzle";
import { topicsTable, subjectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ExercisesTopicPageProps {
  params: Promise<{
    "subject-slug": string;
    topic: string;
  }>;
  searchParams: Promise<{
    subtopic?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ExercisesTopicPageProps): Promise<Metadata> {
  const { topic: topicSlug, "subject-slug": subjectSlug } = await params;

  try {
    // Fetch topic and subject data for metadata
    const topicData = await db
      .select({
        topic_name: topicsTable.name,
        topic_description: topicsTable.description,
        subject_name: subjectsTable.name,
        subject_description: subjectsTable.description,
      })
      .from(topicsTable)
      .innerJoin(subjectsTable, eq(topicsTable.subject_id, subjectsTable.id))
      .where(eq(topicsTable.slug, topicSlug))
      .limit(1);

    const data = topicData[0];
    if (!data) {
      return {
        title: "Esercizi per Argomento",
        description: "Esercizi organizzati per argomento per il consolidamento delle competenze scolastiche.",
      };
    }

    const title = `Esercizi: ${data.topic_name} - ${data.subject_name}`;
    const description = `Esercizi di ${data.topic_name} per ${data.subject_name}. ${data.topic_description} Allenati con problemi graduali e feedback immediato per consolidare le tue competenze.`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description: description.length > 160 ? description.substring(0, 157) + "..." : description,
      keywords: [
        `esercizi ${data.topic_name.toLowerCase()}`,
        `${data.subject_name.toLowerCase()} ${data.topic_name.toLowerCase()}`,
        "esercizi per argomento",
        "allenamento specifico",
        "practice questions",
        "consolidamento competenze",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        url: `/${subjectSlug}/esercizi/${topicSlug}`,
        type: "website",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `Esercizi: ${data.topic_name} - ${data.subject_name} | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}/esercizi/${topicSlug}`,
      },
      other: {
        "exercise:subject": data.subject_name,
        "exercise:topic": data.topic_name,
        "exercise:type": "topic_specific",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for topic exercises page:", error);
    return {
      title: "Esercizi per Argomento",
      description: "Esercizi organizzati per argomento per il consolidamento delle competenze scolastiche.",
    };
  }
}

// Generate static params for all topics - this enables static generation
export async function generateStaticParams() {
  const topics = await getAllTopics();
  return topics.map((topic) => ({ topic: topic.slug }));
}

export default async function ExercisesTopicPage({
  params,
  searchParams,
}: ExercisesTopicPageProps) {
  // Extract the topic slug and subject slug from params properly
  const { topic: topicSlug, "subject-slug": subjectSlug } = await params;
  const { subtopic: subtopicSlug } = await searchParams;

  return (
    <Suspense fallback={<ExercisesSkeleton />}>
      <ExercisesTopicContent
        topicSlug={topicSlug}
        subtopicSlug={subtopicSlug}
        subjectSlug={subjectSlug}
      />
    </Suspense>
  );
}

async function ExercisesTopicContent({
  topicSlug,
  subtopicSlug,
  subjectSlug,
}: {
  topicSlug: string;
  subtopicSlug?: string;
  subjectSlug: string;
}) {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="text-center p-10">
        <h2 className="text-2xl font-bold mb-4">Accesso negato</h2>
        <p>Devi effettuare il login per accedere a questa pagina.</p>
      </div>
    );
  }

  // Get all topics with their subtopics
  const topicsWithSubtopics = await getTopicsWithSubtopics();

  // Find the current topic by slug
  const currentTopic = topicsWithSubtopics.find(
    (topic) => topic.slug === topicSlug
  );

  if (!currentTopic) {
    notFound();
  }

  // Get subject data for color theming
  const subject = await getSubjectBySlug(subjectSlug);

  if (!subject) {
    notFound();
  }

  // Get subtopics for this topic using the topic ID
  const subtopics = await getSubtopicsByTopic(currentTopic.id);

  // Get favorite exercise cards for this topic
  const favoriteExerciseCards = await getFavoriteExerciseCardsForTopic(
    userId,
    currentTopic.id
  );

  // Find the active subtopic ID from the slug (if provided)
  const activeSubtopicId = subtopicSlug
    ? subtopics.find((sub) => sub.slug === subtopicSlug)?.id
    : undefined;

  if (!subtopics.length) {
    // No subtopics found for this topic
    return (
      <TopicExercisesPage
        currentTopic={currentTopic}
        topicsWithSubtopics={topicsWithSubtopics}
        subtopicsWithExercises={[]}
        favoriteExerciseCards={favoriteExerciseCards}
        subjectColor={subject.color}
        activeSubtopicId={activeSubtopicId}
        userId={userId}
        subjectSlug={subjectSlug}
      />
    );
  }

  // Get exercise cards with completion information for all subtopics
  const subtopicIds = subtopics.map((subtopic) => subtopic.id);
  const exerciseCards = await getExerciseCardsWithCompletion(
    subtopicIds,
    userId
  );

  // Group exercise cards by subtopic
  const subtopicsWithExercises = subtopics.map((subtopic) => {
    const cardsForSubtopic = exerciseCards.filter(
      (card) => card.subtopic_id === subtopic.id
    );

    return {
      id: subtopic.id,
      name: subtopic.name,
      order_index: subtopic.order_index,
      topic_id: subtopic.topic_id,
      slug: subtopic.slug,
      exercise_cards: cardsForSubtopic.map((card) => ({
        id: card.id,
        subtopic_id: card.subtopic_id,
        description: card.description || "",
        difficulty: card.difficulty,
        is_completed: card.is_completed,
        total_exercises: card.total_exercises,
        completed_exercises: card.completed_exercises,
        is_flagged: card.is_flagged,
        slug: card.slug,
      })),
    };
  });

  return (
    <TopicExercisesPage
      currentTopic={currentTopic}
      topicsWithSubtopics={topicsWithSubtopics}
      subtopicsWithExercises={subtopicsWithExercises}
      favoriteExerciseCards={favoriteExerciseCards}
      subjectColor={subject.color}
      activeSubtopicId={activeSubtopicId}
      userId={userId}
      subjectSlug={subjectSlug}
    />
  );
}
