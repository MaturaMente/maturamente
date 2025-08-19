import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getExercisesData } from "@/utils/exercise-data";
import { ExercisesSkeleton } from "@/app/components/shared/loading";
import { auth } from "@/lib/auth";
import { connection } from "next/server";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

// Set revalidation period
export const revalidate = 3600;

interface EserciziPageProps {
  params: Promise<{
    "subject-slug": string;
  }>;
}

export default function EserciziPage({ params }: EserciziPageProps) {
  return (
    <Suspense fallback={<ExercisesSkeleton />}>
      <ExercisesContent params={params} />
    </Suspense>
  );
}

async function ExercisesContent({
  params,
}: {
  params: Promise<{ "subject-slug": string }>;
}) {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  const { "subject-slug": subjectSlug } = await params;

  if (!userId) {
    return (
      <div className="text-center p-10">
        <h2 className="text-2xl font-bold mb-4">Accesso negato</h2>
        <p>Devi effettuare il login per accedere a questa pagina.</p>
      </div>
    );
  }

  // Get exercise data - this will return either a redirect to the first topic
  // or indicate that there are no topics available
  const exercisesData = await getExercisesData();

  // If there's a first topic, redirect to it using the current subject slug
  if (exercisesData.firstTopic) {
    redirect(`/${subjectSlug}/esercizi/${exercisesData.firstTopic}`);
  }

  return (
    <div className="text-center p-10">
      <h1 className="text-2xl font-bold mb-4">Non sono presenti esercizi</h1>
      <p>Per ora non sono presenti esercizi. Per favore, torna più tardi.</p>
    </div>
  );
}
