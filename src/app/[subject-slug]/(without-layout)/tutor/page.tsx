import SubjectChat from "@/app/components/tutor/subject-chat";

export default async function TutorPage({
  params,
}: {
  params: Promise<{ "subject-slug"?: string }>;
}) {
  const resolvedParams = await params;
  const subject = resolvedParams?.["subject-slug"]; // pass down to the chat for RAG filters
  return <SubjectChat subject={subject} />;
}
