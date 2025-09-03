import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExerciseCardDetail from "@/app/components/subject/esercizi/exercise-card-detail";
import { Suspense } from "react";
import { ExercisesSkeleton } from "@/app/components/shared/loading";
import { auth } from "@/lib/auth";
import { getExerciseCardDataBySlug } from "@/utils/exercise-data";
import { connection } from "next/server";
import { db } from "@/db/drizzle";
import { exercisesCardsTable, subtopicsTable, topicsTable, subjectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

interface ExerciseCardPageProps {
  params: Promise<{
    "subject-slug": string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ExerciseCardPageProps): Promise<Metadata> {
  const { slug: cardSlug, "subject-slug": subjectSlug } = await params;

  try {
    // Fetch exercise card data for metadata
    const cardData = await db
      .select({
        card_description: exercisesCardsTable.description,
        card_difficulty: exercisesCardsTable.difficulty,
        subtopic_name: subtopicsTable.name,
        topic_name: topicsTable.name,
        subject_name: subjectsTable.name,
      })
      .from(exercisesCardsTable)
      .innerJoin(subtopicsTable, eq(exercisesCardsTable.subtopic_id, subtopicsTable.id))
      .innerJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
      .innerJoin(subjectsTable, eq(topicsTable.subject_id, subjectsTable.id))
      .where(eq(exercisesCardsTable.slug, cardSlug))
      .limit(1);

    const data = cardData[0];
    if (!data) {
      return {
        title: "Scheda Esercizi",
        description: "Scheda di esercizi interattivi per il consolidamento delle competenze scolastiche.",
      };
    }

    const difficultyText = data.card_difficulty === 1 ? "Base" : data.card_difficulty === 2 ? "Intermedio" : "Avanzato";
    const title = `${data.topic_name}: ${data.card_description}`;
    const description = `Scheda esercizi di ${data.subject_name} - ${data.topic_name}. Livello: ${difficultyText}. ${data.card_description} Migliora le tue competenze con esercizi graduali e feedback immediato.`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description: description.length > 160 ? description.substring(0, 157) + "..." : description,
      keywords: [
        `esercizi ${data.topic_name.toLowerCase()}`,
        `${data.subject_name.toLowerCase()} ${data.subtopic_name.toLowerCase()}`,
        `livello ${difficultyText.toLowerCase()}`,
        "scheda esercizi",
        "allenamento specifico",
        "practice questions",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        url: `/${subjectSlug}/esercizi/card/${cardSlug}`,
        type: "website",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `${data.topic_name}: ${data.card_description} | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}/esercizi/card/${cardSlug}`,
      },
      other: {
        "exercise:subject": data.subject_name,
        "exercise:topic": data.topic_name,
        "exercise:subtopic": data.subtopic_name,
        "exercise:difficulty": difficultyText,
        "exercise:type": "exercise_card",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for exercise card page:", error);
    return {
      title: "Scheda Esercizi",
      description: "Scheda di esercizi interattivi per il consolidamento delle competenze scolastiche.",
    };
  }
}

export default async function ExerciseCardPage({
  params,
}: ExerciseCardPageProps) {
  // Extract the slug and subject slug from params properly
  const { slug: cardSlug, "subject-slug": subjectSlug } = await params;

  return (
    <Suspense fallback={<ExercisesSkeleton />}>
      <ExerciseCardContent cardSlug={cardSlug} subjectSlug={subjectSlug} />
    </Suspense>
  );
}

async function ExerciseCardContent({
  cardSlug,
  subjectSlug,
}: {
  cardSlug: string;
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

  // Get all required data for the card detail page
  const cardData = await getExerciseCardDataBySlug(cardSlug, userId);

  if (!cardData) {
    notFound();
  }

  const { card, exercises, completedExercises, flaggedExercises } = cardData;

  return (
    <ExerciseCardDetail
      id={card.id}
      description={card.description}
      difficulty={card.difficulty}
      topicId={card.topicId}
      topicName={card.topicName}
      topicSlug={card.topicSlug}
      subtopicId={card.subtopicId}
      subtopicName={card.subtopicName}
      exercises={exercises}
      completedExercises={completedExercises}
      flaggedExercises={flaggedExercises}
      card={card}
      subjectSlug={subjectSlug}
    />
  );
}
