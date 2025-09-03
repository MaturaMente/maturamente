import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotesDataServer } from "@/app/components/subject/notes/notes-data-server";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db/drizzle";
import { subjectsTable, notesTable } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { CourseStructuredData, LearningResourceStructuredData } from "@/app/components/shared/seo/structured-data";

interface SubjectPageProps {
  params: Promise<{
    "subject-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: SubjectPageProps): Promise<Metadata> {
  const { "subject-slug": subjectSlug } = await params;

  try {
    // Fetch subject data with note count for metadata
    const subjectData = await db
      .select({
        id: subjectsTable.id,
        name: subjectsTable.name,
        description: subjectsTable.description,
        slug: subjectsTable.slug,
        notes_count: count(notesTable.id),
      })
      .from(subjectsTable)
      .leftJoin(notesTable, eq(subjectsTable.id, notesTable.subject_id))
      .where(eq(subjectsTable.slug, subjectSlug))
      .groupBy(
        subjectsTable.id,
        subjectsTable.name,
        subjectsTable.description,
        subjectsTable.slug
      )
      .limit(1);

    if (!subjectData[0]) {
      return {
        title: "Materia non trovata",
        description: "La materia richiesta non è stata trovata su MaturaMente.",
      };
    }

    const subject = subjectData[0];
    const notesCount = subject.notes_count || 0;

    const title = `${subject.name} - Appunti e Teoria`;
    const description = `Scopri gli appunti di ${subject.name} su MaturaMente. ${notesCount} appunti disponibili per studenti di scuole superiori. ${subject.description} Dalla prima alla quinta superiore, inclusa preparazione maturità.`;

    return {
      title,
      description: description.length > 160 ? description.substring(0, 157) + "..." : description,
      keywords: [
        `${subject.name.toLowerCase()}`,
        `appunti ${subject.name.toLowerCase()}`,
        `teoria ${subject.name.toLowerCase()}`,
        `${subject.name.toLowerCase()} superiori`,
        `scuola superiore ${subject.name.toLowerCase()}`,
        "supporto scolastico",
        "aiuto compiti",
        "preparazione esame",
        "maturità",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        url: `/${subjectSlug}`,
        type: "website",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `${subject.name} - Appunti e Teoria | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}`,
      },
      other: {
        "subject:name": subject.name,
        "subject:notes_count": notesCount.toString(),
      },
    };
  } catch (error) {
    console.error("Error generating metadata for subject page:", error);
    return {
      title: "Errore - MaturaMente",
      description: "Si è verificato un errore durante il caricamento della materia.",
    };
  }
}

function NotesLoadingSkeleton() {
  return (
    <div className="space-y-8 opacity">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <Skeleton className="h-9 w-48" />
          <div className="relative w-full sm:max-w-xs">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Favorites Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg w-full"></Skeleton>
          ))}
        </div>
      </section>

      {/* All Notes Section Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg w-full"></Skeleton>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { "subject-slug": subjectSlug } = await params;

  // Fetch subject data for structured data
  let subjectData = null;
  try {
    const data = await db
      .select({
        id: subjectsTable.id,
        name: subjectsTable.name,
        description: subjectsTable.description,
        slug: subjectsTable.slug,
      })
      .from(subjectsTable)
      .where(eq(subjectsTable.slug, subjectSlug))
      .limit(1);
    
    subjectData = data[0] || null;
  } catch (error) {
    console.error("Error fetching subject data for structured data:", error);
  }

  return (
    <div className="container mx-auto">
      {subjectData && (
        <>
          {/* Structured Data for SEO */}
          <CourseStructuredData
            name={`${subjectData.name} - Preparazione Maturità`}
            description={`Corso completo di ${subjectData.name} per studenti di scuole superiori. ${subjectData.description} Dalla prima alla quinta superiore, inclusa preparazione maturità.`}
            url={`https://maturamente.it/${subjectSlug}`}
            provider={{
              name: "MaturaMente",
              url: "https://maturamente.it"
            }}
            educationalLevel="High School"
            teaches={[subjectData.name, "Scuole Superiori", "Maturità"]}
            courseMode="online"
            hasCourseInstance={{
              courseMode: "online",
              instructor: {
                name: "MaturaMente AI Tutor"
              }
            }}
          />
          <LearningResourceStructuredData
            name={`Appunti di ${subjectData.name}`}
            description={`Collezione completa di appunti e materiali di studio per ${subjectData.name} per studenti di scuole superiori, dalla prima alla quinta inclusa preparazione maturità.`}
            url={`https://maturamente.it/${subjectSlug}`}
            educationalLevel="High School"
            learningResourceType="Course Material"
            teaches={[subjectData.name]}
            about={[subjectData.name, "Scuole Superiori", "Liceo", "Maturità", "Esame di Stato"]}
            provider={{
              name: "MaturaMente",
              url: "https://maturamente.it"
            }}
          />
        </>
      )}
      <Suspense fallback={<NotesLoadingSkeleton />}>
        {/* soft color glow background */}
        <NotesDataServer subjectSlug={subjectSlug} />
      </Suspense>
    </div>
  );
}
