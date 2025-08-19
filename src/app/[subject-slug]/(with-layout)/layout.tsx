import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSubjectBySlug } from "@/utils/subjects-data";
import SubjectLayoutClient from "../../components/subject/subject-layout";
import { connection } from "next/server";

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

  // If no user session, let middleware handle the redirect
  if (!session?.user?.id) {
    return <SubjectLayoutClient>{children}</SubjectLayoutClient>;
  }

  // Check if the subject exists for this user
  const subject = await getUserSubjectBySlug(session.user.id, subjectSlug);

  // If subject doesn't exist, show 404
  if (!subject) {
    notFound();
  }

  return (
    <div>
      <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />
      <SubjectLayoutClient>{children}</SubjectLayoutClient>
    </div>
  );
}
