import PdfChat from "@/app/components/tutor/pdf-chat";

export default async function TutorPage({
  params,
}: {
  params: Promise<{ "subject-slug"?: string }>;
}) {
  const resolvedParams = await params;
  const subject = resolvedParams?.["subject-slug"]; // pass down to the chat for RAG filters
  return <PdfChat subject={subject} />;
}
