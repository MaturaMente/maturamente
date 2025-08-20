import SubjectLayoutClient from "@/app/components/subject/subject-layout";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

// Auth check now handled by middleware - no need for auth() call here
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SubjectLayoutClient>{children}</SubjectLayoutClient>
    </div>
  );
}
