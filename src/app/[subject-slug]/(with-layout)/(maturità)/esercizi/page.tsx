import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getExercisesData } from "@/utils/exercise-data";
import { ExercisesSkeleton } from "@/app/components/shared/loading";
import { auth } from "@/lib/auth";
import { connection } from "next/server";
import { db } from "@/db/drizzle";
import { subjectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

// Set revalidation period
export const revalidate = 3600;

interface EserciziPageProps {
  params: Promise<{
    "subject-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: EserciziPageProps): Promise<Metadata> {
  const { "subject-slug": subjectSlug } = await params;

  try {
    // Fetch subject data for metadata
    const subjectData = await db
      .select({
        name: subjectsTable.name,
        description: subjectsTable.description,
      })
      .from(subjectsTable)
      .where(eq(subjectsTable.slug, subjectSlug))
      .limit(1);

    const subject = subjectData[0];
    if (!subject) {
      return {
        title: "Esercizi",
        description: "Esercizi interattivi per il consolidamento delle competenze scolastiche su MaturaMente.",
      };
    }

    const title = `Esercizi di ${subject.name}`;
    const description = `Risolvi esercizi interattivi di ${subject.name} su MaturaMente. Migliora le tue competenze con esercizi graduali, spiegazioni dettagliate e feedback immediato per tutti gli anni di liceo.`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description: description.length > 160 ? description.substring(0, 157) + "..." : description,
      keywords: [
        `esercizi ${subject.name.toLowerCase()}`,
        `problemi ${subject.name.toLowerCase()}`,
        "esercizi interattivi",
        "practice questions",
        "allenamento scolastico",
        "consolidamento competenze",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        url: `/${subjectSlug}/esercizi`,
        type: "website",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `Esercizi di ${subject.name} | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}/esercizi`,
      },
      other: {
        "exercise:subject": subject.name,
        "exercise:type": "interactive",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for exercises page:", error);
    return {
      title: "Esercizi",
      description: "Esercizi interattivi per il consolidamento delle competenze scolastiche.",
    };
  }
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
