import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSubjectBySlug } from "@/utils/subjects-data";
import GeneralLayout from "@/app/components/subject/general-layout";
import { connection } from "next/server";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

// Auth check now handled by middleware - no need for auth() call here
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ "subject-slug": string }>;
}) {
  // Get the subject slug from URL parameters
  const { "subject-slug": subjectSlug } = await params;

  // Opt into dynamic rendering for authentication
  await connection();

  // Get current user session
  const session = await auth();

  // If no user session, show authentication overlay
  if (!session?.user?.id) {
    return (
      <GeneralLayout>
        <UnauthenticatedOverlay
          title="Accedi alla materia"
          description="Crea un account gratuito per accedere a tutti i contenuti e funzionalità di questa materia"
          features={[
            "Accesso completo ai contenuti",
            "Tracciamento del progresso",
            "Simulazioni personalizzate",
            "Chat con il tutor AI",
          ]}
        >
          {children}
        </UnauthenticatedOverlay>
      </GeneralLayout>
    );
  }

  // Check if the subject exists for this user
  const subject = await getUserSubjectBySlug(session.user.id, subjectSlug);

  // If subject doesn't exist, show 404
  if (!subject) {
    notFound();
  }

  return (
    <div>
      <GeneralLayout>{children}</GeneralLayout>
    </div>
  );
}
