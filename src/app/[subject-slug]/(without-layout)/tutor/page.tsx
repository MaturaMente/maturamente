import PdfChat from "@/app/components/tutor/pdf-chat";

export default function TutorPage({
  params,
}: {
  params: { "subject-slug"?: string };
}) {
  const subject = params?.["subject-slug"]; // pass down to the chat for RAG filters
  return <PdfChat subject={subject} />;
}
