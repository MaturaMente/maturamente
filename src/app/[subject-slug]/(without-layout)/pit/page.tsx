import type { Metadata } from "next";
import SubjectChat from "@/app/components/chat/subject-chat";
import { db } from "@/db/drizzle";
import { subjectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "@/utils/user-context";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "subject-slug"?: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const subjectSlug = resolvedParams?.["subject-slug"];

  if (!subjectSlug) {
    return {
      title: "Pit - Tutor AI",
      description:
        "Chatta con Pit, il tutor AI di MaturaMente per ricevere aiuto personalizzato nello studio di tutte le materie scolastiche.",
    };
  }

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
        title: "Pit - Tutor AI",
        description:
          "Chatta con Pit, il tutor AI di MaturaMente per ricevere aiuto personalizzato nello studio.",
      };
    }

    const title = `Pit - Tutor AI per ${subject.name}`;
    const description = `Chatta con Pit, il tutor AI specializzato in ${subject.name}. Ricevi spiegazioni personalizzate, risolvi dubbi e migliora le tue competenze con l'intelligenza artificiale di MaturaMente.`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description:
        description.length > 160
          ? description.substring(0, 157) + "..."
          : description,
      keywords: [
        `tutor AI ${subject.name.toLowerCase()}`,
        `chat AI ${subject.name.toLowerCase()}`,
        "aiuto studio",
        "intelligenza artificiale educazione",
        "supporto scolastico",
        "spiegazioni personalizzate",
        "MaturaMente",
      ],
      openGraph: {
        title,
        description:
          description.length > 160
            ? description.substring(0, 157) + "..."
            : description,
        url: `/${subjectSlug}/pit`,
        type: "website",
        images: [
          {
            url: "/opengraph-image.png",
            width: 1200,
            height: 630,
            alt: `Pit - Tutor AI per ${subject.name} | MaturaMente`,
          },
        ],
      },
      twitter: {
        title: title.length > 60 ? title.substring(0, 57) + "..." : title,
        description:
          description.length > 160
            ? description.substring(0, 157) + "..."
            : description,
        images: ["/opengraph-image.png"],
      },
      alternates: {
        canonical: `/${subjectSlug}/pit`,
      },
      other: {
        "ai:subject": subject.name,
        "ai:type": "educational_tutor",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for Pit page:", error);
    return {
      title: "Pit - Tutor AI",
      description:
        "Chatta con Pit, il tutor AI di MaturaMente per ricevere aiuto personalizzato nello studio.",
    };
  }
}

export default async function TutorPage({
  params,
}: {
  params: Promise<{ "subject-slug"?: string }>;
}) {
  const resolvedParams = await params;
  const subject = resolvedParams?.["subject-slug"]; // pass down to the chat for RAG filters
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // Get subject name for better UX
    let subjectName = "questa materia";
    if (subject) {
      try {
        const subjectData = await db
          .select({
            name: subjectsTable.name,
          })
          .from(subjectsTable)
          .where(eq(subjectsTable.slug, subject))
          .limit(1);

        if (subjectData[0]) {
          subjectName = subjectData[0].name;
        }
      } catch (error) {
        console.error("Error fetching subject name:", error);
      }
    }

    return (
      <div className="relative h-full">
        <UnauthenticatedOverlay
          title={`Chatta con Pit per ${subjectName}`}
          description={`Accedi per utilizzare Pit, il tutor AI specializzato in ${subjectName}`}
          features={[
            "Spiegazioni personalizzate",
            "Aiuto con gli esercizi",
            "Supporto specifico per la materia",
            "Disponibile 24/7",
          ]}
        >
          <SubjectChat subject={subject} />
        </UnauthenticatedOverlay>
      </div>
    );
  }

  return <SubjectChat subject={subject} />;
}
