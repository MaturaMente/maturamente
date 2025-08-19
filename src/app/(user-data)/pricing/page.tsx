import { PricingPage } from "../../components/pricing/pricing-page";
import { db } from "@/db/drizzle";
import { subjectsTable, notesTable } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import DashboardFooter from "../../components/shared/navigation/footer";

export default async function PricingPageRoute() {
  // Fetch available subjects
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
      <PricingPage subjects={subjects} />
      <DashboardFooter />
    </>
  );
}
