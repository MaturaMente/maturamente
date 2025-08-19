import { notFound } from "next/navigation";
import ExerciseCardDetail from "@/app/components/subject/esercizi/exercise-card-detail";
import { Suspense } from "react";
import { ExercisesSkeleton } from "@/app/components/shared/loading";
import { auth } from "@/lib/auth";
import { getExerciseCardDataBySlug } from "@/utils/exercise-data";
import { connection } from "next/server";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

interface ExerciseCardPageProps {
  params: Promise<{
    "subject-slug": string;
    slug: string;
  }>;
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
