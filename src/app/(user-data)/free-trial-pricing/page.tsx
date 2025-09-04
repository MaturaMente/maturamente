import type { Metadata } from "next";
import { FreeTrialPricingPage as FreeTrialComponent } from "../../components/pricing/free-trial-pricing-page";
import { db } from "@/db/drizzle";
import { subjectsTable, notesTable } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import DashboardFooter from "../../components/shared/navigation/footer";

export const metadata: Metadata = {
  title: "Prova Gratuita | MaturaMente",
  description: "Inizia la prova gratuita di 2 settimane senza carta.",
  alternates: { canonical: "/free-trial-pricing" },
};

export default async function FreeTrialPricingPage() {
  const subjects = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      description: subjectsTable.description,
      slug: subjectsTable.slug,
      color: subjectsTable.color,
      maturita: subjectsTable.maturita,
      notes_count: count(notesTable.id),
    })
    .from(subjectsTable)
    .leftJoin(notesTable, eq(subjectsTable.id, notesTable.subject_id))
    .groupBy(
      subjectsTable.id,
      subjectsTable.name,
      subjectsTable.description,
      subjectsTable.slug,
      subjectsTable.color,
      subjectsTable.maturita
    )
    .orderBy(subjectsTable.order_index);

  return (
    <>
      <FreeTrialComponent subjects={subjects} />
      <DashboardFooter />
    </>
  );
}


