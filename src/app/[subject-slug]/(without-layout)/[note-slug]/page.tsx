import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNoteBySlug } from "@/utils/notes-data";
import { SingleNoteLayout } from "@/app/components/subject/notes/single-note/single-note-layout";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import { connection } from "next/server";
import { db } from "@/db/drizzle";
import { subjectsTable, notesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ArticleStructuredData, LearningResourceStructuredData } from "@/app/components/shared/seo/structured-data";
import { isUserOnFreeTrial } from "@/utils/free-trial-check";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

interface NotePageProps {
  params: Promise<{
    "subject-slug": string;
    "note-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { "subject-slug": subjectSlug, "note-slug": noteSlug } = await params;

  try {
    // Fetch note and subject data for metadata
    const noteData = await db
      .select({
        note_id: notesTable.id,
        note_title: notesTable.title,
        note_description: notesTable.description,
        note_slug: notesTable.slug,
        note_pages: notesTable.n_pages,
        note_created_at: notesTable.created_at,
        subject_id: subjectsTable.id,
        subject_name: subjectsTable.name,
        subject_description: subjectsTable.description,
        subject_slug: subjectsTable.slug,
      })
      .from(notesTable)
      .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
      .where(
        and(
          eq(subjectsTable.slug, subjectSlug),
          eq(notesTable.slug, noteSlug)
        )
      )
      .limit(1);

    if (!noteData[0]) {
      return {
        title: "Appunto non trovato",
        description: "L'appunto richiesto non è stato trovato su MaturaMente.",
      };
    }

    const note = noteData[0];
    const title = `${note.note_title} - ${note.subject_name}`;
    const description = note.note_description 
      ? `${note.note_description} Studia l'appunto di ${note.subject_name} su MaturaMente con il supporto dell'AI tutor.`
      : `Studia l'appunto "${note.note_title}" di ${note.subject_name} su MaturaMente. ${note.note_pages} pagine di contenuto per studenti di scuole superiori. Dalla prima alla quinta, inclusa preparazione maturità.`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description: description.length > 160 ? description.substring(0, 157) + "..." : description,
      keywords: [
        note.note_title.toLowerCase(),
        `${note.subject_name.toLowerCase()}`,
        `appunto ${note.subject_name.toLowerCase()}`,
        "studio scuole superiori",
        "aiuto compiti",
        "supporto scolastico",
        "preparazione esame",
        "maturità",
        "AI tutor",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        url: `/${subjectSlug}/${noteSlug}`,
        type: "article",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `${note.note_title} - ${note.subject_name} | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description: description.length > 160 ? description.substring(0, 157) + "..." : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}/${noteSlug}`,
      },
      other: {
        "note:title": note.note_title,
        "note:subject": note.subject_name,
        "note:pages": note.note_pages.toString(),
      },
    };
  } catch (error) {
    console.error("Error generating metadata for note page:", error);
    return {
      title: "Errore - MaturaMente",
      description: "Si è verificato un errore durante il caricamento dell'appunto.",
    };
  }
}

async function NotePageServer({
  subjectSlug,
  noteSlug,
}: {
  subjectSlug: string;
  noteSlug: string;
}) {
  await connection();
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  try {
    const note = await getNoteBySlug(subjectSlug, noteSlug, session.user.id);

    if (!note) {
      notFound();
    }

    // Determine if user is on free trial to conditionally restrict chat on non-trial notes
    const isFreeTrialUser = await isUserOnFreeTrial(session.user.id);

    // Fetch additional data for structured data
    let noteStructuredData = null;
    try {
      const structuredDataQuery = await db
        .select({
          note_title: notesTable.title,
          note_description: notesTable.description,
          note_created_at: notesTable.created_at,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          subject_slug: subjectsTable.slug,
        })
        .from(notesTable)
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .where(
          and(
            eq(subjectsTable.slug, subjectSlug),
            eq(notesTable.slug, noteSlug)
          )
        )
        .limit(1);

      noteStructuredData = structuredDataQuery[0] || null;
    } catch (error) {
      console.error("Error fetching note structured data:", error);
    }

    return (
      <>
        {noteStructuredData && (
          <>
            <ArticleStructuredData
              headline={noteStructuredData.note_title}
              description={noteStructuredData.note_description || `Appunto di ${noteStructuredData.subject_name}: ${noteStructuredData.note_title}`}
              url={`https://maturamente.it/${subjectSlug}/${noteSlug}`}
              datePublished={noteStructuredData.note_created_at.toISOString()}
              author={{
                name: "MaturaMente",
                url: "https://maturamente.it"
              }}
              publisher={{
                name: "MaturaMente",
                url: "https://maturamente.it",
                logo: "/opengraph-image.png"
              }}
              image="/opengraph-image.png"
              articleSection={noteStructuredData.subject_name}
              keywords={[
                noteStructuredData.note_title.toLowerCase(),
                noteStructuredData.subject_name.toLowerCase(),
                "maturità",
                "appunto",
                "studio"
              ]}
            />
            <LearningResourceStructuredData
              name={noteStructuredData.note_title}
              description={noteStructuredData.note_description || `Materiale di studio per ${noteStructuredData.subject_name}: ${noteStructuredData.note_title}. Contenuto per studenti di scuole superiori.`}
              url={`https://maturamente.it/${subjectSlug}/${noteSlug}`}
              educationalLevel="High School"
              learningResourceType="Study Material"
              teaches={[noteStructuredData.subject_name]}
              about={[noteStructuredData.subject_name, "Scuole Superiori", "Liceo", "Maturità", "Studio"]}
              provider={{
                name: "MaturaMente",
                url: "https://maturamente.it"
              }}
              datePublished={noteStructuredData.note_created_at.toISOString()}
              author={{
                name: "MaturaMente"
              }}
            />
          </>
        )}
        <SingleNoteLayout note={note} isFreeTrialUser={isFreeTrialUser} />
      </>
    );
  } catch (error) {
    console.error("Error fetching note:", error);
    notFound();
  }
}

function NotePageLoading() {
  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Left section - PDF placeholder */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <LoadingSpinner text="Caricamento appunto..." size="sm" />
      </div>

      {/* Right section - Chat placeholder */}
      <div className="w-80 lg:w-96 border-l bg-background flex items-center justify-center">
        <LoadingSpinner text="Caricamento chat..." size="sm" />
      </div>
    </div>
  );
}

export default async function NotePage({ params }: NotePageProps) {
  const { "subject-slug": subjectSlug, "note-slug": noteSlug } = await params;

  return (
    <Suspense fallback={<NotePageLoading />}>
      <NotePageServer subjectSlug={subjectSlug} noteSlug={noteSlug} />
    </Suspense>
  );
}
