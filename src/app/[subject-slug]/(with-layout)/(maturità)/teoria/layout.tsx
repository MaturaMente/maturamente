import { Suspense } from "react";
import { TheorySkeleton } from "@/app/components/shared/loading";

export default async function TeoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The theory context and completion data are now handled within
  // the individual theory pages through the new TheoryPage component
  return <Suspense fallback={<TheorySkeleton />}>{children}</Suspense>;
}
